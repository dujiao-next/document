# Single Binary Deployment (Recommended for Beginners)

> Who this is for: Complete beginners who want to run everything with "one binary + one Redis + one domain".

As of v1.4.0 the storefront and admin panel are embedded in the backend binary. Download, extract, and you have the complete service — no separate frontend deployment.

## Requirements

- Linux x86_64 or arm64
- Redis (a system service, an existing instance, or a Docker container)
- One domain + SSL certificate (for production)
- At least 512MB RAM

## Official One-Click Installer (Recommended)

On a fresh Ubuntu 22.04+ or Debian 12+ server, use the official interactive installer (x86_64 and arm64 are supported):

```bash
curl -fsSL https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/scripts/dujiao-next-manager.sh \
  -o /tmp/dujiao-next-manager.sh
sudo bash /tmp/dujiao-next-manager.sh install
```

Before running it, prepare:

- One non-wildcard domain that already resolves to the server
- Publicly reachable TCP ports 80 and 443
- An email address for Let's Encrypt expiry notices
- Root or sudo access

The wizard downloads and verifies the latest Release, generates three independent runtime secrets, and installs SQLite, an isolated local Redis instance, systemd services, Nginx, and a Certbot-managed TLS certificate. The application and Redis listen only on loopback; ports 8080 and 6380 are not exposed publicly.

Reopen the management menu after installation with:

```bash
sudo dujiao-next-manager
```

The menu provides status and logs, start/stop/restart, domain and admin-path changes, certificate renewal, admin password/2FA recovery, and safe uninstall. Application upgrades continue to use **System Update** in the admin panel; the manager does not implement a second updater.

The same operations are exposed as automation-friendly subcommands:

```bash
sudo dujiao-next-manager status
sudo dujiao-next-manager logs app        # redis / nginx / certbot are also available
sudo dujiao-next-manager start           # stop / restart
sudo dujiao-next-manager configure-domain
sudo dujiao-next-manager configure-admin-path
sudo dujiao-next-manager renew-cert
sudo dujiao-next-manager admin-reset-password
sudo dujiao-next-manager admin-reset-2fa
sudo dujiao-next-manager uninstall
```

::: warning Supported scope
The first installer release supports Ubuntu 22.04+ / Debian 12+, SQLite, and a single-domain HTTP-01 certificate only. It does not adopt manual or legacy three-part deployments and does not support Docker, PostgreSQL, external Redis, wildcard certificates, or DNS-01.
:::

::: warning SMTP and email registration
SMTP is optional in the wizard. The storefront can run without it, but email-verification registration cannot. Configure and test SMTP under **Settings → SMTP Email** before opening registration. After installation, the database-backed admin setting is authoritative.
:::

If DNS, port 80, or certificate issuance fails, the installer does not expose the storefront over plain HTTP. Fix the problem and rerun `sudo dujiao-next-manager install`; it resumes from the recorded stage.

Main data locations:

| Path | Contents |
| --- | --- |
| `/opt/dujiao-next/` | Binary, `config.yml`, SQLite, uploads, and logs |
| `/etc/dujiao-next/install-state.json` | Installation stage and managed resources (no admin password) |
| `/var/lib/dujiao-next/redis/` | AOF data for the isolated Redis instance |
| `/var/backups/dujiao-next/` | Mandatory recovery backups created before uninstall |

Uninstall never removes apt packages that may be shared by other services. It deletes the application only after a backup containing `config.yml`, SQLite, and `uploads` has been created and verified. Keep `config.yml` with the database: its `app.secret_key` is required to recover encrypted data.

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
| `app.secret_key` | Sensitive-config encryption key — **must change and differ from the JWT secrets** | output of `openssl rand -hex 32` |
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
Restart=always
RestartSec=3
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

::: warning Upgrading from v1.3.1 or earlier: switch to `Restart=always` first
If your unit currently says `Restart=on-failure`, change it to `Restart=always` and run `systemctl daemon-reload` **before** using the admin panel's one-click upgrade.

The reason is that the upgrade is carried out by the **currently running old binary**: after it replaces the binary on disk, it is still the one that handles "restart now". The old binary has none of the new exit-code logic, so it exits normally (exit code 0) — and `Restart=on-failure` does nothing on a normal exit. The service simply stays down until you run `systemctl start dujiao` yourself.

`Restart=always` relaunches on any exit, so after this change even that first upgrade is fully automatic. Switching to `always` does not affect `systemctl stop`; an explicit stop still stops the service.

Once the new version is running, both policies work for subsequent upgrades.
:::

::: tip `Restart=` determines whether one-click restart works
The one-click restart in the admin panel's "System Update" section works by letting the current process exit so systemd relaunches the new binary. The unit's `Restart=` policy must therefore allow an automatic relaunch:

| `Restart=` | One-click restart | Notes |
| --- | --- | --- |
| `always` | ✅ Recommended | Relaunches on any exit; `systemctl stop` still stops the service normally |
| `on-failure` | ✅ Works | A self-update restart exits with a dedicated non-zero code, so it is relaunched |
| `on-success` / `on-abnormal` / `on-abort` | ❌ | Only react to clean exits or signals, not to exit codes |
| `no` | ❌ | Exiting means the service stays down (this is also systemd's default when `Restart=` is omitted) |

Also note that `SuccessExitStatus=70` or `RestartPreventExitStatus=70` in your unit will break one-click restart — 70 is exactly the exit code self-update uses.

At startup the program reads these three settings from the unit and decides whether to expose the restart button. **If they cannot be read, it assumes restart is not possible** and the admin panel asks you to run `systemctl restart dujiao` manually instead.
:::

## 9. Upgrading

1. `systemctl stop dujiao`
2. Back up: `cp -r db uploads config.yml /backup/`
3. Download the new tar.gz and replace the `dujiao-next` binary
4. `systemctl start dujiao`

Database migrations run automatically. The frontends are updated along with the binary — no separate static files to replace.

::: tip Replacing the binary by hand does not clear a one-click upgrade's backup
If you have used the admin panel's one-click upgrade before, `dujiao-next.backup` and `dujiao-next.backup.json` are still sitting in the directory. Replacing the binary by hand leaves them untouched, so the rollback target shown under "System Update" is still the build from **before that one-click upgrade** — potentially several versions older than what you are running now. Delete both files if you do not want to keep it; the rollback entry disappears with them.
:::

### Rolling Back

The admin panel's one-click upgrade keeps the previous binary as `dujiao-next.backup`. There are two ways to roll back:

- **When the admin panel still opens**: go to "System Update" and click roll back.
- **When the new version fails to start**: the admin panel is down too, so use the terminal instead:

  ```bash
  cd /opt/dujiao
  ./dujiao-next rollback
  systemctl restart dujiao
  ```

  This command does not read `config.yml` and does not connect to the database — it only swaps local files, so a bad config or an unreachable database cannot block recovery.

::: warning When `--force` is required
Once database migration has started, the older binary may no longer understand the schema. The CLI therefore **refuses outright** in all three cases below, and the admin panel shows a risk confirmation first:

| Case | Why it is refused |
| --- | --- |
| The new version started completely | Migration definitely finished |
| The new version failed partway through migration | Migration is recorded before the first SQL statement, so the schema may be half-changed |
| No upgrade record, or a corrupted one | There is no way to prove migration did not run |

**The third case is the most common one.** On the *first* one-click upgrade from v1.3.1 or earlier, the swap is performed by the old binary, which has none of this bookkeeping — all it leaves behind is a bare `dujiao-next.backup`. So if you upgraded from v1.3.1 and the new version will not start, the `./dujiao-next rollback` above **will** print a refusal. That is expected behaviour, not a broken command.

Back up your database, then pass `--force` to accept the risk:

```bash
cp -r db /backup/          # SQLite; use pg_dump for PostgreSQL
./dujiao-next rollback --force
systemctl restart dujiao
```
:::

### Startup fails with "无法可靠记录升级状态"

The service will not start and the log shows:

```
无法可靠记录升级状态，已在数据库迁移前中止启动: open update lock: ... permission denied
```

This means the install directory still holds the state files left by a one-click upgrade (`dujiao-next.backup`, `dujiao-next.backup.json`), but **the service account cannot write to that directory**, so the program cannot record that database migration has begun.

It therefore stops **before touching the database on purpose**: letting it continue would migrate the schema with nothing recorded, and a later ordinary rollback would then be wrongly allowed, pairing the old binary with the new schema.

This usually happens when the install directory is owned by `root` while the unit declares `User=dujiao`. Pick either fix:

```bash
# 1) Make the directory writable by the service account (recommended — keeps rollback available)
sudo chown -R dujiao /opt/dujiao

# 2) Drop the rollback point if you no longer need it
sudo rm -f /opt/dujiao/dujiao-next.backup /opt/dujiao/dujiao-next.backup.json
sudo systemctl restart dujiao
```

If the log says "另一个升级或回滚正在进行" instead, two processes simply raced for the lock. Wait a few seconds and restart — no files need changing.

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
