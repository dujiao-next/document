# 环境要求

> 更新时间：2026-02-11  

## 1. 最低运行要求

### 1.1 操作系统

推荐以下任一系统：

- Linux（推荐 Ubuntu 22.04+ / Debian 12+）
- macOS（Apple Silicon / Intel 均可）
- Windows 10/11（建议使用 WSL2）

### 1.2 运行时与工具链

- Go：`1.26.3`（与 `api/go.mod` 一致）
- Node.js：`20 LTS` 或更高
- npm：`10+`
- Git：`2.30+`

### 1.3 数据与中间件

- 数据库：
  - SQLite（默认，单机快速部署）
  - PostgreSQL（生产推荐）
- Redis：`6+`（缓存、队列、限流建议启用）

## 2. 推荐生产环境配置

- CPU：1 核及以上
- 内存：1GB 及以上
- 磁盘：20GB 及以上（含日志、上传、数据库）
- 网络：可访问支付网关与邮件服务

## 3. 端口规划建议

- 生产环境：只需要 `8080` 一个端口。前台在 `/`，后台在 `web.admin_path`，
  API 与上传文件也都由这个端口提供。
- 开发环境额外使用：
  - User 前台 dev server：`5173`
  - Admin 后台 dev server：`5174`
  - 文档（VitePress）：`5175`（示例，可自定义）

## 4. 开发环境自检命令

```bash
# 在仓库根目录执行
go version
node -v
pnpm -v          # 未安装可执行 corepack enable

# 后端依赖同步
go mod tidy

# 两端前台依赖安装
cd frontend/user  && pnpm install
cd ../admin       && pnpm install
```

## 5. 常见问题


### 5.1 Go 版本不一致

如果你使用的 Go 低于 `1.26.3`，可能出现编译失败或依赖解析异常，建议升级到与 `go.mod` 一致版本。

### 5.2 Redis 未启动

当 `config.yml` 中 `redis.enabled=true` 或 `queue.enabled=true` 时，Redis 不可用会导致部分功能（如队列、限流）不可用。
