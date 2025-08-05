# Requirements Document

## Introduction

這個專案是一個前後端分離的應用程式，讓使用者能夠透過全域熱鍵快速截圖，並將截圖傳送給 OpenAI 的 LLM 進行分析。使用者可以在截圖時提供額外的提示詞或輸入，讓 AI 根據圖片內容和使用者的需求提供相應的回答。前端應用程式需要在截圖和畫面分享時保持隱形狀態，確保不會干擾使用者的工作流程。

## Requirements

### Requirement 1

**User Story:** 作為使用者，我希望能夠透過全域熱鍵快速截圖，這樣我就可以在任何應用程式中都能使用這個功能，且不會被其他軟體監測到。

#### Acceptance Criteria

1. WHEN 使用者按下預設的全域熱鍵 THEN 系統 SHALL 立即開始截圖流程
2. WHEN 截圖流程啟動 THEN 前端應用程式 SHALL 從螢幕上完全隱藏
3. WHEN 截圖完成 THEN 系統 SHALL 顯示輸入介面讓使用者輸入提示詞
4. IF 使用者在其他應用程式中 THEN 熱鍵 SHALL 仍然能夠正常觸發截圖功能
5. WHEN 熱鍵被按下 THEN 系統 SHALL 使用低層級的鍵盤鉤子來避免被其他軟體監測
6. WHEN 處理熱鍵事件 THEN 系統 SHALL 不在系統日誌中留下可追蹤的記錄

### Requirement 2

**User Story:** 作為使用者，我希望應用程式在截圖和畫面分享時完全隱形，這樣就不會在截圖中出現應用程式的介面。

#### Acceptance Criteria

1. WHEN 截圖流程開始 THEN 前端應用程式 SHALL 立即隱藏所有視窗
2. WHEN 系統進行畫面分享 THEN 應用程式 SHALL 不會出現在分享畫面中
3. WHEN 截圖完成後 THEN 應用程式 SHALL 重新顯示必要的輸入介面
4. IF 使用者正在進行視訊會議 THEN 應用程式 SHALL 不會干擾畫面分享

### Requirement 3

**User Story:** 作為使用者，我希望能夠在截圖時提供額外的提示詞或輸入，這樣 AI 就能根據我的具體需求來分析圖片。

#### Acceptance Criteria

1. WHEN 截圖完成 THEN 系統 SHALL 顯示輸入框讓使用者輸入提示詞
2. WHEN 使用者輸入提示詞 THEN 系統 SHALL 將提示詞與截圖一起傳送給後端
3. IF 使用者沒有輸入提示詞 THEN 系統 SHALL 使用預設的分析提示詞
4. WHEN 使用者確認輸入 THEN 系統 SHALL 立即開始處理請求

### Requirement 4

**User Story:** 作為使用者，我希望 AI 能夠分析我的截圖並提供相關回答，這樣我就能快速獲得圖片內容的解釋或協助。

#### Acceptance Criteria

1. WHEN 後端收到截圖和提示詞 THEN 系統 SHALL 透過 OpenAI API 處理圖片分析請求
2. WHEN OpenAI 回傳分析結果 THEN 系統 SHALL 將結果傳送回前端顯示
3. IF API 請求失敗 THEN 系統 SHALL 顯示適當的錯誤訊息
4. WHEN 分析完成 THEN 使用者 SHALL 能夠複製結果或進行後續操作

### Requirement 5

**User Story:** 作為使用者，我希望有一個簡潔的前端介面來查看 AI 的分析結果，這樣我就能快速理解和使用這些資訊。

#### Acceptance Criteria

1. WHEN AI 分析完成 THEN 前端 SHALL 顯示結果在清晰易讀的介面中
2. WHEN 顯示結果 THEN 使用者 SHALL 能夠複製文字內容
3. WHEN 顯示結果 THEN 使用者 SHALL 能夠查看原始截圖
4. IF 結果很長 THEN 介面 SHALL 提供適當的滾動或分頁功能

### Requirement 6

**User Story:** 作為使用者，我希望後端 API 能夠安全且高效地處理截圖上傳和 LLM 請求，這樣我就能獲得穩定可靠的服務。

#### Acceptance Criteria

1. WHEN 前端上傳截圖 THEN 後端 SHALL 驗證圖片格式和大小
2. WHEN 處理 OpenAI 請求 THEN 後端 SHALL 實作適當的錯誤處理和重試機制
3. WHEN 處理完成 THEN 後端 SHALL 清理暫存的圖片檔案
4. IF 請求量過大 THEN 後端 SHALL 實作適當的限流機制

### Requirement 7

**User Story:** 作為使用者，我希望能夠自訂熱鍵和其他設定，這樣我就能根據個人喜好調整應用程式的行為。

#### Acceptance Criteria

1. WHEN 使用者開啟設定 THEN 系統 SHALL 提供熱鍵自訂選項
2. WHEN 使用者變更熱鍵 THEN 系統 SHALL 立即套用新的熱鍵設定
3. WHEN 使用者設定預設提示詞 THEN 系統 SHALL 儲存並在後續使用
4. IF 熱鍵衝突 THEN 系統 SHALL 警告使用者並要求選擇其他組合

### Requirement 8

**User Story:** 作為使用者，我希望應用程式能夠保護我的隱私，確保使用行為不會被其他軟體或系統監測到。

#### Acceptance Criteria

1. WHEN 應用程式運行 THEN 系統 SHALL 使用隱蔽的程序名稱和視窗標題
2. WHEN 處理截圖 THEN 系統 SHALL 在記憶體中處理圖片而不儲存到磁碟
3. WHEN 與 API 通訊 THEN 系統 SHALL 使用加密連線並清理網路日誌
4. IF 系統偵測到鍵盤記錄軟體 THEN 應用程式 SHALL 警告使用者潛在的隱私風險
5. WHEN 應用程式關閉 THEN 系統 SHALL 清理所有暫存資料和記憶體痕跡