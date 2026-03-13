# Deployment Overview and Selection Guide

> Last Updated: 2026-03-13

If you have not decided which deployment method to use, read this page first, then jump to the detailed guide.

## 1. Recommended Starting Points

The official documentation now keeps only formal deployment guides that can be reviewed step by step. Choose the path that matches your environment:

- First deployment and you want a stable long-term setup: start with [Docker Compose Deployment](/en/deploy/docker-compose).
- You already run aaPanel: go directly to [aaPanel Deployment](/en/deploy/aapanel).
- You need source-level customization or local builds: use [Manual Deployment](/en/deploy/manual).

## 2. How to Choose a Deployment Method

| Method | Difficulty | Best For | Key Characteristics | Guide |
| --- | --- | --- | --- | --- |
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
