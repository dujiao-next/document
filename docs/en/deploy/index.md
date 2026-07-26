# Deployment Overview and Selection Guide

> Last Updated: 2026-07-26

If you have not decided which deployment method to use, read this page first, then jump to the detailed guide.

## 1. Since v1.4.0: One Process Runs Everything

As of v1.4.0, the storefront and admin panel frontends are compiled into the backend binary via `go:embed`. This means:

- **You deploy a single program** — no more separate api / user / admin deployments
- **You need a single port** (8080 by default): the storefront is served at `/`, the admin panel at `web.admin_path` (`/admin` by default)
- **You need a single domain** — no separate domains for storefront and admin panel
- No nginx is needed to serve frontend static files; the reverse proxy simply forwards the whole domain to that one port

If you are running a v1.3.x or earlier split deployment, see [Upgrade and Migration](/en/deploy/upgrade).

## 2. Recommended Starting Points

- Complete beginners / want to avoid Docker: start with [Single Binary Deployment](/en/deploy/binary) (simplest).
- You want a standardized, repeatable setup: start with [Docker Compose Deployment](/en/deploy/docker-compose).
- You already run aaPanel: go directly to [aaPanel Deployment](/en/deploy/aapanel).
- You need source-level customization or local builds: use [Manual Deployment](/en/deploy/manual).

## 3. How to Choose a Deployment Method

| Method | Difficulty | Best For | Key Characteristics | Guide |
| --- | --- | --- | --- | --- |
| Single Binary | Low | Complete beginners / want to avoid Docker | Download, extract, run — no compilation | [Single Binary Deployment](/en/deploy/binary) |
| Docker Compose | Medium | Users who need standardized and repeatable deployment | One image + Redis, clear upgrade/rollback path | [Docker Compose Deployment](/en/deploy/docker-compose) |
| aaPanel Deployment | Low-Medium | Users already running aaPanel | GUI-oriented operations, suitable for panel-based maintenance | [aaPanel Deployment](/en/deploy/aapanel) |
| Manual Deployment (Build from source) | High | Advanced customization and secondary development | Highest control and flexibility | [Manual Deployment](/en/deploy/manual) |

Whichever you pick, you end up running the same binary with embedded frontends. The only difference is how you obtain it and what supervises the process.

## 4. Pre-Deployment Checklist

- Prepare a Linux server and one domain that resolves to your public IP (**one is enough**)
- Plan your port (only 8080 is needed by default)
- Set strong random keys in `config.yml`:
  - `jwt.secret`
  - `user_jwt.secret`
- Change the admin entry path `web.admin_path` — do not keep the default `/admin`
- Choose your data stack:
  - Lightweight: SQLite + Redis
  - Production: PostgreSQL + Redis
- Decide how the default administrator is initialized (pick one):
  - Environment variables: `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`: `bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 5. After Deployment

1. Check service status:
   - API health check: `/health`
   - Verify both the storefront `/` and the admin panel `/<web.admin_path>` load
2. Change the administrator password immediately after your first login.
3. Configure payment settings and callback URLs (see [Payment Configuration and Callback Guide](/en/payment/guide)).
4. Configure HTTPS (at your reverse proxy, panel, or container entry layer).
