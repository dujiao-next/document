---
outline: deep
---

# 备份与恢复

> 更新时间：2026-03-28

定期备份是保障站点数据安全的关键。本指南介绍 Dujiao-Next 各组件的备份与恢复方法。

---

## 1. 需要备份的内容

| 内容 | 路径 | 重要性 |
|------|------|--------|
| 数据库 | `db/`（SQLite）或 PostgreSQL | 最高 |
| 配置文件 | `config.yml` | 高 |
| 上传文件 | `uploads/` | 高 |

> 前端已内嵌进二进制，没有需要单独备份的静态文件目录。
> 下文路径均相对于程序运行目录（Docker 部署下对应宿主机挂载出来的 `data/` 目录）。

---

## 2. 数据库备份

### 2.1 SQLite

SQLite 数据存储在单个文件中，直接复制即可：

```bash
# 备份
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d%H%M%S)
```

> 建议在服务停止或低流量时备份，避免写入冲突。

### 2.2 PostgreSQL

使用 `pg_dump` 备份：

```bash
# 备份整个数据库
pg_dump -U dujiao -d dujiao -F c -f dujiao_backup_$(date +%Y%m%d).dump

# 仅备份数据（不含结构，适合迁移）
pg_dump -U dujiao -d dujiao --data-only -f dujiao_data_$(date +%Y%m%d).sql
```

### 2.3 Docker 环境备份

```bash
# SQLite（直接从容器中拷贝）
docker compose cp dujiao-next:/app/db/dujiao.db ./backup/dujiao.db

# PostgreSQL（使用 pg_dump）
docker compose exec postgres pg_dump -U dujiao -d dujiao -F c -f /tmp/backup.dump
docker compose cp postgres:/tmp/backup.dump ./backup/
```

---

## 3. 配置文件备份

```bash
cp config.yml backup/config.yml.$(date +%Y%m%d)
```

> `config.yml` 包含数据库密码、JWT 密钥等敏感信息，其中 `app.secret_key` 是恢复数据库内加密配置所必需的。请限制备份文件权限，并始终让它与对应数据库备份配套保存。

---

## 4. 上传文件备份

```bash
# 直接复制目录
cp -r uploads backup/uploads_$(date +%Y%m%d)

# 或使用 rsync 增量备份
rsync -av uploads/ backup/uploads/
```

Docker 环境：

```bash
docker compose cp dujiao-next:/app/uploads ./backup/uploads
```

---

## 5. 自动备份脚本

创建定时备份脚本：

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backup/$(date +%Y%m%d)"
APP_DIR="/path/to/dujiao-studio/api"

mkdir -p "$BACKUP_DIR"

# 备份数据库（SQLite）
cp "$APP_DIR/db/dujiao.db" "$BACKUP_DIR/dujiao.db"

# 备份配置
cp "$APP_DIR/config.yml" "$BACKUP_DIR/config.yml"

# 备份上传文件
rsync -a "$APP_DIR/uploads/" "$BACKUP_DIR/uploads/"

# 清理 30 天前的备份
find /path/to/backup -maxdepth 1 -mtime +30 -type d -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

添加 crontab 定时执行：

```bash
# 每天凌晨 3 点执行备份
0 3 * * * /path/to/backup.sh >> /var/log/dujiao-backup.log 2>&1
```

---

## 6. 恢复数据

### 6.1 恢复 SQLite

```bash
# 停止服务
systemctl stop dujiao-next

# 恢复数据库
cp backup/dujiao.db db/dujiao.db

# 启动服务
systemctl start dujiao-next
```

### 6.2 恢复 PostgreSQL

```bash
# 停止服务
systemctl stop dujiao-next

# 恢复数据库
pg_restore -U dujiao -d dujiao -c backup/dujiao_backup.dump

# 启动服务
systemctl start dujiao-next
```

### 6.3 恢复配置和上传文件

```bash
cp backup/config.yml config.yml
cp -r backup/uploads/* uploads/
```

---

## 7. 备份建议

- **频率**：数据库至少每天备份一次，高流量站点建议每 6-12 小时一次
- **保留**：至少保留 7 天的历史备份，建议保留 30 天
- **异地**：重要数据建议同步到异地存储（如对象存储、另一台服务器）
- **测试**：定期测试恢复流程，确保备份有效
- **安全**：备份文件包含敏感信息，注意存储安全和权限控制
