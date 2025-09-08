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

👻 **一个隐形的 AI 驱动桌面助手，能够捕获、分析并提供洞察**

Ghost AI 是一个隐私优先的跨平台桌面应用程序，通过全局热键直接整合 OpenAI API，提供无缝的 AI 辅助体验，同时对屏幕分享和监控软件完全隐形。它提供三个核心功能：文本输入与屏幕截图分析、语音录音与实时对话支持、以及隐蔽式操作界面。

**其他语言版本**: [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

## ✨ 主要功能

### 👻 **隐形操作**
- **幽灵模式**: 在截图和屏幕分享时完全隐形
- **隐蔽热键**: 使用低层级键盘钩子避免被监控软件侦测
- **隐藏进程**: 伪装进程名称和窗口标题以获得最大隐私保护
- **内存处理**: 图片仅在 RAM 中处理，不会写入磁盘

### ⚡ **闪电般快速捕获**
- **全局热键**: 通过可自定义的按键组合从任何应用程序触发截图
- **实时分析**: 使用 OpenAI Vision API 进行实时图片分析
- **智能提示词**: 存储和使用自定义提示词进行特定分析
- **多种捕获模式**: 全屏幕、活动窗口或自定义区域选择

### 🤖 **AI 驱动智能**
- **OpenAI Vision**: 先进的图片理解和分析能力
- **情境感知**: 提供自定义提示以获得关于截图的特定洞察
- **对话记忆**: 在多次交互中保持上下文
- **错误处理**: 强健的重试机制和优雅的错误恢复

### 🎤 **语音录音与转录**
- **实时转录**: 使用 OpenAI 的 Whisper API 进行实时语音转文字
- **语音控制**: 暂停、恢复或停止录音而不丢失上下文
- **语言支持**: 选择英文或中文转录
- **无缝整合**: 语音转录与同一对话流程整合

### 🔒 **隐私与安全**
- **图片不持久化**: 截图仅在 RAM 中处理，不会写入磁盘
- **加密通讯**: 所有 API 调用使用 HTTPS 和证书固定
- **自动清理**: 内存和网络痕迹自动清除
- **无数据收集**: 您的数据保留在您的设备上

### 🎨 **用户体验**
- **浮动控制栏**: 屏幕上方置中的现代 HUD，含 Listen、Ask、Hide、Settings
- **快速截图切换**: 在 Ask 面板直接切换截图附加功能
- **统一界面**: AI 回应和语音转录在同一对话流程中
- **分页导航**: 通过上一页/下一页控制浏览对话历史
- **跨平台**: 在 Windows、macOS 和 Linux 上无缝运作

## 🚀 快速开始

### 系统需求
- **OpenAI API 密钥** 用于 AI 分析功能
- **Windows、macOS 或 Linux** 操作系统

### 安装步骤

1. **下载最新版本** 从 [发布页面](https://github.com/Mai0313/ghost-ai/releases)

2. **安装应用程序** 根据您的平台：
   - **Windows**: 运行 `.exe` 安装程序
   - **macOS**: 打开 `.dmg` 文件并拖拽到应用程序文件夹
   - **Linux**: 使用 `.AppImage` 文件或安装 `.deb` 包

3. **配置您的 OpenAI API 设置** 首次启动时：
   - 输入您的 OpenAI API 密钥
   - 选择您偏好的模型
   - 设置自定义提示词（可选）

### 首次使用

1. **按下 `Ctrl/Cmd+Enter`** 打开 Ask 面板
2. **输入您的问题** 然后按发送
3. **使用 `Ctrl/Cmd+Shift+Enter`** 开始语音录音
4. **按下 `Ctrl/Cmd+\`** 隐藏/显示界面
5. **按下 `Ctrl/Cmd+R`** 清除对话并重新开始

## ⌨️ 热键

| 操作 | 热键 | 描述 |
|------|------|------|
| **Ask 面板** | `Ctrl/Cmd+Enter` | 切换 Ask 面板 |
| **语音录音** | `Ctrl/Cmd+Shift+Enter` | 开始/停止语音录音 |
| **隐藏/显示** | `Ctrl/Cmd+\` | 隐藏或显示界面 |
| **清除会话** | `Ctrl/Cmd+R` | 清除对话并重新开始 |
| **向上/向下滚动** | `Ctrl/Cmd+Up/Down` | 滚动对话内容 |
| **上一页/下一页** | `Ctrl/Cmd+Shift+Up/Down` | 浏览对话历史 |

## 🎯 使用方法

### 截图分析
1. 按下您配置的热键来捕获截图
2. 应用程序自动隐藏所有窗口
3. 在 Ask 面板中输入您的问题
4. 获得基于您问题的截图 AI 分析

### 语音录音
1. 按下 `Ctrl/Cmd+Shift+Enter` 开始录音
2. 说出您的问题或想法
3. 应用程序实时转录您的语音
4. 基于您的语音输入获得 AI 回应

### 自定义提示词
1. 在 `~/.ghost-ai/prompts/` 中创建提示词文件
2. 在设置中选择您的活动提示词
3. 提示词会自动应用到每个会话的第一个问题

### 设置配置
- **API 设置**: 配置您的 OpenAI API 密钥和模型偏好
- **热键**: 自定义键盘快捷键
- **转录**: 选择语言和音频设置
- **截图**: 配置捕获行为和附加设置

## 🔧 配置

### API 设置
- **API 密钥**: 您的 OpenAI API 密钥（安全存储）
- **基础 URL**: 自定义 API 端点（可选）
- **模型**: 从可用的 OpenAI 模型中选择
- **转录语言**: 英文或中文

### 隐私设置
- **隐蔽模式**: 对屏幕分享软件隐形
- **仅内存**: 永不将图片保存到磁盘
- **自动清理**: 自动清除痕迹
- **进程隐藏**: 伪装应用程序进程

## 🛠️ 疑难排解

### 常见问题

**应用程序无法启动:**
- 检查您是否有必要的权限
- 确保您的 OpenAI API 密钥有效
- 尝试以管理员身份运行（Windows）或使用 sudo（Linux/macOS）

**AI 无回应:**
- 验证您的 OpenAI API 密钥是否正确
- 检查您的网络连接
- 确保您有足够的 API 额度

**语音录音不工作:**
- 检查麦克风权限
- 验证音频输入设备是否正常工作
- 尝试重启应用程序

**界面不可见:**
- 按下 `Ctrl/Cmd+Enter` 显示 Ask 面板
- 检查系统托盘中的应用程序图标
- 尝试全局热键 `Ctrl/Cmd+\` 切换可见性

### 获取帮助
- 查看 [问题页面](https://github.com/Mai0313/ghost-ai/issues) 了解已知问题
- 如果遇到错误，请创建新问题
- 在 [讨论区](https://github.com/Mai0313/ghost-ai/discussions) 参与讨论

## 🤝 贡献

我们欢迎贡献！请随时：
- 🐛 回报错误和问题
- 💡 建议新功能或改进
- 🔧 提交拉取请求
- 📖 改进文档

### 开发设置
1. 克隆存储库
2. 使用 `npm install` 安装依赖
3. 使用 `npm run dev` 在开发模式下运行
4. 使用 `npm run build` 构建生产版本

## 📄 授权

本项目采用 MIT 授权 - 详见 [LICENSE](LICENSE) 文件。

---

<center>

**为注重隐私的用户而制作 ❤️**

_Ghost AI - 隐形的 AI 驱动桌面辅助_

</center>