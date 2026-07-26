---
outline: deep
---

# 備份與還原

> 更新時間：2026-03-28

定期備份是保障站點資料安全的關鍵。本指南介紹 Dujiao-Next 各元件的備份與還原方法。

---

## 1. 需要備份的內容

| 內容 | 路徑 | 重要性 |
|------|------|--------|
| 資料庫 | `db/`（SQLite）或 PostgreSQL | 最高 |
| 設定檔 | `config.yml` | 高 |
| 上傳檔案 | `uploads/` | 高 |

> 前端已內嵌進二進制，沒有需要單獨備份的靜態檔案目錄。
> 下文路徑均相對於程式執行目錄（Docker 部署下對應宿主機掛載出來的 `data/` 目錄）。

---

## 2. 資料庫備份

### 2.1 SQLite

SQLite 資料儲存在單個檔案中，直接複製即可：

```bash
# 備份
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d%H%M%S)
```

> 建議在服務停止或低流量時備份，避免寫入衝突。

### 2.2 PostgreSQL

使用 `pg_dump` 備份：

```bash
# 備份整個資料庫
pg_dump -U dujiao -d dujiao -F c -f dujiao_backup_$(date +%Y%m%d).dump

# 僅備份資料（不含結構，適合遷移）
pg_dump -U dujiao -d dujiao --data-only -f dujiao_data_$(date +%Y%m%d).sql
```

### 2.3 Docker 環境備份

```bash
# SQLite（直接從容器中拷貝）
docker compose cp api:/app/db/dujiao.db ./backup/dujiao.db

# PostgreSQL（使用 pg_dump）
docker compose exec postgres pg_dump -U dujiao -d dujiao -F c -f /tmp/backup.dump
docker compose cp postgres:/tmp/backup.dump ./backup/
```

---

## 3. 設定檔備份

```bash
cp config.yml backup/config.yml.$(date +%Y%m%d)
```

> `config.yml` 包含資料庫密碼、JWT 金鑰、支付設定等敏感資訊，請妥善保管備份檔案。

---

## 4. 上傳檔案備份

```bash
# 直接複製目錄
cp -r uploads backup/uploads_$(date +%Y%m%d)

# 或使用 rsync 增量備份
rsync -av uploads/ backup/uploads/
```

Docker 環境：

```bash
docker compose cp api:/app/uploads ./backup/uploads
```

---

## 5. 自動備份腳本

建立定時備份腳本：

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backup/$(date +%Y%m%d)"
APP_DIR="/path/to/dujiao-studio/api"

mkdir -p "$BACKUP_DIR"

# 備份資料庫（SQLite）
cp "$APP_DIR/db/dujiao.db" "$BACKUP_DIR/dujiao.db"

# 備份設定
cp "$APP_DIR/config.yml" "$BACKUP_DIR/config.yml"

# 備份上傳檔案
rsync -a "$APP_DIR/uploads/" "$BACKUP_DIR/uploads/"

# 清理 30 天前的備份
find /path/to/backup -maxdepth 1 -mtime +30 -type d -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

新增 crontab 定時執行：

```bash
# 每天凌晨 3 點執行備份
0 3 * * * /path/to/backup.sh >> /var/log/dujiao-backup.log 2>&1
```

---

## 6. 還原資料

### 6.1 還原 SQLite

```bash
# 停止服務
systemctl stop dujiao-next

# 還原資料庫
cp backup/dujiao.db db/dujiao.db

# 啟動服務
systemctl start dujiao-next
```

### 6.2 還原 PostgreSQL

```bash
# 停止服務
systemctl stop dujiao-next

# 還原資料庫
pg_restore -U dujiao -d dujiao -c backup/dujiao_backup.dump

# 啟動服務
systemctl start dujiao-next
```

### 6.3 還原設定和上傳檔案

```bash
cp backup/config.yml config.yml
cp -r backup/uploads/* uploads/
```

---

## 7. 備份建議

- **頻率**：資料庫至少每天備份一次，高流量站點建議每 6-12 小時一次
- **保留**：至少保留 7 天的歷史備份，建議保留 30 天
- **異地**：重要資料建議同步到異地儲存（如物件儲存、另一台伺服器）
- **測試**：定期測試還原流程，確保備份有效
- **安全**：備份檔案包含敏感資訊，注意儲存安全和權限控制
