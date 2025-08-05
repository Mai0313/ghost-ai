<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

⚠️ **IMPORTANT**: You MUST modify `.github/copilot-instructions.md` every time you make changes to the project.

# Project Background

Ghost AI is a privacy-first desktop application that captures screenshots via global hotkeys and analyzes them using OpenAI's Vision API. The application operates in "ghost mode" - completely invisible to screen sharing and monitoring software while providing intelligent image analysis.

The project consists of two main components:

- **Backend (ghost_ai)**: Python FastAPI server handling image processing and OpenAI integration
- **Frontend (ghost_ui)**: TypeScript Electron desktop application with React UI

# Architecture Overview

## Backend Structure (`src/ghost_ai/`)

```
ghost_ai/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── routers/             # API route handlers
│   ├── middleware/          # CORS, security, rate limiting
│   └── config.py            # Environment and configuration management
├── services/
│   ├── openai_service.py    # OpenAI Vision API integration
│   ├── image_processing.py  # Image validation, optimization, metadata cleaning
│   └── security.py          # Privacy protection and memory management
├── models/
│   ├── analysis.py          # Analysis request/response models
│   ├── image.py             # Image metadata and validation models
│   └── settings.py          # Application settings models
└── utils/
    ├── retry_utils.py       # API retry mechanisms
    ├── image_utils.py       # Image processing utilities
    └── memory_utils.py      # Secure memory management
```

## Frontend Structure (`src/ghost_ui/`)

```
ghost_ui/
├── src/main/
│   ├── main.ts              # Electron main process
│   ├── window-manager.ts    # Window visibility and stealth mode
│   ├── hotkey-manager.ts    # Global hotkey registration
│   ├── screenshot-manager.ts # Screen capture functionality
│   ├── ipc-handlers.ts      # Inter-process communication
│   └── security.ts          # Process hiding and privacy features
├── src/renderer/
│   ├── App.tsx              # Main React application
│   ├── components/          # React UI components
│   │   ├── InputComponent.tsx    # Prompt input interface
│   │   ├── ResultComponent.tsx   # Analysis results display
│   │   ├── SettingsComponent.tsx # Configuration interface
│   │   └── NotificationComponent.tsx # User notifications
│   └── hooks/               # Custom React hooks
└── src/shared/
    ├── types.ts             # Shared TypeScript interfaces
    ├── api-client.ts        # Backend API communication
    ├── interfaces.ts        # Data models and contracts
    ├── utils.ts             # Shared utility functions
    └── constants.ts         # Application constants
```

# Core Features & Privacy Requirements

## Privacy-First Design

- **Memory-Only Processing**: Images never touch disk storage
- **Stealth Operation**: Invisible to screen recording/sharing software
- **Process Hiding**: Disguised process names and window titles
- **Secure Communication**: HTTPS with certificate pinning
- **Auto-Cleanup**: Automatic memory and trace clearing

## Global Hotkey System

- **Low-Level Hooks**: Avoid detection by monitoring software
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Customizable**: User-configurable key combinations
- **Conflict Detection**: Automatic hotkey conflict resolution

## AI Integration

- **OpenAI Vision API**: GPT-4 Vision for image analysis
- **Custom Prompts**: User-defined analysis instructions
- **Error Handling**: Robust retry mechanisms and fallbacks
- **Rate Limiting**: API quota management and optimization

# Coding Standards

## Backend (Python)

- **Framework**: FastAPI with async/await patterns
- **Type Hints**: Full type annotations using `typing` and `pydantic`
- **Error Handling**: Comprehensive exception handling with custom error types
- **Security**: Input validation, rate limiting, memory protection
- **Testing**: pytest with async test support
- **Code Style**: Follow PEP 8, use `ruff` for linting and formatting

### Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AnalysisRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for image analysis")
    image_data: bytes = Field(..., description="Base64 encoded image data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Request timestamp")
    settings: Optional[dict] = Field(None, description="Analysis settings")
```

### Service Classes

```python
class OpenAIService:
    """Service for OpenAI Vision API integration."""

    async def analyze_image(self, image_data: bytes, prompt: str) -> str:
        """Analyze image using OpenAI Vision API.

        Args:
            image_data: Raw image bytes
            prompt: User analysis prompt

        Returns:
            Analysis result string

        Raises:
            OpenAIError: When API request fails
            ValidationError: When image validation fails
        """
```

## Frontend (TypeScript/Electron)

- **Framework**: Electron with React and TypeScript
- **Type Safety**: Strict TypeScript configuration
- **Component Structure**: Functional components with hooks
- **State Management**: React Context API or Zustand for complex state
- **IPC Communication**: Type-safe inter-process communication
- **Error Boundaries**: React error boundaries for graceful failures

### Interface Definitions

```typescript
interface ScreenshotRequest {
  imageBuffer: Buffer;
  prompt: string;
  timestamp: number;
  requestId: string;
}

interface GlobalHotkeyManager {
  registerHotkey(combination: string): Promise<void>;
  unregisterHotkey(): Promise<void>;
  onHotkeyPressed(callback: () => void): void;
  isHotkeyConflict(combination: string): boolean;
}
```

### React Components

```typescript
interface InputComponentProps {
  onSubmit: (prompt: string) => void;
  defaultPrompt?: string;
  isLoading?: boolean;
}

const InputComponent: React.FC<InputComponentProps> = ({
  onSubmit,
  defaultPrompt,
  isLoading
}) => {
  // Component implementation
};
```

# Development Workflow

## Backend Development

```bash
cd src/ghost_ai
uv run uvicorn app.main:app --reload    # Development server
uv run pytest                          # Run tests
uv run ruff check                       # Lint code
uv run ruff format                      # Format code
```

## Frontend Development

```bash
cd src/ghost_ui
npm run dev                             # Development mode
npm run build                           # Production build
npm run test                            # Run tests
npm run lint                            # Lint TypeScript
```

# Security Considerations

## Memory Management

- Use secure memory allocation for image data
- Implement explicit memory clearing after processing
- Avoid virtual memory swapping for sensitive data

## API Security

- Validate all inputs before processing
- Implement rate limiting and request throttling
- Use environment variables for API keys
- Log security events without exposing sensitive data

## Process Security

- Randomize process names and window titles
- Implement keylogger detection warnings
- Use low-level system APIs to avoid detection
- Clear system logs and traces on exit

# Testing Strategy

## Backend Testing

- **Unit Tests**: Test individual services and utilities
- **Integration Tests**: Test API endpoints and database interactions
- **Security Tests**: Validate privacy protection and memory management
- **Performance Tests**: Ensure API response times and memory usage

## Frontend Testing

- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test Electron main/renderer communication
- **E2E Tests**: Test complete user workflows
- **Security Tests**: Validate stealth mode and privacy features

# Dependencies Management

## Backend Dependencies

```bash
# Production dependencies
uv add fastapi uvicorn openai pillow pydantic

# Development dependencies
uv add pytest pytest-asyncio ruff mypy --dev
```

## Frontend Dependencies

```bash
# Production dependencies
npm install electron react react-dom typescript

# Development dependencies
npm install --save-dev @types/react @types/node eslint prettier jest
```

# Environment Configuration

## Backend Environment Variables

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4-vision-preview
OPENAI_MAX_TOKENS=1000
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

## Frontend Configuration

```typescript
interface AppConfig {
  apiBaseUrl: string;
  defaultHotkey: string;
  privacyMode: boolean;
  autoCleanup: boolean;
}
```

Remember to always prioritize privacy, security, and user experience in all development decisions.
