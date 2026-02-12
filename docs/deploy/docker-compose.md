# Docker Compose 部署（Docker Hub 镜像）

> 更新时间：2026-02-11

## 1. 镜像对应关系

- API：`dujiaonext/api:tagname`
- User（用户前台）：`dujiaonext/user:tagname`
- Admin（后台）：`dujiaonext/admin:tagname`

## 2. 准备部署目录

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 关键：避免日志/数据库目录权限不足（api 容器默认非 root 用户）
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

目录说明：

- `config/`：API 配置文件（`config.yml`）
- `data/db`：SQLite 数据目录（仅 SQLite 方案使用）
- `data/uploads`：上传文件目录
- `data/logs`：API 日志目录
- `data/redis`：Redis 数据目录
- `data/postgres`：PostgreSQL 数据目录（仅 PostgreSQL 方案使用）

## 3. 准备 API 配置文件

API 容器默认读取 `/app/config.yml`，先下载模板：

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

你需要在 `./config/config.yml` 里按方案修改数据库与 Redis 配置。

> ⚠️ 重要安全提醒：上线前必须修改 JWT 密钥。
>
> - `jwt.secret`（后台管理员登录 Token）
> - `user_jwt.secret`（前台用户登录 Token）
>
> 请务必使用高强度随机字符串（建议至少 32 位），严禁使用模板默认值。否则会导致 Token 可伪造，存在严重安全风险。

### 3.1 方案 A：SQLite + Redis（推荐轻量部署）

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

### 3.2 方案 B：PostgreSQL + Redis（推荐生产）

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

```env
TAG=v0.0.1-beta
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
REDIS_PORT=6379
POSTGRES_PORT=5432

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

## 5. 编写 Compose 文件

## 5.1 方案 A（SQLite + Redis）：`docker-compose.sqlite.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a \"$${REDIS_PASSWORD}\" ping | grep PONG"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "${API_PORT}:8080"
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

  user:
    image: dujiaonext/user:${TAG}
    container_name: dujiaonext-user
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${USER_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

  admin:
    image: dujiaonext/admin:${TAG}
    container_name: dujiaonext-admin
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${ADMIN_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
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
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a \"$${REDIS_PASSWORD}\" ping | grep PONG"]
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
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - dujiao-net

  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "${API_PORT}:8080"
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

  user:
    image: dujiaonext/user:${TAG}
    container_name: dujiaonext-user
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${USER_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

  admin:
    image: dujiaonext/admin:${TAG}
    container_name: dujiaonext-admin
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${ADMIN_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

networks:
  dujiao-net:
    driver: bridge
```

## 6. 外层 Nginx 反向代理（必需）

`user` 与 `admin` 采用同源 `/api`、`/uploads` 访问后端，因此你需要在最外层网关（Nginx/Ingress）配置反向代理。

> 下方示例使用默认端口：
>
> - API: `127.0.0.1:8080`
> - User: `127.0.0.1:8081`
> - Admin: `127.0.0.1:8082`
>
> 如果你在 `.env` 修改了端口，请同步替换。

### 6.1 分域名部署示例（推荐）

```nginx
# 前台 User
server {
    listen 80;
    server_name user.example.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

### 6.2 单域名 `/admin` 子路径示例（可选）

如果你希望只暴露一个域名（例如 `shop.example.com`），可按下列方式配置：

```nginx
server {
    listen 80;
    server_name shop.example.com;

    # 前台 User
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后台 Admin
    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8082/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

如果没有 `/api` 和 `/uploads` 代理，User/Admin 页面虽然能打开，但接口与上传文件会访问失败。

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

当数据库中 `admins` 表为空，且 API 首次启动时，会使用以下默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后立即修改密码。

若你希望部署时就使用自定义管理员，请在 `.env` 中改写：

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

并保持 compose 中 `api` 服务已注入上述环境变量。

## 8. 升级与回滚

升级：

1. 修改 `.env` 中 `TAG` 为目标版本（例如 `v1.0.3`）
2. 执行 `docker compose --env-file .env -f <你的方案文件> pull`
3. 执行 `docker compose --env-file .env -f <你的方案文件> up -d`

回滚：

1. 将 `TAG` 改回历史版本
2. 执行 `docker compose --env-file .env -f <你的方案文件> up -d`

## 9. 访问与联通性检查

- API：`http://服务器IP:${API_PORT}/health`
- User：`http://服务器IP:${USER_PORT}`
- Admin：`http://服务器IP:${ADMIN_PORT}`

如页面可打开但接口异常，优先检查：

1. `config.yml` 中数据库与 Redis 地址是否与容器名一致（`postgres` / `redis`）
2. 外层网关是否已配置 `/api`、`/uploads` 反向代理
3. API 与 Redis/PostgreSQL 健康状态（`docker compose ps`）
