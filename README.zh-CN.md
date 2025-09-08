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

Ghost AI 是一个基于 Electron 和 TypeScript 的隐私优先跨平台桌面应用程序。提供三个核心功能：文本输入与屏幕截图分析、语音录音与实时对话支持、以及隐蔽式操作界面。系统通过全局热键直接整合 OpenAI API，所有 API 设置都可通过前端界面配置，提供无缝的 AI 辅助体验，同时对屏幕分享和监控软件完全隐形。

**其他语言版本**: [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> ID 模型已简化
>
> - sessionId：单一会话标识（UUID）。所有分析/转写事件一律附带。
> - requestId：单次流式请求标识。
> - requestSessionId：请求开始时对 sessionId 的快照（内部用，避免与清除操作竞争）。
> - 已移除：OpenAI Conversations 相关辅助（createConversation、retrieveConversationItems）。

## ✨ 功能特色

### 👻 **隐形操作**

- **幽灵模式**: 在截图和屏幕分享时完全隐形
- **隐蔽热键**: 使用低层级键盘钩子避免被监控软件侦测
- **隐藏进程**: 伪装进程名称和窗口标题以获得最大隐私保护
- **图片仅在内存处理**: 图片仅在 RAM 中处理，不会写入磁盘。纯文本 Q/A 对话在每次请求完成后，会写入 `~/.ghost-ai/logs/<sessionId>/<sessionId>.log` 以便调试/查看。

### ⚡ **闪电般快速捕获**

- **全局热键**: 通过可自定义的按键组合从任何应用程序触发截图
- **实时分析**: 使用 OpenAI Vision API 进行实时图片分析
- **智能提示词**: 提示词文件存放于 `~/.ghost-ai/prompts`，启用的提示词名称会持久化保存于设置并自动应用（内容编辑请于文件系统中操作）
- **多种捕获模式**: 全屏幕、活动窗口或自定义区域选择

### 🤖 **AI 驱动智能**

- **OpenAI Vision**: 先进的图片理解和分析能力
- **情境感知**: 提供自定义提示以获得关于截图的特定洞察
- **错误处理**: 强健的重试机制和优雅的错误恢复
- **速率限制**: 内置 API 配额管理和请求优化
- **简易对话记忆**：以「每个会话」为单位在主程序中维持纯文本 Q/A 历史，用于提示组合；每次请求完成后，会将目前该会话的对话文字写入 `~/.ghost-ai/logs/<sessionId>/<sessionId>.log`。
- **默认提示词仅首轮注入**：每个会话（session）的第一轮才会注入 `~/.ghost-ai/prompts/default.txt` 的内容；后续各轮只会带上您的新问题与纯文本对话历史。进行 Regenerate 时，会保留首轮的提示词于「先前对话」内容中。

### 🔒 **隐私与安全**

- **图片不持久化**: 截图仅在 RAM 中处理，不会写入磁盘
- **对话日志**: 为方便调试，应用会在每次分析请求完成后，将目前纯文本 Q/A 对话写入 `~/.ghost-ai/logs/<sessionId>/<sessionId>.log`；同时会输出 `~/.ghost-ai/logs/<sessionId>/<sessionId>.json`，包含每笔送出的 `{ index, requestId, log_path, text_input, ai_output }`。此修复确保新 session 会正确建立新的日志路径，而不会与先前的 session 混合。被中断的对话（通过 Ctrl+R）不会写入日志，以避免竞争条件问题。
- **加密通讯**: 所有 API 调用使用 HTTPS 和证书固定
- **键盘记录器侦测**: 警告用户监控软件的潜在隐私风险
- **自动清理**: 内存和网络痕迹自动清除

### 🎨 **用户体验**

- **浮动控制栏**: 屏幕上方置中的现代 HUD（默认仅显示控制栏），含 Listen、Ask、Hide、Settings
- **快速截图切换**: 在 Ask 面板的输入框旁使用 📷 按钮直接切换截图附加功能，与设置页面实时同步
- **统一 Ask 卡片 + 分页（仅流式）**：AI 回应与输入框整合在同一张卡片中。在同一个会话中，历史回答会显示为分页，提供「上一页/下一页」按钮与页码（如 `2/5`）。流式期间你可以留在旧页面查看，随时点「下一页」回到「Live」观看实时输出。
- **统一渲染流程（回答与逐字稿一致）**：分析回应与实时语音转写都通过同一套渲染流程（追加/完成），在同一个回复区域一致呈现，行为与格式完全一致。逐字稿片段也会以 `{ user, assistant }` 形式加入与 AI 回答相同的分页历史（assistant 初始内容与逐字稿相同），可与 AI 回答一样翻页浏览。
- **Reasoning 显示**：若所选模型支持 reasoning，系统会「实时流式」显示较小、较透明的「Reasoning」区块，并放在「最终答案的上方」。支持事件类型包含 `response.reasoning_summary_text.delta/.done` 与 `response.reasoning_summary_part.added/.done`。
- **网络搜索指示**：当模型触发网络搜索（`response.web_search_call.in_progress/searching/completed`）时，回答区上方会显示「正在搜索网络…」的细微加载指示。
- **逐字稿页面可重生**：选中某一则逐字稿页面后点击 Regenerate，会以该逐字稿做为问题重新分析，并就地覆盖该页的 assistant 内容；原始逐字稿会保留在前一条 user 消息中以供上下文使用。
- **完成后可重生 (Regenerate)**：当某一页的回答输出完毕，会显示「Regenerate」按钮。点击后会以「该页的原始问题 + 之前（不包含该页）的所有对话」作为上下文重新请求，并就地覆盖该页的回答，不会新增新页面。
- **优雅的验证反馈**：API 设置测试以图标和颜色编码的通知提供清晰的视觉反馈
  - **固定热键（全部为全局）**: Ask = Cmd/Ctrl+Enter，语音切换 = Cmd/Ctrl+Shift+Enter（实时文字转写），切换隐藏 = Cmd/Ctrl+\\，清除对话 = Cmd/Ctrl+R（同时重置语音状态），向上/向下滚动 = Cmd/Ctrl+Up/Down，上一页/下一页（分页）= Cmd/Ctrl+Shift+Up/Down（无论通过 HUD 的 Hide 按钮或热键隐藏，都可以再按热键重新显示）
  - **Listen 控制**：录音进行时可「暂停/恢复」实时逐字稿（不中断连线），或按「停止」结束录音。
- **内嵌错误提示**: 发生错误时，会在原本显示 AI 回答的泡泡中显示 `Error: ...`，可立即重试
- **快速清除 / 中断**: 任何时刻按下 Cmd/Ctrl+R，都会立刻中断正在进行的 AI 回答、清除 Ask 泡泡与对话记录，并立即重新开始一个全新的会话（session）
- **低摩擦输入**: 输入问题即可分析；系统会自动应用启用的提示词
- **可自定义设置**: 个性化热键、默认提示和行为
- **跨平台**: 在 Windows、macOS 和 Linux 上无缝运作
- **边缘友好的覆盖层**：覆盖层默认为全屏幕且可点击穿透；只有当鼠标悬停在 HUD 或泡泡上时才会接收鼠标事件，避免「透明窗口挡住」的情况，让控制栏可拖到最上/下缘。
- **滚动条样式**：AI 回答区使用与面板风格一致的薄型圆角滚动条，可在 `src/styles/blocknote-custom.css` 进一步调整。

## 提示词目录（只读）

- 应用只会从 `~/.ghost-ai/prompts` 读取提示词，不会写入或覆盖任何文件。
- 启用中的提示词名称会保存于设置；不再使用 `default.txt` 作为默认回退。请务必在 Settings → Prompts 中选择一个提示词。
- 若 `default.txt` 不存在，首次执行会自动建立为空档。
- 建立或编辑提示词请直接在文件系统中操作（例如 `general.txt`, `ui-review.md`）。

### 🏗️ **现代化架构**

- **纯前端应用程序**: 纯 Electron + TypeScript，无任何后端依赖
- **UI 框架**: React 提供响应式和现代化的用户界面
- **直接 API 整合**: OpenAI SDK 直接整合在主程序中
- **前端配置**: 所有 API 设置都可通过用户界面配置
- **类型安全**: 整个代码库完整的 TypeScript 类型注解
- **内存优先**: 所有处理都在内存中进行，不会持久化到磁盘

### 覆盖层点击穿透行为

- 主窗口为透明且无外框、无阴影的全屏幕覆盖层。
- 默认启用点击穿透，桌面与其他应用保持可互动。
- 当鼠标进入 HUD 或泡泡时，暂时关闭点击穿透以便点击/拖拽；离开后再恢复点击穿透。

## 🚀 快速开始

### 系统需求

- **Node.js 18+** 用于 Electron 应用程序
- **OpenAI API 密钥** 用于 AI 分析功能

### 安装步骤

1. **复制存储库**

   ```bash
   git clone https://github.com/Mai0313/ghost-ai.git
   cd ghost-ai
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置您的 OpenAI API 设置**

   应用程序首次执行时会提示您配置 OpenAI API 设置：
   - API 密钥
   - 基础 URL（可选，默认为 https://api.openai.com/v1）
   - 模型选择（在 Ask 面板和设置面板中都可使用）
   - 其他偏好设置

   所有设置都使用 Electron 内置加密功能安全存储。

### 执行应用程序

1. **以开发模式启动应用程序**

   ```bash
   npm run dev
   ```

2. **固定热键（全局）**
   - **Ask（切换 Ask 面板）**: `Cmd/Ctrl+Enter`（再按一次收合）
   - **语音（实时转写）**: `Cmd/Ctrl+Shift+Enter` — 捕获麦克风与（允许时）系统音频，客户端启用音频小批次聚合（约 220 ms 或 32 KB）以提升稳定性并维持低延迟。默认使用 `gpt-4o-mini-transcribe`。
   - **切换隐藏**: `Cmd/Ctrl+\\`（即使先用 HUD 的 Hide 隐藏，也可用此热键再显示）
   - **清除对话**: `Cmd/Ctrl+R`（同时停止录音并丢弃暂存音频）
   - **向上滚动**（Ask/逐字稿泡泡）: `Cmd/Ctrl+Up`
   - **向下滚动**（Ask/逐字稿泡泡）: `Cmd/Ctrl+Down`

3. **构建生产版本**

   ```bash
   npm run build
   ```

### 首次使用

1. 按下您配置的热键来捕获截图
2. 使用顶部控制栏切换 Ask 与 Settings
3. 输入问题后点击 Send（会自动应用启用的提示词）
4. 在回应泡泡查看结果。系统会以 Markdown 格式渲染回答；代码区块不再进行语法高亮显示。

## 📁 项目结构

```
├── .devcontainer/          # VS Code Dev Container 配置
├── .github/
│   ├── workflows/          # CI/CD 工作流程
│   └── copilot-instructions.md
├── .kiro/
│   └── specs/ghost-ai/     # 项目规格和需求
├── src/
│   ├── main/               # Electron 主进程
│   │   ├── hotkey-manager.ts    # 全局热键管理
│   │   ├── screenshot-manager.ts # 屏幕截图捕获
│   │   ├── audio-manager.ts     # 语音录音
│   │   └── hide-manager.ts      # 隐蔽界面
│   ├── renderer/           # React 渲染进程
│   │   ├── App.tsx               # 顶层 UI 状态与接线
│   │   ├── main.tsx              # 精简入口，仅渲染 <App />
│   │   ├── components/           # UI 组件（HUDBar、AskPanel、TranscriptBubble、MarkdownViewer、Settings、Icons）
│   │   ├── hooks/                # 自定义 Hook（useTranscription）
│   │   └── styles/               # 主题与样式
│   ├── shared/             # 共用工具
│   │   ├── openai-client.ts     # OpenAI API 整合
│   │   └── types.ts             # TypeScript 定义
│   └── services/           # 业务逻辑服务
├── tests/                  # 测试套件
├── package.json            # Node.js 项目配置
├── tsconfig.json           # TypeScript 配置
├── electron-builder.json   # Electron 打包配置
└── README.md
```

注：已移除未使用的服务文件 `src/services/audio-processor.ts`、`src/services/image-processor.ts`。

## 🛠️ 可用命令

### 开发命令

```bash
# 开发
npm run dev                             # 启动开发模式
npm run build                           # 构建生产版本
npm run test                            # 执行测试
npm run lint                            # 检查 TypeScript 代码
npm run format                          # 格式化代码

# 打包
    npm run dist                            # 构建并打包（electron-builder）
npm run dist:win                        # 打包 Windows 版本
npm run dist:win:portable               # 打包 Windows Portable（免安装单一 .exe）
npm run dist:mac                        # 打包 macOS 版本（DMG）
npm run dist:mac:zip                    # 打包 macOS 版本（ZIP）
npm run dist:linux                      # 打包 Linux 版本
npm run dist:linux:portable             # 打包 Linux Portable（AppImage）

# 依赖管理
npm install <package>                   # 添加依赖
npm install <package> --save-dev        # 添加开发依赖
```

### 打包

```bash
npm run dist   # 构建并打包当前平台
```

#### 各操作系统打包说明

- Windows：执行 `npm run dist:win`，会在 `release/` 产出 NSIS 安装程序（例如 `Ghost AI Setup <version>.exe`）。
- Windows（Portable）：执行 `npm run dist:win:portable`，会在 `release/` 产出免安装的单一 `.exe`（无安装程序、无须系统管理员权限）。适合随身碟/免安装情境。Portable 版本不支持自动更新。
- macOS：执行 `npm run dist:mac`（需在 macOS 上执行；DMG 与签章步骤需 macOS）。如需 ZIP 版，请执行 `npm run dist:mac:zip`。
- Linux：执行 `npm run dist:linux`（建议在 Linux 环境执行，会产出 AppImage 与 deb）。在 Windows 上可考虑使用 WSL2。若需免安装单档，请执行 `npm run dist:linux:portable`（AppImage）。
- 所有产物会输出到 `release/` 目录。脚本使用 `--publish never` 以避免意外上传。

### 应用程序图标

- Windows 安装程序与应用图标使用项目根目录的 `ghost.ico`。
- 如需更换图标，请以新的 `ghost.ico` 覆盖后重新打包：

```bash
npm run dist
```

## 🎯 运作原理

### 捕获流程

1. **热键触发**: 按下您配置的全局热键 (例如 `Ctrl+Shift+S`)
2. **隐形模式**: 应用程序立即隐藏所有窗口
3. **屏幕截图**: 系统将当前屏幕捕获到内存中
4. **提示输入**: UI 出现让您输入分析指令
5. **AI 分析**: 依据「Settings → Screenshots → Attach a screenshot with each Ask」设置：
   - 勾选时会附上屏幕截图，连同问题一起送出；
   - 取消勾选时不会进行截图，只送出您的问题。
     分析使用流式 Responses API 执行。
     **注意**：您也可以直接在 Ask 面板使用输入框旁的 📷 按钮切换此设置，两个位置的变更会实时同步。
6. **结果显示**: 回答以流式方式在输入框上方显示；若发生错误，会在同一泡泡显示 `Error: ...`，可立即重试。应用程序已全面改为流式流程，过去的非流式聊天路径已移除。
7. **内存清理**: 所有痕迹自动从内存中清除
8. **对话记忆**: 每次回答后会将 `Q:`/`A:` 内容附加到主进程的内存字符串；下一轮会连同新问题一并送出。此外，会把目前对话文字写入 `~/.ghost-ai/logs/<sessionId>/<sessionId>.log`。

### 隐私保护

- **无磁盘存储**: 截图永不保存到磁盘
- **内存处理**: 所有图片数据仅在 RAM 中处理
- **隐蔽操作**: 对屏幕录制和分享隐形
- **安全通讯**: 加密的 API 调用
- **进程隐藏**: 伪装进程名称和窗口标题
- **自动清理**: 退出时清除内存和网络痕迹

### AI 整合

- **OpenAI Vision API**: 最先进的图片理解技术
- **自定义提示**: 根据您的特定需求调整分析
- **情境感知**: AI 理解图片内容和您的问题
- **错误恢复**: 强健的 API 失败和速率限制处理
- **回应优化**: 智能缓存和请求批次处理

## ⚙️ 配置

### 热键自定义

在设置中编辑热键配置：

```typescript
// 默认热键: Ctrl+Shift+S
const defaultHotkey = "CommandOrControl+Shift+S";

// 自定义热键范例:
// "CommandOrControl+Alt+G"     // Ctrl+Alt+G (Windows/Linux) 或 Cmd+Alt+G (macOS)
// "CommandOrControl+Shift+A"   // Ctrl+Shift+A (Windows/Linux) 或 Cmd+Shift+A (macOS)
// "F12"                        // 功能键 F12
```

### API 配置

通过应用程序的设置界面配置您的 OpenAI API 设置：

- **API 密钥**: 您的 OpenAI API 密钥（使用 Electron safeStorage 安全存储）
- **基础 URL**: 自定义 API 端点（默认为 https://api.openai.com/v1）
- **模型**: 从可用模型中选择（从 OpenAI 动态获取）- 在 Ask 面板和设置面板中都可使用，方便操作
  注意：为了提高与不同模型的兼容性，应用程序默认不设定温度或最大 Token 参数。若您的模型支持这些参数，可透过更换模型或调整提示词达成类似效果。
  - `OpenAIConfig.maxTokens` 仍保留于设置中以供需要时使用，类型为 `number | null`。默认为 `null`，代表「使用模型的默认/最大 token」。此字段默认不会被送到 API；若在程序中重新启用 token 上限，当 `maxTokens` 为 `null` 或 `undefined` 时，请完全省略该 API 参数。
- 仅在选择 `gpt-5` 时，应用会自动附加 `reasoning_effort: "low"` 以降低延迟/成本；为避免兼容性问题，其余模型均不会传送此参数。

所有设置都经过加密并本地存储 - 无需外部服务。

### 疑难排解

- 若 Ask 输入框旁的模型选单一直显示「Loading models…」：
  - 请开启「Settings」输入有效的 OpenAI API 密钥与 Base URL。
  - 应用现已在 API 密钥遗漏/无效时，回退为默认模型清单，因此仍可先选择模型；若之后请求失败，请确认您的账号是否拥有该模型的使用权限。
  - 当您变更设置时，Ask 面板的模型选单会自动刷新。
  - 设置面板不再每次打开都重新加载；首次挂载后常驻，避免闪烁。

#### 已安装但看不到界面（只有系统托盘图标/进程存在）

- 现象：执行安装档后，只看到系统托盘（托盘）图标与任务管理器的进程，却没有窗口。
- 可能原因与处理：
  1. 生产版资源路径
     - 请将 `vite.config.ts` 的 `base` 设为 `'./'`，确保在 Electron 的 `file://` 环境能正确加载前端资产。
  2. 环境侦测错误
     - 在 `src/main/main.ts` 使用 `app.isPackaged` 判断是否为打包版，避免安装版仍尝试加载 `http://localhost:5173` 而造成空白。
  3. 覆盖层行为
     - 本应用是全屏幕透明覆盖层，启动时可能为隐藏/可点击穿透状态。请使用全局热键 `Ctrl/Cmd+Enter` 或托盘选单的「Show Overlay」唤出 HUD。
  4. 重新构建/打包
     - 套用上述修正后，请重新构建与打包：
       ```bash
       npm run build
       npm run dist:win   # 或 :mac / :linux
       ```

### 实时转写语言

- 在 设置 → 转写 中可选择语音转文字的语言：**English (en)** 或 **中文 (zh)**，默认为 **en**。
- 这个语言提示会传给实时转写连线，能减少中文语音出现乱码（例如避免 `得到吗?`）。

### UI 客制化（透明度与颜色）

- 要同时调整「字体与背景的深浅」，修改 `src/styles/theme.ts` 的主题透明度：

```96:96:src/styles/theme.ts
export const theme = makeTheme();
```

例如改成 `makeTheme(0.75)` 会更透明（0–1 之间，越小越透明）。

- 要更改颜色，编辑同文件内的 `palette`：

```54:65:src/styles/theme.ts
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

- 组件样式集中于 `src/styles/styles.ts` 并使用主题色，通常只需调整上述两处即可完成外观客制化。

## 🔧 开发

### 设定开发环境

1. **安装依赖**

   ```bash
   npm install
   ```

2. **配置 API 设置**

   应用程序首次执行时会引导您设定 OpenAI API 配置。

3. **以开发模式执行**

   ```bash
   npm run dev
   ```

4. **执行测试**

   ```bash
   npm test
   ```

### 构建生产版本

```bash
# 构建应用程序
npm run build

# 打包分发
npm run dist
```

## 🤝 贡献

我们欢迎贡献！请随时：

- 🐛 回报错误和问题
- 💡 建议新功能或改进
- 🔧 提交拉取请求
- 📖 改进文档
- 🧪 添加测试并提高覆盖率

### 开发指南

- 遵循现有的代码风格和惯例
- 为新功能添加测试
- 根据需要更新文档
- 确保所有测试在提交 PR 前通过

## 📖 文档

详细文档请访问：[https://mai0313.github.io/ghost-ai/](https://mai0313.github.io/ghost-ai/)

## 👥 贡献者

[![Contributors](https://contrib.rocks/image?repo=Mai0313/ghost-ai)](https://github.com/Mai0313/ghost-ai/graphs/contributors)

Made with [contrib.rocks](https://contrib.rocks)

## 📄 授权

本项目采用 MIT 授权 - 详见 [LICENSE](LICENSE) 文件。
