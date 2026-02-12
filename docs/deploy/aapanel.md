# 使用 aaPanel 手动部署（基于 Releases 压缩包）

> 更新时间：2026-02-12

本文档适用于你已在各仓库 Release 中提供编译产物压缩包的部署方式。

特点：

- 不需要在服务器 `git clone` 源码
- 不需要在服务器执行 `go build` / `npm run build`
- 只做“上传（或下载）→ 解压 → 配置 → 启动”

## 1. 面板与软件准备

在 aaPanel 中安装：

- Nginx
- PM2 管理器（或 Supervisor）
- 解压工具（`unzip` / `tar`）
- Redis（按需）
- PostgreSQL（按需）

> 此部署方案不依赖 Git、Go、Node.js 编译环境。

## 2. 准备目录

```bash
mkdir -p /www/wwwroot/dujiao-next/{api,user,admin}
cd /www/wwwroot/dujiao-next
```

## 3. 下载并解压 Release 包

请从以下仓库的 Releases 下载对应版本压缩包（建议三端使用同一版本号）：

- API（主项目）：`https://github.com/dujiao-next/dujiao-next/releases`
- User（用户前台）：`https://github.com/dujiao-next/user/releases`
- Admin（后台）：`https://github.com/dujiao-next/admin/releases`

示例（文件名按你的实际 Release 产物替换）：

> API 压缩包命名遵循 GoReleaser 规则：`dujiao-next_<tag>_Linux_x86_64.tar.gz`，例如 `dujiao-next_v0.0.1-beta_Linux_x86_64.tar.gz`。
> User 压缩包命名示例：`dujiao-next-user-v0.0.1-beta.zip`。
> Admin 压缩包命名示例：`dujiao-next-admin-v0.0.1-beta.zip`。

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

> API 压缩包解压后，`/www/wwwroot/dujiao-next/api` 目录中应包含：
> - `config.yml.example`
> - `dujiao-next`
> - `README.md`


## 4. 部署 API（无需编译）

确认 API 解压目录中存在以下文件：`config.yml.example`、`dujiao-next`、`README.md`。

```bash
cd /www/wwwroot/dujiao-next/api
cp config.yml.example config.yml
# 编辑 config.yml
chmod +x ./dujiao-next
```

> ⚠️ 重要安全提醒：上线前必须修改 `config.yml` 中的 `jwt.secret` 与 `user_jwt.secret`。
>
> 请使用至少 32 位高强度随机字符串，严禁使用模板默认值。

在 aaPanel 的 PM2/Supervisor 中添加启动命令：

> 建议同时为该进程设置环境变量（用于初始化默认管理员，避免使用默认弱口令）：
>
> - `DJ_DEFAULT_ADMIN_USERNAME=admin`
> - `DJ_DEFAULT_ADMIN_PASSWORD=<你的强密码>`

```bash
/www/wwwroot/dujiao-next/api/dujiao-next
```

工作目录设置为：

```text
/www/wwwroot/dujiao-next/api
```

### 4.1 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空时，API 首次启动会尝试创建默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后立即修改密码。

如已在 PM2/Supervisor 设置 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`，则以你设置的值为准。

## 5. 部署 User 与 Admin（无需构建）

要求：Release 包内已经包含可直接托管的静态文件（通常是 `dist`）；
若是 ZIP 包，请先解压并确认 `user/dist`、`admin/dist` 目录已存在。

建议目录：

- User 站点根目录：`/www/wwwroot/dujiao-next/user/dist`
- Admin 站点根目录：`/www/wwwroot/dujiao-next/admin/dist`

## 6. 在 aaPanel 创建站点

建议两个站点：

- 前台站点：`shop.example.com` → 根目录 `user/dist`
- 后台站点：`admin.example.com`（或 `shop.example.com/admin`）→ 根目录 `admin/dist`

并为两者申请 SSL 证书。

## 7. 反向代理配置（同源模式）

在外层网关（Nginx）中添加：

- `/api` → `http://127.0.0.1:8080/api`
- `/uploads` → `http://127.0.0.1:8080/uploads`

### 7.1 分域名部署示例（推荐）

```nginx
# 前台 User
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

# 后台 Admin
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

### 7.2 单域名 `/admin` 子路径示例（可选）

```nginx
server {
    listen 80;
    server_name shop.example.com;

    root /www/wwwroot/dujiao-next/user/dist;
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

## 8. 安全建议

- `config.yml` 中密钥不要使用默认值
- 仅开放必要端口（80/443）
- API 不建议直接暴露在公网端口
- 生产模式请设置 `server.mode: release`
