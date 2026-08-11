# Docker Compose 部署（Docker Hub 鏡像）

> 更新時間：2026-07-26

若你尚未確定部署方式，建議先閱讀 [部署總覽與選型建議](/zh-hant/deploy/)。

## 1. 鏡像對應關係

- 全端服務：`dujiaonext/dujiao-next:tagname`

自 v1.4.0 起，用戶前臺與管理後臺的前端已經內嵌進這一個鏡像，**不再有 `dujiaonext/user` 與 `dujiaonext/admin` 鏡像**。整套服務只需要 2 個容器（SQLite 方案）或 3 個容器（PostgreSQL 方案）。

::: tip 從 v1.3.x 升級
原來的 `dujiaonext/user` / `dujiaonext/admin` 容器可以直接刪除，前端不再需要單獨部署。
遷移步驟見 [升級與遷移](/zh-hant/deploy/upgrade)。
:::

## 2. 準備部署目錄

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 關鍵：避免日誌/資料庫目錄權限不足（api 容器默認非 root 使用者）
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

目錄說明：

- `config/`：配置檔案（`config.yml`）
- `data/db`：SQLite 資料目錄（僅 SQLite 方案使用）
- `data/uploads`：上傳檔案目錄
- `data/logs`：日誌目錄
- `data/redis`：Redis 資料目錄
- `data/postgres`：PostgreSQL 資料目錄（僅 PostgreSQL 方案使用）

## 3. 準備配置檔案

容器默認讀取 `/app/config.yml`，先下載範本：

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

你需要在 `./config/config.yml` 裡按方案修改資料庫與 Redis 配置。

> ⚠️ 重要安全提醒：上線前必須修改三個執行時期密鑰。
>
> - `app.secret_key`（敏感資料加密根密鑰）
> - `jwt.secret`（後臺管理員登入 Token）
> - `user_jwt.secret`（前臺用戶登入 Token）
>
> 請分別產生至少 32 位的高強度隨機字串並確保三者不同，嚴禁使用範本默認值。`app.secret_key` 必須與資料庫一起備份。

### 3.1 後臺入口路徑（新增，務必設定）

前端內嵌後，後臺不再有獨立網域，而是掛在同一個站點的某個路徑下。默認 `/admin` 是掃描器的頭號目標，**強烈建議改掉**：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 換成你自己的字串
```

改完需要重啟容器才會生效。

### 3.2 方案 A：SQLite + Redis（推薦輕量部署）

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

### 3.3 方案 B：PostgreSQL + Redis（推薦生產）

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

```dotenv
TAG=latest
TZ=Asia/Shanghai

# 只需要一個埠了
APP_PORT=8080

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
> Docker 透過直接寫入 iptables 的 `DOCKER` 鏈來實現埠映射，**完全繞過 ufw / firewalld 等主機防火牆規則**。若在 compose 中寫 `ports: - "6379:6379"`，即使你用 ufw 只放行了 80/443，Redis / PostgreSQL 等埠依然會暴露到公網，極易被掃描爆破。
>
> 因此本文件遵循兩條原則：
>
> 1. **Redis / PostgreSQL 不匯出任何埠**，僅透過內部 `dujiao-net` 網路供 `api` 容器存取。
> 2. **應用埠綁定 `127.0.0.1`**，僅允許本機 Nginx 反向代理，不對公網開放。
>
> 如需臨時從宿主機除錯 Redis/PostgreSQL，可用 `docker exec` 進入容器，或為對應服務臨時新增 `ports: - "127.0.0.1:6379:6379"`（同樣僅綁定本機回環）。

## 5. 編寫 Compose 檔案

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

## 6. 外層 Nginx 反向代理

前臺、後臺、API、上傳檔案、`sitemap.xml`、`robots.txt` 全部由同一個埠提供，因此反向代理只需要一個網域、一條 `location /`：

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

存取方式：

- 用戶前臺：`https://shop.example.com`
- 管理後臺：`https://shop.example.com/<web.admin_path>`

::: tip 相比 v1.3.x 簡化了什麼
舊版需要兩個 `server` 區塊（前臺網域 + 後臺網域），並且要給 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt` 分別寫 `location` 轉發到 API 容器，漏了任何一條都會出問題（最常見的是 SEO 資源被 SPA 兜底成 404）。現在這些路徑都由同一個行程處理，不需要再拆分。
:::

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

> 若使用 PostgreSQL 方案，將檔名替換為 `docker-compose.postgres.yml` 即可。

### 7.4 默認後臺管理員帳號（首次初始化）

當資料庫中 `admins` 表為空，且服務首次啟動時，會使用以下默認管理員：

- 默認帳號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登入後臺後立即修改密碼。

若你希望部署時就使用自訂管理員，請在 `.env` 中改寫：

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

並保持 compose 中 `api` 服務已注入上述環境變量。

## 8. 升級與回滾

升級：

1. 修改 `.env` 中 `TAG` 為目標版本（例如 `v1.4.0`）
2. 執行 `docker compose --env-file .env -f <你的方案檔案> pull`
3. 執行 `docker compose --env-file .env -f <你的方案檔案> up -d`

前端隨鏡像一起更新，不需要額外操作。

回滾：

1. 將 `TAG` 改回歷史版本
2. 執行 `docker compose --env-file .env -f <你的方案檔案> up -d`

## 9. 存取與連通性檢查

由於容器埠已綁定到 `127.0.0.1`，請在**伺服器本機**檢查：

- 健康檢查：`curl http://127.0.0.1:${APP_PORT}/health`
- 用戶前臺：`curl -I http://127.0.0.1:${APP_PORT}/`
- 管理後臺：`curl -I http://127.0.0.1:${APP_PORT}/<web.admin_path>/`

外部使用者應透過配置好的網域（經 Nginx 反向代理）存取。

啟動日誌裡應該能看到這一行，表示前端已正確內嵌並掛載：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

如頁面可開啟但介面異常，優先檢查：

1. `config.yml` 中資料庫與 Redis 位址是否與容器名一致（`postgres` / `redis`）
2. `web.admin_path` 是否與你存取的路徑一致（改動後需重啟容器）
3. 容器與 Redis/PostgreSQL 健康狀態（`docker compose ps`）
