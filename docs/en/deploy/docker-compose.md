# Docker Compose Deployment (Docker Hub Images)

> Last Updated: 2026-07-26

If you have not chosen a deployment method yet, start with [Deployment Overview and Selection Guide](/en/deploy/).

## 1. Image Correspondence

- Full-stack service: `dujiaonext/dujiao-next:tagname`

As of v1.4.0 the storefront and admin panel frontends are embedded in this single image, so **the `dujiaonext/user` and `dujiaonext/admin` images no longer exist**. The whole stack needs 2 containers (SQLite) or 3 containers (PostgreSQL).

::: tip Upgrading from v1.3.x
You can simply delete the old `dujiaonext/user` / `dujiaonext/admin` containers — the frontends no longer
need separate deployment. See [Upgrade and Migration](/en/deploy/upgrade) for the migration steps.
:::

## 2. Prepare the Deployment Directory

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# Important: avoid permission errors on log/database directories (the api container runs as non-root)
chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

Directory reference:

- `config/` — configuration file (`config.yml`)
- `data/db` — SQLite data directory (SQLite setup only)
- `data/uploads` — uploaded files
- `data/logs` — logs
- `data/redis` — Redis data
- `data/postgres` — PostgreSQL data (PostgreSQL setup only)

## 3. Prepare the Configuration File

The container reads `/app/config.yml` by default. Download the template first:

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

Then edit `./config/config.yml` for your chosen database and Redis setup.

> ⚠️ Critical security note: change all three runtime secrets before going live.
>
> - `app.secret_key` (root key for encrypting sensitive data)
> - `jwt.secret` (admin login tokens)
> - `user_jwt.secret` (storefront user login tokens)
>
> Generate separate high-entropy strings of at least 32 characters and keep all three different. Never keep the template defaults, and back up `app.secret_key` with the database.

### 3.1 Admin Entry Path (New — Set This)

With the frontends embedded, the admin panel no longer has its own domain; it is mounted at a path on the same site. The default `/admin` is a prime scanner target, so **change it**:

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # pick your own string
```

Restart the container after changing it.

### 3.2 Option A: SQLite + Redis (Recommended for Lightweight Deployments)

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

### 3.3 Option B: PostgreSQL + Redis (Recommended for Production)

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

## 4. Write the `.env` File

Create `/opt/dujiao-next/.env`:

```dotenv
TAG=latest
TZ=Asia/Shanghai

# Only one port is needed now
APP_PORT=8080

# Default administrator (applies on first initialization only)
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123

# Redis
REDIS_PASSWORD=your-strong-redis-password

# PostgreSQL (required for the PostgreSQL setup)
POSTGRES_DB=dujiao_next
POSTGRES_USER=dujiao
POSTGRES_PASSWORD=dujiao_pass
```

> 🔒 **Security warning (please read): Docker bypasses host firewalls**
>
> Docker implements port mapping by writing directly to the iptables `DOCKER` chain, **completely bypassing ufw / firewalld rules**. If you write `ports: - "6379:6379"` in your compose file, Redis will be exposed to the public internet even if ufw only allows 80/443 — an easy target for scanners and brute-force attacks.
>
> This guide therefore follows two rules:
>
> 1. **Redis / PostgreSQL expose no ports at all** — they are reachable only over the internal `dujiao-net` network from the `api` container.
> 2. **The application port binds to `127.0.0.1`**, so only the local Nginx reverse proxy can reach it.
>
> To debug Redis/PostgreSQL from the host temporarily, use `docker exec`, or add `ports: - "127.0.0.1:6379:6379"` (loopback only) for that service.

## 5. Write the Compose File

## 5.1 Option A (SQLite + Redis): `docker-compose.sqlite.yml`

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

## 5.2 Option B (PostgreSQL + Redis): `docker-compose.postgres.yml`

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

## 6. Nginx Reverse Proxy

The storefront, admin panel, API, uploads, `sitemap.xml`, and `robots.txt` are all served on the same port, so the reverse proxy needs one domain and one `location /`:

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

Access:

- Storefront: `https://shop.example.com`
- Admin panel: `https://shop.example.com/<web.admin_path>`

::: tip What got simpler compared to v1.3.x
The old setup needed two `server` blocks (storefront domain + admin domain) plus individual `location` rules forwarding `/api/`, `/uploads/`, `/sitemap.xml`, and `/robots.txt` to the API container. Missing any one of them caused problems — most commonly SEO resources being swallowed by the SPA fallback and returning 404. All of those paths are now handled by the same process.
:::

## 7. Startup and Operations

### 7.1 Start (SQLite + Redis)

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml up -d
```

### 7.2 Start (PostgreSQL + Redis)

```bash
docker compose --env-file .env -f docker-compose.postgres.yml up -d
```

### 7.3 Common Commands

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml ps
docker compose --env-file .env -f docker-compose.sqlite.yml logs -f api
docker compose --env-file .env -f docker-compose.sqlite.yml down
```

> For the PostgreSQL setup, substitute `docker-compose.postgres.yml` for the filename.

### 7.4 Default Administrator Account (First Initialization)

When the `admins` table is empty and the service starts for the first time, it creates:

- Username: `admin`
- Password: `admin123`

> Strongly recommended: change the password immediately after your first login.

To use a custom administrator from the start, set these in `.env`:

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

and make sure the `api` service in your compose file passes them through.

## 8. Upgrade and Rollback

Upgrade:

1. Set `TAG` in `.env` to the target version (e.g. `v1.4.0`)
2. Run `docker compose --env-file .env -f <your compose file> pull`
3. Run `docker compose --env-file .env -f <your compose file> up -d`

The frontends are updated along with the image — nothing extra to do.

Rollback:

1. Set `TAG` back to the previous version
2. Run `docker compose --env-file .env -f <your compose file> up -d`

## 9. Access and Connectivity Checks

Since container ports bind to `127.0.0.1`, run these checks **on the server itself**:

- Health check: `curl http://127.0.0.1:${APP_PORT}/health`
- Storefront: `curl -I http://127.0.0.1:${APP_PORT}/`
- Admin panel: `curl -I http://127.0.0.1:${APP_PORT}/<web.admin_path>/`

External users should access the service through your configured domain via the Nginx reverse proxy.

The startup log should contain this line, confirming the frontends were embedded and mounted:

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

If pages load but API calls fail, check in this order:

1. Whether the database and Redis hosts in `config.yml` match the container names (`postgres` / `redis`)
2. Whether `web.admin_path` matches the path you are visiting (restart the container after changing it)
3. Container and Redis/PostgreSQL health (`docker compose ps`)
