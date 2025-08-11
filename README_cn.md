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

👻 **一個隱形的 AI 驅動截圖分析工具，能夠捕獲、分析並提供洞察，且不留任何痕跡**

Ghost AI 是一個隱私優先的桌面應用程式，讓你能夠透過全域熱鍵捕獲截圖，使用 OpenAI 的 Vision API 進行分析，並獲得智能回應 - 同時對螢幕分享和其他監控軟體完全隱形。

**其他語言版本**: [English](README.md) | [繁體中文](README_cn.md)

## ✨ 功能特色

### 👻 **隱形操作**

- **幽靈模式**: 在截圖和螢幕分享時完全隱形
- **隱蔽熱鍵**: 使用低層級鍵盤鉤子避免被監控軟體偵測
- **隱藏程序**: 偽裝程序名稱和視窗標題以獲得最大隱私保護
- **記憶體處理**: 不在磁碟留下痕跡 - 所有圖片處理都在記憶體中進行

### ⚡ **閃電般快速捕獲**

- **全域熱鍵**: 透過可自訂的按鍵組合從任何應用程式觸發截圖
- **即時分析**: 使用 OpenAI Vision API 進行即時圖片分析
- **智能提示**: 添加自訂提示或使用智能預設值進行情境感知分析
- **多種捕獲模式**: 全螢幕、活動視窗或自訂區域選擇

### 🤖 **AI 驅動智能**

- **OpenAI Vision**: 先進的圖片理解和分析能力
- **情境感知**: 提供自訂提示以獲得關於截圖的特定洞察
- **錯誤處理**: 強健的重試機制和優雅的錯誤恢復
- **速率限制**: 內建 API 配額管理和請求最佳化

### 🔒 **隱私與安全**

- **零持久化**: 圖片永不接觸磁碟 - 完全在記憶體中處理
- **加密通訊**: 所有 API 呼叫使用 HTTPS 和憑證固定
- **鍵盤記錄器偵測**: 警告使用者監控軟體的潛在隱私風險
- **自動清理**: 記憶體和網路痕跡自動清除

### 🎨 **使用者體驗**

- **簡潔介面**: 僅在需要時出現的極簡 UI
- **可自訂設定**: 個人化熱鍵、預設提示和行為
- **複製與分享**: 輕鬆複製分析結果和原始截圖
- **跨平台**: 在 Windows、macOS 和 Linux 上無縫運作

### 🏗️ **現代化架構**

- **前端**: TypeScript + Electron 提供跨平台桌面體驗
- **後端**: Python + FastAPI 提供高效能 API 處理
- **關注點分離**: 使用 `ghost_ui` 和 `ghost_ai` 模組的清晰架構
- **型別安全**: 完整的 TypeScript 和 Python 型別註解

## 🚀 快速開始

### 系統需求

- **Python 3.10+** 用於後端 API
- **Node.js 18+** 用於 Electron 前端
- **OpenAI API 金鑰** 用於圖片分析

### 安裝步驟

1. **複製儲存庫**

    ```bash
    git clone https://github.com/Mai0313/ghost_ai.git
    cd ghost_ai
    ```

2. **設定後端 (ghost_ai)**

    ```bash
    # 如果尚未安裝 uv
    make uv-install

    # 安裝 Python 依賴
    cd src/ghost_ai
    uv sync

    # 設定環境變數
    cp .env.example .env
    # 編輯 .env 並添加您的 OpenAI API 金鑰
    ```

3. **設定前端 (ghost_ui)**

    ```bash
    cd ghost_ui
    npm install
    ```

4. **配置您的 OpenAI API 金鑰**

    ```bash
    # 在 src/ghost_ai/.env 中
    OPENAI_API_KEY=your_api_key_here
    ```

### 執行應用程式

1. **啟動後端 API**

    ```bash
    cd src/ghost_ai
    uv run uvicorn app.main:app --reload --port 8000
    ```

2. **啟動前端應用程式**

    ```bash
    cd ghost_ui
    npm run dev
    ```

3. **設定您的熱鍵** (預設: `Ctrl+Shift+S`)

    - 應用程式將在啟動時註冊全域熱鍵
    - 從任何應用程式按下熱鍵即可捕獲和分析截圖

### 首次使用

1. 按下您配置的熱鍵來捕獲截圖
2. 輸入描述您想了解圖片內容的提示
3. 等待 AI 分析並查看結果
4. 複製結果或進行另一次截圖

## 📁 專案結構

```
├── .devcontainer/          # VS Code Dev Container 配置
├── .github/
│   ├── workflows/          # CI/CD 工作流程
│   └── copilot-instructions.md
├── docker/                 # Docker 配置
├── docs/                   # MkDocs 文檔
├── scripts/                # 自動化腳本
├── ghost_ui/               # 前端 Electron 應用
│   ├── src/main/           # Electron 主進程
│   ├── src/renderer/       # React 渲染進程
│   └── src/shared/         # 共用工具
├── src/
│   └── ghost_ai/           # 後端 Python API
├── tests/                  # 測試套件
├── pyproject.toml          # 專案配置
├── Makefile                # 開發命令
└── README.md
```

## 🛠️ 可用命令

```bash
# 開發
make clean          # 清理自動生成的檔案
make format         # 執行 pre-commit hooks
make test           # 執行所有測試
make gen-docs       # 生成文檔

# 依賴管理
make uv-install     # 安裝 uv 依賴管理器
uv add <package>    # 添加生產依賴
uv add <package> --dev  # 添加開發依賴
```

## 🎯 包含內容

### CI/CD 工作流程

- **測試**: PR 上的多版本 Python 測試
- **程式碼品質**: 自動化 ruff 檢查和 pre-commit 驗證
- **文檔**: 自動 GitHub Pages 部署
- **發布**: 自動發布草稿和變更日誌生成
- **標籤**: 基於 PR 內容的自動標籤

### 開發工具

- **ruff**: 快速 Python 檢查器和格式化器
- **pytest**: 帶覆蓋率的測試框架
- **pre-commit**: 程式碼品質的 Git hooks
- **MkDocs**: 文檔生成
- **Docker**: 容器化開發和部署

### 專案模板

- **Python 套件**: 即用型套件結構
- **配置檔案**: 包含所有必要的配置檔案
- **文檔**: 完整的文檔設定
- **測試**: 全面的測試配置

## 🎨 自訂指南

### 專案名稱自訂

本模板設計為可透過簡單的全局替換快速自訂：

1. **替換套件名稱**: 將所有 `ghost_ai` 替換為您的專案名稱（建議使用 snake_case）
2. **替換專案標題**: 將所有 `GhostAI` 替換為您的專案標題（建議使用 PascalCase）
3. **更新中繼資料**: 修改 `pyproject.toml` 中的作者、描述等資訊

範例：

```bash
# 如果您的專案叫做 "awesome_project"
find . -type f -name "*.py" -o -name "*.md" -o -name "*.toml" | xargs sed -i 's/ghost_ai/awesome_project/g'
find . -type f -name "*.py" -o -name "*.md" -o -name "*.toml" | xargs sed -i 's/GhostAI/AwesomeProject/g'
```

## 🤝 貢獻

我們歡迎貢獻！請隨時：

- 開啟問題回報錯誤或功能請求
- 提交拉取請求進行改進
- 分享您使用此模板的經驗

## 📖 文檔

詳細文檔請訪問：[https://mai0313.github.io/ghost_ai/](https://mai0313.github.io/ghost_ai/)

## 👥 貢獻者

[![Contributors](https://contrib.rocks/image?repo=Mai0313/ghost_ai)](https://github.com/Mai0313/ghost_ai/graphs/contributors)

Made with [contrib.rocks](https://contrib.rocks)

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案。
