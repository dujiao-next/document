---
outline: deep
---

# Backup & Recovery

> Updated: 2026-03-28

Regular backups are essential for safeguarding your site's data. This guide covers backup and recovery procedures for each Dujiao-Next component.

---

## 1. What to Back Up

| Item | Path | Importance |
|------|------|------------|
| Database | `db/` (SQLite) or PostgreSQL | Critical |
| Configuration file | `config.yml` | High |
| Uploaded files | `uploads/` | High |

> The frontends are embedded in the binary — there are no static asset directories
> to back up separately. Paths below are relative to the program's working directory
> (for Docker deployments, the `data/` directory mounted from the host).

---

## 2. Database Backup

### 2.1 SQLite

SQLite data is stored in a single file -- simply copy it:

```bash
# Back up
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d%H%M%S)
```

> It is recommended to back up while the service is stopped or during low-traffic periods to avoid write conflicts.

### 2.2 PostgreSQL

Use `pg_dump` to back up:

```bash
# Full database backup
pg_dump -U dujiao -d dujiao -F c -f dujiao_backup_$(date +%Y%m%d).dump

# Data-only backup (no schema, suitable for migration)
pg_dump -U dujiao -d dujiao --data-only -f dujiao_data_$(date +%Y%m%d).sql
```

### 2.3 Docker Environment Backup

```bash
# SQLite (copy directly from the container)
docker compose cp dujiao-next:/app/db/dujiao.db ./backup/dujiao.db

# PostgreSQL (using pg_dump)
docker compose exec postgres pg_dump -U dujiao -d dujiao -F c -f /tmp/backup.dump
docker compose cp postgres:/tmp/backup.dump ./backup/
```

---

## 3. Configuration File Backup

```bash
cp config.yml backup/config.yml.$(date +%Y%m%d)
```

> `config.yml` contains sensitive information such as database passwords, JWT secrets, and payment configurations. Store backup copies securely.

---

## 4. Uploaded Files Backup

```bash
# Direct copy
cp -r uploads backup/uploads_$(date +%Y%m%d)

# Or use rsync for incremental backup
rsync -av uploads/ backup/uploads/
```

Docker environment:

```bash
docker compose cp dujiao-next:/app/uploads ./backup/uploads
```

---

## 5. Automated Backup Script

Create a scheduled backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backup/$(date +%Y%m%d)"
APP_DIR="/path/to/dujiao-studio/api"

mkdir -p "$BACKUP_DIR"

# Back up database (SQLite)
cp "$APP_DIR/db/dujiao.db" "$BACKUP_DIR/dujiao.db"

# Back up configuration
cp "$APP_DIR/config.yml" "$BACKUP_DIR/config.yml"

# Back up uploaded files
rsync -a "$APP_DIR/uploads/" "$BACKUP_DIR/uploads/"

# Remove backups older than 30 days
find /path/to/backup -maxdepth 1 -mtime +30 -type d -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

Add a crontab entry for scheduled execution:

```bash
# Run backup daily at 3:00 AM
0 3 * * * /path/to/backup.sh >> /var/log/dujiao-backup.log 2>&1
```

---

## 6. Restoring Data

### 6.1 Restore SQLite

```bash
# Stop the service
systemctl stop dujiao-next

# Restore the database
cp backup/dujiao.db db/dujiao.db

# Start the service
systemctl start dujiao-next
```

### 6.2 Restore PostgreSQL

```bash
# Stop the service
systemctl stop dujiao-next

# Restore the database
pg_restore -U dujiao -d dujiao -c backup/dujiao_backup.dump

# Start the service
systemctl start dujiao-next
```

### 6.3 Restore Configuration and Uploaded Files

```bash
cp backup/config.yml config.yml
cp -r backup/uploads/* uploads/
```

---

## 7. Backup Recommendations

- **Frequency**: Back up the database at least once daily; for high-traffic sites, every 6--12 hours is recommended
- **Retention**: Keep at least 7 days of historical backups; 30 days is recommended
- **Off-site storage**: Store critical data in a remote location (e.g., object storage, a separate server)
- **Testing**: Periodically test the recovery process to ensure backups are valid
- **Security**: Backup files contain sensitive information -- pay attention to storage security and access permissions
