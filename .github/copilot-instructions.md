# Ghost AI — Copilot Instructions (需求與計畫整合)

本文件整合 `.kiro/specs/ghost-ai` 中的需求與實作計畫，作為 Copilot 與協作開發的工作指南。專案為純 Electron + TypeScript 跨平台桌面應用，直接整合 OpenAI API，核心能力包含：

- 文字輸入 + 螢幕截圖分析
- 語音錄音（並預留 WebRTC 實時對話）
- 隱藏式操作界面與全域熱鍵

**重要：本專案採用純前端 TypeScript + Electron 架構，完全無後端服務。所有功能都在 Electron 應用程式內實現，包括 OpenAI API 設定都可在前端界面中配置。**

更新時請與 `.kiro/specs/ghost-ai/{requirements.md,tasks.md,design.md}` 保持一致。

---

## 一、功能需求與驗收標準（Functional Requirements）

以下匯總自 `requirements.md`，保留 User Story 與 Acceptance Criteria，作為 DoD（Definition of Done）的依據。

### R1：文字輸入與螢幕截圖分析

- User Story：作為用戶，我希望透過熱鍵快速呼叫輸入框，輸入問題並自動截圖，讓 AI 助手分析當前螢幕內容並回答。
- Acceptance Criteria：
  1. 當用戶按下設定熱鍵，系統會立即顯示文字輸入框。
  2. 當用戶送出文字，系統會自動進行螢幕截圖。
  3. 截圖完成後，將用戶問題、螢幕截圖與自定義提示詞一併送至 Chat Completion API。
  4. 截圖失敗時，顯示錯誤並允許重試。
  5. API 回應後，在適當界面顯示 AI 回答。

### R2：語音錄音與實時對話（預留）

- User Story：作為用戶，我希望透過按鈕或熱鍵開始錄音，並預留未來 WebRTC 實時對話能力。
- Acceptance Criteria：
  1. 按下錄音按鈕或熱鍵，立即開始錄音。
  2. 錄音中有明確狀態指示。
  3. 再次按下時停止錄音並保存音訊。
  4. 麥克風權限被拒時，顯示權限請求指引。
  5. 錄音完成後，預留 WebRTC 實時對話介面。
  6. 首次使用時，提供設定界面讓用戶輸入OpenAI API金鑰和基礎URL。

### R3：隱藏式操作界面

- User Story：作為用戶，我希望可隱藏操作界面，避免在螢幕分享或截圖時被看到。
- Acceptance Criteria：
  1. 按下隱藏熱鍵，立即隱藏所有可見界面。
  2. 隱藏狀態下，不出現在螢幕截圖或分享中。
  3. 再次按下熱鍵可恢復顯示。
  4. 系統重啟後記住上次隱藏狀態。
  5. 隱藏狀態下，全域熱鍵仍可運作。

### R4：全域熱鍵系統

- User Story：作為用戶，我希望能自定義所有功能熱鍵，並在任何應用中可用。
- Acceptance Criteria：
  1. 設定熱鍵時檢查衝突並警告。
  2. 任何應用中按下熱鍵，能正確觸發功能。
  3. 系統啟動時自動註冊所有熱鍵。
  4. 註冊失敗時通知用戶並提供替代方案。
  5. 修改設定後，立即更新註冊。

### R5：自定義提示詞與API設定管理

- User Story：作為用戶，我希望能設定與管理自定義 AI 提示詞，以及配置OpenAI API連接設定。
- Acceptance Criteria：
  1. 提供簡潔的提示詞編輯介面。
  2. 保存時驗證格式並儲存至本地。
  3. 發送請求時自動包含自定義提示詞。
  4. 過長時給出警告與優化建議。
  5. 重置時恢復預設模板。
  6. 開啟設定時提供API金鑰、基礎URL、模型選擇等配置選項。
  7. 保存API設定時加密儲存敏感資訊並驗證連接有效性。

### R6：AI 分析與回應處理

- User Story：作為用戶，我希望 AI 能準確分析輸入與螢幕內容，提供有用回應。
- Acceptance Criteria：
  1. 收到截圖與提示詞後，使用前端設定的API金鑰直接透過 OpenAI API 處理圖片分析。
  2. 回傳分析結果後，在界面顯示。
  3. API 失敗時顯示錯誤並可重試。
  4. 分析完成後，支援複製結果或進行後續操作。
  5. 處理音訊時，支援語音轉文字並整合分析流程。

### R7：系統整合與穩定性

- User Story：作為用戶，我希望系統穩定運行並與作業系統良好整合。
- Acceptance Criteria：
  1. 啟動後在系統托盤顯示圖示並提供基本控制。
  2. 發生錯誤時記錄日誌並嘗試自動恢復。
  3. 登出或關機時正確清理資源與保存設定。
  4. 崩潰後重啟可恢復到上次工作狀態。
  5. 系統更新後保留用戶自定義設定。
  6. 應用程式可打包到 Windows/macOS/Linux。

### R8：隱私保護與安全性

- User Story：作為用戶，我希望我的資料被妥善保護，系統運行不被他人輕易偵測。
- Acceptance Criteria：
  1. 運行時採用隱蔽的程序名稱與視窗標題。
  2. 截圖與音訊僅在記憶體中處理，不落地。
  3. 與 API 通訊採用加密連線並清理網路日誌。
  4. 偵測到監控軟體時警告用戶潛在風險。
  5. 關閉應用時清理所有暫存與記憶體痕跡。
  6. 儲存API金鑰時使用本地加密儲存，不依賴外部服務。
  7. 設定敏感資訊時提供安全性警告和最佳實踐建議。

---

## 二、非功能性需求（NFR，節選自設計）

出自 `design.md` 的約束（請據此實作與檢查）：

- 錯誤處理策略：
  - 熱鍵註冊失敗：替代組合、用戶提示、不中斷運行
  - 截圖失敗：最多 3 次重試、降級至視窗截圖、友善錯誤
  - 網路連線：自動重試、離線提示、請求快取
  - OpenAI API：指數退避、配額/用量監控、必要時降級
  - 跨平台錯誤：平台特定降級、可用性檢測、對應訊息
  - 資源不足：記憶體監控/清理、優雅降級、警告

- 隱私與安全：
  - 僅在記憶體中處理圖片與音訊，安全清理緩衝區
  - HTTPS、可考慮憑證固定與請求標頭混淆
  - 程序隱蔽（隨機名稱、隱藏標題、最小足跡）
  - 暫存資料自動清理與加密；API 金鑰以環境變數配置並限制存取

- 效能最佳化：
  - 啟動最佳化（延遲載入、預載資源、背景初始化、分階段啟動）
  - 記憶體最佳化（及時釋放、生命週期管理、GC 最佳化、監控）
  - 跨平台最佳化與原生 API 利用
  - API 通訊最佳化（連線池、快取、壓縮、批次處理）

---

## 三、實作計畫（Implementation Plan）

以下整合自 `tasks.md`，為開發優先序與工作拆解，含路徑約定與需求對應：

- [ ] 1. 專案骨架與核心介面
  - 建立目錄：`src/main/`, `src/renderer/`, `src/shared/`, `src/services/`
  - 定義三大功能的 TS 介面；設定 `package.json`/`tsconfig.json`
  - 安裝 OpenAI SDK 與必要套件（electron, typescript, react, electron-builder…）
  - 以 UI 設定方式管理 `OPENAI_BASE_URL`, `OPENAI_API_KEY`（不強制使用環境變數）
  - 打包設定（Win/macOS/Linux）
  - 對應需求：R1, R2, R3, R4, R7.6

### UI 指南（Renderer 端）

- 新的 UI 採用「頂部置中控制列 + 下方回應泡泡」設計，與原本的面板不同：
  - 控制列位於螢幕頂部置中，包含 `Listen`、`Ask`、`Hide`、`Settings` 四個按鈕。
  - 錄音中按鈕會切換成紅色並顯示 `mm:ss` 計時。
  - 回應泡泡置於控制列下方，包含回應內容區、提示輸入框、自訂提示欄位、`Send` 與 `Copy response`。
  - 樣式使用內聯樣式，深色玻璃質感（半透明深色背景 + 邊框 + 陰影）。
  - 主要檔案：`src/renderer/main.tsx`、`src/renderer/components/Settings.tsx`、`src/renderer/components/Icons.tsx`。

- 重要互動流程：
  - `window.ghostAI.onTextInputShow` 觸發後顯示控制列與泡泡。
  - `Ask` 分頁中點擊 `Send` 使用 `ghostAI.analyzeCurrentScreen(text, customPrompt)`。
  - `Settings` 分頁沿用 IPC：`openai:update-config`、`openai:get-config`、`openai:validate-config`。

- 型別補充：在 `tsconfig.json` 加入 `"types": ["vite/client"]` 以支援 `import.meta.env`。

- [ ] 2. 全域熱鍵系統
  - [ ] 2.1 `./src/main/hotkey-manager.ts`：註冊文字/錄音/隱藏熱鍵，跨平台與衝突檢測；型別放 `./src/shared/types.ts`
    - 對應：R4 全部條目
  - [ ] 2.2 熱鍵設定管理：本地儲存、自訂 UI、驗證、動態更新、預設與重置
    - 對應：R4.1, R4.2, R4.4, R4.5

- [ ] 3. 文字輸入與螢幕截圖分析
  - [ ] 3.1 `./src/renderer/components/TextInputComponent`：熱鍵觸發顯示、輸入驗證與送出、統一樣式
    - 對應：R1.1–R1.3
  - [ ] 3.2 `./src/main/screenshot-manager.ts`：跨平台截圖、記憶體處理、重試與錯誤處理
    - 對應：R1.2, R1.4
  - [ ] 3.3 整合：組合用戶問題/截圖/自定義提示詞，格式化 Chat Completion 請求，顯示結果與重試
    - 對應：R1.3, R1.5

- [ ] 4. 語音錄音
  - [ ] 4.1 `./src/main/audio-manager.ts`：權限請求、設備檢測、開始/停止、記憶體處理與格式轉換
    - 對應：R2.1, R2.2, R2.4
  - [ ] 4.2 錄音狀態指示 UI：時長與音量指示、通知與確認
    - 對應：R2.2, R2.3
  - [ ] 4.3 WebRTC 預留：架構與介面、數據模型、音訊流處理基礎、設定選項
    - 對應：R2.5

- [ ] 5. 隱藏式操作界面
  - [ ] 5.1 `./src/main/hide-manager.ts`：完全隱藏/恢復、截圖/分享時隱藏、狀態持久化
    - 對應：R3.1, R3.2, R3.4
  - [ ] 5.2 隱藏狀態管理：記憶與恢復、重啟恢復、隱藏模式下熱鍵保持、用戶通知
    - 對應：R3.3, R3.4, R3.5

- [ ] 6. 自定義提示詞與API設定管理
  - [ ] 6.1 本地儲存與管理、編輯 UI 與驗證、模板與預設、匯入匯出
    - 對應：R5.1, R5.2, R5.5
  - [ ] 6.2 API設定管理界面：OpenAI API設定的前端配置、金鑰/URL/模型設定、驗證與測試、加密儲存、首次使用引導
    - 對應：R5.6, R5.7, R6.6
  - [ ] 6.3 與分析流程整合：組合邏輯、長度驗證與優化建議、預覽、動態替換與變數
    - 對應：R5.3, R5.4

- [ ] 7. OpenAI 直接整合
  - [ ] 7.1 `./src/shared/openai-client.ts`：Chat Completion 呼叫、前端動態配置、金鑰管理、安全與重試、模型清單獲取
    - 對應：R6.1, R6.2, R6.6, R8.3
  - [ ] 7.2 Vision 圖片分析整合：文字+圖片綜合分析、base64/格式處理、結果格式化與顯示（Main Process）
    - 對應：R6.1, R6.2, R6.4
  - [ ] 7.3 Whisper 語音轉文字：格式驗證與轉換、base64 處理、結果顯示
    - 對應：R6.5

- [ ] 8. 系統整合與穩定性
  - [ ] 8.1 托盤與狀態：托盤圖示/控制、狀態監控、啟動初始化、優雅關閉與清理
    - 對應：R7.1, R7.3, R7.5
  - [ ] 8.2 錯誤處理與恢復：全域錯誤與日誌、崩潰自動恢復、設定備份/復原、錯誤報告
    - 對應：R7.2, R7.4

- [ ] 9. 隱私保護與安全性
  - [ ] 9.1 記憶體安全：安全清理、圖片/音訊緩衝自動清理、敏感資料加密、防止交換至虛擬記憶體
    - 對應：R8.2, R8.5
  - [ ] 9.2 程序隱蔽與隱私模式：隨機程序名、隱藏視窗標題、監控軟體偵測警告、流量加密與標頭混淆、完整隱私模式
    - 對應：R8.1, R8.3, R8.4, R8.5

- [ ] 10. 測試與品質
  - [ ] 10.1 單元測試：Jest + React Testing Library（Renderer）、Jest（Main）、Mock Electron/OS/OpenAI
  - [ ] 10.2 整合與 E2E：IPC 整合、三大核心流程、隱私與安全驗證、跨平台相容性

- [ ] 11. 效能與發佈
  - [ ] 11.1 效能最佳化：啟動/記憶體最佳化、API 呼叫與快取、跨平台效能監控、資源動態調整
  - [ ] 11.2 打包與分發：跨平台打包、自動化建置/分發、簽名與驗證、安裝與更新機制

---

## 四、測試計畫（節選自設計 Testing Strategy）

- 單元測試：
  - Renderer：React Testing Library
  - Main：服務模組（Mock Electron/OS）、Mock OpenAI 回應
- 整合測試：
  - Main ⇄ Renderer IPC、熱鍵、截圖、OpenAI 整合
- 端到端（Spectron 或 Playwright for Electron）：
  - 完整使用者流程、跨平台相容性（Win/macOS/Linux）
- 效能測試：
  - 啟動時間、記憶體洩漏、API 回應時間、跨平台比較
- 安全性測試：
  - 隱私（無落地、記憶體清理、流量分析）、熱鍵安全（鍵盤記錄偵測、低層級鉤子驗證、系統日誌檢查）

---

## 五、關鍵設定與約定

- 前端設定：OpenAI API金鑰、基礎URL、模型選擇等都可在應用程式設定界面中配置
- 主要檔案與路徑（計畫中已標註）：
  - `./src/main/hotkey-manager.ts`
  - `./src/main/screenshot-manager.ts`
  - `./src/main/audio-manager.ts`
  - `./src/main/hide-manager.ts`
  - `./src/shared/openai-client.ts`
  - `./src/shared/types.ts`
  - `./src/renderer/components/TextInputComponent`

- 建置輸出路徑：
  - 產出至 `dist/`（主行程與預載），Renderer 產出至 `dist/renderer/`

---

## 技術架構與開發指令

- **純前端 Electron + TypeScript 架構**：
  - 單一桌面應用程式，完全無後端服務
  - `OPENAI_API_KEY`、`OPENAI_BASE_URL`、模型選擇等都透過前端 UI 設定
  - 模型清單使用 OpenAI SDK `client.models.list()` 動態取得
  - 所有 AI 處理都在 Main Process 中直接呼叫 OpenAI API
  - API設定使用 Electron safeStorage 進行本地加密儲存
  - 封裝使用 `electron-builder`：Windows（NSIS .exe）、macOS（.dmg）、Linux（AppImage/deb）

### Packaging assets

- Windows icon is set to `ghost.ico` at the repository root via `electron-builder.json` (`win.icon`).
- The icon file is also included at runtime through `extraResources` to allow the Tray and BrowserWindow to load it using `process.resourcesPath`.
- Runtime loading path helper is implemented in `src/main/main.ts` (`resolveAssetPath('ghost.ico')`), used for `BrowserWindow` `icon` and `Tray` icon.

- **開發指令**：
  - `npm install` - 安裝依賴
  - `npm run dev` - 啟動開發模式（首次使用建議進入設定面板設定 OpenAI API）
  - `npm run build` - 建置並打包應用程式
  - `npm run test` - 執行測試

---

本文件作為 Copilot 的主要參照，協助在開發過程中自動對齊需求（R1–R8）與實作計畫（1–11）。提交 PR/Commit 前，請對照本文件之驗收標準與對應開發項目，確保一致。
