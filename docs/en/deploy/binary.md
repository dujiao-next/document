# Single Binary Deployment (Recommended for Beginners)

> Who this is for: Complete beginners who want to run everything with "one binary + one Redis + one domain".

As of v1.4.0 the storefront and admin panel are embedded in the backend binary. Download, extract, and you have the complete service — no separate frontend deployment.

## Requirements

- Linux x86_64 or arm64
- Redis (a system service, an existing instance, or a Docker container)
- One domain + SSL certificate (for production)
- At least 512MB RAM

## 1. Download

Grab the latest `dujiao-next_*.tar.gz` from [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases), matching your architecture:

```bash
# Example: Linux x86_64
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
mkdir -p /opt/dujiao && tar -xzf dujiao-next_*.tar.gz -C /opt/dujiao
cd /opt/dujiao
```

On arm64 machines, download `dujiao-next_vX.Y.Z_Linux_arm64.tar.gz`.

::: tip Note for v1.3.x users
Older releases shipped two archives — `dujiao-next_*` (API only) and `dujiao-all_*` (with frontends) —
whose binaries were named `dujiao-api` and `dujiao-server` respectively.
Since v1.4.0 there is a single artifact, `dujiao-next_*.tar.gz`, containing one binary named `dujiao-next`.
:::

## 2. Copy the Configuration

```bash
cp config.yml.example config.yml
```

## 3. Fields You Must Change

Open `config.yml` and update the following:

| Field | Description | Example |
|---|---|---|
| `jwt.secret` | Admin JWT secret — **must change** | output of `openssl rand -hex 32` |
| `user_jwt.secret` | User JWT secret — **must change** | same, but a different value |
| `web.admin_path` | Admin panel path prefix — **strongly recommended to change** | `/dj-mgmt-7x9k2` |
| `redis.host` / `redis.port` | Redis address (defaults to `127.0.0.1` + `6379`) | `127.0.0.1` + `6379` |
| `database.driver` / `database.dsn` | Database (starts with SQLite) | see below |

### About `web.admin_path` (Important)

The default `/admin` is the number one target for automated scanners. **Change it to something hard to guess:**

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # pick your own string
```

This path is only the "front door" of the admin SPA. Changing it does not affect the admin API endpoints — those are protected by JWT and rate limiting. The point is to filter out automated scanning noise.

You must restart the process after changing it: the path is written into the admin page once at startup.

### About the Database

- **SQLite (default)**: zero configuration, data lives in `./db/dujiao.db`, fine for a single machine.
- **PostgreSQL (recommended for production)**: set `database.driver` to `postgres` and put your connection string in `database.dsn`.

## 4. Prepare Redis

If you already have Redis (a system service or another container), just point `redis.host` and `redis.port` at it.

Otherwise, the simplest option is Docker:

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine
```

## 5. Start

```bash
./dujiao-next
```

The startup log shows:

```
🚀 Dujiao-Next starting
...
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

The `Embedded SPAs` line confirms the frontends were embedded and mounted correctly.

At runtime the program creates:
- `./db/` — SQLite database
- `./uploads/` — user uploads
- `./logs/` — runtime logs

## 6. Access

- **Storefront**: `http://<your-ip>:8080`
- **Admin panel**: `http://<your-ip>:8080/<web.admin_path>` (the path you just set)

Log in with the default administrator account (configured under `bootstrap` in `config.yml`). **Change the password immediately after logging in.**

## 7. Reverse Proxy and HTTPS (Production)

You only need one domain. Forward the entire site to port 8080 — the storefront, admin panel, API, uploads, `sitemap.xml`, and `robots.txt` are all served by that single port:

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

::: tip No more per-path routing
In v1.3.x you had to write separate `location` blocks for `/api/`, `/uploads/`, `/sitemap.xml`, and `/robots.txt`.
Now the whole domain points at a single process, so one `location /` is enough.
:::

## 8. Running as a Service (systemd)

First create a service user (if you want a dedicated one):

```bash
sudo useradd -r -s /sbin/nologin -d /opt/dujiao dujiao
sudo chown -R dujiao:dujiao /opt/dujiao
```

`/etc/systemd/system/dujiao.service`:

```ini
[Unit]
Description=Dujiao-Next
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dujiao
ExecStart=/opt/dujiao/dujiao-next
Restart=on-failure
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

## 9. Upgrading

1. `systemctl stop dujiao`
2. Back up: `cp -r db uploads config.yml /backup/`
3. Download the new tar.gz and replace the `dujiao-next` binary
4. `systemctl start dujiao`

Database migrations run automatically. The frontends are updated along with the binary — no separate static files to replace.

## 10. Migrating from Other Deployments

### From a v1.3.x split deployment

1. Stop the old api / user / admin services (or containers)
2. Copy your existing `db/`, `uploads/`, and `config.yml` into the new working directory
3. Add the `web` section to `config.yml` and set `admin_path`
4. Start the new binary and change your reverse proxy to forward the whole site to 8080
5. The domain previously dedicated to the admin panel can be retired (or kept pointing at the same service)

See [Upgrade and Migration](/en/deploy/upgrade) for detailed steps.

### From a Docker deployment

Same as above — reuse the `db/`, `uploads/`, and `config.yml` you already mount.

## FAQ

### Q: The admin page returns 404

Make sure `web.admin_path` in `config.yml` matches the URL you are visiting. Changing `web.admin_path` requires a restart.

### Q: `Embedded SPAs` does not appear in the startup log

Your binary does not contain the frontends. Make sure you downloaded `dujiao-next_*.tar.gz` from GitHub Releases
rather than building it yourself with `go build` without `-tags fullstack`.

### Q: The log warns that `web.admin_path` is still the default `/admin`

Change `web.admin_path` as described in §3 and the warning goes away.

### Q: Can I run API-only, without the embedded frontends?

Yes — build from source with `go build ./cmd/server` (without `-tags fullstack`). Neither `/` nor the admin path
will be mounted. This is a secondary-development scenario; see [Manual Deployment](/en/deploy/manual).
