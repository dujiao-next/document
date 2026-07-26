# Environment Requirements

> Updated: 2026-02-11

## 1. Minimum Runtime Requirements

### 1.1 Operating Systems

Any of the following systems is recommended:

- Linux (recommended: Ubuntu 22.04+ / Debian 12+)
- macOS (Apple Silicon or Intel)
- Windows 10/11 (WSL2 recommended)

### 1.2 Runtime and Toolchain

- Go: `1.26.3` (aligned with `api/go.mod`)
- Node.js: `20 LTS` or higher
- npm: `10+`
- Git: `2.30+`

### 1.3 Data and Middleware

- Database:
  - SQLite (default, fast single-node deployment)
  - PostgreSQL (recommended for production)
- Redis: `6+` (recommended for cache, queue, and rate limiting)

## 2. Recommended Production Specs

- CPU: 1 core or above
- RAM: 1 GB or above
- Disk: 20 GB or above (including logs, uploads, and database)
- Network: outbound access to payment gateways and mail services

## 3. Suggested Port Plan

- Production: only port `8080` is needed. The storefront is at `/`, the admin panel at
  `web.admin_path`, and the API and uploads are served from the same port.
- Development additionally uses:
  - Storefront dev server: `5173`
  - Admin dev server: `5174`
  - Docs (VitePress): `5175` (example, configurable)

## 4. Development Environment Self-Check

```bash
# Run from the repository root
go version
node -v
pnpm -v          # run `corepack enable` if missing

# Sync backend dependencies
go mod tidy

# Install frontend dependencies
cd frontend/user  && pnpm install
cd ../admin       && pnpm install
```

## 5. Common Issues

### 5.1 Go Version Mismatch

If your Go version is lower than `1.26.3`, you may encounter build failures or dependency resolution issues. Upgrade to the version aligned with `go.mod`.

### 5.2 Redis Not Running

When `config.yml` enables `redis.enabled=true` or `queue.enabled=true`, unavailable Redis may break features such as queue processing and rate limiting.
