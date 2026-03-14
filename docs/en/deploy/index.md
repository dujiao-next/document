# Deployment Overview and Selection Guide

> Last Updated: 2026-03-14

If you have not decided which deployment method to use, read this page first, then jump to the detailed guide.

## 1. Recommended Starting Points

The official documentation prioritizes formal deployment guides that can be reviewed step by step. If you prefer a community-maintained menu-driven script, you can also review that project before deciding.

> Note: Community scripts listed in the deployment module are third-party contributions, not official releases. The official documentation only provides basic security review and listing for public projects, and does not endorse third-party functionality, stability, compatibility, or long-term maintenance.

- First deployment and you want a stable long-term setup: start with [Docker Compose Deployment](/en/deploy/docker-compose).
- You want one menu to cover deployment, updates, HTTPS, and routine operations: review the community script [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install).
- You already run aaPanel: go directly to [aaPanel Deployment](/en/deploy/aapanel).
- You need source-level customization or local builds: use [Manual Deployment](/en/deploy/manual).

## 2. How to Choose a Deployment Method

| Method | Difficulty | Best For | Key Characteristics | Guide |
| --- | --- | --- | --- | --- |
| Community One-Click Script (LangGe) | Low-Medium | Users who want one menu for deployment, updates, HTTPS, and basic ops | Community-maintained, supports Docker / binary / external environment, HTTPS, version checks, and ops menus | [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install) |
| Docker Compose | Medium | Users who need standardized and repeatable deployment | Container isolation, clear upgrade/rollback path, automation-friendly | [Docker Compose Deployment](/en/deploy/docker-compose) |
| aaPanel Manual Deployment | Low-Medium | Users already running aaPanel | GUI-oriented operations, suitable for panel-based maintenance | [aaPanel Deployment](/en/deploy/aapanel) |
| Manual Deployment (Build from source) | High | Advanced customization and secondary development | Highest control and flexibility | [Manual Deployment](/en/deploy/manual) |

## 3. Pre-Deployment Checklist

- Prepare a Linux server and domain(s) that resolve to your public IP (same-origin or split domains both work)
- Plan your ports (at minimum API port + web ports)
- Set strong random keys in `config.yml`:
  - `jwt.secret`
  - `user_jwt.secret`
- Choose your data stack:
  - Lightweight: SQLite + Redis
  - Recommended for production: PostgreSQL + Redis
- Choose one default admin initialization method:
  - Environment variables: `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`: `bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 4. Recommended Paths

- If you want a single community script for deployment, updates, and HTTPS, read the [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install) README first and decide whether its workflow fits your environment.
- New user: start with Docker Compose; if you already use aaPanel, go directly to the aaPanel guide.
- Long-term operations with stable repeatability: use Docker Compose.
- Deep customization or local build workflow: use manual deployment.

## 5. After Deployment

1. Verify service status:
   - API health endpoint: `/health`
   - User/Admin pages accessible
2. Change the admin password immediately after first login.
3. Configure payment settings and callback URLs (see [Payment Configuration & Callback Guide](/en/payment/guide)).
4. Enable HTTPS in your reverse proxy, panel, or container ingress layer according to the deployment method you selected.
