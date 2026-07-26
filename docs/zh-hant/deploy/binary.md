# 單二進制部署（推薦新手）

> 適用人群：完全新手，希望「一個二進制 + 一個 Redis + 一個網域」就能跑起來。

自 v1.4.0 起，用戶前臺與管理後臺已內嵌進後端二進制，下載解壓縮即可執行完整服務，不需要再單獨部署前端。

## 系統要求

- Linux x86_64 或 arm64
- Redis（可以是系統服務、既有實例，或用 Docker 起一個）
- 一個網域 + SSL 憑證（生產部署）
- 至少 512MB 記憶體

## 1. 下載

到 [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases) 找最新的 `dujiao-next_*.tar.gz`，按系統架構選：

```bash
# 例：Linux x86_64
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
mkdir -p /opt/dujiao && tar -xzf dujiao-next_*.tar.gz -C /opt/dujiao
cd /opt/dujiao
```

arm64 機器請下載 `dujiao-next_vX.Y.Z_Linux_arm64.tar.gz`。

::: tip v1.3.x 使用者注意
舊版發佈過 `dujiao-next_*`（純 API）與 `dujiao-all_*`（含前端）兩個包，二進制分別叫 `dujiao-api` 與 `dujiao-server`。
自 v1.4.0 起兩者合併為唯一產物 `dujiao-next_*.tar.gz`，二進制統一叫 `dujiao-next`。
:::

## 2. 複製設定

```bash
cp config.yml.example config.yml
```

## 3. 必改欄位

打開 `config.yml`，按下表修改：

| 欄位 | 說明 | 範例值 |
|---|---|---|
| `jwt.secret` | 後臺管理員 JWT 密鑰，**必改** | `openssl rand -hex 32` 輸出 |
| `user_jwt.secret` | 用戶 JWT 密鑰，**必改** | 同上，不同值 |
| `web.admin_path` | 後臺存取路徑前綴，**強烈建議修改** | `/dj-mgmt-7x9k2` |
| `redis.host` / `redis.port` | Redis 位址（默認 `127.0.0.1` + `6379`） | `127.0.0.1` + `6379` |
| `database.driver` / `database.dsn` | 資料庫（默認 SQLite 起步） | 見下方 |

### 關於 `web.admin_path`（重要）

默認值 `/admin` 是自動化掃描器的頭號目標。**強烈建議改成不易猜測的字串**：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 換成你自己的字串
```

這個路徑只是後臺 SPA 入口的「門牌」，改了它不影響 admin API 介面；API 鑑權由 JWT + 限流保護。改路徑主要是過濾掉自動化掃描的雜訊。

改完必須重啟行程才會生效——路徑是在啟動時一次性寫進後臺頁面的。

### 關於資料庫

- **SQLite（默認）**：零配置，資料存在 `./db/dujiao.db`，單機夠用。
- **PostgreSQL（生產推薦）**：把 `database.driver` 改為 `postgres`，`database.dsn` 寫連線字串。

## 4. 準備 Redis

如果你已有 Redis（系統服務或其他容器），改 `config.yml` 的 `redis.host` 和 `redis.port` 指過去即可。

沒有的話，用 Docker 起一個最簡單：

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine
```

## 5. 啟動

```bash
./dujiao-next
```

啟動日誌會顯示：

```
🚀 Dujiao-Next 啟動中
...
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

看到 `Embedded SPAs` 這行就表示前端已經正確內嵌並掛載。

程式執行時會自動建立：
- `./db/`：SQLite 資料庫
- `./uploads/`：使用者上傳檔案
- `./logs/`：執行日誌

## 6. 存取

- **用戶端**：`http://<your-ip>:8080`
- **管理端**：`http://<your-ip>:8080/<web.admin_path>`（你剛才改的路徑）

首次登入用默認管理員帳號（在 `config.yml` 的 `bootstrap` 段配置）。**登入後立即修改密碼**。

## 7. 反向代理與 HTTPS（生產部署）

只需要一個網域，整站轉發到 8080 即可——前臺、後臺、API、上傳檔案、`sitemap.xml`、`robots.txt` 全都由這一個埠提供：

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.com;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

::: tip 不再需要按路徑分流
v1.3.x 時代需要給 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt` 單獨寫 `location` 轉發到後端，
現在整個網域都指向同一個行程，一條 `location /` 就夠了。
:::

## 8. 系統服務（systemd）

先建立執行使用者（如果你打算用專用使用者跑服務）：

```bash
sudo useradd -r -s /sbin/nologin -d /opt/dujiao dujiao
sudo chown -R dujiao:dujiao /opt/dujiao
```

`/etc/systemd/system/dujiao.service`：

```ini
[Unit]
Description=Dujiao-Next
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dujiao
ExecStart=/opt/dujiao/dujiao-next
Restart=on-failure
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

## 9. 升級

1. `systemctl stop dujiao`
2. 備份：`cp -r db uploads config.yml /backup/`
3. 下載新版 tar.gz，替換 `dujiao-next` 二進制
4. `systemctl start dujiao`

資料庫遷移自動完成。前端也隨二進制一起更新，不需要另外替換靜態檔案。

## 10. 從其他部署方式遷移

### 從 v1.3.x 三端分離部署遷移

1. 停掉舊的 api / user / admin 三個服務（或容器）
2. 把原來的 `db/`、`uploads/`、`config.yml` 複製到新的執行目錄
3. 在 `config.yml` 補上 `web` 段並設定 `admin_path`
4. 啟動新二進制，把網域反向代理改成整站指向 8080
5. 原來給後臺單獨準備的網域可以停用（也可以繼續解析到同一個服務）

詳細步驟見 [升級與遷移](/zh-hant/deploy/upgrade)。

### 從 Docker 部署遷移

同上，把掛載出來的 `db/`、`uploads/`、`config.yml` 直接沿用即可。

## 常見問題

### Q：後臺頁面載入報 404

確認 `config.yml` 的 `web.admin_path` 與瀏覽器存取路徑一致；改了 `web.admin_path` 必須重啟行程才生效。

### Q：啟動日誌沒有出現 `Embedded SPAs`

表示你拿到的二進制不含前端。請確認下載的是 GitHub Releases 裡的 `dujiao-next_*.tar.gz`，
而不是自行用 `go build`（不帶 `-tags fullstack`）編譯出來的產物。

### Q：日誌出現 "web.admin_path 仍為默認 /admin" 警告

按 §3 的建議修改 `web.admin_path`，警告會消失。

### Q：可以只跑 API、不要內嵌前端嗎？

可以，從原始碼用 `go build ./cmd/server`（不加 `-tags fullstack`）編譯即可，此時 `/` 與後臺路徑都不會被掛載。
這屬於二次開發場景，見 [手動部署](/zh-hant/deploy/manual)。
