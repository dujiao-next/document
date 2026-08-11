# Docker Compose 部署（Docker Hub 镜像）

> 更新时间：2026-07-26

若你尚未确定部署方式，建议先阅读 [部署总览与选型建议](/deploy/)。

## 1. 镜像对应关系

- 全栈服务：`dujiaonext/dujiao-next:tagname`

自 v1.4.0 起，用户前台与管理后台的前端已经内嵌进这一个镜像，**不再有 `dujiaonext/user` 与 `dujiaonext/admin` 镜像**。整套服务只需要 2 个容器（SQLite 方案）或 3 个容器（PostgreSQL 方案）。

::: tip 从 v1.3.x 升级
原来的 `dujiaonext/user` / `dujiaonext/admin` 容器可以直接删除，前端不再需要单独部署。
迁移步骤见 [升级与迁移](/deploy/upgrade)。
:::

## 2. 准备部署目录

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 关键：避免日志/数据库目录权限不足（api 容器默认非 root 用户）
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

目录说明：

- `config/`：配置文件（`config.yml`）
- `data/db`：SQLite 数据目录（仅 SQLite 方案使用）
- `data/uploads`：上传文件目录
- `data/logs`：日志目录
- `data/redis`：Redis 数据目录
- `data/postgres`：PostgreSQL 数据目录（仅 PostgreSQL 方案使用）

## 3. 准备配置文件

容器默认读取 `/app/config.yml`，先下载模板：

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

你需要在 `./config/config.yml` 里按方案修改数据库与 Redis 配置。

> ⚠️ 重要安全提醒：上线前必须修改三个运行时密钥。
>
> - `app.secret_key`（敏感数据加密根密钥）
> - `jwt.secret`（后台管理员登录 Token）
> - `user_jwt.secret`（前台用户登录 Token）
>
> 请分别生成至少 32 位的高强度随机字符串并确保三者不同，严禁使用模板默认值。`app.secret_key` 必须与数据库一起备份。

### 3.1 后台入口路径（新增，务必设置）

前端内嵌后，后台不再有独立域名，而是挂在同一个站点的某个路径下。默认 `/admin` 是扫描器的头号目标，**强烈建议改掉**：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 换成你自己的字符串
```

改完需要重启容器才会生效。

### 3.2 方案 A：SQLite + Redis（推荐轻量部署）

```yaml
database:
  driver: sqlite
  dsn: /app/db/dujiao.db

redis:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 0
  prefix: "dj"

queue:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 1
  concurrency: 10
  queues:
    default: 10
    critical: 5
```

### 3.3 方案 B：PostgreSQL + Redis（推荐生产）

```yaml
database:
  driver: postgres
  dsn: host=postgres user=dujiao password=dujiao_pass dbname=dujiao_next port=5432 sslmode=disable TimeZone=Asia/Shanghai

redis:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 0
  prefix: "dj"

queue:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 1
  concurrency: 10
  queues:
    default: 10
    critical: 5
```

## 4. 编写 `.env`

在 `/opt/dujiao-next/.env` 新建：

```dotenv
TAG=latest
TZ=Asia/Shanghai

# 只需要一个端口了
APP_PORT=8080

# 默认管理员（仅首次初始化时生效）
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123

# Redis
REDIS_PASSWORD=your-strong-redis-password

# PostgreSQL（PostgreSQL 方案需要）
POSTGRES_DB=dujiao_next
POSTGRES_USER=dujiao
POSTGRES_PASSWORD=dujiao_pass
```

> 🔒 **安全提示（务必阅读）：Docker 会绕过主机防火墙**
>
> Docker 通过直接写入 iptables 的 `DOCKER` 链来实现端口映射，**完全绕过 ufw / firewalld 等主机防火墙规则**。若在 compose 中写 `ports: - "6379:6379"`，即使你用 ufw 只放行了 80/443，Redis / PostgreSQL 等端口依然会暴露到公网，极易被扫描爆破。
>
> 因此本文档遵循两条原则：
>
> 1. **Redis / PostgreSQL 不导出任何端口**，仅通过内部 `dujiao-net` 网络供 `api` 容器访问。
> 2. **应用端口绑定 `127.0.0.1`**，仅允许本机 Nginx 反代，不对公网开放。
>
> 如需临时从宿主机调试 Redis/PostgreSQL，可用 `docker exec` 进入容器，或为对应服务临时添加 `ports: - "127.0.0.1:6379:6379"`（同样仅绑定本机回环）。

## 5. 编写 Compose 文件

## 5.1 方案 A（SQLite + Redis）：`docker-compose.sqlite.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:${TAG}
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:${APP_PORT}:8080"
    volumes:
      - ./config/config.yml:/app/config.yml:ro
      - ./data/db:/app/db
      - ./data/uploads:/app/uploads
      - ./data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

networks:
  dujiao-net:
    driver: bridge
```

## 5.2 方案 B（PostgreSQL + Redis）：`docker-compose.postgres.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  postgres:
    image: postgres:16-alpine
    container_name: dujiaonext-postgres
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:${TAG}
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:${APP_PORT}:8080"
    volumes:
      - ./config/config.yml:/app/config.yml:ro
      - ./data/uploads:/app/uploads
      - ./data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

networks:
  dujiao-net:
    driver: bridge
```

## 6. 外层 Nginx 反向代理

前台、后台、API、上传文件、`sitemap.xml`、`robots.txt` 全部由同一个端口提供，因此反代只需要一个域名、一条 `location /`：

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

访问方式：

- 用户前台：`https://shop.example.com`
- 管理后台：`https://shop.example.com/<web.admin_path>`

::: tip 相比 v1.3.x 简化了什么
旧版需要两个 `server` 块（前台域名 + 后台域名），并且要给 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt` 分别写 `location` 转发到 API 容器，漏了任何一条都会出问题（最常见的是 SEO 资源被 SPA 兜底成 404）。现在这些路径都由同一个进程处理，不需要再拆分。
:::

## 7. 启动与运维命令

### 7.1 启动（SQLite + Redis）

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml up -d
```

### 7.2 启动（PostgreSQL + Redis）

```bash
docker compose --env-file .env -f docker-compose.postgres.yml up -d
```

### 7.3 常用命令

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml ps
docker compose --env-file .env -f docker-compose.sqlite.yml logs -f api
docker compose --env-file .env -f docker-compose.sqlite.yml down
```

> 若使用 PostgreSQL 方案，将文件名替换为 `docker-compose.postgres.yml` 即可。

### 7.4 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空，且服务首次启动时，会使用以下默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后立即修改密码。

若你希望部署时就使用自定义管理员，请在 `.env` 中改写：

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

并保持 compose 中 `api` 服务已注入上述环境变量。

## 8. 升级与回滚

升级：

1. 修改 `.env` 中 `TAG` 为目标版本（例如 `v1.4.0`）
2. 执行 `docker compose --env-file .env -f <你的方案文件> pull`
3. 执行 `docker compose --env-file .env -f <你的方案文件> up -d`

前端随镜像一起更新，不需要额外操作。

回滚：

1. 将 `TAG` 改回历史版本
2. 执行 `docker compose --env-file .env -f <你的方案文件> up -d`

## 9. 访问与联通性检查

由于容器端口已绑定到 `127.0.0.1`，请在**服务器本机**检查：

- 健康检查：`curl http://127.0.0.1:${APP_PORT}/health`
- 用户前台：`curl -I http://127.0.0.1:${APP_PORT}/`
- 管理后台：`curl -I http://127.0.0.1:${APP_PORT}/<web.admin_path>/`

外部用户应通过配置好的域名（经 Nginx 反代）访问。

启动日志里应该能看到这一行，说明前端已正确内嵌并挂载：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

如页面可打开但接口异常，优先检查：

1. `config.yml` 中数据库与 Redis 地址是否与容器名一致（`postgres` / `redis`）
2. `web.admin_path` 是否与你访问的路径一致（改动后需重启容器）
3. 容器与 Redis/PostgreSQL 健康状态（`docker compose ps`）
