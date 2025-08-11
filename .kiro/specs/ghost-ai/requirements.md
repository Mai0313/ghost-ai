# Requirements Document

## Introduction

Ghost AI是一個基於 Electron 和 TypeScript 的跨平台智能桌面助手系統，提供三個核心功能：文字輸入與螢幕截圖分析、語音錄音與實時對話、以及隱藏式操作界面。系統採用單一應用程式架構，直接整合 OpenAI API，通過全域熱鍵操作為用戶提供無縫的AI輔助體驗。支援自定義提示詞和多模態輸入處理，所有功能都設計為隱蔽運行，確保不會在螢幕分享或截圖中被發現，並可封裝為全平台可用的桌面應用程式。

## Requirements

### Requirement 1：文字輸入與螢幕截圖分析

**User Story:** 作為用戶，我希望通過熱鍵快速呼叫輸入框，輸入問題並自動截圖，讓AI助手分析當前螢幕內容並回答我的問題。

#### Acceptance Criteria

1. WHEN 用戶按下設定的熱鍵組合 THEN 系統 SHALL 立即顯示文字輸入框
2. WHEN 用戶在輸入框中輸入文字並送出 THEN 系統 SHALL 自動進行螢幕截圖
3. WHEN 截圖完成 THEN 系統 SHALL 將用戶問題、螢幕截圖和自定義提示詞一起送至Chat Completion API
4. IF 截圖失敗 THEN 系統 SHALL 顯示錯誤訊息並允許用戶重試
5. WHEN API回應 THEN 系統 SHALL 在適當的界面顯示AI的回答

### Requirement 2：語音錄音與實時對話

**User Story:** 作為用戶，我希望通過按鈕或熱鍵開始語音錄音，並支援未來的WebRTC實時對話功能。

#### Acceptance Criteria

1. WHEN 用戶按下錄音按鈕或熱鍵 THEN 系統 SHALL 立即開始錄音
2. WHEN 正在錄音 THEN 系統 SHALL 顯示明確的錄音狀態指示器
3. WHEN 用戶再次按下按鈕或熱鍵 THEN 系統 SHALL 停止錄音並保存音頻文件
4. IF 麥克風權限被拒絕 THEN 系統 SHALL 顯示權限請求指導
5. WHEN 錄音完成 THEN 系統 SHALL 為未來的WebRTC實時對話功能預留介面

### Requirement 3：隱藏式操作界面

**User Story:** 作為用戶，我希望能夠隱藏操作界面，確保在螢幕分享或截圖時不會被他人看到。

#### Acceptance Criteria

1. WHEN 用戶按下隱藏熱鍵 THEN 系統 SHALL 立即隱藏所有可見的操作界面
2. WHEN 界面隱藏 THEN 系統 SHALL 確保不會出現在螢幕截圖或螢幕分享中
3. WHEN 用戶再次按下熱鍵 THEN 系統 SHALL 恢復顯示操作界面
4. IF 系統重啟 THEN 系統 SHALL 記住上次的隱藏狀態
5. WHEN 界面隱藏 THEN 所有熱鍵功能 SHALL 仍然正常運作

### Requirement 4：全域熱鍵系統

**User Story:** 作為用戶，我希望能夠自定義所有功能的熱鍵組合，並在任何應用程式中都能使用這些熱鍵。

#### Acceptance Criteria

1. WHEN 用戶設定熱鍵 THEN 系統 SHALL 檢查熱鍵衝突並提供警告
2. WHEN 用戶在任何應用程式中按下熱鍵 THEN 系統 SHALL 正確響應對應功能
3. WHEN 系統啟動 THEN 系統 SHALL 自動註冊所有設定的全域熱鍵
4. IF 熱鍵註冊失敗 THEN 系統 SHALL 通知用戶並提供替代方案
5. WHEN 用戶修改熱鍵設定 THEN 系統 SHALL 立即更新全域熱鍵註冊

### Requirement 5：自定義提示詞與API設定管理

**User Story:** 作為用戶，我希望能夠設定和管理自定義的AI提示詞，以及配置OpenAI API連接設定，以便獲得更符合需求的回答。

#### Acceptance Criteria

1. WHEN 用戶設定提示詞 THEN 系統 SHALL 提供簡潔的編輯界面
2. WHEN 用戶保存提示詞 THEN 系統 SHALL 驗證提示詞格式並保存到本地
3. WHEN 發送請求到AI THEN 系統 SHALL 自動將自定義提示詞包含在請求中
4. IF 提示詞過長 THEN 系統 SHALL 提供警告並建議優化
5. WHEN 用戶重置提示詞 THEN 系統 SHALL 恢復到預設的提示詞模板
6. WHEN 用戶開啟設定 THEN 系統 SHALL 提供API金鑰、基礎URL、模型選擇等配置選項
7. WHEN 用戶保存API設定 THEN 系統 SHALL 加密儲存敏感資訊並驗證連接有效性

### Requirement 6：AI分析與回應處理

**User Story:** 作為用戶，我希望AI能夠準確分析我的輸入和螢幕內容，並提供有用的回答和建議。

#### Acceptance Criteria

1. WHEN 應用程式收到截圖和提示詞 THEN 系統 SHALL 使用前端設定的API金鑰直接透過OpenAI API處理圖片分析請求
2. WHEN OpenAI回傳分析結果 THEN 系統 SHALL 在應用程式界面中顯示結果
3. IF API請求失敗 THEN 系統 SHALL 顯示適當的錯誤訊息並提供重試選項
4. WHEN 分析完成 THEN 用戶 SHALL 能夠複製結果或進行後續操作
5. WHEN 處理音頻輸入 THEN 系統 SHALL 支援語音轉文字並整合到分析流程
6. WHEN 用戶首次使用 THEN 系統 SHALL 提供設定界面讓用戶輸入OpenAI API金鑰和基礎URL

### Requirement 7：系統整合與穩定性

**User Story:** 作為用戶，我希望系統能夠穩定運行，並與作業系統良好整合，提供可靠的跨平台服務。

#### Acceptance Criteria

1. WHEN 應用程式啟動 THEN 系統 SHALL 在系統托盤中顯示圖示並提供基本控制
2. WHEN 系統遇到錯誤 THEN 系統 SHALL 記錄錯誤日誌並嘗試自動恢復
3. WHEN 用戶登出或關機 THEN 系統 SHALL 正確清理資源並保存設定
4. IF 系統崩潰 THEN 重啟後 SHALL 能恢復到上次的工作狀態
5. WHEN 系統更新 THEN 系統 SHALL 保留用戶的所有自定義設定
6. WHEN 應用程式打包 THEN 系統 SHALL 支援 Windows、macOS 和 Linux 平台

### Requirement 8：隱私保護與安全性

**User Story:** 作為用戶，我希望我的數據得到安全保護，並且系統運行不會被其他軟體或系統監測到。

#### Acceptance Criteria

1. WHEN 應用程式運行 THEN 系統 SHALL 使用隱蔽的程序名稱和視窗標題
2. WHEN 處理截圖和音頻 THEN 系統 SHALL 在記憶體中處理而不儲存到磁碟
3. WHEN 與API通訊 THEN 系統 SHALL 使用加密連線並清理網路日誌
4. IF 系統偵測到監控軟體 THEN 應用程式 SHALL 警告用戶潛在的隱私風險
5. WHEN 應用程式關閉 THEN 系統 SHALL 清理所有暫存資料和記憶體痕跡
6. WHEN 儲存API金鑰 THEN 系統 SHALL 使用本地加密儲存，不依賴外部服務
7. WHEN 用戶設定敏感資訊 THEN 系統 SHALL 提供安全性警告和最佳實踐建議
