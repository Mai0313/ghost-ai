<center>

# 👻 Ghost AI

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![OpenAI](https://img.shields.io/badge/-OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![tests](https://github.com/Mai0313/ghost_ai/actions/workflows/test.yml/badge.svg)](https://github.com/Mai0313/ghost_ai/actions/workflows/test.yml)
[![code-quality](https://github.com/Mai0313/ghost_ai/actions/workflows/code-quality-check.yml/badge.svg)](https://github.com/Mai0313/ghost_ai/actions/workflows/code-quality-check.yml)
[![license](https://img.shields.io/badge/License-MIT-green.svg?labelColor=gray)](https://github.com/Mai0313/ghost_ai/tree/master?tab=License-1-ov-file)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Mai0313/ghost_ai/pulls)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple?logo=shield&logoColor=white)](https://github.com/Mai0313/ghost_ai)
[![Cross Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?logo=electron&logoColor=white)](https://github.com/Mai0313/ghost_ai)

</center>

👻 **An invisible AI-powered desktop assistant that captures, analyzes, and provides insights**

Ghost AI is a privacy-first cross-platform desktop application built with Electron and TypeScript. It provides three core features: text input with screenshot analysis, voice recording with real-time conversation support, and stealth operation interface. The system integrates directly with OpenAI API through global hotkeys, with all API settings configurable through the frontend interface, offering seamless AI assistance while remaining completely invisible to screen sharing and monitoring software.

**Other Languages**: [English](README.md) | [繁體中文](README_cn.md)

## ✨ Features

### 👻 **Invisible Operation**

- **Ghost Mode**: Completely invisible during screenshots and screen sharing
- **Stealth Hotkeys**: Low-level keyboard hooks that avoid detection by monitoring software
- **Hidden Process**: Disguised process names and window titles for maximum privacy
- **Memory-Only Images**: Images are processed entirely in memory; they never touch disk. Plain-text Q/A conversation is logged per session under `~/.ghost_ai/logs/<sessionId>/<sessionId>.log` for debugging/inspection.

### ⚡ **Lightning Fast Capture**

- **Global Hotkeys**: Trigger screenshots from any application with customizable key combinations
- **Instant Analysis**: Real-time image analysis using OpenAI's Vision API
- **Smart Prompting**: Store prompt files under `~/.ghost_ai/prompts` and switch the active prompt in Settings (editing is done outside the app)
- **Multiple Capture Modes**: Full screen, active window, or custom region selection

### 🤖 **AI-Powered Intelligence**

- **OpenAI Vision**: Advanced image understanding and analysis capabilities
- **Context-Aware**: Provide custom prompts to get specific insights about your screenshots
- **Error Handling**: Robust retry mechanisms and graceful error recovery
- **Rate Limiting**: Built-in API quota management and request optimization
- **Simple Conversation Memory**: Keeps a plain‑text Q/A history in memory for prompt composition; after each request completes, the current conversation text is also written to `~/.ghost_ai/logs/<sessionId>/<sessionId>.log`.
- **Default Prompt Injection (first turn only)**: The active prompt from `~/.ghost_ai/prompts/default.txt` is injected only on the first turn of each session. Subsequent turns include only your question and the plain‑text conversation history.
- **Top-level Session**: A `sessionId` is created on app start and whenever you press Clear (Cmd/Ctrl+R). All capture and transcription events carry this `sessionId`, and conversation logs are written to `~/.ghost_ai/logs/<sessionId>/<sessionId>.log` for easier correlation.
  - A structured Session Store is also maintained in memory and persisted to `~/.ghost_ai/logs/<sessionId>/<sessionId>.json`, recording each send with `{ index, requestId, log_path, text_input, ai_output }`.

### 🔒 **Privacy & Security**

- **Images never persisted**: Screenshots are processed in RAM only and are not saved to disk
- **Conversation logs**: For debugging, the app writes the current plain-text Q/A conversation to `~/.ghost_ai/logs/<sessionId>/<sessionId>.log` after each analyze request completes. This fix ensures new sessions create proper separate log paths without mixing with previous sessions. Interrupted conversations (via Ctrl+R) are not logged to prevent race conditions.
- **Encrypted Communication**: All API calls use HTTPS with certificate pinning
- **Keylogger Detection**: Warns users about potential privacy risks from monitoring software
- **Automatic Cleanup**: Memory and network traces are automatically cleared

### 🎨 **User Experience**

- **Floating HUD**: A modern top‑center control bar (bar‑only by default) with Listen, Ask, Hide, and Settings
- **Unified Ask card with pagination (streaming‑only)**: The AI response and the input are combined into one card. Within the same session, past answers are shown as pages with Prev/Next controls and a page indicator (e.g., `2/5`). The live view is the latest page while streaming.
- **Elegant validation feedback**: API settings tests show clear visual feedback with icons and color-coded notifications
- **Fixed hotkeys (all are global)**: Ask = Cmd/Ctrl+Enter, Voice Toggle = Cmd/Ctrl+Shift+Enter (realtime transcription), Toggle Hide = Cmd/Ctrl+\\, Clear Ask = Cmd/Ctrl+R (also resets voice state), Scroll Up/Down = Cmd/Ctrl+Up/Down, Prev/Next Page = Cmd/Ctrl+Shift+Up/Down
- **Edge-friendly overlay**: The overlay is full‑screen and click‑through by default; it only captures mouse input when you hover the HUD or bubbles. This prevents invisible blockers and lets you drag the bar to the very top/bottom edges.
- **Inline error messages**: If something goes wrong, errors show inline where the AI answer appears, so you can retry immediately
- **Quick clear / Interrupt**: Press Cmd/Ctrl+R anytime to abort an in‑progress AI answer, clear the Ask bubble and conversation history, and start a brand‑new session instantly
- **Minimal Friction**: Prompt composer with custom prompt field and Send button
- **Customizable Settings**: Personalize hotkeys, default prompts, and behavior
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

### 🏗️ **Modern Architecture**

- **Frontend-Only Application**: Pure Electron + TypeScript with no backend dependencies
- **UI Framework**: React for responsive and modern user interface
- **Direct API Integration**: OpenAI SDK integrated directly in the main process
- **Frontend Configuration**: All API settings configurable through the user interface
- **Type Safety**: Full TypeScript type annotations throughout the codebase
- **Memory-First**: All processing happens in memory without disk persistence

### Overlay click‑through behavior

- The main window is a transparent, full‑screen overlay with no frame/shadow.
- It starts in click‑through mode so your desktop/apps remain interactive.
- When your cursor enters the HUD or bubbles, the app temporarily disables click‑through so you can click/drag; it re‑enables click‑through when you move away.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** for the Electron application
- **OpenAI API Key** for AI analysis features

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Mai0313/ghost_ai.git
   cd ghost_ai
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure your OpenAI API settings**

   The application will prompt you to configure your OpenAI API settings on first run:
   - API Key
   - Base URL (optional, defaults to https://api.openai.com/v1)
   - Model selection
   - Other preferences

   All settings are stored securely using Electron's built-in encryption.

### Running the Application

1. **Start the application in development mode**

   ```bash
   npm run dev
   ```

2. **Fixed hotkeys (global)**
   - **Ask (toggle Ask panel)**: `Cmd/Ctrl+Enter` (press again to collapse)
   - **Voice (realtime transcription)**: `Cmd/Ctrl+Shift+Enter` — captures microphone +, where permitted, system audio, and streams live transcript under the bar using `gpt-4o-mini-transcribe`.
   - **Toggle Hide**: `Cmd/Ctrl+\\` (works even if the HUD was hidden via the Hide button)
   - **Clear Ask**: `Cmd/Ctrl+R` (also stops recording and resets voice state)
   - **Scroll Up/Down** (Ask/Transcript content): `Cmd/Ctrl+Up` / `Cmd/Ctrl+Down`
   - **Prev/Next Page** (pagination within a session): `Cmd/Ctrl+Shift+Up` / `Cmd/Ctrl+Shift+Down` (also `Cmd/Ctrl+Left` / `Cmd/Ctrl+Right`)

3. **Build for production**

   ```bash
   npm run build
   ```

### First Use

1. Press your configured hotkey to capture a screenshot
2. Use the top control bar to switch between Ask and Settings
3. Enter your question and click Send. The active prompt from `~/.ghost_ai/prompts` is applied automatically on the first turn of a session.
4. View the AI response inside the bubble. Answers are rendered as Markdown with proper formatting. Code blocks are shown without syntax highlighting.

## 📁 Project Structure

```
├── .devcontainer/          # VS Code Dev Container configuration
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── copilot-instructions.md
├── .kiro/
│   └── specs/ghost-ai/     # Project specifications and requirements
├── src/
│   ├── main/               # Electron main process
│   │   ├── hotkey-manager.ts    # Global hotkey management
│   │   ├── screenshot-manager.ts # Screenshot capture
│   │   ├── audio-manager.ts     # Voice recording
│   │   └── hide-manager.ts      # Stealth interface
│   ├── renderer/           # React renderer process
│   │   ├── components/     # UI components
│   │   └── pages/          # Application pages
│   ├── shared/             # Shared utilities
│   │   ├── openai-client.ts     # OpenAI API integration
│   │   └── types.ts             # TypeScript definitions
│   └── services/           # Business logic services
├── tests/                  # Test suite
├── package.json            # Node.js project configuration
├── tsconfig.json           # TypeScript configuration
├── electron-builder.json   # Electron packaging configuration
└── README.md
```

## 🛠️ Available Commands

### Development Commands

```bash
# Development
npm run dev                             # Start development mode
npm run build                           # Build for production
npm run test                            # Run tests
npm run lint                            # Lint TypeScript code
npm run format                          # Format code

# Packaging
    npm run dist                            # Build and package (electron-builder)
npm run dist:win                        # Package for Windows
npm run dist:mac                        # Package for macOS
npm run dist:linux                      # Package for Linux

# Dependencies
npm install <package>                   # Add dependency
npm install <package> --save-dev        # Add dev dependency
```

### Packaging

```bash
npm run dist   # Build and package for your platform
```

#### OS-specific packaging notes

- Windows: `npm run dist:win` produces an NSIS installer under `release/` (e.g., `Ghost AI Setup <version>.exe`).
- macOS: `npm run dist:mac` must be run on macOS (DMG creation and code signing require macOS).
- Linux: `npm run dist:linux` must be run on a Linux environment for best results (AppImage/deb). On Windows, use WSL2 or a Linux machine.
- All artifacts are written to the `release/` directory. Use `--publish never` (default in scripts) to avoid accidental uploads.

### Application Icon

- Windows installer and app icon use `ghost.ico` in the project root.
- To change the icon, replace the file `ghost.ico` and rebuild:

```bash
npm run dist
```

## 🎯 How It Works

### Capture Flow

1. **Hotkey Trigger**: Press your configured global hotkey (e.g., `Ctrl+Shift+S`)
2. **Invisible Mode**: Application immediately hides all windows
3. **Screenshot Capture**: System captures the current screen to memory
4. **Prompt Input**: UI appears for you to enter analysis instructions
5. **AI Analysis**: Image and prompt sent to OpenAI Vision API (streaming-only)
6. **Results Display**: Answer streams live above the input; on errors, an inline `Error: ...` shows in the same bubble, and you can retry right away. The app is streaming‑only; legacy non‑streaming chat flows have been removed.
7. **Memory Cleanup**: All traces automatically cleared from memory
8. **Conversation Memory**: After each answer, the app appends `Q:`/`A:` lines to an in‑memory string; on the next turn, it sends that history plus the new question. The current conversation text is also written to `~/.ghost_ai/logs/<sessionId>/<sessionId>.log`.

### Privacy Protection

- **No Disk Storage**: Screenshots never saved to disk
- **Memory Processing**: All image data processed in RAM only
- **Stealth Operation**: Invisible to screen recording and sharing
- **Secure Communication**: Encrypted API calls
- **Process Hiding**: Disguised process names and window titles
- **Automatic Cleanup**: Memory and network traces cleared on exit

### AI Integration

- **OpenAI Vision API**: State-of-the-art image understanding
- **Custom Prompts**: Tailor analysis to your specific needs
- **Context Awareness**: AI understands both image content and your questions
- **Error Recovery**: Robust handling of API failures and rate limits
- **Response Optimization**: Intelligent caching and request batching

## ⚙️ Configuration

### Hotkey Customization

Edit the hotkey configuration in the settings:

```typescript
// Default hotkey: Ctrl+Shift+S
const defaultHotkey = 'CommandOrControl+Shift+S';

// Custom hotkey examples:
// "CommandOrControl+Alt+G"     // Ctrl+Alt+G (Windows/Linux) or Cmd+Alt+G (macOS)
// "CommandOrControl+Shift+A"   // Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (macOS)
// "F12"                        // Function key F12
```

### API Configuration

Configure your OpenAI API settings through the application's settings interface:

- **API Key**: Your OpenAI API key (stored securely using Electron's safeStorage)
- **Base URL**: Custom API endpoint (defaults to https://api.openai.com/v1)
- **Model**: Choose from available models (dynamically fetched from OpenAI)
- Note: The app does not set temperature or max tokens by default to maximize compatibility across models. If your selected model supports these, you can customize behavior by changing models or your prompts.

All settings are encrypted and stored locally - no external services required.

### UI customization (opacity and colors)

- To adjust overall opacity (both background and text), change the theme opacity in `src/renderer/styles/theme.ts`:

```96:96:src/renderer/styles/theme.ts
export const theme = makeTheme();
```

For example, `makeTheme(0.75)` makes the UI more transparent; values are 0–1.

- To change colors, edit the `palette` in the same file:

```54:65:src/renderer/styles/theme.ts
const palette = {
  text: [255, 255, 255],
  mutedText: [189, 189, 189],
  barBg: [30, 30, 30],
  settingsBg: [20, 20, 20],
  panelBg: [22, 22, 22],
  panelFooterBg: [24, 24, 24],
  inputBg: [22, 22, 22],
  border: [255, 255, 255],
  shadow: [0, 0, 0],
  primary: [43, 102, 246],
  danger: [255, 40, 40],
};
```

- Component styles are centralized in `src/renderer/styles/styles.ts` and consume the theme, so most tweaks should only require the edits above.

### Privacy Settings

Customize privacy and security options:

```typescript
interface PrivacySettings {
  stealthMode: boolean; // Hide from screen sharing
  memoryOnly: boolean; // Never save to disk
  autoCleanup: boolean; // Auto-clear memory traces
  processHiding: boolean; // Disguise process names
  keyloggerDetection: boolean; // Warn about monitoring software
}
```

### Prompts Directory

- Ghost AI loads prompts from `~/.ghost_ai/prompts`.
- The app always reads from `~/.ghost_ai/prompts/default.txt` as the effective prompt.
- Using the Settings panel to select a prompt will copy that file's content into `default.txt`.
- If `default.txt` does not exist, the app creates an empty `default.txt` on first run.
- To create or edit prompts, manage files directly in your editor (e.g., `general.txt`, `ui-review.md`).

## 🔧 Development

### Setting Up Development Environment

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure API settings**

   The application will guide you through setting up your OpenAI API configuration on first run.

3. **Run in development mode**

   ```bash
   npm run dev
   ```

4. **Run tests**

   ```bash
   npm test
   ```

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run dist
```

## 🤝 Contributing

We welcome contributions! Please feel free to:

- 🐛 Report bugs and issues
- 💡 Suggest new features or improvements
- 🔧 Submit pull requests
- 📖 Improve documentation
- 🧪 Add tests and improve coverage

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PRs

## 📖 Documentation

For detailed documentation, visit: [https://mai0313.github.io/ghost_ai/](https://mai0313.github.io/ghost_ai/)

## 🛡️ Security

If you discover a security vulnerability, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

## 👥 Contributors

[![Contributors](https://contrib.rocks/image?repo=Mai0313/ghost_ai)](https://github.com/Mai0313/ghost_ai/graphs/contributors)

Made with [contrib.rocks](https://contrib.rocks)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<center>

**Made with ❤️ for privacy-conscious developers**

_Ghost AI - Invisible AI-powered screenshot analysis_

</center>
