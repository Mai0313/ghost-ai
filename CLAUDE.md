# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ghost AI is a privacy-first, invisible AI-powered desktop assistant built with Electron, React, and TypeScript. It captures screenshots, transcribes voice, and provides AI analysis through OpenAI's API while remaining completely hidden from screen sharing and monitoring software.

## Build System & Commands

### Development

```bash
npm run dev          # Start all dev servers (Vite + tsup + Electron)
npm run dev:renderer # Start Vite dev server only (port 5173)
npm run dev:main     # Start tsup watch for main process
npm run dev:electron # Start Electron with nodemon watch
```

### Building & Distribution

```bash
npm run build            # Production build (Vite + tsup)
npm run dist             # Build and package for current platform
npm run dist:win         # Build Windows installer (.exe)
npm run dist:win:portable # Build Windows portable
npm run dist:mac         # Build macOS (.dmg)
npm run dist:linux       # Build Linux AppImage/deb
```

### Code Quality

```bash
npm run check      # Run type-check + format + lint (fixes issues)
npm run type-check # TypeScript type checking (no emit)
npm run lint       # ESLint with --fix
npm run format     # Prettier with --write
npm run lint:nofix # ESLint check only
npm run format:nofix # Prettier check only
```

### Testing Single Files

- Type check: `npx tsc --noEmit <file>.ts`
- Lint: `npx eslint <file>.ts`
- Format: `npx prettier --write <file>.ts`

## Architecture

### Process Model (Electron Multi-Process)

**Main Process** (`src/main/main.ts`):

- Owns BrowserWindow, Tray, global hotkeys, and IPC handlers
- Manages session lifecycle (session IDs, conversation history)
- Coordinates screenshot capture, AI streaming, and transcription
- Persists settings and logs via managers

**Renderer Process** (`src/App.tsx`):

- React UI: HUD bar, Ask panel, Settings, voice recording indicators
- Communicates with main via IPC (`window.ghostAI` preload API)
- Handles UI state: conversation history, pagination, streaming deltas

**Preload Script** (`src/main/preload.ts`):

- Exposes safe IPC channels as `window.ghostAI` API
- Built as CommonJS (`.cjs`) for Electron compatibility

### Core Managers (Main Process)

Located in `src/main/modules/`:

1. **hotkey-manager.ts** - Registers fixed global hotkeys using `globalShortcut`:
   - `Ctrl/Cmd+Enter`: Toggle Ask panel
   - `Ctrl/Cmd+Shift+Enter`: Toggle voice recording
   - `Ctrl/Cmd+\`: Hide/show interface
   - `Ctrl/Cmd+R`: Clear conversation & start new session
   - `Ctrl/Cmd+Up/Down`: Scroll conversation
   - `Ctrl/Cmd+Shift+Up/Down`: Navigate history pages

2. **screenshot-manager.ts** - Captures full screen using `screenshot-desktop`, returns Buffer (never writes to disk for privacy)

3. **hide-manager.ts** - Controls window visibility and "ghost mode" (hiding from screen capture)

4. **settings-manager.ts** - Loads/saves user settings and OpenAI config using `electron-store`

5. **prompts-manager.ts** - Manages user prompts stored in `~/.ghost-ai/prompts/`; tracks active prompt selection

6. **session-store.ts** - In-memory session tracking (request IDs, Q&A entries per session)

7. **log-manager.ts** - Writes conversation logs and session JSON to `~/.ghost-ai/sessions/<sessionId>/`

8. **realtime-transcribe.ts** - WebSocket-based real-time audio transcription using OpenAI's Realtime API

### OpenAI Integration

**src/shared/openai-client.ts**:

- Singleton `OpenAIClient` class wrapping OpenAI SDK
- Two streaming methods:
  - `completionStream()`: Standard chat completions (gpt-4o, etc.)
  - `responseStream()`: Responses API (gpt-5 with reasoning, web search)
- Handles reasoning deltas, web search indicators, and answer deltas
- Supports AbortSignal for Ctrl+R cancellation

**Model Support**:

- Allowed models: `chatgpt-4o-latest`, `gpt-4o`, `gpt-4.1`, `o4-mini-2025-04-16`, `gpt-5`, `gpt-5-mini`
- gpt-5 enables reasoning (effort: high) and web search

### Session & Conversation Flow

1. **Session Creation**: New UUID on app start and when user presses Ctrl+R
2. **First Turn**: Loads active prompt (required) from Settings → Prompts
3. **Subsequent Turns**: Injects plain-text Q/A history as "Previous conversation" in prompt
4. **Regeneration**: User can regenerate any historical answer; rebuilds history up to that point
5. **Pagination**: User navigates through assistant answers via Prev/Next; "Live" shows streaming content

### State Management

- **Main Process**: Conversation history stored as plain text per session ID in Map
- **Renderer**: React state for UI, history array of `{ role, content }` objects
- **Sync**: Session changes broadcast via IPC event `session:changed`; renderer clears state on new session

### Privacy Features

- **Screenshot never persisted**: Captured as Buffer, base64-encoded, sent directly to API
- **setContentProtection(true)**: Prevents most screen capture APIs from capturing window
- **Click-through**: Window ignores mouse events except over UI elements (HUD/panels)
- **Logs opt-in**: Conversation logs written to `~/.ghost-ai/sessions/` for debugging (not sent externally)

## TypeScript Configuration

- **Module system**: ESM (`"type": "module"` in package.json)
- **Path aliases** (tsconfig.json):
  - `@main/*` → `src/main/*`
  - `@shared/*` → `src/shared/*`
  - `@services/*` → `src/services/*`
- **Bundlers**:
  - **Vite**: Bundles renderer (React) → `dist/renderer/`
  - **tsup**: Bundles main process (ESM) → `dist/main.js` and preload (CommonJS) → `dist/preload.cjs`

## Component Structure

**src/components/**:

- `HUDBar.tsx` - Top-center floating control bar with Listen/Ask/Hide/Settings buttons
- `AskPanel.tsx` - Question input, markdown viewer, pagination controls, regenerate button
- `Settings.tsx` - OpenAI API config, model selection, prompt management, transcription settings
- `MarkdownViewer.tsx` - Renders AI responses using @blocknote/react
- `TranscriptBubble.tsx` - Shows live transcription during voice recording
- `RecordIndicator.tsx` - Red pulsing dot with timer during recording
- `ThinkingIndicator.tsx` - Loading spinner for web search and reasoning phases
- `Icons.tsx` - SVG icon components

## Key Files to Understand

1. **src/main/main.ts:318-411** - IPC handlers for analyze stream, session management, transcription
2. **src/shared/openai-client.ts:173-301** - responseStream() with reasoning and web search support
3. **src/App.tsx:369-568** - onSubmit() flow: loads active prompt, calls analyzeCurrentScreenStream, handles deltas
4. **src/main/modules/hotkey-manager.ts** - Global hotkey registration
5. **src/main/modules/prompts-manager.ts** - Active prompt selection logic

## Common Patterns

### Adding a New IPC Handler (Main → Renderer)

1. **Main process** (`src/main/main.ts`):

   ```typescript
   ipcMain.handle("my-channel:action", async (evt, payload) => {
     // logic
     return result;
   });
   ```

2. **Preload** (`src/main/preload.ts`):

   ```typescript
   myAction: (payload: any) => ipcRenderer.invoke('my-channel:action', payload),
   ```

3. **Renderer** (`src/App.tsx` or component):
   ```typescript
   const result = await (window as any).ghostAI?.myAction?.(payload);
   ```

### Adding a New Manager Module

1. Create `src/main/modules/my-manager.ts` with exported functions/class
2. Import and use in `src/main/main.ts`
3. Expose via IPC if renderer needs access

### Extending OpenAI Streaming

1. Update `onDelta()` callback signature in `openai-client.ts`
2. Emit new channel/eventType in `responseStream()` loop
3. Handle new channel in `App.tsx` onDelta handler (lines 426-486)

## Important Notes

- **Hotkeys are fixed**: User cannot customize hotkey bindings (by design for simplicity)
- **Active prompt required**: User must select a prompt in Settings → Prompts before first Ask; no auto-fallback to default.txt
- **Session ID changes**: On Ctrl+R or app restart; active AbortControllers canceled to prevent stale requests
- **History format**: Plain text `Q: ...\nA: ...\n\n` for simple continuity (not full OpenAI message array)
- **Reasoning & Web Search**: Only available with gpt-5 model using Responses API
- **Transcription language**: English or Chinese (zh); selected in Settings

## Development Tips

- **Hot reload**: Vite reloads renderer instantly; main process requires restart (handled by nodemon)
- **DevTools**: Press F5 in-app or use View → Toggle Developer Tools
- **Logs**: Main process logs to console; session logs in `~/.ghost-ai/sessions/<sessionId>/conversation.md`
- **Testing hotkeys**: Use tray menu "Show Overlay" if global hotkeys conflict
- **Debugging IPC**: Add `console.log()` in preload to trace renderer → main calls

## File Locations at Runtime

- **User config**: `~/.ghost-ai/` (managed by electron-store)
- **Prompts**: `~/.ghost-ai/prompts/*.txt`
- **Session logs**: `~/.ghost-ai/sessions/<sessionId>/conversation.md` and `session.json`
- **Settings**: `~/.ghost-ai/config.json` (OpenAI config, user preferences)
