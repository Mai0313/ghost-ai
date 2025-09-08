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

👻 **一個隱形的 AI 驅動桌面助手，能夠捕獲、分析並提供洞察**

Ghost AI 是一個隱私優先的跨平台桌面應用程式，透過全域熱鍵直接整合 OpenAI API，提供無縫的 AI 輔助體驗，同時對螢幕分享和監控軟體完全隱形。它提供三個核心功能：文字輸入與螢幕截圖分析、語音錄音與即時對話支援、以及隱蔽式操作界面。

**其他語言版本**: [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

## ✨ 主要功能

### 👻 **隱形操作**
- **幽靈模式**: 在截圖和螢幕分享時完全隱形
- **隱蔽熱鍵**: 使用低層級鍵盤鉤子避免被監控軟體偵測
- **隱藏程序**: 偽裝程序名稱和視窗標題以獲得最大隱私保護
- **記憶體處理**: 圖片僅在 RAM 中處理，不會寫入磁碟

### ⚡ **閃電般快速捕獲**
- **全域熱鍵**: 透過可自訂的按鍵組合從任何應用程式觸發截圖
- **即時分析**: 使用 OpenAI Vision API 進行即時圖片分析
- **智慧提示詞**: 儲存和使用自訂提示詞進行特定分析
- **多種捕獲模式**: 全螢幕、活動視窗或自訂區域選擇

### 🤖 **AI 驅動智能**
- **OpenAI Vision**: 先進的圖片理解和分析能力
- **情境感知**: 提供自訂提示以獲得關於截圖的特定洞察
- **對話記憶**: 在多次互動中保持上下文
- **錯誤處理**: 強健的重試機制和優雅的錯誤恢復

### 🎤 **語音錄音與轉錄**
- **即時轉錄**: 使用 OpenAI 的 Whisper API 進行即時語音轉文字
- **語音控制**: 暫停、恢復或停止錄音而不丟失上下文
- **語言支援**: 選擇英文或中文轉錄
- **無縫整合**: 語音轉錄與同一對話流程整合

### 🔒 **隱私與安全**
- **圖片不持久化**: 截圖僅在 RAM 中處理，不會寫入磁碟
- **加密通訊**: 所有 API 呼叫使用 HTTPS 和憑證固定
- **自動清理**: 記憶體和網路痕跡自動清除
- **無資料收集**: 您的資料保留在您的裝置上

### 🎨 **使用者體驗**
- **浮動控制列**: 螢幕上方置中的現代 HUD，含 Listen、Ask、Hide、Settings
- **快速截圖切換**: 在 Ask 面板直接切換截圖附加功能
- **統一界面**: AI 回應和語音轉錄在同一對話流程中
- **分頁導航**: 透過上一頁/下一頁控制瀏覽對話歷史
- **跨平台**: 在 Windows、macOS 和 Linux 上無縫運作

## 🚀 快速開始

### 系統需求
- **OpenAI API 金鑰** 用於 AI 分析功能
- **Windows、macOS 或 Linux** 作業系統

### 安裝步驟

1. **下載最新版本** 從 [發布頁面](https://github.com/Mai0313/ghost-ai/releases)

2. **安裝應用程式** 根據您的平台：
   - **Windows**: 執行 `.exe` 安裝程式
   - **macOS**: 開啟 `.dmg` 檔案並拖拽到應用程式資料夾
   - **Linux**: 使用 `.AppImage` 檔案或安裝 `.deb` 套件

3. **配置您的 OpenAI API 設定** 首次啟動時：
   - 輸入您的 OpenAI API 金鑰
   - 選擇您偏好的模型
   - 設定自訂提示詞（可選）

### 首次使用

1. **按下 `Ctrl/Cmd+Enter`** 開啟 Ask 面板
2. **輸入您的問題** 然後按傳送
3. **使用 `Ctrl/Cmd+Shift+Enter`** 開始語音錄音
4. **按下 `Ctrl/Cmd+\`** 隱藏/顯示界面
5. **按下 `Ctrl/Cmd+R`** 清除對話並重新開始

## ⌨️ 熱鍵

| 操作 | 熱鍵 | 描述 |
|------|------|------|
| **Ask 面板** | `Ctrl/Cmd+Enter` | 切換 Ask 面板 |
| **語音錄音** | `Ctrl/Cmd+Shift+Enter` | 開始/停止語音錄音 |
| **隱藏/顯示** | `Ctrl/Cmd+\` | 隱藏或顯示界面 |
| **清除會話** | `Ctrl/Cmd+R` | 清除對話並重新開始 |
| **向上/向下捲動** | `Ctrl/Cmd+Up/Down` | 捲動對話內容 |
| **上一頁/下一頁** | `Ctrl/Cmd+Shift+Up/Down` | 瀏覽對話歷史 |

## 🎯 使用方法

### 截圖分析
1. 按下您配置的熱鍵來捕獲截圖
2. 應用程式自動隱藏所有視窗
3. 在 Ask 面板中輸入您的問題
4. 獲得基於您問題的截圖 AI 分析

### 語音錄音
1. 按下 `Ctrl/Cmd+Shift+Enter` 開始錄音
2. 說出您的問題或想法
3. 應用程式即時轉錄您的語音
4. 基於您的語音輸入獲得 AI 回應

### 自訂提示詞
1. 在 `~/.ghost-ai/prompts/` 中建立提示詞檔案
2. 在設定中選擇您的活動提示詞
3. 提示詞會自動套用到每個會話的第一個問題

### 設定配置
- **API 設定**: 配置您的 OpenAI API 金鑰和模型偏好
- **熱鍵**: 自訂鍵盤快速鍵
- **轉錄**: 選擇語言和音訊設定
- **截圖**: 配置捕獲行為和附加設定

## 🔧 配置

### API 設定
- **API 金鑰**: 您的 OpenAI API 金鑰（安全儲存）
- **基礎 URL**: 自訂 API 端點（可選）
- **模型**: 從可用的 OpenAI 模型中選擇
- **轉錄語言**: 英文或中文

### 隱私設定
- **隱蔽模式**: 對螢幕分享軟體隱形
- **僅記憶體**: 永不將圖片儲存到磁碟
- **自動清理**: 自動清除痕跡
- **程序隱藏**: 偽裝應用程式程序

## 🛠️ 疑難排解

### 常見問題

**應用程式無法啟動:**
- 檢查您是否有必要的權限
- 確保您的 OpenAI API 金鑰有效
- 嘗試以系統管理員身份執行（Windows）或使用 sudo（Linux/macOS）

**AI 無回應:**
- 驗證您的 OpenAI API 金鑰是否正確
- 檢查您的網路連線
- 確保您有足夠的 API 額度

**語音錄音不工作:**
- 檢查麥克風權限
- 驗證音訊輸入裝置是否正常工作
- 嘗試重新啟動應用程式

**界面不可見:**
- 按下 `Ctrl/Cmd+Enter` 顯示 Ask 面板
- 檢查系統匣中的應用程式圖示
- 嘗試全域熱鍵 `Ctrl/Cmd+\` 切換可見性

### 取得協助
- 查看 [問題頁面](https://github.com/Mai0313/ghost-ai/issues) 了解已知問題
- 如果遇到錯誤，請建立新問題
- 在 [討論區](https://github.com/Mai0313/ghost-ai/discussions) 參與討論

## 🤝 貢獻

我們歡迎貢獻！請隨時：
- 🐛 回報錯誤和問題
- 💡 建議新功能或改進
- 🔧 提交拉取請求
- 📖 改進文檔

### 開發設定
1. 複製儲存庫
2. 使用 `npm install` 安裝依賴
3. 使用 `npm run dev` 在開發模式下執行
4. 使用 `npm run build` 建置生產版本

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。

---

<center>

**為注重隱私的使用者而製作 ❤️**

_Ghost AI - 隱形的 AI 驅動桌面輔助_

</center>