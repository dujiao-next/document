# Deploy Using aaPanel (Based on Releases Archive)

> Last Updated: 2026-07-26

If you have not chosen a deployment method yet, start with [Deployment Overview and Selection Guide](/en/deploy/).

This document covers deploying the official compiled artifact on an aaPanel/BT panel server.

Features:

- No need to `git clone` the source code on the server
- No need to run `go build` / `pnpm run build` on the server
- Only involves "Download → Extract → Configure → Start"
- Since v1.4.0 the frontends are embedded in the program, so you **download one archive and create one site**

## 1. Panel and Software Prerequisites

Install in aaPanel:

- Nginx
- PM2 Manager (or Supervisor)
- Extraction tools (`tar`)
- Redis (as needed)
- PostgreSQL (as needed)

> This deployment method does not require Git, Go, or a Node.js build environment.

## 2. Prepare the Directory

```bash
mkdir -p /www/wwwroot/dujiao-next
cd /www/wwwroot/dujiao-next
```

## 3. Download and Extract the Release Archive

Download the archive matching your architecture from [Releases](https://github.com/dujiao-next/dujiao-next/releases).

Naming follows GoReleaser conventions: `dujiao-next_<tag>_Linux_<arch>.tar.gz`, for example `dujiao-next_v1.4.0_Linux_x86_64.tar.gz` (use `_Linux_arm64.tar.gz` on arm64 machines).

```bash
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz
```

After extraction the directory should contain:

- `dujiao-next` (the executable with embedded frontends)
- `config.yml.example`
- `README.md`

::: tip Note for v1.3.x users
The old setup required downloading three archives (API, User, Admin) and creating two sites.
Now there is one archive; the frontends live inside the program, and there are no `user/dist` or `admin/dist` directories.
:::

## 4. Configure

```bash
cd /www/wwwroot/dujiao-next
cp config.yml.example config.yml
chmod +x ./dujiao-next
# edit config.yml
```

> ⚠️ Critical security note: before going live, change `app.secret_key`, `jwt.secret`, and `user_jwt.secret` separately in `config.yml`.
>
> Use high-entropy strings of at least 32 characters, keep all three different, never retain template defaults, and back up `app.secret_key` with the database.

Also change the admin entry path (the default `/admin` is a prime scanner target):

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # pick your own string
```

## 5. Start with PM2 / Supervisor

Add the start command in aaPanel's PM2/Supervisor:

```bash
/www/wwwroot/dujiao-next/dujiao-next
```

Set the working directory to:

```text
/www/wwwroot/dujiao-next
```

> It is also recommended to set these environment variables on the process (to initialize the default administrator and avoid weak default credentials):
>
> - `DJ_DEFAULT_ADMIN_USERNAME=admin`
> - `DJ_DEFAULT_ADMIN_PASSWORD=<your strong password>`

After starting, check the logs — this line confirms the frontends were embedded correctly:

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 5.1 Default Administrator Account (First Initialization)

When the `admins` table is empty, the first startup attempts to create a default administrator:

- Username: `admin`
- Password: `admin123`

> Strongly recommended: change the password immediately after your first login.

If you set `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD` in PM2/Supervisor, those values take precedence.

Without those environment variables, you can also configure it in `config.yml`:

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: <your strong password>
```

The values are read on first startup to initialize the administrator.

## 6. Create the Site in aaPanel

**You only need one site:**

- Site domain: `shop.example.com`
- Document root: anything (no static files are actually served — every request is proxied to the program)
- Issue an SSL certificate for the site

## 7. Reverse Proxy Configuration

In the site's "Reverse Proxy" settings, forward the whole site to `http://127.0.0.1:8080`.

If you edit the Nginx configuration by hand, it looks like this:

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

::: tip What got simpler
The old setup needed two sites and two domains, plus separate proxy rules for `/api/`, `/uploads/`,
`/sitemap.xml`, and `/robots.txt`. All of that is now handled by one program behind a single site-wide proxy.
:::

## 8. Upgrading

1. Stop the process in PM2/Supervisor
2. Back up `db/`, `uploads/`, and `config.yml`
3. Download the new archive and overwrite the `dujiao-next` binary
4. Start the process again

The frontends update along with the binary — no separate static files to replace.

## 9. Security Recommendations

- Never keep the default secrets in `config.yml`
- Do not keep the default `/admin` for `web.admin_path`
- Only open the necessary ports (80/443)
- Do not expose the application port (8080) publicly — only the local Nginx should reach it
- Set `server.mode: release` in production
