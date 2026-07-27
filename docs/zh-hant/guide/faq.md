---
outline: deep
---

# 常見問題（FAQ）

> 更新時間：2026-03-28

---

## 1. 部署與啟動

### Q：啟動時提示連接埠被佔用

檢查 `config.yml` 中的 `server.port`（預設 8080）是否被其他程序佔用：

```bash
lsof -i :8080
```

修改連接埠或停止佔用程序後重新啟動。

### Q：Docker 容器啟動後無法存取

1. 確認容器正在執行：`docker compose ps`
2. 檢查連接埠映射是否正確
3. 檢視容器日誌：`docker compose logs -f dujiao-next`
4. 確認防火牆是否放行了對應連接埠

### Q：首次啟動後管理員帳號是什麼

在 `config.yml` 的 `bootstrap` 節點設定初始管理員：

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: your-password
```

首次啟動時系統自動建立該帳號。如果已啟動過，修改此設定不會生效，需要透過資料庫手動修改。

---

## 2. 資料庫

### Q：SQLite 並行寫入報錯 "database is locked"

SQLite 不支援並行寫入。解決方案：

1. **連線池設為 1**（推薦）：
   ```yaml
   database:
     driver: sqlite
     pool:
       max_open_conns: 1
       max_idle_conns: 1
   ```
2. 如果並行量較高，建議切換到 PostgreSQL

### Q：如何從 SQLite 遷移到 PostgreSQL

1. 匯出 SQLite 資料
2. 修改 `config.yml` 中的資料庫設定：
   ```yaml
   database:
     driver: postgres
     dsn: "host=127.0.0.1 user=dujiao password=xxx dbname=dujiao port=5432 sslmode=disable"
   ```
3. 重啟服務，系統會自動建立表結構
4. 匯入資料到 PostgreSQL

> 建議在站點流量較大時儘早遷移到 PostgreSQL。

### Q：PostgreSQL 連線池該怎麼設定

推薦設定：

```yaml
database:
  driver: postgres
  pool:
    max_open_conns: 25
    max_idle_conns: 10
    conn_max_lifetime_seconds: 3600
    conn_max_idle_time_seconds: 600
```

根據實際並行量調整 `max_open_conns`。

---

## 3. Redis

### Q：Redis 連線失敗

1. 確認 Redis 服務正在執行：`redis-cli ping`
2. 檢查 `config.yml` 中的 Redis 位址、連接埠和密碼
3. 如果使用 Docker，確認網路互通
4. 檢查 Redis 是否設定了 `requirepass`，密碼是否匹配

### Q：可以不用 Redis 嗎

Redis 用於快取和非同步任務佇列。可以在 `config.yml` 中關閉：

```yaml
redis:
  enabled: false
queue:
  enabled: false
```

> 關閉後以下功能將不可用：登入限流、自動發卡（非同步）、訂單逾時取消（非同步）、通知推送（非同步）、分銷佣金確認（定時）、上游庫存同步（定時）。建議正式環境保持開啟。

---

## 4. 支付相關

### Q：使用者支付成功，但訂單狀態沒有更新

按以下順序排查：

1. **回呼位址**：確認支付渠道設定的 `notify_url` / `callback_url` 是否正確
2. **公網可達**：確認回呼位址可被支付平台存取（不能是 localhost）
3. **HTTPS**：部分支付平台要求回呼位址為 HTTPS
4. **支付平台日誌**：在支付平台後台檢視回呼發送記錄和回傳狀態
5. **應用日誌**：檢視後端日誌中是否有回呼請求和處理錯誤

### Q：支付頁面/二維碼無法開啟

1. 檢查支付渠道的商戶參數是否填寫正確
2. 檢查閘道位址（gateway_url）是否正確
3. 確認支付渠道已啟用
4. 檢視後端日誌中的具體錯誤訊息

### Q：PayPal / Stripe Webhook 不生效

1. 確認 Webhook URL 帶上了 `channel_id` 參數：
   - PayPal：`/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`
   - Stripe：`/api/v1/payments/webhook/stripe?channel_id=你的渠道ID`
2. 確認在支付平台後台正確設定了 Webhook URL
3. 確認 `webhook_id`（PayPal）或 `webhook_secret`（Stripe）已填寫

---

## 5. 郵件

### Q：郵件發送失敗

1. 確認 `config.yml` 中 `email.enabled` 為 `true`
2. 檢查 SMTP 設定是否正確（host、port、username、password）
3. 確認 SSL/TLS 設定與郵件服務商要求一致：
   - 連接埠 465 通常使用 `use_ssl: true`
   - 連接埠 587 通常使用 `use_tls: true`
4. 後台「設定 → SMTP 郵件」中點擊「發送測試郵件」驗證
5. 檢查寄件人位址（from）是否與郵箱帳號匹配

### Q：驗證碼郵件收不到

1. 檢查郵件是否進入了垃圾郵件資料夾
2. 確認發送間隔（`send_interval_seconds`，預設 60 秒）是否已過
3. 確認發送次數未超限（`max_attempts`，預設 5 次）
4. 檢視後端日誌確認郵件是否發送成功

---

## 6. 卡密與交付

### Q：自動交付失敗，提示庫存不足

1. 後台檢查對應商品/SKU 的可用卡密數量
2. 如果卡密不足，補充匯入卡密後在訂單中手動觸發交付
3. 建議開啟庫存預警通知，提前補充卡密

### Q：CSV 匯入卡密報錯

1. 確認 CSV 檔案包含 `secret` 欄位標題（不區分大小寫）
2. 確認檔案編碼為 UTF-8
3. 確認每行只有一條卡密內容
4. 檢查是否有空行或格式錯誤

---

## 7. 前端

### Q：前台存取報 API 錯誤

1. 開發環境確認後端服務正在執行（預設 localhost:8080）
2. 確認 Vite 開發設定的代理設定正確（`/api` 代理到後端）
3. 正式環境確認 Nginx 反向代理設定正確

### Q：正式構建後頁面空白

1. 確認構建命令執行成功（`npm run build`）
2. 確認 Nginx 設定的 `root` 指向正確的構建產物目錄
3. 確認 `try_files` 設定正確（SPA 需要將所有路由回退到 `index.html`）
