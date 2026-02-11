# 环境要求

> 更新时间：2026-02-11  

## 1. 最低运行要求

### 1.1 操作系统

推荐以下任一系统：

- Linux（推荐 Ubuntu 22.04+ / Debian 12+）
- macOS（Apple Silicon / Intel 均可）
- Windows 10/11（建议使用 WSL2）

### 1.2 运行时与工具链

- Go：`1.25.3`（与 `api/go.mod` 一致）
- Node.js：`20 LTS` 或更高
- npm：`10+`
- Git：`2.30+`

### 1.3 数据与中间件

- 数据库：
  - SQLite（默认，单机快速部署）
  - PostgreSQL（生产推荐）
- Redis：`6+`（缓存、队列、限流建议启用）

## 2. 推荐生产环境配置

- CPU：2 核及以上
- 内存：4GB 及以上
- 磁盘：20GB 及以上（含日志、上传、数据库）
- 网络：可访问支付网关与邮件服务

## 3. 端口规划建议

- API：`8080`
- User：`5173`（开发）
- Admin：`5174`（开发）
- 文档（VitePress）：`5175`（示例，可自定义）

## 4. 开发环境自检命令

```bash
# Go
cd api && go version

# Node / npm
node -v
npm -v

# User/Admin 前后台依赖安装
cd user && npm install
cd ../admin && npm install

# 后端依赖同步
cd ../api && go mod tidy
```

## 5. 常见问题


### 5.1 Go 版本不一致

如果你使用的 Go 低于 `1.25.3`，可能出现编译失败或依赖解析异常，建议升级到与 `go.mod` 一致版本。

### 5.2 Redis 未启动

当 `config.yml` 中 `redis.enabled=true` 或 `queue.enabled=true` 时，Redis 不可用会导致部分功能（如队列、限流）不可用。
