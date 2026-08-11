# 手動部署（源碼構建）

> 更新時間：2026-07-26

若你尚未確定部署方式，建議先閱讀 [部署總覽與選型建議](/zh-hant/deploy/)。

本文檔適合希望完全掌控構建過程、或需要二次開發的開發者。

自 v1.4.0 起，前端源碼已併入主倉庫的 `frontend/` 目錄，**只需要 clone 一個倉庫**，構建產物透過 `go:embed` 打進二進制。

## 1. 環境要求

- Go（版本見倉庫 `go.mod`）
- Node.js 24.x
- pnpm 10.34.3（`corepack enable` 即可）

## 2. 獲取源碼

```bash
git clone https://github.com/dujiao-next/dujiao-next.git
cd dujiao-next
```

倉庫結構：

```
dujiao-next/
├── cmd/server/          # 程式入口
├── internal/
│   └── web/             # 前端嵌入與 SPA 路由掛載
├── frontend/
│   ├── admin/           # 管理後臺（Vue 3 + Vite）
│   └── user/            # 用戶前臺（Vue 3 + Vite）
├── config.yml.example
└── .goreleaser.yaml
```

## 3. 一鍵構建（推薦）

倉庫已經用 GoReleaser 描述了完整構建流程（含前端構建與嵌入），本地跑一條命令即可：

```bash
goreleaser build --snapshot --single-target --clean
```

產物在 `dist/` 下，是一個內嵌前端的完整二進制。這條命令與 CI 發佈走的是同一條路徑。

如果沒裝 GoReleaser，按下一節手工構建。

## 4. 手工構建

### 4.1 構建前端

```bash
# 管理後臺：必須用 fullstack 模式，會注入 <base> 佔位符供後端執行時替換
cd frontend/admin
pnpm install --frozen-lockfile
pnpm run build:fullstack

# 用戶前臺
cd ../user
pnpm install --frozen-lockfile
pnpm run build

cd ../..
```

::: warning admin 必須用 build:fullstack
`pnpm run build`（不帶 `:fullstack`）產出的是給獨立網域部署用的版本，`base` 固定為 `/`，
嵌入後掛在自訂前綴下會載入不到靜態資源。嵌入場景一律用 `build:fullstack`。
:::

### 4.2 複製產物到嵌入目錄

`go:embed` 只能讀取套件目錄內的檔案，所以前端產物必須放到 `internal/web/dist/` 下：

```bash
rm -rf internal/web/dist
mkdir -p internal/web/dist
cp -r frontend/admin/dist internal/web/dist/admin
cp -r frontend/user/dist  internal/web/dist/user
```

### 4.3 編譯二進制

```bash
CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" \
  -o dujiao-next ./cmd/server
```

`-tags fullstack` 是關鍵：不帶它編譯出來的二進制不含前端，只提供 API。

交叉編譯範例（在 macOS 上編譯 Linux 版本）：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" -o dujiao-next-linux-amd64 ./cmd/server
```

### 4.4 只要 API、不要前端

用於二次開發或前後端分離的自訂場景：

```bash
go build -o dujiao-api ./cmd/server
```

此時 `/` 與後臺路徑都不會被掛載，你需要自行用 Nginx 託管前端產物，
並把 `/api`、`/uploads`、`/sitemap.xml`、`/robots.txt` 反向代理到本服務。

## 5. 配置

```bash
cp config.yml.example config.yml
# 按實際環境修改 config.yml
```

關鍵項至少要確認：

- `server.mode`（debug/release）
- `database.driver` / `database.dsn`
- `app.secret_key` / `jwt.secret` / `user_jwt.secret`
- `web.admin_path`（後臺入口路徑，**務必改掉默認的 `/admin`**）
- `redis`、`queue`、`email`（按需啟用）

> ⚠️ 重要安全提醒：上線前必須分別修改 `app.secret_key`、`jwt.secret` 與 `user_jwt.secret`，使用至少 32 位的高強度隨機字串，並確保三者不同。
>
> 嚴禁使用範本默認值，否則服務會拒絕啟動。`app.secret_key` 用於解密敏感資料，必須與資料庫一起備份。

## 6. 運行

```bash
./dujiao-next
```

默認監聽：`http://0.0.0.0:8080`

啟動日誌出現下面這行，表示前端已正確內嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 6.1 默認後臺管理員帳號（首次初始化）

當資料庫中 `admins` 表為空時，系統會在首次啟動時嘗試建立默認管理員：

- 默認帳號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登入後臺後，立刻在「後臺 -> 修改密碼」中更換為強密碼。

說明：

- 你可以在啟動前設定環境變量覆蓋默認值：
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- 若 `server.mode=release` 且未設定 `DJ_DEFAULT_ADMIN_PASSWORD`，系統會跳過默認管理員初始化（不會自動建立 `admin/admin123`）。

## 7. Nginx 反向代理配置

整站轉發到同一個埠即可，不需要按路徑拆分：

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.com;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 8. 本地開發

開發時不需要每次都嵌入前端，直接分別跑三個行程，前端有熱重載：

```bash
# 終端 1：後端（不帶 fullstack tag，不掛載 SPA）
go run ./cmd/server

# 終端 2：用戶前臺 http://localhost:5173
cd frontend/user && pnpm run dev

# 終端 3：管理後臺 http://localhost:5174
cd frontend/admin && pnpm run dev
```

兩個前端的 Vite dev server 已配置好把 `/api`、`/uploads` 代理到 `localhost:8080`，
用戶前臺還額外代理了 `/sitemap.xml` 與 `/robots.txt`。

## 9. 啟停與升級建議

- 建議使用 `systemd` / `supervisor` 託管（systemd unit 範例見 [單二進制部署](/zh-hant/deploy/binary#_8-系統服務-systemd)）
- 發佈時按順序執行：
  1. 停止服務
  2. 更新程式碼並重新構建（前端會一併打進二進制）
  3. 替換二進制
  4. 啟動服務
  5. 檢查健康介面：`GET /health`
