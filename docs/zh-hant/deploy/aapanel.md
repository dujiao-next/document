# 使用 aaPanel 手動部署（基於 Releases 壓縮包）

> 更新時間：2026-02-12

本文檔適用於你已在各倉庫 Release 中提供編譯產物壓縮包的部署方式。

特點：

- 不需要在服務器 `git clone` 源碼
- 不需要在服務器執行 `go build` / `npm run build`
- 只做“上傳（或下載）→ 解壓 → 配置 → 啟動”

## 1. 面板與軟件準備

在 aaPanel 中安裝：

- Nginx
- PM2 管理器（或 Supervisor）
- 解壓工具（`unzip` / `tar`）
- Redis（按需）
- PostgreSQL（按需）

> 此部署方案不依賴 Git、Go、Node.js 編譯環境。

## 2. 準備目錄

```bash
mkdir -p /www/wwwroot/dujiao-next/{api,user,admin}
cd /www/wwwroot/dujiao-next
```

## 3. 下載並解壓 Release 包

請從以下倉庫的 Releases 下載對應版本壓縮包（建議三端使用同一版本號）：

- API（主項目）：`https://github.com/dujiao-next/dujiao-next/releases`
- User（用戶前臺）：`https://github.com/dujiao-next/user/releases`
- Admin（後臺）：`https://github.com/dujiao-next/admin/releases`

示例（文件名按你的實際 Release 產物替換）：

> API 壓縮包命名遵循 GoReleaser 規則：`dujiao-next_<tag>_Linux_x86_64.tar.gz`，例如 `dujiao-next_v0.0.1-beta_Linux_x86_64.tar.gz`。
> User 壓縮包命名示例：`dujiao-next-user-v0.0.1-beta.zip`。
> Admin 壓縮包命名示例：`dujiao-next-admin-v0.0.1-beta.zip`。

```bash
# API
wget -O api.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v0.0.1-beta/dujiao-next_v0.0.1-beta_Linux_x86_64.tar.gz
mkdir -p api && tar -xzf api.tar.gz -C api

# User
wget -O user.zip https://github.com/dujiao-next/user/releases/download/v0.0.1-beta/dujiao-next-user-v0.0.1-beta.zip
mkdir -p user && unzip -o user.zip -d user

# Admin
wget -O admin.zip https://github.com/dujiao-next/admin/releases/download/v0.0.1-beta/dujiao-next-admin-v0.0.1-beta.zip
mkdir -p admin && unzip -o admin.zip -d admin
```

> API 壓縮包解壓後，`/www/wwwroot/dujiao-next/api` 目錄中應包含：
> - `config.yml.example`
> - `dujiao-next`
> - `README.md`


## 4. 部署 API（無需編譯）

確認 API 解壓目錄中存在以下文件：`config.yml.example`、`dujiao-next`、`README.md`。

```bash
cd /www/wwwroot/dujiao-next/api
cp config.yml.example config.yml
# 編輯 config.yml
chmod +x ./dujiao-next
```

> ⚠️ 重要安全提醒：上線前必須修改 `config.yml` 中的 `jwt.secret` 與 `user_jwt.secret`。
>
> 請使用至少 32 位高強度隨機字符串，嚴禁使用模板默認值。

在 aaPanel 的 PM2/Supervisor 中添加啟動命令：

> 建議同時為該進程設置環境變量（用於初始化默認管理員，避免使用默認弱口令）：
>
> - `DJ_DEFAULT_ADMIN_USERNAME=admin`
> - `DJ_DEFAULT_ADMIN_PASSWORD=<你的強密碼>`

```bash
/www/wwwroot/dujiao-next/api/dujiao-next
```

工作目錄設置為：

```text
/www/wwwroot/dujiao-next/api
```

### 4.1 默認後臺管理員賬號（首次初始化）

當數據庫中 `admins` 表為空時，API 首次啟動會嘗試創建默認管理員：

- 默認賬號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登錄後臺後立即修改密碼。

如已在 PM2/Supervisor 設置 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`，則以你設置的值為準。

## 5. 部署 User 與 Admin（無需構建）

要求：Release 包內已經包含可直接託管的靜態文件（通常是 `dist`）；
若是 ZIP 包，請先解壓並確認 `user/dist`、`admin/dist` 目錄已存在。

建議目錄：

- User 站點根目錄：`/www/wwwroot/dujiao-next/user/dist`
- Admin 站點根目錄：`/www/wwwroot/dujiao-next/admin/dist`

## 6. 在 aaPanel 創建站點

建議兩個站點：

- 前臺站點：`shop.example.com` → 根目錄 `user/dist`
- 後臺站點：`admin.example.com`（或 `shop.example.com/admin`）→ 根目錄 `admin/dist`

併為兩者申請 SSL 證書。

## 7. 反向代理配置（同源模式）

在外層網關（Nginx）中添加：

- `/api` → `http://127.0.0.1:8080/api`
- `/uploads` → `http://127.0.0.1:8080/uploads`

### 7.1 分域名部署示例（推薦）

```nginx
# 前臺 User
server {
    listen 80;
    server_name shop.example.com;

    root /www/wwwroot/dujiao-next/user/dist;
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

    root /www/wwwroot/dujiao-next/admin/dist;
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

### 7.2 單域名 `/admin` 子路徑示例（可選）

```nginx
server {
    listen 80;
    server_name shop.example.com;

    root /www/wwwroot/dujiao-next/user/dist;
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
        alias /www/wwwroot/dujiao-next/admin/dist/;
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

前端 history 路由需配置 `try_files` 到 `index.html`。

## 8. 安全建議

- `config.yml` 中密鑰不要使用默認值
- 僅開放必要端口（80/443）
- API 不建議直接暴露在公網端口
- 生產模式請設置 `server.mode: release`
