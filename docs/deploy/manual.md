# 手动部署（API / User / Admin）

> 更新时间：2026-02-11

本文档适合希望完全掌控部署过程的开发者，分为「编译」与「运行」两部分。

## 1. 获取源码

```bash
mkdir dujiao-next && cd dujiao-next

# API（主项目）
git clone https://github.com/dujiao-next/dujiao-next.git api

# User（用户前台）
git clone https://github.com/dujiao-next/user.git user

# Admin（后台）
git clone https://github.com/dujiao-next/admin.git admin
```

> 若你当前使用的是历史单仓目录（`web/`），请将下文 `user/` 替换为 `web/`。

## 2. 后端 API 部署

### 2.1 安装依赖并构建

```bash
cd api
go mod tidy
go build -o dujiao-api ./cmd/server
```

### 2.2 配置文件

```bash
cp config.yml.example config.yml
# 按实际环境修改 config.yml
```

关键项至少要确认：

- `server.mode`（debug/release）
- `database.driver` / `database.dsn`
- `jwt.secret` / `user_jwt.secret`
- `redis`、`queue`、`email`（按需启用）

> ⚠️ 重要安全提醒：上线前必须修改 `jwt.secret` 与 `user_jwt.secret`，并使用至少 32 位高强度随机字符串。
>
> 严禁使用模板默认值，否则可能导致 Token 可伪造，存在严重安全风险。

### 2.3 初始化数据（可选）

```bash
go run ./cmd/seed
```

### 2.4 运行 API

```bash
./dujiao-api
```

默认监听：`http://0.0.0.0:8080`

### 2.5 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空时，系统会在 API 首次启动时尝试创建默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后，立刻在“后台 -> 修改密码”中更换为强密码。

说明：

- 你可以在启动 API 前设置环境变量覆盖默认值：
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- 若 `server.mode=release` 且未设置 `DJ_DEFAULT_ADMIN_PASSWORD`，系统会跳过默认管理员初始化（不会自动创建 `admin/admin123`）。

## 3. 用户前台 User 部署

### 3.1 安装依赖与构建

```bash
cd ../user
npm install
npm run build
```

构建产物目录：`user/dist`

### 3.2 运行方式

你可以选择：

- 用 Nginx 托管 `user/dist`
- 或临时使用 `npm run preview` 验证

## 4. 后台 Admin 部署

### 4.1 安装依赖与构建

```bash
cd ../admin
npm install
npm run build
```

构建产物目录：`admin/dist`

### 4.2 运行方式

你可以选择：

- 用 Nginx 托管 `admin/dist`（建议绑定 `/admin` 路径）
- 或临时使用 `npm run preview` 验证

## 5. Nginx 反向代理建议（同源模式）

推荐采用同源代理模式：User 与 Admin 前端统一请求 `/api`、`/uploads`，由外层 Nginx 转发到 API 服务（`127.0.0.1:8080`）。

### 5.1 分域名部署示例（推荐）

- 前台：`user.example.com` → `user/dist`
- 后台：`admin.example.com` → `admin/dist`

```nginx
# 前台 User
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

# 后台 Admin
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

### 5.2 单域名 `/admin` 子路径示例（可选）

```nginx
server {
    listen 80;
    server_name shop.example.com;

    root /var/www/dujiao-next/user/dist;
    index index.html;

    # 前台 User
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后台 Admin
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

同时建议：

- 前台与后台分别绑定独立域名（更清晰）
- 开启 HTTPS 并强制跳转到 443
- 前端 SPA 路由必须保留 `try_files ... /index.html`

## 6. 启停与升级建议

- API 建议使用 `systemd` / `supervisor` 托管
- 发布时按顺序执行：
  1. 停止 API
  2. 更新代码并重新构建
  3. 替换 `user/dist`、`admin/dist`
  4. 启动 API
  5. 检查健康接口：`GET /health`
