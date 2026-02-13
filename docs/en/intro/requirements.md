# Environment Requirements

> Updated: 2026-02-11

## 1. Minimum Runtime Requirements

### 1.1 Operating Systems

Any of the following systems is recommended:

- Linux (recommended: Ubuntu 22.04+ / Debian 12+)
- macOS (Apple Silicon or Intel)
- Windows 10/11 (WSL2 recommended)

### 1.2 Runtime and Toolchain

- Go: `1.25.3` (aligned with `api/go.mod`)
- Node.js: `20 LTS` or higher
- npm: `10+`
- Git: `2.30+`

### 1.3 Data and Middleware

- Database:
  - SQLite (default, fast single-node deployment)
  - PostgreSQL (recommended for production)
- Redis: `6+` (recommended for cache, queue, and rate limiting)

## 2. Recommended Production Specs

- CPU: 2 cores or above
- RAM: 4 GB or above
- Disk: 20 GB or above (including logs, uploads, and database)
- Network: outbound access to payment gateways and mail services

## 3. Suggested Port Plan

- API: `8080`
- User: `5173` (development)
- Admin: `5174` (development)
- Docs (VitePress): `5175` (example, configurable)

## 4. Development Environment Self-Check

```bash
# Go
cd api && go version

# Node / npm
node -v
npm -v

# Install User/Admin dependencies
cd user && npm install
cd ../admin && npm install

# Sync backend dependencies
cd ../api && go mod tidy
```

## 5. Common Issues

### 5.1 Go Version Mismatch

If your Go version is lower than `1.25.3`, you may encounter build failures or dependency resolution issues. Upgrade to the version aligned with `go.mod`.

### 5.2 Redis Not Running

When `config.yml` enables `redis.enabled=true` or `queue.enabled=true`, unavailable Redis may break features such as queue processing and rate limiting.
