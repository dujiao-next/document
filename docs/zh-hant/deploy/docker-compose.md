# Docker Compose 部署（Docker Hub 鏡像）

> 更新時間：2026-02-11

## 1. 鏡像對應關係

- API：`dujiaonext/api:tagname`
- User（用戶前臺）：`dujiaonext/user:tagname`
- Admin（後臺）：`dujiaonext/admin:tagname`

## 2. 準備部署目錄

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 關鍵：避免日誌/數據庫目錄權限不足（api 容器默認非 root 用戶）
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

目錄說明：

- `config/`：API 配置文件（`config.yml`）
- `data/db`：SQLite 數據目錄（僅 SQLite 方案使用）
- `data/uploads`：上傳文件目錄
- `data/logs`：API 日誌目錄
- `data/redis`：Redis 數據目錄
- `data/postgres`：PostgreSQL 數據目錄（僅 PostgreSQL 方案使用）

## 3. 準備 API 配置文件

API 容器默認讀取 `/app/config.yml`，先下載模板：

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

你需要在 `./config/config.yml` 裡按方案修改數據庫與 Redis 配置。

> ⚠️ 重要安全提醒：上線前必須修改 JWT 密鑰。
>
> - `jwt.secret`（後臺管理員登錄 Token）
> - `user_jwt.secret`（前臺用戶登錄 Token）
>
> 請務必使用高強度隨機字符串（建議至少 32 位），嚴禁使用模板默認值。否則會導致 Token 可偽造，存在嚴重安全風險。

### 3.1 方案 A：SQLite + Redis（推薦輕量部署）

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

### 3.2 方案 B：PostgreSQL + Redis（推薦生產）

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

## 4. 編寫 `.env`

在 `/opt/dujiao-next/.env` 新建：

```env
TAG=v0.0.1-beta
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
REDIS_PORT=6379
POSTGRES_PORT=5432

# 默認管理員（僅首次初始化時生效）
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123

# Redis
REDIS_PASSWORD=your-strong-redis-password

# PostgreSQL（PostgreSQL 方案需要）
POSTGRES_DB=dujiao_next
POSTGRES_USER=dujiao
POSTGRES_PASSWORD=dujiao_pass
```

## 5. 編寫 Compose 文件

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

## 6. 外層 Nginx 反向代理（必需）

`user` 與 `admin` 採用同源 `/api`、`/uploads` 訪問後端，因此你需要在最外層網關（Nginx/Ingress）配置反向代理。

> 下方示例使用默認端口：
>
> - API: `127.0.0.1:8080`
> - User: `127.0.0.1:8081`
> - Admin: `127.0.0.1:8082`
>
> 如果你在 `.env` 修改了端口，請同步替換。

### 6.1 分域名部署示例（推薦）

```nginx
# 前臺 User
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

# 後臺 Admin
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

### 6.2 單域名 `/admin` 子路徑示例（可選）

如果你希望只暴露一個域名（例如 `shop.example.com`），可按下列方式配置：

```nginx
server {
    listen 80;
    server_name shop.example.com;

    # 前臺 User
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 後臺 Admin
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

如果沒有 `/api` 和 `/uploads` 代理，User/Admin 頁面雖然能打開，但介面與上傳文件會訪問失敗。

## 7. 啟動與運維命令

### 7.1 啟動（SQLite + Redis）

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml up -d
```

### 7.2 啟動（PostgreSQL + Redis）

```bash
docker compose --env-file .env -f docker-compose.postgres.yml up -d
```

### 7.3 常用命令

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml ps
docker compose --env-file .env -f docker-compose.sqlite.yml logs -f api
docker compose --env-file .env -f docker-compose.sqlite.yml down
```

> 若使用 PostgreSQL 方案，將文件名替換為 `docker-compose.postgres.yml` 即可。

### 7.4 默認後臺管理員賬號（首次初始化）

當數據庫中 `admins` 表為空，且 API 首次啟動時，會使用以下默認管理員：

- 默認賬號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登錄後臺後立即修改密碼。

若你希望部署時就使用自定義管理員，請在 `.env` 中改寫：

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

並保持 compose 中 `api` 服務已注入上述環境變量。

## 8. 升級與回滾

升級：

1. 修改 `.env` 中 `TAG` 為目標版本（例如 `v1.0.3`）
2. 執行 `docker compose --env-file .env -f <你的方案文件> pull`
3. 執行 `docker compose --env-file .env -f <你的方案文件> up -d`

回滾：

1. 將 `TAG` 改回歷史版本
2. 執行 `docker compose --env-file .env -f <你的方案文件> up -d`

## 9. 訪問與聯通性檢查

- API：`http://服務器IP:${API_PORT}/health`
- User：`http://服務器IP:${USER_PORT}`
- Admin：`http://服務器IP:${ADMIN_PORT}`

如頁面可打開但介面異常，優先檢查：

1. `config.yml` 中數據庫與 Redis 地址是否與容器名一致（`postgres` / `redis`）
2. 外層網關是否已配置 `/api`、`/uploads` 反向代理
3. API 與 Redis/PostgreSQL 健康狀態（`docker compose ps`）
