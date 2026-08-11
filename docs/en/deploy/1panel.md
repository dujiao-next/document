# Deploy with 1Panel

> Last Updated: 2026-07-26

If you have not chosen a deployment method yet, start with [Deployment Overview and Selection Guide](/en/deploy/).

[1Panel](https://1panel.cn) is an open-source modern Linux server management panel from FIT2CLOUD, with a built-in app store, container orchestration, website and certificate management, and scheduled backup tasks. This document covers **two complete paths** for running Dujiao-Next on 1Panel, from installing the panel all the way through HTTPS, backups, upgrades, and troubleshooting.

::: tip Version note
This guide follows the menu structure of **1Panel v2.x**. Menu locations differ slightly between minor versions (for example, "Supervisor" lived under "Host" in v1.9 and moved under "Toolbox" in v1.10+). Search by name — the functionality is the same.
:::

## 0. Choose Your Path First: Container Orchestration vs. Binary + Supervisor

Since v1.4.0 Dujiao-Next is a **single process, single port, single domain** program (the frontends are embedded in the binary), so there are two ways to run it on 1Panel:

| | Path A: Container Orchestration | Path B: Binary + Supervisor |
| --- | --- | --- |
| Runtime form | Docker container (`dujiaonext/dujiao-next` image) | Host process (binary from the Release archive) |
| Where in 1Panel | Containers → Compose | Toolbox → Supervisor |
| Prerequisites | Only Docker (bundled with 1Panel) | Supervisor must be installed first |
| Upgrade method | Pull a new image, recreate the container | Admin "One-Click Upgrade", or swap the binary manually |
| **Admin one-click upgrade** | ❌ Unavailable (deliberately blocked) | ✅ Download & swap works, but **restart is manual** |
| Data isolation | Volume mounts, clear boundaries | Written directly into host directories |
| Recommendation | ⭐ Recommended for most users | Choose this if you want the admin one-click upgrade |

::: warning Why one-click upgrade is blocked inside containers
Replacing `/app/dujiao-next` inside a container only lasts for that container's lifetime. After a `docker restart`, `compose up`, or a host reboot, the process falls back to the old binary baked into the image layer — which looks like "the upgrade succeeded, then reverted itself a few days later." The program therefore blocks the upgrade when it detects a container environment and shows the manual upgrade command instead. This is intentional, not a limitation.
:::

The **preparation (sections 1–2) and the follow-up work (sections 6–9) are shared** by both paths. In between, read either section 3 or section 4.

## 1. Install 1Panel

### 1.1 System Requirements

- Mainstream Linux distributions (Debian / RedHat families)
- Architectures: x86_64, aarch64, and others
- At least 1GB of available memory recommended (Dujiao-Next itself runs in 512MB, but the panel + Redis + PostgreSQL need headroom)
- The server needs internet access

### 1.2 One-Line Install

```bash
bash -c "$(curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh)"
```

The installer asks for the port, security entrance, username, and password, and offers to install Docker automatically (**say yes** — Path A requires it).

The panel address is printed when installation finishes. If you lose it, run:

```bash
1pctl user-info
```

The address format is `http://SERVER_IP:PANEL_PORT/SECURITY_ENTRANCE`.

### 1.3 Open Ports

Allow the following in your cloud security group / host firewall:

- The panel port (set during install, default 18080)
- `80` and `443` (website traffic)

**Do not open 8080** — the Dujiao-Next port is only ever accessed from the local machine or the internal network, and 1Panel's OpenResty proxies it to the outside world.

1Panel has built-in firewall management under "Host → Firewall", so you can toggle ports directly in the panel.

## 2. Preparation (Both Paths)

### 2.1 DNS

Point an A record for your domain (e.g. `shop.example.com`) at the server's public IP. **One domain is enough** — both the storefront and the admin panel live under it.

### 2.2 Generate Secrets

Run this twice in "Host → Terminal" or over SSH and keep both random strings:

```bash
openssl rand -hex 32
```

### 2.3 Decide on the Admin Path

The default `/admin` is the number-one target for automated scanners. Pick something unguessable up front, for example `/dj-mgmt-7x9k2`.

---

## 3. Path A: Container Orchestration (Recommended)

### 3.1 Create the Data Directories

::: tip Why not inside the compose directory
When 1Panel deletes a compose stack it also deletes `/opt/1panel/docker/compose/<name>/`. Keeping `config.yml` and your data in a **separate directory** — `/opt/dujiao-next` — means an accidental deletion never costs you data.
:::

Run in "Host → Terminal":

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# Important: the api container runs as a non-root user, and missing write permission breaks startup
chmod -R 0777 ./data/db ./data/uploads ./data/logs ./data/redis ./data/postgres
```

Directory reference:

| Directory | Purpose |
| --- | --- |
| `config/` | The `config.yml` configuration file |
| `data/db` | SQLite database (SQLite option only) |
| `data/uploads` | Uploaded files such as product images |
| `data/logs` | Runtime logs |
| `data/redis` | Redis persistence |
| `data/postgres` | PostgreSQL data (PostgreSQL option only) |

### 3.2 Prepare config.yml

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example \
  -o /opt/dujiao-next/config/config.yml
```

Then open `/opt/dujiao-next/config/config.yml` in "Host → Files" and edit it with the panel's built-in editor (or use `vim`).

**Fields you must change:**

| Field | Purpose | What to put |
| --- | --- | --- |
| `app.secret_key` | AES key for encrypting sensitive data | A random string from §2.2 |
| `jwt.secret` | Admin token signing key | A different random string |
| `user_jwt.secret` | Storefront user token signing key | Yet another random string |
| `web.admin_path` | Admin entry path | e.g. `/dj-mgmt-7x9k2` |
| `server.mode` | Runtime mode | `release` in production |
| `database.*` | Database | See options A / B below |
| `redis.*` / `queue.*` | Redis | Set `host` to `redis` |

::: danger Check before going live
`jwt.secret`, `user_jwt.secret`, and `app.secret_key` must **never** keep their template defaults or duplicate one another. The current version refuses to start with weak, known-placeholder, or duplicated runtime secrets; `app.secret_key` is also required to recover encrypted sensitive data.
:::

#### Option A: SQLite + Redis (lightweight, good starting point)

```yaml
server:
  host: 0.0.0.0
  port: 8080
  mode: release

web:
  admin_path: "/dj-mgmt-7x9k2"

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

#### Option B: PostgreSQL + Redis (recommended for production)

```yaml
database:
  driver: postgres
  dsn: host=postgres user=dujiao password=dujiao_pass dbname=dujiao_next port=5432 sslmode=disable TimeZone=Asia/Shanghai
```

The `redis` and `queue` sections are identical to Option A.

### 3.3 Make Sure 1panel-network Exists

For the reverse proxy to reach the container, the cleanest approach is to put the container on the **same Docker network** as 1Panel's OpenResty. That shared network is called `1panel-network`:

```bash
docker network ls | grep 1panel-network
```

If nothing is printed, create it once (it usually already exists after you install any app from the app store):

```bash
docker network create 1panel-network
```

### 3.4 Create the Compose Stack

Go to "Containers → Compose → Create":

- **Name**: `dujiao-next`
- **Source**: keep the default "Edit" (write the compose file in the web editor)

Paste the content for your chosen option below.

::: tip Where the compose file lands
1Panel writes it to `/opt/1panel/docker/compose/dujiao-next/docker-compose.yml` (`/opt` being the 1Panel install directory). You can edit it later from the panel or directly under "Host → Files".
:::

#### Option A: SQLite + Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "your-strong-redis-password"]
    volumes:
      - /opt/dujiao-next/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your-strong-redis-password", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:latest
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      DJ_DEFAULT_ADMIN_USERNAME: admin
      DJ_DEFAULT_ADMIN_PASSWORD: change-me-please
    volumes:
      - /opt/dujiao-next/config/config.yml:/app/config.yml:ro
      - /opt/dujiao-next/data/db:/app/db
      - /opt/dujiao-next/data/uploads:/app/uploads
      - /opt/dujiao-next/data/logs:/app/logs
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
      - 1panel-network

networks:
  dujiao-net:
    driver: bridge
  1panel-network:
    external: true
```

#### Option B: PostgreSQL + Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "your-strong-redis-password"]
    volumes:
      - /opt/dujiao-next/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your-strong-redis-password", "ping"]
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
      TZ: Asia/Shanghai
      POSTGRES_DB: dujiao_next
      POSTGRES_USER: dujiao
      POSTGRES_PASSWORD: dujiao_pass
    volumes:
      - /opt/dujiao-next/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dujiao -d dujiao_next"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:latest
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      DJ_DEFAULT_ADMIN_USERNAME: admin
      DJ_DEFAULT_ADMIN_PASSWORD: change-me-please
    volumes:
      - /opt/dujiao-next/config/config.yml:/app/config.yml:ro
      - /opt/dujiao-next/data/uploads:/app/uploads
      - /opt/dujiao-next/data/logs:/app/logs
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
      - 1panel-network

networks:
  dujiao-net:
    driver: bridge
  1panel-network:
    external: true
```

::: danger Note that no ports are published at all
This is **deliberate**, and it is the safest arrangement under 1Panel:

- Docker port publishing writes straight into the iptables `DOCKER` chain and **bypasses ufw / firewalld and the 1Panel firewall**. If you add `ports: - "8080:8080"`, port 8080 is reachable from the internet even when the panel firewall only allows 80/443.
- With no published ports, `dujiao-next` is reachable only by OpenResty through `1panel-network`, while Redis and PostgreSQL stay visible only inside `dujiao-net` — completely out of reach from outside.

For ad-hoc debugging, open "Containers → Containers → Terminal" and run `wget -qO- http://127.0.0.1:8080/health` inside the container; you never need to publish a port.
:::

::: tip If you prefer .env variables
The 1Panel compose editor gives you a single content box. If you like the `${VAR}` style, create a `.env` file under `/opt/1panel/docker/compose/dujiao-next/` via "Host → Files" — compose loads it automatically when running from that directory.
:::

Click "Confirm" and 1Panel pulls the images and starts everything.

### 3.5 Verify Startup

Open "Containers → Compose → dujiao-next" and check the container list — all three (or two) containers should be `running` / `healthy`.

Open the logs for `dujiao-next`. This line confirms the frontends are correctly embedded:

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

If a container keeps restarting, look for database/Redis connection errors in the logs and check section 9.

---

## 4. Path B: Binary + Supervisor

The main reason to pick this path: **you want the "Check for updates / One-click upgrade" button in the admin panel to work.**

### 4.1 Install Supervisor

In "Host → Terminal":

```bash
# Debian / Ubuntu
apt update && apt install -y supervisor

# RedHat / CentOS / Rocky
yum install -y epel-release && yum install -y supervisor
systemctl enable --now supervisord
```

Then open "Toolbox → Supervisor" and complete the one-time **initialization** (it asks for the supervisor config path and service name; the panel detects them automatically, so confirming is usually enough).

### 4.2 Download and Extract the Binary

Grab the latest release from [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases) and pick the archive matching your architecture:

```bash
mkdir -p /opt/dujiao-next && cd /opt/dujiao-next

# x86_64
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
# On arm64 machines use dujiao-next_v1.4.0_Linux_arm64.tar.gz

tar -xzf dujiao.tar.gz
chmod +x ./dujiao-next
```

The archive contains `dujiao-next` (the executable with embedded frontends), `config.yml.example`, and `README.md`.

### 4.3 Provide Redis

Dujiao-Next needs Redis. Two ways to get it:

**Option 1: 1Panel App Store (recommended)**

Go to "App Store → search for Redis → Install", then set a password and port. **Turn off "external port access"** during installation, and point `redis.host` at the Docker bridge gateway in `config.yml`:

```yaml
redis:
  enabled: true
  host: 172.17.0.1     # docker0 gateway: host process reaching the containerized Redis
  port: 6379
  password: the-password-you-set-in-the-app-store
```

::: tip Port mapping and address
Redis installed from the 1Panel app store publishes its port to the host. With "external port access" disabled the mapping binds to the loopback only, so a host process can also use `127.0.0.1:6379`; `172.17.0.1` is simply the more universal form. Check the actual container name and port mapping under "Containers → Containers".
:::

**Option 2: Run your own container**

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine \
  redis-server --requirepass 'your-strong-redis-password'
```

Set `redis.host` to `127.0.0.1` in the config.

### 4.4 Configure config.yml

```bash
cd /opt/dujiao-next
cp config.yml.example config.yml
```

Edit `/opt/dujiao-next/config.yml` in "Host → Files". The required fields are exactly the same as the table in §3.2, with these differences:

```yaml
server:
  host: 0.0.0.0        # Must stay 0.0.0.0, otherwise the OpenResty container cannot reach it (see 4.6)
  port: 8080
  mode: release

database:
  driver: sqlite
  dsn: ./db/dujiao.db  # A relative path is fine for binary deployments
```

### 4.5 Create the Supervisor Program

Go to "Toolbox → Supervisor → Create" and fill in:

| Field | Value |
| --- | --- |
| Name | `dujiao-next` |
| Run user | `root` (or a dedicated low-privilege user) |
| Working directory | `/opt/dujiao-next` |
| Start command | `/opt/dujiao-next/dujiao-next` |
| Process count | `1` |

::: danger Process count must be 1
Dujiao-Next is a stateful service — it binds a fixed port and runs a background task queue. Setting more than one process causes port conflicts and duplicated jobs.
:::

::: tip Running as a dedicated user is safer
```bash
useradd -r -s /sbin/nologin -d /opt/dujiao-next dujiao
chown -R dujiao:dujiao /opt/dujiao-next
```
Then set "Run user" to `dujiao`. Note that this user needs write permission on `/opt/dujiao-next`, otherwise the admin one-click upgrade is blocked because it cannot write there (`block_reason: dir_not_writable`).
:::

After creating it, click "Start" in the list, then check the logs for:

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 4.6 About the Listen Address (Important)

1Panel's OpenResty runs inside a container. If you set `server.host` to `127.0.0.1`, that is the host's loopback address, which the **OpenResty container cannot reach** — the proxy will always return 502.

Keep `0.0.0.0` and let the firewall provide the security: do **not** allow 8080 under "Host → Firewall". The port then stays unreachable from the internet while remaining accessible from the local machine and the Docker bridge.

---

## 5. Create the Website and Reverse Proxy (Both Paths)

### 5.1 Create a Reverse Proxy Site

Go to "Websites → Websites → Create Website":

- **Type**: choose "Reverse Proxy"
- **Primary domain**: `shop.example.com`
- **Proxy address**: depends on your path
  - Path A (compose): `http://dujiao-next:8080`
  - Path B (binary + supervisor): `http://172.17.0.1:8080`

::: danger The most common mistake: never use 127.0.0.1 as the proxy address
1Panel's OpenResty runs in a container, so `http://127.0.0.1:8080` points at **the OpenResty container itself**, not the host — the result is always `502 Bad Gateway`.

Correct values:

- Target is a container → use the **container name** (both must be on `1panel-network`)
- Target is a host process → use **`172.17.0.1`** (the docker0 gateway)

Run `ip addr show docker0` if you are unsure about the gateway address.
:::

Once created, every Dujiao-Next path — the storefront at `/`, the admin panel at `/<admin_path>`, `/api`, `/uploads`, `/sitemap.xml`, and `/robots.txt` — is covered by this single proxy rule. There is **no** need for the per-path rules older versions required.

### 5.2 Request an SSL Certificate

Go to "Websites → Certificates → Apply":

- **Account**: on first use, create an Acme account (an email address is enough)
- **Validation**:
  - HTTP validation: simplest, requires the domain to resolve to this machine with port 80 reachable
  - DNS validation: supports wildcards, requires your DNS provider's API credentials
- 1Panel handles renewals automatically

### 5.3 Enable HTTPS

Back in "Websites → your site → Settings → HTTPS":

- Turn HTTPS on
- **Certificate**: pick the one you just issued
- **HTTP option**: choose "redirect HTTP to HTTPS automatically"
- Enabling **HSTS** as well is recommended

::: warning Payment callbacks require HTTPS
Most payment gateways require a valid HTTPS callback URL. Set up the certificate before you start accepting payments, then configure the callback addresses in the admin panel. See [Payment Configuration and Callback Guide](/en/payment/guide).
:::

### 5.4 Raise the Upload Size Limit

Product images and bulk card-secret imports can exceed OpenResty's default 1MB limit, which shows up as `413 Request Entity Too Large`.

Under "Websites → your site → Settings → Config File", add one line inside the `server { }` block:

```nginx
client_max_body_size 50m;
```

The panel reloads automatically after saving. Some versions expose an upload-limit field directly in "Basic Settings" — use that if it is available.

### 5.5 Real Client IP

Login logs, risk control, and rate limiting all depend on the real visitor IP. 1Panel's reverse proxy already sends `X-Forwarded-For` by default. If the admin panel records only private addresses (like `172.x.x.x`), enable the matching option under "Websites → Settings → Real IP".

### 5.6 Verify

In a browser:

- Storefront: `https://shop.example.com`
- Admin panel: `https://shop.example.com/dj-mgmt-7x9k2` (use your own `admin_path`)
- Health check: `https://shop.example.com/health`

Log in with `admin` and the password you set via environment variable or `config.yml`, and **change it immediately**.

## 6. Upgrading

### 6.1 Upgrading Path A (Compose)

Edit the compose file under "Containers → Compose → dujiao-next" and set the image tag to your target version:

```yaml
image: dujiaonext/dujiao-next:v1.4.0
```

Save and redeploy (or run it in the terminal):

```bash
cd /opt/1panel/docker/compose/dujiao-next
docker compose pull && docker compose up -d
```

The frontends ship with the image, so nothing else is needed. To roll back, set the tag to the previous version and repeat.

::: tip The admin panel tells you what to do
If you click "One-Click Upgrade" while running in a container, the program recognises the container environment and shows the command above (with a copy button) instead of trying to replace the binary.
:::

### 6.2 Upgrading Path B (Binary + Supervisor)

**Option 1: One-click upgrade from the admin panel (recommended)**

Click "Check for updates → One-Click Upgrade" and the program will:

1. Download the archive for the current platform from the GitHub Release
2. Verify its sha256 checksum
3. Extract the new binary
4. Rename the old binary to `dujiao-next.backup` and move the new one into place (an atomic swap)

::: warning You must restart manually after the swap
The program only restarts itself when it is supervised by **systemd**. A Supervisor-managed process has none of systemd's environment markers, so the admin panel reports `can_restart: false` and asks you to restart manually.

Go to "Toolbox → Supervisor", find `dujiao-next`, and click "Restart". Refresh the admin panel afterwards and the version number will have changed.
:::

**Option 2: Manual replacement**

```bash
# 1. Stop the process under "Toolbox → Supervisor" in 1Panel
# 2. Back up
cp -r /opt/dujiao-next/db /opt/dujiao-next/uploads /opt/dujiao-next/config.yml /root/backup/
# 3. Download the new release and overwrite the binary
cd /opt/dujiao-next
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz dujiao-next
chmod +x dujiao-next
# 4. Start the process again from the panel
```

Database migrations run automatically at startup.

### 6.3 Rolling Back a Failed Upgrade

The admin panel has a "Rollback" button that restores `dujiao-next.backup`.

But if the new version **fails to start at all**, the admin panel is unreachable too. Use the terminal:

```bash
cd /opt/dujiao-next
mv dujiao-next.backup dujiao-next
# Restart the Supervisor program from the panel
```

## 7. Backups

1Panel's scheduled tasks are the easiest way to keep backups for this deployment.

### 7.1 Add a Backup Account

Add a remote destination under "Panel Settings → Backup Accounts" (local disk, OSS, S3, WebDAV, and more). **Configure at least one off-site destination** — if the server dies, local backups die with it.

### 7.2 Create Backup Tasks

Go to "Cron Jobs → Create Task":

**Task 1: back up the data directory**

- Type: `Backup Directory`
- Directory: `/opt/dujiao-next` (contains `config.yml`, `db/`, `uploads/`)
- Schedule: daily, early morning
- Retention: 7 copies

**Task 2: back up the database (PostgreSQL option only)**

- Type: `Backup Database`
- Select `dujiao_next`
- Schedule: daily

**Task 3 (optional): health check**

- Type: `Access URL`
- URL: `https://shop.example.com/health`
- Schedule: every 5 minutes

::: danger SQLite backup caveat
Copying a `.db` file while writes are in flight can produce an inconsistent snapshot. For anything important, stop the process before backing up, or switch to PostgreSQL. See [Backup and Recovery](/en/deploy/backup) for the full strategy.
:::

## 8. Security Checklist

Walk through this list once deployment is done:

- [ ] `jwt.secret`, `user_jwt.secret`, and `app.secret_key` are different random strings, none is a template default, and `app.secret_key` is backed up
- [ ] `web.admin_path` has been changed and is not `/admin`
- [ ] `server.mode` is `release`
- [ ] The default admin password was changed on first login
- [ ] The firewall allows only 80, 443, the panel port, and SSH — **not** 8080 / 6379 / 5432
- [ ] Redis and PostgreSQL have no `ports` entries in the compose file
- [ ] Redis has a strong password
- [ ] HTTPS is enabled with forced redirect
- [ ] The 1Panel panel itself uses a non-default port and security entrance, with two-factor authentication enabled
- [ ] At least one off-site backup account is configured and one backup run has succeeded

See [Security Best Practices](/en/guide/security) for more.

## 9. Troubleshooting

### Q: The domain returns 502 Bad Gateway

Check in this order:

1. **Is the proxy address `127.0.0.1`?** This is by far the most common cause — see §5.1.
2. Is the container/process actually running? Check "Containers → Containers" or "Toolbox → Supervisor".
3. Path A: is `dujiao-next` on `1panel-network`? Confirm with `docker network inspect 1panel-network`.
4. Path B: was `server.host` changed to `127.0.0.1`? It must be `0.0.0.0`.
5. Test the backend directly from the terminal:

```bash
# Path A
docker exec dujiao-next wget -qO- http://127.0.0.1:8080/health
# Path B
curl http://127.0.0.1:8080/health
```

### Q: The admin URL returns 404

`web.admin_path` in `config.yml` does not match the path you are visiting. Note that changing this field **requires a restart** — the path is written into the admin page once at startup.

### Q: The startup log has no `Embedded SPAs` line

The binary does not include the frontends. Make sure you downloaded `dujiao-next_*.tar.gz` from Releases rather than building it yourself with `go build` (without `-tags fullstack`).

### Q: Image uploads fail with 413

OpenResty's `client_max_body_size` is too small — see §5.4.

### Q: The container will not start and the log shows permission errors

The `data/` directories have the wrong owner. The api container runs as non-root, so run:

```bash
chmod -R 0777 /opt/dujiao-next/data/{db,uploads,logs,redis}
```

### Q: Redis connection fails

- Path A: `redis.host` must be the container name `redis`, not `127.0.0.1`
- Path B: a host process reaching a containerized Redis needs `172.17.0.1` or `127.0.0.1` (depending on the port mapping) — a container name will not resolve
- In both cases, verify the password matches what you set in compose or the app store

### Q: The "One-Click Upgrade" button is disabled / says this deployment is unsupported

Look at the reason code shown in the admin panel:

| Reason | Meaning | What to do |
| --- | --- | --- |
| `container` | A container environment was detected | Expected — pull a new image as described in §6.1 |
| `source_build` | The binary is not an official release | Download the official archive from Releases instead of a self-built binary |
| `dir_not_writable` | The program cannot write to its own directory | Grant the run user write permission on `/opt/dujiao-next` |
| `unsupported_os` | Not Linux or macOS | Upgrade manually |

### Q: The upgrade finished but the version number did not change

That is expected — the binary was replaced, but the running process is still the old one. Click "Restart" under "Toolbox → Supervisor"; see §6.2.

### Q: I deleted the compose stack in the panel — is my data gone?

This guide keeps data in `/opt/dujiao-next`, outside the compose directory, so deleting the stack loses nothing; just recreate it. If you had mounted data under `/opt/1panel/docker/compose/dujiao-next/`, deleting the stack would have removed it too — which is exactly why §3.1 uses a separate directory.

## 10. Related Documents

- [Deployment Overview and Selection Guide](/en/deploy/)
- [Docker Compose Deployment](/en/deploy/docker-compose) (full explanation of the compose parameters)
- [Single Binary Deployment](/en/deploy/binary) (full explanation of the binary approach)
- [config.yml Reference](/en/config/config-yml)
- [Upgrade and Migration](/en/deploy/upgrade)
- [Backup and Recovery](/en/deploy/backup)
- [Security Best Practices](/en/guide/security)
