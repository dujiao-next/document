# Docker Compose Deployment (Docker Hub Images)

> Last Updated: 2026-02-11

## 1. Image Correspondence

- API: `dujiaonext/api:tagname`
- User (Frontend): `dujiaonext/user:tagname`
- Admin (Backend): `dujiaonext/admin:tagname`

## 2. Prepare Deployment Directory

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# Important: avoid permission issues on log/database directories (API container runs as non-root by default)
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```
Directory Description:

- `config/`: API configuration files (`config.yml`)
- `data/db`: SQLite data directory (used only for the SQLite setup)
- `data/uploads`: Uploads directory
- `data/logs`: API logs directory
- `data/redis`: Redis data directory
- `data/postgres`: PostgreSQL data directory (used only for the PostgreSQL setup)

## 3. Prepare the API Configuration File

The API container reads `/app/config.yml` by default. First, download the template:

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```
You need to modify the database and Redis configuration in `./config/config.yml` according to the plan.

> ⚠️ Important Security Reminder: You must change the JWT secret before going live.
>
> - `jwt.secret` (Admin login token)
> - `user_jwt.secret` (Frontend user login token)
>
> Be sure to use a high-strength random string (at least 32 characters recommended). Do not use the default template values. Otherwise, tokens can be forged, posing a serious security risk.

### 3.1 Plan A: SQLite + Redis (Recommended for lightweight deployment)

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
### 3.2 Plan B: PostgreSQL Redis (Recommended for Production)

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
## 4. Create `.env`

Create a new file at `/opt/dujiao-next/.env`:

```env
TAG=v0.0.1-beta
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
REDIS_PORT=6379
POSTGRES_PORT=5432

# Default admin account (only effective during first-time initialization)
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123

# Redis
REDIS_PASSWORD=your-strong-redis-password

# PostgreSQL (required for PostgreSQL deployment profile)
POSTGRES_DB=dujiao_next
POSTGRES_USER=dujiao
POSTGRES_PASSWORD=dujiao_pass
```
## 5. Writing Compose Files

## 5.1 Option A (SQLite Redis): `docker-compose.sqlite.yml`

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
## 5.2 Plan B (PostgreSQL Redis): `docker-compose.postgres.yml`

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
## 6. Outer Nginx Reverse Proxy (Required)

Both `user` and `admin` access the backend using the same-origin `/api` and `/uploads`, so you need to configure a reverse proxy at the outermost gateway (Nginx/Ingress).

> The example below uses the default ports:
>
> - API: `127.0.0.1:8080`
> - User: `127.0.0.1:8081`
> - Admin: `127.0.0.1:8082`
>
> If you have modified the ports in `.env`, please replace them accordingly.

### 6.1 Subdomain Deployment Example (Recommended)

```nginx
# User frontend
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

# Admin frontend
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
### 6.2 Single Domain `/admin` Subpath Example (Optional)

If you only want to expose a single domain (for example, `shop.example.com`), you can configure it as follows:

```nginx
server {
    listen 80;
    server_name shop.example.com;

    # User frontend
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin frontend
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
If there is no `/api` and `/uploads` proxy, the User/Admin pages can open, but the API and file uploads will fail to work.

## 7. Startup and Operations Commands

### 7.1 Startup (SQLite Redis)

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml up -d
```
### 7.2 Startup (PostgreSQL Redis)

```bash
docker compose --env-file .env -f docker-compose.postgres.yml up -d
```
### 7.3 Common Commands

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml ps
docker compose --env-file .env -f docker-compose.sqlite.yml logs -f api
docker compose --env-file .env -f docker-compose.sqlite.yml down
```
> If using the PostgreSQL setup, simply replace the filename with `docker-compose.postgres.yml`.

### 7.4 Default Admin Account for Backend (First Initialization)

When the `admins` table in the database is empty and the API is started for the first time, the following default admin account will be used:

- Default username: `admin`
- Default password: `admin123`

> Strongly recommended: Change the password immediately after the first login.

If you want to use a custom admin account during deployment, modify the following in your `.env` file:

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

And ensure that the `api` service in your compose file has these environment variables injected.

## 8. Upgrade and Rollback

Upgrade:

1. Change `TAG` in `.env` to the target version (e.g., `v1.0.3`)
2. Run `docker compose --env-file .env -f <your-compose-file> pull`
3. Run `docker compose --env-file .env -f <your-compose-file> up -d`

Rollback:

1. Change `TAG` back to the previous version
2. Run `docker compose --env-file .env -f <your-compose-file> up -d`

## 9. Access and Connectivity Checks

- API: `http://your-server-ip:${API_PORT}/health`
- User: `http://your-server-ip:${USER_PORT}`
- Admin: `http://your-server-ip:${ADMIN_PORT}`

If the pages load but the API endpoints fail, first check:

1. Whether the database and Redis addresses in `config.yml` match the container names (`postgres` / `redis`)
2. Whether the external gateway has configured `/api` and `/uploads` reverse proxy
3. The health status of API, Redis, and PostgreSQL (`docker compose ps`)