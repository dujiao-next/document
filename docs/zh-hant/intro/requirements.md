# 環境要求

> 更新時間：2026-02-11  

## 1. 最低運行要求

### 1.1 操作系統

推薦以下任一系統：

- Linux（推薦 Ubuntu 22.04+ / Debian 12+）
- macOS（Apple Silicon / Intel 均可）
- Windows 10/11（建議使用 WSL2）

### 1.2 運行時與工具鏈

- Go：`1.26.3`（與 `api/go.mod` 一致）
- Node.js：`20 LTS` 或更高
- npm：`10+`
- Git：`2.30+`

### 1.3 數據與中間件

- 數據庫：
  - SQLite（默認，單機快速部署）
  - PostgreSQL（生產推薦）
- Redis：`6+`（緩存、隊列、限流建議啟用）

## 2. 推薦生產環境配置

- CPU：1 核及以上
- 內存：1GB 及以上
- 磁盤：20GB 及以上（含日誌、上傳、數據庫）
- 網絡：可訪問支付網關與郵件服務

## 3. 端口規劃建議

- 生產環境：只需要 `8080` 一個埠。前臺在 `/`，後臺在 `web.admin_path`，
  API 與上傳檔案也都由這個埠提供。
- 開發環境額外使用：
  - User 前臺 dev server：`5173`
  - Admin 後臺 dev server：`5174`
  - 文檔（VitePress）：`5175`（示例，可自定義）

## 4. 開發環境自檢命令

```bash
# 在倉庫根目錄執行
go version
node -v
pnpm -v          # 未安裝可執行 corepack enable

# 後端依賴同步
go mod tidy

# 兩端前臺依賴安裝
cd frontend/user  && pnpm install
cd ../admin       && pnpm install
```

## 5. 常見問題


### 5.1 Go 版本不一致

如果你使用的 Go 低於 `1.26.3`，可能出現編譯失敗或依賴解析異常，建議升級到與 `go.mod` 一致版本。

### 5.2 Redis 未啟動

當 `config.yml` 中 `redis.enabled=true` 或 `queue.enabled=true` 時，Redis 不可用會導致部分功能（如隊列、限流）不可用。
