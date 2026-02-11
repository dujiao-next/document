# 使用 aaPanel 手动部署（基于 Releases 压缩包）

> 更新时间：2026-02-11

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

```bash
# API
wget -O api.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.0.0/api-v1.0.0-linux-amd64.tar.gz
mkdir -p api && tar -xzf api.tar.gz -C api

# User
wget -O user.tar.gz https://github.com/dujiao-next/user/releases/download/v1.0.0/user-v1.0.0-dist.tar.gz
mkdir -p user && tar -xzf user.tar.gz -C user

# Admin
wget -O admin.tar.gz https://github.com/dujiao-next/admin/releases/download/v1.0.0/admin-v1.0.0-dist.tar.gz
mkdir -p admin && tar -xzf admin.tar.gz -C admin
```

## 4. 部署 API（无需编译）

确保 API 目录中存在可执行文件（例如 `dujiao-api`）和配置模板（`config.yml.example`）。

```bash
cd /www/wwwroot/dujiao-next/api
cp config.yml.example config.yml
# 编辑 config.yml
chmod +x ./dujiao-api
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
/www/wwwroot/dujiao-next/api/dujiao-api
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

要求：Release 包内已经包含可直接托管的静态文件（通常是 `dist`）。

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

示例：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:8080/uploads/;
}
```

前端 history 路由需配置 `try_files` 到 `index.html`。

## 8. 安全建议

- `config.yml` 中密钥不要使用默认值
- 仅开放必要端口（80/443）
- API 不建议直接暴露在公网端口
- 生产模式请设置 `server.mode: release`
