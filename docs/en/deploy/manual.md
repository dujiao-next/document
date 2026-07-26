# Manual Deployment (Build from Source)

> Last updated: 2026-07-26

If you have not chosen a deployment method yet, start with [Deployment Overview and Selection Guide](/en/deploy/).

This document is for developers who want full control over the build, or who are doing secondary development.

As of v1.4.0 the frontend source lives in the main repository under `frontend/`, so **you only clone one repository**. Build output is compiled into the binary via `go:embed`.

## 1. Requirements

- Go (see the repository's `go.mod` for the version)
- Node.js 24.x
- pnpm 10.34.3 (just run `corepack enable`)

## 2. Obtaining the Source Code

```bash
git clone https://github.com/dujiao-next/dujiao-next.git
cd dujiao-next
```

Repository layout:

```
dujiao-next/
├── cmd/server/          # entry point
├── internal/
│   └── web/             # frontend embedding and SPA route mounting
├── frontend/
│   ├── admin/           # admin panel (Vue 3 + Vite)
│   └── user/            # storefront (Vue 3 + Vite)
├── config.yml.example
└── .goreleaser.yaml
```

## 3. One-Command Build (Recommended)

The repository already describes the full build pipeline (frontend build + embedding) in GoReleaser, so a single local command is enough:

```bash
goreleaser build --snapshot --single-target --clean
```

The output lands in `dist/` as a complete binary with embedded frontends. This is the exact same path CI uses for releases.

If you don't have GoReleaser installed, build manually as described below.

## 4. Manual Build

### 4.1 Build the Frontends

```bash
# Admin panel: must use fullstack mode, which injects a <base> placeholder
# that the backend replaces at runtime
cd frontend/admin
pnpm install --frozen-lockfile
pnpm run build:fullstack

# Storefront
cd ../user
pnpm install --frozen-lockfile
pnpm run build

cd ../..
```

::: warning admin must use build:fullstack
`pnpm run build` (without `:fullstack`) produces the standalone-domain variant with `base` hardcoded to `/`.
Embedded under a custom prefix, it fails to load its static assets. Always use `build:fullstack` for embedding.
:::

### 4.2 Copy Output into the Embed Directory

`go:embed` can only read files inside the package directory, so the frontend output must go under `internal/web/dist/`:

```bash
rm -rf internal/web/dist
mkdir -p internal/web/dist
cp -r frontend/admin/dist internal/web/dist/admin
cp -r frontend/user/dist  internal/web/dist/user
```

### 4.3 Compile the Binary

```bash
CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" \
  -o dujiao-next ./cmd/server
```

`-tags fullstack` is the key part: without it, the resulting binary contains no frontends and serves only the API.

Cross-compilation example (building a Linux binary on macOS):

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -tags release,fullstack \
  -ldflags="-s -w" -o dujiao-next-linux-amd64 ./cmd/server
```

### 4.4 API Only, Without Frontends

For secondary development or a custom split-frontend setup:

```bash
go build -o dujiao-api ./cmd/server
```

Neither `/` nor the admin path will be mounted. You then need to serve the frontend build with Nginx yourself
and proxy `/api`, `/uploads`, `/sitemap.xml`, and `/robots.txt` to this service.

## 5. Configuration

```bash
cp config.yml.example config.yml
# edit config.yml for your environment
```

At minimum, verify:

- `server.mode` (debug/release)
- `database.driver` / `database.dsn`
- `jwt.secret` / `user_jwt.secret`
- `web.admin_path` (admin entry path — **change the default `/admin`**)
- `redis`, `queue`, `email` (enable as needed)

> ⚠️ Critical security note: you must change `jwt.secret` and `user_jwt.secret` before going live, using random strings of at least 32 characters.
>
> Never keep the template defaults — doing so makes tokens forgeable and is a serious security risk.

## 6. Running

```bash
./dujiao-next
```

Default listen address: `http://0.0.0.0:8080`

This line in the startup log confirms the frontends were embedded correctly:

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 6.1 Default Administrator Account (First Initialization)

When the `admins` table is empty, the system attempts to create a default administrator on first start:

- Username: `admin`
- Password: `admin123`

> Strongly recommended: change it to a strong password right after your first login, under "Admin -> Change Password".

Notes:

- You can override the defaults with environment variables before starting:
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- If `server.mode=release` and `DJ_DEFAULT_ADMIN_PASSWORD` is unset, default administrator initialization is skipped (no `admin/admin123` is created).

## 7. Nginx Reverse Proxy

Forward the whole site to a single port — no per-path splitting required:

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

## 8. Local Development

During development you don't need to embed the frontends every time — run three processes and get hot reload:

```bash
# Terminal 1: backend (no fullstack tag, SPAs not mounted)
go run ./cmd/server

# Terminal 2: storefront at http://localhost:5173
cd frontend/user && pnpm run dev

# Terminal 3: admin panel at http://localhost:5174
cd frontend/admin && pnpm run dev
```

Both Vite dev servers are preconfigured to proxy `/api` and `/uploads` to `localhost:8080`;
the storefront also proxies `/sitemap.xml` and `/robots.txt`.

## 9. Start/Stop and Upgrade Notes

- Use `systemd` / `supervisor` to supervise the process (see the systemd unit example in [Single Binary Deployment](/en/deploy/binary#_8-running-as-a-service-systemd))
- Release in this order:
  1. Stop the service
  2. Pull changes and rebuild (the frontends are compiled into the binary)
  3. Replace the binary
  4. Start the service
  5. Check the health endpoint: `GET /health`
