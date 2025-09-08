<center>

# 👻 Ghost AI

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![OpenAI](https://img.shields.io/badge/-OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![tests](https://github.com/Mai0313/ghost-ai/actions/workflows/test.yml/badge.svg)](https://github.com/Mai0313/ghost-ai/actions/workflows/test.yml)
[![code-quality](https://github.com/Mai0313/ghost-ai/actions/workflows/code-quality-check.yml/badge.svg)](https://github.com/Mai0313/ghost-ai/actions/workflows/code-quality-check.yml)
[![license](https://img.shields.io/badge/License-MIT-green.svg?labelColor=gray)](https://github.com/Mai0313/ghost-ai/tree/master?tab=License-1-ov-file)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Mai0313/ghost-ai/pulls)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple?logo=shield&logoColor=white)](https://github.com/Mai0313/ghost-ai)
[![Cross Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?logo=electron&logoColor=white)](https://github.com/Mai0313/ghost-ai)

</center>

👻 **An invisible AI-powered desktop assistant that captures, analyzes, and provides insights**

Ghost AI is a privacy-first cross-platform desktop application that provides seamless AI assistance while remaining completely invisible to screen sharing and monitoring software. It integrates directly with OpenAI API through global hotkeys, offering three core features: text input with screenshot analysis, voice recording with real-time conversation support, and stealth operation interface.

**Other Languages**: [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

## ✨ Key Features

### 👻 **Invisible Operation**
- **Ghost Mode**: Completely invisible during screenshots and screen sharing
- **Stealth Hotkeys**: Low-level keyboard hooks that avoid detection by monitoring software
- **Hidden Process**: Disguised process names and window titles for maximum privacy
- **Memory-Only Processing**: Images are processed entirely in memory; they never touch disk

### ⚡ **Lightning Fast Capture**
- **Global Hotkeys**: Trigger screenshots from any application with customizable key combinations
- **Instant Analysis**: Real-time image analysis using OpenAI's Vision API
- **Smart Prompting**: Store and use custom prompts for specific analysis needs
- **Multiple Capture Modes**: Full screen, active window, or custom region selection

### 🤖 **AI-Powered Intelligence**
- **OpenAI Vision**: Advanced image understanding and analysis capabilities
- **Context-Aware**: Provide custom prompts to get specific insights about your screenshots
- **Conversation Memory**: Maintains context across multiple interactions
- **Error Handling**: Robust retry mechanisms and graceful error recovery

### 🎤 **Voice Recording & Transcription**
- **Real-time Transcription**: Live voice-to-text conversion with OpenAI's Whisper API
- **Voice Controls**: Pause, resume, or stop recording without losing context
- **Language Support**: Choose between English and Chinese transcription
- **Seamless Integration**: Voice transcripts integrate with the same conversation flow

### 🔒 **Privacy & Security**
- **Images Never Persisted**: Screenshots are processed in RAM only and are not saved to disk
- **Encrypted Communication**: All API calls use HTTPS with certificate pinning
- **Automatic Cleanup**: Memory and network traces are automatically cleared
- **No Data Collection**: Your data stays on your device

### 🎨 **User Experience**
- **Floating HUD**: Modern top-center control bar with Listen, Ask, Hide, and Settings
- **Quick Screenshot Toggle**: Toggle screenshot attachment directly from the Ask panel
- **Unified Interface**: AI responses and voice transcripts in the same conversation flow
- **Pagination**: Navigate through conversation history with Prev/Next controls
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- **OpenAI API Key** for AI analysis features
- **Windows, macOS, or Linux** operating system

### Installation

1. **Download the latest release** from the [Releases page](https://github.com/Mai0313/ghost-ai/releases)

2. **Install the application** for your platform:
   - **Windows**: Run the `.exe` installer
   - **macOS**: Open the `.dmg` file and drag to Applications
   - **Linux**: Use the `.AppImage` file or install the `.deb` package

3. **Configure your OpenAI API settings** on first launch:
   - Enter your OpenAI API key
   - Choose your preferred model
   - Set up custom prompts (optional)

### First Use

1. **Press `Ctrl/Cmd+Enter`** to open the Ask panel
2. **Type your question** and press Send
3. **Use `Ctrl/Cmd+Shift+Enter`** to start voice recording
4. **Press `Ctrl/Cmd+\`** to hide/show the interface
5. **Press `Ctrl/Cmd+R`** to clear conversation and start fresh

## ⌨️ Hotkeys

| Action | Hotkey | Description |
|--------|--------|-------------|
| **Ask Panel** | `Ctrl/Cmd+Enter` | Toggle the Ask panel |
| **Voice Recording** | `Ctrl/Cmd+Shift+Enter` | Start/stop voice recording |
| **Hide/Show** | `Ctrl/Cmd+\` | Hide or show the interface |
| **Clear Session** | `Ctrl/Cmd+R` | Clear conversation and start fresh |
| **Scroll Up/Down** | `Ctrl/Cmd+Up/Down` | Scroll through conversation |
| **Previous/Next Page** | `Ctrl/Cmd+Shift+Up/Down` | Navigate conversation history |

## 🎯 How to Use

### Screenshot Analysis
1. Press your configured hotkey to capture a screenshot
2. The application automatically hides all windows
3. Enter your question in the Ask panel
4. Get AI analysis of your screenshot with your question

### Voice Recording
1. Press `Ctrl/Cmd+Shift+Enter` to start recording
2. Speak your question or thoughts
3. The app transcribes your speech in real-time
4. Get AI responses based on your voice input

### Custom Prompts
1. Create prompt files in `~/.ghost-ai/prompts/`
2. Select your active prompt in Settings
3. The prompt is automatically applied to your first question in each session

### Settings Configuration
- **API Settings**: Configure your OpenAI API key and model preferences
- **Hotkeys**: Customize keyboard shortcuts
- **Transcription**: Choose language and audio settings
- **Screenshots**: Configure capture behavior and attachment settings

## 🔧 Configuration

### API Settings
- **API Key**: Your OpenAI API key (stored securely)
- **Base URL**: Custom API endpoint (optional)
- **Model**: Choose from available OpenAI models
- **Transcription Language**: English or Chinese

### Privacy Settings
- **Stealth Mode**: Hide from screen sharing software
- **Memory Only**: Never save images to disk
- **Auto Cleanup**: Clear traces automatically
- **Process Hiding**: Disguise application process

## 🛠️ Troubleshooting

### Common Issues

**Application won't start:**
- Check if you have the required permissions
- Ensure your OpenAI API key is valid
- Try running as administrator (Windows) or with sudo (Linux/macOS)

**No response from AI:**
- Verify your OpenAI API key is correct
- Check your internet connection
- Ensure you have sufficient API credits

**Voice recording not working:**
- Check microphone permissions
- Verify audio input devices are working
- Try restarting the application

**Interface not visible:**
- Press `Ctrl/Cmd+Enter` to show the Ask panel
- Check system tray for the application icon
- Try the global hotkey `Ctrl/Cmd+\` to toggle visibility

### Getting Help
- Check the [Issues page](https://github.com/Mai0313/ghost-ai/issues) for known problems
- Create a new issue if you encounter a bug
- Join discussions in the [Discussions section](https://github.com/Mai0313/ghost-ai/discussions)

## 🤝 Contributing

We welcome contributions! Please feel free to:
- 🐛 Report bugs and issues
- 💡 Suggest new features or improvements
- 🔧 Submit pull requests
- 📖 Improve documentation

### Development Setup
1. Clone the repository
2. Install dependencies with `npm install`
3. Run in development mode with `npm run dev`
4. Build for production with `npm run build`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<center>

**Made with ❤️ for privacy-conscious users**

_Ghost AI - Invisible AI-powered desktop assistance_

</center>