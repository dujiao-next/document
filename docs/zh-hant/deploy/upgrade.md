---
outline: deep
---

# 升級與遷移

> 更新時間：2026-07-26

本指南介紹如何將 Dujiao-Next 從舊版本升級到新版本。

---

## 0. 從 v1.3.x 升級到 v1.4.0（重要，架構變更）

v1.4.0 把用戶前臺與管理後臺的前端**內嵌進了後端二進制**，部署形態從「三端分離」變成「單行程」。這是一次性的部署結構調整，資料完全相容，但部署方式需要調整。

### 0.1 變了什麼

| | v1.3.x 及更早 | v1.4.0 起 |
|---|---|---|
| 部署單元 | api + user + admin 三個服務 | 一個行程 |
| Docker 鏡像 | `dujiaonext/api`、`dujiaonext/user`、`dujiaonext/admin` | 只有 `dujiaonext/api` |
| 容器數量 | 4-5 個 | 2-3 個 |
| 發佈產物 | `dujiao-next_*.tar.gz`（純 API）+ `dujiao-all_*.tar.gz`（含前端） | 只有 `dujiao-next_*.tar.gz` |
| 二進制名 | `dujiao-api` / `dujiao-server` | `dujiao-next` |
| 網域 | 前臺、後臺各一個 | 一個 |
| 後臺入口 | 獨立網域的 `/` | 同一站點的 `web.admin_path` |
| Nginx | 需為 `/api`、`/uploads`、`/sitemap.xml`、`/robots.txt` 分別配置反向代理 | 整站一條 `location /` |
| 源碼倉庫 | `dujiao-next`、`user`、`admin` 三個 | 前端併入 `dujiao-next` 的 `frontend/` |

**資料層沒有任何破壞性變更**：資料庫、`uploads/`、`config.yml` 全部可以直接沿用。

### 0.2 升級步驟（Docker Compose）

1. 備份（見下方第 1 節）。

2. 停止舊服務：

   ```bash
   docker compose -f <你的 compose 檔案> down
   ```

3. 修改 compose 檔案：**刪除 `user` 與 `admin` 兩個 service**，只保留 `redis`（+ `postgres`）與 `api`。
   完整範例見 [Docker Compose 部署](/zh-hant/deploy/docker-compose#_5-編寫-compose-檔案)。

4. 在 `config.yml` 補上 `web` 段，設定一個不易猜測的後臺路徑：

   ```yaml
   web:
     admin_path: "/dj-mgmt-7x9k2"
   ```

5. 把 `.env` 裡的 `TAG` 改成 `v1.4.0`，刪掉不再使用的 `USER_PORT` / `ADMIN_PORT`。

6. 啟動並檢查：

   ```bash
   docker compose --env-file .env -f <你的 compose 檔案> pull
   docker compose --env-file .env -f <你的 compose 檔案> up -d
   docker compose logs -f api
   ```

   日誌出現 `Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)` 即為成功。

7. 調整 Nginx：把原來的兩個 `server` 區塊合併為一個，整站轉發到應用埠。
   後臺網域可以停用，也可以繼續解析到同一個服務。

### 0.3 升級步驟（二進制 / 手動部署）

1. 備份（見下方第 1 節）。
2. 停止舊的 api / user / admin 服務。
3. 下載 v1.4.0 的 `dujiao-next_*.tar.gz` 並解壓縮。
4. 把原有的 `db/`、`uploads/`、`config.yml` 放進新的執行目錄。
5. 在 `config.yml` 補上 `web.admin_path`。
6. 更新 systemd unit 裡的 `ExecStart`（二進制名從 `dujiao-api` / `dujiao-server` 改為 `dujiao-next`），
   然後 `systemctl daemon-reload`。
7. 啟動服務，確認日誌出現 `Embedded SPAs`。
8. 調整 Nginx 為整站轉發；原來託管 `user/dist`、`admin/dist` 的 `root` 配置可以刪除。

### 0.4 注意事項

- 後臺地址變了：從 `https://admin.example.com/` 變成 `https://shop.example.com/<web.admin_path>`，
  記得通知所有管理員並更新書籤。
- 支付回調地址如果之前填的是後臺網域，請檢查是否仍可達；建議統一改用前臺網域。
- 改動 `web.admin_path` 後必須重啟行程才會生效。
- 舊的 `dujiaonext/user`、`dujiaonext/admin` 鏡像不再更新，可以從伺服器上清理掉。

---

## 1. 升級前準備

### 1.1 備份資料

**必須在升級前備份以下內容：**

- 資料庫（SQLite 檔案或 PostgreSQL 資料）
- 配置檔案（`config.yml`）
- 上傳檔案目錄（`uploads/`）

參考 [備份與恢復](/zh-hant/deploy/backup) 指南。

### 1.2 查看更新日誌

升級前務必閱讀 [更新日誌](/zh-hant/intro/changelog)，了解：

- 新增功能和配置項
- 破壞性變更（Breaking Changes）
- 資料庫結構變更
- 配置檔案新增欄位

---

## 2. 二進制部署升級

### 2.1 停止服務

```bash
systemctl stop dujiao
```

### 2.2 備份

```bash
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d)
cp config.yml config.yml.bak
cp -r uploads uploads.bak
```

### 2.3 替換二進制

```bash
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao-next_*.tar.gz dujiao-next
```

前端隨二進制一起更新，不需要另外替換靜態檔案。

### 2.4 更新配置

對比 `config.yml.example` 檢查是否有新增配置項，按需新增到 `config.yml`。

### 2.5 啟動服務

```bash
systemctl start dujiao
```

> 資料庫結構變更會在啟動時由 GORM 自動遷移完成，無需手動執行 SQL。

---

## 3. 源碼構建升級

```bash
git pull origin main

# 一鍵構建（含前端）
goreleaser build --snapshot --single-target --clean
```

或手工構建，步驟見 [手動部署](/zh-hant/deploy/manual#_4-手工構建)。

---

## 4. Docker Compose 升級

### 4.1 備份

```bash
docker compose exec api cp /app/db/dujiao.db /app/db/dujiao.db.bak
docker compose cp api:/app/config.yml ./config.yml.bak
```

### 4.2 更新鏡像

```bash
# 修改 .env 中的 TAG 為目標版本
docker compose --env-file .env -f <你的方案檔案> pull
```

### 4.3 重啟服務

```bash
docker compose --env-file .env -f <你的方案檔案> up -d
```

### 4.4 檢查日誌

```bash
docker compose logs -f api
```

---

## 5. 升級後驗證

升級完成後按以下步驟驗證：

1. **前臺可存取**：開啟站點根路徑，確認商品列表正常
2. **後臺登入**：存取 `/<web.admin_path>`，確認管理員可正常登入
3. **儀表板**：檢查資料是否正常顯示
4. **商品列表**：確認商品和庫存資料正確
5. **建立測試訂單**：前臺下單並完成支付測試
6. **支付回調**：確認支付回調正常運作
7. **郵件通知**：確認郵件發送功能正常

---

## 6. 回滾

如果升級後出現問題：

### 6.1 二進制部署回滾

```bash
systemctl stop dujiao

# 恢復資料庫與配置
cp db/dujiao.db.bak.YYYYMMDD db/dujiao.db
cp config.yml.bak config.yml

# 換回舊版二進制
systemctl start dujiao
```

> 從 v1.4.0 回滾到 v1.3.x 時，還需要把 user / admin 前端重新部署起來，並還原 Nginx 配置。

### 6.2 Docker 回滾

```bash
docker compose down

# 把 .env 的 TAG 改回舊版本，恢復資料庫備份
docker compose --env-file .env -f <你的方案檔案> up -d
```

---

## 7. 注意事項

- 跨多個版本升級時，建議逐版本升級或仔細閱讀每個版本的更新日誌
- 資料庫自動遷移只增加欄位/表，不會刪除已有欄位
- 升級後首次啟動可能稍慢（執行資料庫遷移）
- 配置檔案新增欄位通常有默認值，不加也不影響啟動，但建議補全
