# 手动部署（源码构建）

> 更新时间：2026-07-26

若你尚未确定部署方式，建议先阅读 [部署总览与选型建议](/deploy/)。

本文档适合希望完全掌控构建过程、或需要二次开发的开发者。

自 v1.4.0 起，前端源码已并入主仓库的 `frontend/` 目录，**只需要 clone 一个仓库**，构建产物通过 `go:embed` 打进二进制。

## 1. 环境要求

- Go（版本见仓库 `go.mod`）
- Node.js 24.x
- pnpm 10.34.3（`corepack enable` 即可）

## 2. 获取源码

```bash
git clone https://github.com/dujiao-next/dujiao-next.git
cd dujiao-next
```

仓库结构：

```
dujiao-next/
├── cmd/server/          # 程序入口
├── internal/
│   └── web/             # 前端嵌入与 SPA 路由挂载
├── frontend/
│   ├── admin/           # 管理后台（Vue 3 + Vite）
│   └── user/            # 用户前台（Vue 3 + Vite）
├── config.yml.example
└── .goreleaser.yaml
```

## 3. 一键构建（推荐）

仓库已经用 GoReleaser 描述了完整构建流程（含前端构建与嵌入），本地跑一条命令即可：

```bash
goreleaser build --snapshot --single-target --clean
```

产物在 `dist/` 下，是一个内嵌前端的完整二进制。这条命令与 CI 发布走的是同一条路径。

如果没装 GoReleaser，按下一节手工构建。

## 4. 手工构建

### 4.1 构建前端

```bash
# 管理后台：必须用 fullstack 模式，会注入 <base> 占位符供后端运行时替换
cd frontend/admin
pnpm install --frozen-lockfile
pnpm run build:fullstack

# 用户前台
cd ../user
pnpm install --frozen-lockfile
pnpm run build

cd ../..
```

::: warning admin 必须用 build:fullstack
`pnpm run build`（不带 `:fullstack`）产出的是给独立域名部署用的版本，`base` 固定为 `/`，
嵌入后挂在自定义前缀下会加载不到静态资源。嵌入场景一律用 `build:fullstack`。
:::

### 4.2 拷贝产物到嵌入目录

`go:embed` 只能读取包目录内的文件，所以前端产物必须放到 `internal/web/dist/` 下：

```bash
rm -rf internal/web/dist
mkdir -p internal/web/dist
cp -r frontend/admin/dist internal/web/dist/admin
cp -r frontend/user/dist  internal/web/dist/user
```

### 4.3 编译二进制

```bash
CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" \
  -o dujiao-next ./cmd/server
```

`-tags fullstack` 是关键：不带它编译出来的二进制不含前端，只提供 API。

交叉编译示例（在 macOS 上编译 Linux 版本）：

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" -o dujiao-next-linux-amd64 ./cmd/server
```

### 4.4 只要 API、不要前端

用于二次开发或前后端分离的自定义场景：

```bash
go build -o dujiao-api ./cmd/server
```

此时 `/` 与后台路径都不会被挂载，你需要自行用 Nginx 托管前端产物，
并把 `/api`、`/uploads`、`/sitemap.xml`、`/robots.txt` 反代到本服务。

## 5. 配置

```bash
cp config.yml.example config.yml
# 按实际环境修改 config.yml
```

关键项至少要确认：

- `server.mode`（debug/release）
- `database.driver` / `database.dsn`
- `jwt.secret` / `user_jwt.secret`
- `web.admin_path`（后台入口路径，**务必改掉默认的 `/admin`**）
- `redis`、`queue`、`email`（按需启用）

> ⚠️ 重要安全提醒：上线前必须修改 `jwt.secret` 与 `user_jwt.secret`，并使用至少 32 位高强度随机字符串。
>
> 严禁使用模板默认值，否则可能导致 Token 可伪造，存在严重安全风险。

## 6. 运行

```bash
./dujiao-next
```

默认监听：`http://0.0.0.0:8080`

启动日志出现下面这行，说明前端已正确内嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 6.1 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空时，系统会在首次启动时尝试创建默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后，立刻在「后台 -> 修改密码」中更换为强密码。

说明：

- 你可以在启动前设置环境变量覆盖默认值：
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- 若 `server.mode=release` 且未设置 `DJ_DEFAULT_ADMIN_PASSWORD`，系统会跳过默认管理员初始化（不会自动创建 `admin/admin123`）。

## 7. Nginx 反向代理配置

整站转发到同一个端口即可，不需要按路径拆分：

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

## 8. 本地开发

开发时不需要每次都嵌入前端，直接分别跑三个进程，前端有热重载：

```bash
# 终端 1：后端（不带 fullstack tag，不挂载 SPA）
go run ./cmd/server

# 终端 2：用户前台 http://localhost:5173
cd frontend/user && pnpm run dev

# 终端 3：管理后台 http://localhost:5174
cd frontend/admin && pnpm run dev
```

两个前端的 Vite dev server 已配置好把 `/api`、`/uploads` 代理到 `localhost:8080`，
用户前台还额外代理了 `/sitemap.xml` 与 `/robots.txt`。

## 9. 启停与升级建议

- 建议使用 `systemd` / `supervisor` 托管（systemd unit 示例见 [单二进制部署](/deploy/binary#_8-系统服务-systemd)）
- 发布时按顺序执行：
  1. 停止服务
  2. 更新代码并重新构建（前端会一并打进二进制）
  3. 替换二进制
  4. 启动服务
  5. 检查健康接口：`GET /health`
