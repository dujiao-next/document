---
outline: deep
---

# Upgrade & Migration

> Updated: 2026-07-26

This guide explains how to upgrade Dujiao-Next from an older version to a newer version.

---

## 0. Upgrading from v1.3.x to v1.4.0 (Important — Architecture Change)

v1.4.0 **embeds the storefront and admin panel frontends into the backend binary**, changing the deployment shape from "three separate services" to "one process". This is a one-time deployment restructuring. Your data is fully compatible, but the deployment setup needs adjusting.

### 0.1 What Changed

| | v1.3.x and earlier | v1.4.0 onward |
|---|---|---|
| Deployment units | api + user + admin (three services) | one process |
| Docker images | `dujiaonext/api`, `dujiaonext/user`, `dujiaonext/admin` | only `dujiaonext/dujiao-next` (the old `dujiaonext/api` is still pushed as a transitional alias) |
| Container count | 4-5 | 2-3 |
| Release artifacts | `dujiao-next_*.tar.gz` (API only) + `dujiao-all_*.tar.gz` (with frontends) | only `dujiao-next_*.tar.gz` |
| Binary name | `dujiao-api` / `dujiao-server` | `dujiao-next` |
| Domains | one each for storefront and admin | one |
| Admin entry | `/` on a dedicated domain | `web.admin_path` on the same site |
| Nginx | separate proxy rules for `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` | a single site-wide `location /` |
| Source repositories | `dujiao-next`, `user`, `admin` | frontends merged into `dujiao-next` under `frontend/` |

**There are no breaking changes at the data layer**: the database, `uploads/`, and `config.yml` all carry over as-is.

### 0.2 Upgrade Steps (Docker Compose)

1. Back up (see section 1 below).

2. Stop the old services:

   ```bash
   docker compose -f <your compose file> down
   ```

3. Edit your compose file: **delete the `user` and `admin` services**, keeping only `redis` (+ `postgres`) and `api`.
   See [Docker Compose Deployment](/en/deploy/docker-compose#_5-write-the-compose-file) for a complete example.

4. Add a `web` section to `config.yml` with a hard-to-guess admin path:

   ```yaml
   web:
     admin_path: "/dj-mgmt-7x9k2"
   ```

5. Set `TAG=v1.4.0` in `.env` and remove the now-unused `USER_PORT` / `ADMIN_PORT`.

6. Start and verify:

   ```bash
   docker compose --env-file .env -f <your compose file> pull
   docker compose --env-file .env -f <your compose file> up -d
   docker compose logs -f api
   ```

   Seeing `Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)` in the log means it worked.

7. Update Nginx: merge the two `server` blocks into one that forwards the whole site to the application port.
   The admin domain can be retired, or kept pointing at the same service.

### 0.3 Upgrade Steps (Binary / Manual Deployment)

1. Back up (see section 1 below).
2. Stop the old api / user / admin services.
3. Download and extract the v1.4.0 `dujiao-next_*.tar.gz`.
4. Move your existing `db/`, `uploads/`, and `config.yml` into the new working directory.
5. Add `web.admin_path` to `config.yml`.
6. Update `ExecStart` in your systemd unit (the binary is now `dujiao-next` instead of `dujiao-api` / `dujiao-server`),
   then run `systemctl daemon-reload`.
7. Start the service and confirm `Embedded SPAs` appears in the log.
8. Switch Nginx to site-wide forwarding; the `root` directives that served `user/dist` and `admin/dist` can be removed.

### 0.4 Things to Watch Out For

- The admin URL changed: from `https://admin.example.com/` to `https://shop.example.com/<web.admin_path>`.
  Tell your administrators and update bookmarks.
- If your payment callback URLs pointed at the admin domain, verify they are still reachable; using the storefront domain everywhere is recommended.
- Changing `web.admin_path` requires a process restart to take effect.
- The old `dujiaonext/user` and `dujiaonext/admin` images are no longer updated and can be pruned from your server.

---

## 1. Before Upgrading

### 1.1 Back Up Your Data

**You must back up the following before upgrading:**

- Database (SQLite file or PostgreSQL data)
- Configuration file (`config.yml`)
- Uploads directory (`uploads/`)

See the [Backup & Restore](/en/deploy/backup) guide.

### 1.2 Read the Changelog

Always read the [Changelog](/en/intro/changelog) before upgrading to understand:

- New features and configuration options
- Breaking changes
- Database schema changes
- New configuration fields

### 1.3 Check In-Flight Payments and the Authorization Baseline

When an upgrade introduces strict callback amount/currency validation or changes DujiaoPay configuration:

- In admin, filter for pending records with `provider_type=dujiaopay`. Prefer to let them complete or expire before upgrading.
- If you must upgrade with in-flight payments, verify that the channel's `fiat_currency` matches the currency stored on those payment records. Do not change that channel's fiat currency until the in-flight records are cleared.
- Prepare test administrators for the six built-in roles (`readonly_auditor`, `operations`, `support`, `integration`, `finance`, and `system_admin`) for post-upgrade authorization smoke tests.

The new version can adopt the signed webhook currency in a limited compatibility path when the signature, channel, provider order ID, merchant order ID, and amount all match and the old payment has no new-version fiat snapshot. This pre-upgrade check still avoids relying on that compatibility path. A currency mismatch on a payment that already has a new-version snapshot remains rejected. If this has already happened, retain the original callback and payment record for manual reconciliation; do not bypass amount or currency validation manually.

---

## 2. Binary Deployment Upgrade

### 2.1 Stop the Service

```bash
systemctl stop dujiao
```

### 2.2 Back Up

```bash
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d)
cp config.yml config.yml.bak
cp -r uploads uploads.bak
```

### 2.3 Replace the Binary

```bash
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao-next_*.tar.gz dujiao-next
```

The frontends update along with the binary — no separate static files to replace.

### 2.4 Update the Configuration

Compare against `config.yml.example` and add any new configuration options you need.

### 2.5 Start the Service

```bash
systemctl start dujiao
```

> Database schema changes are migrated automatically by GORM at startup — no manual SQL required.

---

## 3. Source Build Upgrade

```bash
git pull origin main

# One-command build (includes the frontends)
goreleaser build --snapshot --single-target --clean
```

Or build manually — see [Manual Deployment](/en/deploy/manual#_4-manual-build).

---

## 4. Docker Compose Upgrade

### 4.1 Back Up

```bash
docker compose exec api cp /app/db/dujiao.db /app/db/dujiao.db.bak
docker compose cp api:/app/config.yml ./config.yml.bak
```

### 4.2 Pull the New Image

```bash
# Set TAG in .env to the target version
docker compose --env-file .env -f <your compose file> pull
```

### 4.3 Restart

```bash
docker compose --env-file .env -f <your compose file> up -d
```

### 4.4 Check the Logs

```bash
docker compose logs -f api
```

---

## 5. Post-Upgrade Verification

Verify in this order:

1. **Storefront loads**: open the site root and confirm the product list renders
2. **Admin login**: visit `/<web.admin_path>` and confirm you can log in
3. **Dashboard**: check that data displays correctly
4. **Product list**: confirm products and stock are correct
5. **Create a test order**: place an order on the storefront and complete payment
6. **Payment callback**: confirm callbacks are processed
7. **Email notifications**: confirm outbound email works
8. **Built-in role authorization**: sign in with a test administrator for each built-in role and verify menu visibility, read/write access, and expected 403 boundaries

---

## 6. Rollback

If something goes wrong after upgrading:

### 6.1 Binary Deployment Rollback

```bash
systemctl stop dujiao

# Restore the database and configuration
cp db/dujiao.db.bak.YYYYMMDD db/dujiao.db
cp config.yml.bak config.yml

# Put the old binary back
systemctl start dujiao
```

> Rolling back from v1.4.0 to v1.3.x also requires redeploying the user / admin frontends and restoring the old Nginx configuration.

### 6.2 Docker Rollback

```bash
docker compose down

# Set TAG in .env back to the previous version and restore the database backup
docker compose --env-file .env -f <your compose file> up -d
```

---

## 7. Notes

- When skipping several versions, upgrade one version at a time or read each version's changelog carefully
- Automatic migrations only add columns/tables; they never drop existing columns
- The first startup after an upgrade may be slower (running migrations)
- New configuration fields usually have defaults — omitting them won't break startup, but filling them in is recommended
