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

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:8080/uploads/;
}
```

同时建议：

- 前台与后台分别指向对应静态目录
- 前端路由开启 `try_files $uri $uri/ /index.html`

## 6. 启停与升级建议

- API 建议使用 `systemd` / `supervisor` 托管
- 发布时按顺序执行：
  1. 停止 API
  2. 更新代码并重新构建
  3. 替换 `user/dist`、`admin/dist`
  4. 启动 API
  5. 检查健康接口：`GET /health`
