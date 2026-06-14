# Docker Compose 部署（Docker Hub 鏡像）

> 更新時間：2026-02-27

若你尚未確定部署方式，建議先閱讀 [部署總覽與選型建議](/zh-hant/deploy/)。

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
TAG=latest
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082

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

> 🔒 **安全提示（務必閱讀）：Docker 會繞過主機防火牆**
>
> Docker 通過直接寫入 iptables 的 `DOCKER` 鏈來實現端口映射，**完全繞過 ufw / firewalld 等主機防火牆規則**。若在 compose 中寫 `ports: - "6379:6379"`，即使你用 ufw 只放行了 80/443，Redis / PostgreSQL 等端口依然會暴露到公網，極易被掃描爆破。
>
> 因此本文檔遵循兩條原則：
>
> 1. **Redis / PostgreSQL 不導出任何端口**，僅通過內部 `dujiao-net` 網絡供 `api` 容器訪問。
> 2. **API / User / Admin 端口綁定 `127.0.0.1`**，僅允許本機 Nginx 反代，不對公網開放。
>
> 如需臨時從宿主機調試 Redis/PostgreSQL，可用 `docker exec` 進入容器，或為對應服務臨時添加 `ports: - "127.0.0.1:6379:6379"`（同樣僅綁定本機回環）。

## 5. 編寫 Compose 文件

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

  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:${API_PORT}:8080"
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
      - "127.0.0.1:${USER_PORT}:80"
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
      - "127.0.0.1:${ADMIN_PORT}:80"
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

  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "127.0.0.1:${API_PORT}:8080"
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
      - "127.0.0.1:${USER_PORT}:80"
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
      - "127.0.0.1:${ADMIN_PORT}:80"
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

`user` 與 `admin` 分別透過各自網域的 `/api`、`/uploads` 路徑訪問後端，因此你需要在最外層網關（Nginx/Ingress）配置反向代理。前臺網域還需要把 `/sitemap.xml` 與 `/robots.txt` 反代到後端，否則會被 SPA 路由兜底為 NotFound，搜尋引擎抓不到。

> 下方示例使用默認端口：
>
> - API: `127.0.0.1:8080`
> - User: `127.0.0.1:8081`
> - Admin: `127.0.0.1:8082`
>
> 如果你在 `.env` 修改了端口，請同步替換。

### 6.1 分域名部署示例

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

    # SEO 資源由後端動態生成，必須顯式反代，否則會被上面的 SPA 兜底攔截
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080/sitemap.xml;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:8080/robots.txt;
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

1. 修改 `.env` 中 `TAG` 為目標版本（例如 `v1.0.0`）
2. 執行 `docker compose --env-file .env -f <你的方案文件> pull`
3. 執行 `docker compose --env-file .env -f <你的方案文件> up -d`

回滾：

1. 將 `TAG` 改回歷史版本
2. 執行 `docker compose --env-file .env -f <你的方案文件> up -d`

## 9. 訪問與聯通性檢查

由於容器端口已綁定到 `127.0.0.1`，請在**服務器本機**檢查：

- API：`http://127.0.0.1:${API_PORT}/health`
- User：`http://127.0.0.1:${USER_PORT}`
- Admin：`http://127.0.0.1:${ADMIN_PORT}`

外部用戶應通過配置好的域名（經 Nginx 反代）訪問。

如頁面可打開但介面異常，優先檢查：

1. `config.yml` 中數據庫與 Redis 地址是否與容器名一致（`postgres` / `redis`）
2. 外層網關是否已配置 `/api`、`/uploads` 反向代理（前臺還需 `/sitemap.xml`、`/robots.txt`）
3. API 與 Redis/PostgreSQL 健康狀態（`docker compose ps`）
