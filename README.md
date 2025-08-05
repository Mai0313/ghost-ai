<center>

# 👻 Ghost AI

[![Python](https://img.shields.io/badge/-Python_3.10_%7C_3.11_%7C_3.12-blue?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/-OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![uv](https://img.shields.io/badge/-uv_dependency_management-2C5F2D?logo=python&logoColor=white)](https://docs.astral.sh/uv/)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![tests](https://github.com/Mai0313/ghost_ai/actions/workflows/test.yml/badge.svg)](https://github.com/Mai0313/ghost_ai/actions/workflows/test.yml)
[![code-quality](https://github.com/Mai0313/ghost_ai/actions/workflows/code-quality-check.yml/badge.svg)](https://github.com/Mai0313/ghost_ai/actions/workflows/code-quality-check.yml)
[![license](https://img.shields.io/badge/License-MIT-green.svg?labelColor=gray)](https://github.com/Mai0313/ghost_ai/tree/master?tab=License-1-ov-file)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Mai0313/ghost_ai/pulls)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple?logo=shield&logoColor=white)](https://github.com/Mai0313/ghost_ai)
[![Cross Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?logo=electron&logoColor=white)](https://github.com/Mai0313/ghost_ai)

</center>

👻 **An invisible AI-powered screenshot analyzer that captures, analyzes, and provides insights without leaving a trace**

Ghost AI is a privacy-first desktop application that allows you to capture screenshots with a global hotkey, analyze them using OpenAI's Vision API, and get intelligent responses - all while remaining completely invisible to screen sharing and other monitoring software.

**Other Languages**: [English](README.md) | [繁體中文](README_cn.md)

## ✨ Features

### 👻 **Invisible Operation**

- **Ghost Mode**: Completely invisible during screenshots and screen sharing
- **Stealth Hotkeys**: Low-level keyboard hooks that avoid detection by monitoring software
- **Hidden Process**: Disguised process names and window titles for maximum privacy
- **Memory-Only Processing**: No traces left on disk - all image processing happens in memory

### ⚡ **Lightning Fast Capture**

- **Global Hotkeys**: Trigger screenshots from any application with customizable key combinations
- **Instant Analysis**: Real-time image analysis using OpenAI's Vision API
- **Smart Prompting**: Add custom prompts or use intelligent defaults for context-aware analysis
- **Multiple Capture Modes**: Full screen, active window, or custom region selection

### 🤖 **AI-Powered Intelligence**

- **OpenAI Vision**: Advanced image understanding and analysis capabilities
- **Context-Aware**: Provide custom prompts to get specific insights about your screenshots
- **Error Handling**: Robust retry mechanisms and graceful error recovery
- **Rate Limiting**: Built-in API quota management and request optimization

### 🔒 **Privacy & Security**

- **Zero Persistence**: Images never touch the disk - processed entirely in memory
- **Encrypted Communication**: All API calls use HTTPS with certificate pinning
- **Keylogger Detection**: Warns users about potential privacy risks from monitoring software
- **Automatic Cleanup**: Memory and network traces are automatically cleared

### 🎨 **User Experience**

- **Clean Interface**: Minimalist UI that appears only when needed
- **Customizable Settings**: Personalize hotkeys, default prompts, and behavior
- **Copy & Share**: Easy copying of analysis results and original screenshots
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

### 🏗️ **Modern Architecture**

- **Frontend**: TypeScript + Electron for cross-platform desktop experience
- **Backend**: Python + FastAPI for high-performance API processing
- **Separation of Concerns**: Clean architecture with `ghost_ui` and `ghost_ai` modules
- **Type Safety**: Full TypeScript and Python type annotations

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** for the backend API
- **Node.js 18+** for the Electron frontend
- **OpenAI API Key** for image analysis

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/Mai0313/ghost_ai.git
    cd ghost_ai
    ```

2. **Set up the backend (ghost_ai)**

    ```bash
    # Install uv if not already installed
    make uv-install

    # Install Python dependencies
    cd src/ghost_ai
    uv sync

    # Set up environment variables
    cp .env.example .env
    # Edit .env and add your OpenAI API key
    ```

3. **Set up the frontend (ghost_ui)**

    ```bash
    cd src/ghost_ui
    npm install
    ```

4. **Configure your OpenAI API key**

    ```bash
    # In src/ghost_ai/.env
    OPENAI_API_KEY=your_api_key_here
    ```

### Running the Application

1. **Start the backend API**

    ```bash
    cd src/ghost_ai
    uv run uvicorn app.main:app --reload --port 8000
    ```

2. **Start the frontend application**

    ```bash
    cd src/ghost_ui
    npm run dev
    ```

3. **Set up your hotkey** (default: `Ctrl+Shift+S`)

    - The application will register a global hotkey on startup
    - Press the hotkey from any application to capture and analyze screenshots

### First Use

1. Press your configured hotkey to capture a screenshot
2. Enter a prompt describing what you want to know about the image
3. Wait for AI analysis and view the results
4. Copy the results or take another screenshot

## 📁 Project Structure

```
├── .devcontainer/          # VS Code Dev Container configuration
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── copilot-instructions.md
├── .kiro/
│   └── specs/ghost-ai/     # Project specifications and requirements
├── docker/                 # Docker configurations
├── docs/                   # MkDocs documentation
├── scripts/                # Automation scripts
├── src/
│   ├── ghost_ai/          # Backend Python API
│   │   ├── app/           # FastAPI application
│   │   ├── services/      # Business logic services
│   │   ├── models/        # Data models
│   │   └── utils/         # Utility functions
│   └── ghost_ui/          # Frontend Electron app
│       ├── src/main/      # Electron main process
│       ├── src/renderer/  # React renderer process
│       └── src/shared/    # Shared utilities
├── tests/                  # Test suite
├── pyproject.toml          # Python project configuration
├── Makefile               # Development commands
└── README.md
```

## 🛠️ Available Commands

### Backend (ghost_ai)

```bash
# Development
cd src/ghost_ai
uv run uvicorn app.main:app --reload    # Start development server
uv run pytest                          # Run Python tests
uv run ruff check                       # Lint Python code
uv run ruff format                      # Format Python code

# Dependencies
uv add <package>                        # Add production dependency
uv add <package> --dev                  # Add development dependency
```

### Frontend (ghost_ui)

```bash
# Development
cd src/ghost_ui
npm run dev                             # Start development mode
npm run build                           # Build for production
npm run test                            # Run TypeScript tests
npm run lint                            # Lint TypeScript code

# Dependencies
npm install <package>                   # Add dependency
npm install <package> --save-dev        # Add dev dependency
```

### Global Commands

```bash
# Project management
make clean                              # Clean autogenerated files
make format                             # Run pre-commit hooks
make test                               # Run all tests
make gen-docs                           # Generate documentation
make uv-install                         # Install uv dependency manager
```

## 🎯 How It Works

### Capture Flow

1. **Hotkey Trigger**: Press your configured global hotkey (e.g., `Ctrl+Shift+S`)
2. **Invisible Mode**: Application immediately hides all windows
3. **Screenshot Capture**: System captures the current screen to memory
4. **Prompt Input**: UI appears for you to enter analysis instructions
5. **AI Analysis**: Image and prompt sent to OpenAI Vision API
6. **Results Display**: Analysis results shown in a clean interface
7. **Memory Cleanup**: All traces automatically cleared from memory

### Privacy Protection

- **No Disk Storage**: Screenshots never saved to disk
- **Memory Processing**: All image data processed in RAM only
- **Stealth Operation**: Invisible to screen recording and sharing
- **Secure Communication**: Encrypted API calls with certificate pinning
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
const defaultHotkey = "CommandOrControl+Shift+S";

// Custom hotkey examples:
// "CommandOrControl+Alt+G"     // Ctrl+Alt+G (Windows/Linux) or Cmd+Alt+G (macOS)
// "CommandOrControl+Shift+A"   // Ctrl+Shift+A (Windows/Linux) or Cmd+Shift+A (macOS)
// "F12"                        // Function key F12
```

### API Configuration

Configure your OpenAI API settings:

```bash
# src/ghost_ai/.env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4-vision-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### Privacy Settings

Customize privacy and security options:

```typescript
interface PrivacySettings {
  stealthMode: boolean;           // Hide from screen sharing
  memoryOnly: boolean;            // Never save to disk
  autoCleanup: boolean;           // Auto-clear memory traces
  processHiding: boolean;         // Disguise process names
  keyloggerDetection: boolean;    // Warn about monitoring software
}
```

### Default Prompts

Set up default analysis prompts:

```typescript
const defaultPrompts = {
  general: "Describe what you see in this image",
  code: "Explain the code shown in this screenshot",
  ui: "Analyze the user interface design and suggest improvements",
  error: "Help me understand and fix this error message",
  text: "Extract and format the text from this image"
};
```

## 🔧 Development

### Setting Up Development Environment

1. **Install dependencies**

    ```bash
    # Backend
    cd src/ghost_ai && uv sync

    # Frontend
    cd src/ghost_ui && npm install
    ```

2. **Run in development mode**

    ```bash
    # Terminal 1: Start backend
    cd src/ghost_ai && uv run uvicorn app.main:app --reload

    # Terminal 2: Start frontend
    cd src/ghost_ui && npm run dev
    ```

3. **Run tests**

    ```bash
    # Backend tests
    cd src/ghost_ai && uv run pytest

    # Frontend tests
    cd src/ghost_ui && npm test
    ```

### Building for Production

```bash
# Build backend
cd src/ghost_ai && uv build

# Build frontend
cd src/ghost_ui && npm run build
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

*Ghost AI - Invisible AI-powered screenshot analysis*

</center>
