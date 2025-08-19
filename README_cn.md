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

👻 **一個隱形的 AI 驅動桌面助手，能夠捕獲、分析並提供洞察**

Ghost AI 是一個基於 Electron 和 TypeScript 的隱私優先跨平台桌面應用程式。提供三個核心功能：文字輸入與螢幕截圖分析、語音錄音與實時對話支援、以及隱蔽式操作界面。系統透過全域熱鍵直接整合 OpenAI API，所有 API 設定都可透過前端界面配置，提供無縫的 AI 輔助體驗，同時對螢幕分享和監控軟體完全隱形。

**其他語言版本**: [English](README.md) | [繁體中文](README_cn.md)

## ✨ 功能特色

### 👻 **隱形操作**

- **幽靈模式**: 在截圖和螢幕分享時完全隱形
- **隱蔽熱鍵**: 使用低層級鍵盤鉤子避免被監控軟體偵測
- **隱藏程序**: 偽裝程序名稱和視窗標題以獲得最大隱私保護
- **圖片僅在記憶體處理**: 圖片僅在 RAM 中處理，不會寫入磁碟。純文字 Q/A 對話在每次請求完成後，會寫入 `~/.ghost_ai/logs/<sessionId>.log` 以便除錯/檢視。

### ⚡ **閃電般快速捕獲**

- **全域熱鍵**: 透過可自訂的按鍵組合從任何應用程式觸發截圖
- **即時分析**: 使用 OpenAI Vision API 進行即時圖片分析
- **智慧提示詞**: 在 `~/.ghost_ai/prompts` 管理提示詞檔案，並可在設定中切換啟用的提示詞
- **多種捕獲模式**: 全螢幕、活動視窗或自訂區域選擇

### 🤖 **AI 驅動智能**

- **OpenAI Vision**: 先進的圖片理解和分析能力
- **情境感知**: 提供自訂提示以獲得關於截圖的特定洞察
- **錯誤處理**: 強健的重試機制和優雅的錯誤恢復
- **速率限制**: 內建 API 配額管理和請求最佳化
- **簡易對話記憶**: 應用在主程序以純文字維持 Q/A 歷史用於提示組合；每次請求完成後，也會將目前對話文字寫入 `~/.ghost_ai/logs/<sessionId>.log`。

### 🔒 **隱私與安全**

- **圖片不持久化**: 截圖僅在 RAM 中處理，不會寫入磁碟
- **對話日誌**: 為方便除錯，應用會在每次分析請求完成後，將目前純文字 Q/A 對話寫入 `~/.ghost_ai/logs/<sessionId>.log`
- **加密通訊**: 所有 API 呼叫使用 HTTPS 和憑證固定
- **鍵盤記錄器偵測**: 警告使用者監控軟體的潛在隱私風險
- **自動清理**: 記憶體和網路痕跡自動清除

### 🎨 **使用者體驗**

- **浮動控制列**: 螢幕上方置中的現代 HUD（預設僅顯示控制列），含 Listen、Ask、Hide、Settings
- **統一 Ask 卡片（僅串流）**：AI 回應與輸入框整合在同一張卡片中；回應顯示於上方、輸入框位於卡片底部（支援中文輸入法組字不誤送）
  - **固定熱鍵（全部為全域）**: Ask = Cmd/Ctrl+Enter，語音切換 = Cmd/Ctrl+Shift+Enter（即時文字轉錄），切換隱藏 = Cmd/Ctrl+\\，清除對話 = Cmd/Ctrl+R（同時重置語音狀態），上一則回答 = Cmd/Ctrl+Up，下一則回答 = Cmd/Ctrl+Down（無論透過 HUD 的 Hide 按鈕或熱鍵隱藏，都可以再按熱鍵重新顯示）
- **內嵌錯誤提示**: 發生錯誤時，會在原本顯示 AI 回答的泡泡中顯示 `Error: ...`，可立即重試
- **快速清除**: 透過 Cmd/Ctrl+R 清除 Ask 泡泡與對話紀錄（不重新整理視窗）
- **低摩擦輸入**: 輸入問題即可分析；系統會自動套用啟用的提示詞
- **可自訂設定**: 個人化熱鍵、預設提示和行為
- **跨平台**: 在 Windows、macOS 和 Linux 上無縫運作
- **邊緣友善的覆蓋層**：覆蓋層預設為全螢幕且可點擊穿透；只有當滑鼠懸停在 HUD 或泡泡上時才會接收滑鼠事件，避免「透明視窗擋住」的情況，讓控制列可拖到最上/下緣。

### 🏗️ **現代化架構**

- **純前端應用程式**: 純 Electron + TypeScript，無任何後端依賴
- **UI 框架**: React 提供響應式和現代化的使用者界面
- **直接 API 整合**: OpenAI SDK 直接整合在主程序中
- **前端配置**: 所有 API 設定都可透過使用者界面配置
- **型別安全**: 整個程式碼庫完整的 TypeScript 型別註解
- **記憶體優先**: 所有處理都在記憶體中進行，不會持久化到磁碟

### 覆蓋層點擊穿透行為

- 主視窗為透明且無外框、無陰影的全螢幕覆蓋層。
- 預設啟用點擊穿透，桌面與其他應用保持可互動。
- 當滑鼠進入 HUD 或泡泡時，暫時關閉點擊穿透以便點擊/拖曳；離開後再恢復點擊穿透。

## 🚀 快速開始

### 系統需求

- **Node.js 18+** 用於 Electron 應用程式
- **OpenAI API 金鑰** 用於 AI 分析功能

### 安裝步驟

1. **複製儲存庫**

   ```bash
   git clone https://github.com/Mai0313/ghost_ai.git
   cd ghost_ai
   ```

2. **安裝依賴**

   ```bash
   npm install
   ```

3. **配置您的 OpenAI API 設定**

   應用程式首次執行時會提示您配置 OpenAI API 設定：
   - API 金鑰
   - 基礎 URL（可選，預設為 https://api.openai.com/v1）
   - 模型選擇
   - 其他偏好設定

   所有設定都使用 Electron 內建加密功能安全儲存。

### 執行應用程式

1. **以開發模式啟動應用程式**

   ```bash
   npm run dev
   ```

2. **固定熱鍵（全域）**
   - **Ask（切換 Ask 面板）**: `Cmd/Ctrl+Enter`（再按一次收合）
   - **語音（即時轉錄）**: `Cmd/Ctrl+Shift+Enter` — 捕獲麥克風與（作業系統允許時）系統音訊，並以 `gpt-4o-mini-transcribe` 在控制列下方串流顯示逐字稿。
   - **切換隱藏**: `Cmd/Ctrl+\\`（即使先用 HUD 的 Hide 隱藏，也可用此熱鍵再顯示）
   - **清除對話**: `Cmd/Ctrl+R`（同時停止錄音並丟棄暫存音訊）
   - **上一則回答**: `Cmd/Ctrl+Up`
   - **下一則回答**: `Cmd/Ctrl+Down`

3. **建置生產版本**

   ```bash
   npm run build
   ```

### 首次使用

1. 按下您配置的熱鍵來捕獲截圖
2. 使用頂部控制列切換 Ask 與 Settings
3. 輸入問題後點擊 Send（會自動套用啟用的提示詞）
4. 在回應泡泡查看結果。系統會以 Markdown 格式渲染回答，並支援程式碼區塊高亮顯示。

## 📁 專案結構

```
├── .devcontainer/          # VS Code Dev Container 配置
├── .github/
│   ├── workflows/          # CI/CD 工作流程
│   └── copilot-instructions.md
├── .kiro/
│   └── specs/ghost-ai/     # 專案規格和需求
├── src/
│   ├── main/               # Electron 主程序
│   │   ├── hotkey-manager.ts    # 全域熱鍵管理
│   │   ├── screenshot-manager.ts # 螢幕截圖捕獲
│   │   ├── audio-manager.ts     # 語音錄音
│   │   └── hide-manager.ts      # 隱蔽界面
│   ├── renderer/           # React 渲染程序
│   │   ├── components/     # UI 組件
│   │   └── pages/          # 應用程式頁面
│   ├── shared/             # 共用工具
│   │   ├── openai-client.ts     # OpenAI API 整合
│   │   └── types.ts             # TypeScript 定義
│   └── services/           # 業務邏輯服務
├── tests/                  # 測試套件
├── package.json            # Node.js 專案配置
├── tsconfig.json           # TypeScript 配置
├── electron-builder.json   # Electron 打包配置
└── README.md
```

## 🛠️ 可用命令

### 開發命令

```bash
# 開發
npm run dev                             # 啟動開發模式
npm run build                           # 建置生產版本
npm run test                            # 執行測試
npm run lint                            # 檢查 TypeScript 程式碼
npm run format                          # 格式化程式碼

# 打包
    npm run dist                            # 建置並打包（electron-builder）
npm run dist:win                        # 打包 Windows 版本
npm run dist:mac                        # 打包 macOS 版本
npm run dist:linux                      # 打包 Linux 版本

# 依賴管理
npm install <package>                   # 添加依賴
npm install <package> --save-dev        # 添加開發依賴
```

### 打包

```bash
npm run dist   # 建置並打包當前平台
```

#### 各作業系統打包說明

- Windows：執行 `npm run dist:win`，會在 `release/` 產出 NSIS 安裝程式（例如 `Ghost AI Setup <version>.exe`）。
- macOS：執行 `npm run dist:mac`（需在 macOS 上執行；DMG 與簽章步驟需 macOS）。
- Linux：執行 `npm run dist:linux`（建議在 Linux 環境執行，會產出 AppImage 與 deb）。在 Windows 上可考慮使用 WSL2。
- 所有產物會輸出到 `release/` 目錄。腳本使用 `--publish never` 以避免意外上傳。

### 應用程式圖示

- Windows 安裝程式與應用圖示使用專案根目錄的 `ghost.ico`。
- 如需更換圖示，請以新的 `ghost.ico` 覆蓋後重新打包：

```bash
npm run dist
```

## 🎯 運作原理

### 捕獲流程

1. **熱鍵觸發**: 按下您配置的全域熱鍵 (例如 `Ctrl+Shift+S`)
2. **隱形模式**: 應用程式立即隱藏所有視窗
3. **螢幕截圖**: 系統將當前螢幕捕獲到記憶體中
4. **提示輸入**: UI 出現讓您輸入分析指令
5. **AI 分析**: 圖片和提示發送到 OpenAI Vision API（僅支援串流）
6. **結果顯示**: 回答以串流方式在輸入框上方顯示；若發生錯誤，會在同一泡泡顯示 `Error: ...`，可立即重試。應用程式已全面改為串流流程，過去的非串流聊天路徑已移除。
7. **記憶體清理**: 所有痕跡自動從記憶體中清除
8. **對話記憶**: 每次回答後會將 `Q:`/`A:` 內容附加到主程序的記憶體字串；下一輪會連同新問題一併送出。此外，會把目前對話文字寫入 `~/.ghost_ai/logs/<requestId>.log`。

### 隱私保護

- **無磁碟儲存**: 截圖永不保存到磁碟
- **記憶體處理**: 所有圖片資料僅在 RAM 中處理
- **隱蔽操作**: 對螢幕錄製和分享隱形
- **安全通訊**: 加密的 API 呼叫
- **程序隱藏**: 偽裝程序名稱和視窗標題
- **自動清理**: 退出時清除記憶體和網路痕跡

### AI 整合

- **OpenAI Vision API**: 最先進的圖片理解技術
- **自訂提示**: 根據您的特定需求調整分析
- **情境感知**: AI 理解圖片內容和您的問題
- **錯誤恢復**: 強健的 API 失敗和速率限制處理
- **回應最佳化**: 智能快取和請求批次處理

## ⚙️ 配置

### 熱鍵自訂

在設定中編輯熱鍵配置：

```typescript
// 預設熱鍵: Ctrl+Shift+S
const defaultHotkey = 'CommandOrControl+Shift+S';

// 自訂熱鍵範例:
// "CommandOrControl+Alt+G"     // Ctrl+Alt+G (Windows/Linux) 或 Cmd+Alt+G (macOS)
// "CommandOrControl+Shift+A"   // Ctrl+Shift+A (Windows/Linux) 或 Cmd+Shift+A (macOS)
// "F12"                        // 功能鍵 F12
```

### API 配置

透過應用程式的設定界面配置您的 OpenAI API 設定：

- **API 金鑰**: 您的 OpenAI API 金鑰（使用 Electron safeStorage 安全儲存）
- **基礎 URL**: 自訂 API 端點（預設為 https://api.openai.com/v1）
- **模型**: 從可用模型中選擇（從 OpenAI 動態獲取）
  注意：為了提高與不同模型的相容性，應用程式預設不設定溫度或最大 Token 參數。若您的模型支援這些參數，可透過更換模型或調整提示詞達成類似效果。

所有設定都經過加密並本地儲存 - 無需外部服務。

### UI 客製化（透明度與顏色）

- 要同時調整「字體與背景的深淺」，修改 `src/renderer/styles/theme.ts` 的主題透明度：

```96:96:src/renderer/styles/theme.ts
export const theme = makeTheme();
```

例如改成 `makeTheme(0.75)` 會更透明（0–1 之間，越小越透明）。

- 要更改顏色，編輯同檔案內的 `palette`：

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

- 元件樣式集中於 `src/renderer/styles/styles.ts` 並使用主題色，通常只需調整上述兩處即可完成外觀客製化。

## 🔧 開發

### 設定開發環境

1. **安裝依賴**

   ```bash
   npm install
   ```

2. **配置 API 設定**

   應用程式首次執行時會引導您設定 OpenAI API 配置。

3. **以開發模式執行**

   ```bash
   npm run dev
   ```

4. **執行測試**

   ```bash
   npm test
   ```

### 建置生產版本

```bash
# 建置應用程式
npm run build

# 打包分發
npm run dist
```

## 🤝 貢獻

我們歡迎貢獻！請隨時：

- 🐛 回報錯誤和問題
- 💡 建議新功能或改進
- 🔧 提交拉取請求
- 📖 改進文檔
- 🧪 添加測試並提高覆蓋率

### 開發指南

- 遵循現有的程式碼風格和慣例
- 為新功能添加測試
- 根據需要更新文檔
- 確保所有測試在提交 PR 前通過

## 📖 文檔

詳細文檔請訪問：[https://mai0313.github.io/ghost_ai/](https://mai0313.github.io/ghost_ai/)

## 👥 貢獻者

[![Contributors](https://contrib.rocks/image?repo=Mai0313/ghost_ai)](https://github.com/Mai0313/ghost_ai/graphs/contributors)

Made with [contrib.rocks](https://contrib.rocks)

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。
