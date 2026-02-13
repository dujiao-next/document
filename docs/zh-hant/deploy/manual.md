# 手動部署（API / User / Admin）

> 更新時間：2026-02-11

本文檔適合希望完全掌控部署過程的開發者，分為「編譯」與「運行」兩部分。

## 1. 獲取源碼

```bash
mkdir dujiao-next && cd dujiao-next

# API（主項目）
git clone https://github.com/dujiao-next/dujiao-next.git api

# User（用戶前臺）
git clone https://github.com/dujiao-next/user.git user

# Admin（後臺）
git clone https://github.com/dujiao-next/admin.git admin
```

> 若你當前使用的是歷史單倉目錄（`web/`），請將下文 `user/` 替換為 `web/`。

## 2. 後端 API 部署

### 2.1 安裝依賴並構建

```bash
cd api
go mod tidy
go build -o dujiao-api ./cmd/server
```

### 2.2 配置文件

```bash
cp config.yml.example config.yml
# 按實際環境修改 config.yml
```

關鍵項至少要確認：

- `server.mode`（debug/release）
- `database.driver` / `database.dsn`
- `jwt.secret` / `user_jwt.secret`
- `redis`、`queue`、`email`（按需啟用）

> ⚠️ 重要安全提醒：上線前必須修改 `jwt.secret` 與 `user_jwt.secret`，並使用至少 32 位高強度隨機字符串。
>
> 嚴禁使用模板默認值，否則可能導致 Token 可偽造，存在嚴重安全風險。

### 2.3 初始化數據（可選）

```bash
go run ./cmd/seed
```

### 2.4 運行 API

```bash
./dujiao-api
```

默認監聽：`http://0.0.0.0:8080`

### 2.5 默認後臺管理員賬號（首次初始化）

當數據庫中 `admins` 表為空時，系統會在 API 首次啟動時嘗試創建默認管理員：

- 默認賬號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登錄後臺後，立刻在“後臺 -> 修改密碼”中更換為強密碼。

說明：

- 你可以在啟動 API 前設置環境變量覆蓋默認值：
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- 若 `server.mode=release` 且未設置 `DJ_DEFAULT_ADMIN_PASSWORD`，系統會跳過默認管理員初始化（不會自動創建 `admin/admin123`）。

## 3. 用戶前臺 User 部署

### 3.1 安裝依賴與構建

```bash
cd ../user
npm install
npm run build
```

構建產物目錄：`user/dist`

### 3.2 運行方式

你可以選擇：

- 用 Nginx 託管 `user/dist`
- 或臨時使用 `npm run preview` 驗證

## 4. 後臺 Admin 部署

### 4.1 安裝依賴與構建

```bash
cd ../admin
npm install
npm run build
```

構建產物目錄：`admin/dist`

### 4.2 運行方式

你可以選擇：

- 用 Nginx 託管 `admin/dist`（建議綁定 `/admin` 路徑）
- 或臨時使用 `npm run preview` 驗證

## 5. Nginx 反向代理建議（同源模式）

推薦採用同源代理模式：User 與 Admin 前端統一請求 `/api`、`/uploads`，由外層 Nginx 轉發到 API 服務（`127.0.0.1:8080`）。

### 5.1 分域名部署示例（推薦）

- 前臺：`user.example.com` → `user/dist`
- 後臺：`admin.example.com` → `admin/dist`

```nginx
# 前臺 User
server {
    listen 80;
    server_name user.example.com;

    root /var/www/dujiao-next/user/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 後臺 Admin
server {
    listen 80;
    server_name admin.example.com;

    root /var/www/dujiao-next/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.2 單域名 `/admin` 子路徑示例（可選）

```nginx
server {
    listen 80;
    server_name shop.example.com;

    root /var/www/dujiao-next/user/dist;
    index index.html;

    # 前臺 User
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 後臺 Admin
    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        alias /var/www/dujiao-next/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

同時建議：

- 前臺與後臺分別綁定獨立域名（更清晰）
- 開啟 HTTPS 並強制跳轉到 443
- 前端 SPA 路由必須保留 `try_files ... /index.html`

## 6. 啟停與升級建議

- API 建議使用 `systemd` / `supervisor` 託管
- 發佈時按順序執行：
  1. 停止 API
  2. 更新代碼並重新構建
  3. 替換 `user/dist`、`admin/dist`
  4. 啟動 API
  5. 檢查健康介面：`GET /health`
