# 單二進制部署（推薦新手）

> 適用人群：完全新手，希望「一個二進制 + 一個 Redis + 一個網域」就能跑起來。

自 v1.4.0 起，用戶前臺與管理後臺已內嵌進後端二進制，下載解壓縮即可執行完整服務，不需要再單獨部署前端。

## 系統要求

- Linux x86_64 或 arm64
- Redis（可以是系統服務、既有實例，或用 Docker 起一個）
- 一個網域 + SSL 憑證（生產部署）
- 至少 512MB 記憶體

## 官方一鍵安裝（推薦）

全新 Ubuntu 22.04+ 或 Debian 12+ 伺服器可以直接使用官方互動式安裝器（支援 x86_64 / arm64）：

```bash
curl -fsSL https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/scripts/dujiao-next-manager.sh \
  -o /tmp/dujiao-next-manager.sh
sudo bash /tmp/dujiao-next-manager.sh install
```

執行前請先準備：

- 一個已經解析到本伺服器的非萬用字元網域
- 可從公網存取的 TCP 80/443 連接埠
- 一個用於 Let's Encrypt 到期通知的電子郵件
- root 或 sudo 權限

精靈會下載並校驗最新 Release，自動產生三個互不相同的執行密鑰，部署 SQLite、獨立本機 Redis、systemd、Nginx，並使用 Certbot 申請 SSL 憑證。應用程式和 Redis 只監聽回環位址，不會把 8080/6380 暴露到公網。

安裝完成後使用以下命令重新開啟管理選單：

```bash
sudo dujiao-next-manager
```

管理選單提供狀態與日誌、啟動/停止/重新啟動、網域和後臺路徑修改、憑證續期、管理員密碼/2FA 復原以及安全解除安裝。應用程式版本升級仍在後臺「系統更新」中完成，管理腳本不會維護第二套升級邏輯。

相同操作也提供可用於自動化的子命令：

```bash
sudo dujiao-next-manager status
sudo dujiao-next-manager logs app        # 也可使用 redis / nginx / certbot
sudo dujiao-next-manager start           # stop / restart
sudo dujiao-next-manager configure-domain
sudo dujiao-next-manager configure-admin-path
sudo dujiao-next-manager renew-cert
sudo dujiao-next-manager admin-reset-password
sudo dujiao-next-manager admin-reset-2fa
sudo dujiao-next-manager uninstall
```

::: warning 適用邊界
首版安裝器只支援 Ubuntu 22.04+ / Debian 12+、SQLite 和單網域 HTTP-01 憑證。它不會接管手動安裝、舊三端部署、Docker、PostgreSQL、外部 Redis、萬用字元網域或 DNS-01。
:::

::: warning SMTP 與電子郵件註冊
SMTP 可以在精靈中設定，也可以略過。未啟用 SMTP 時商城本身可以執行，但電子郵件驗證碼註冊不可用；請登入後臺，在「設定 → SMTP 郵件」完成設定和測試後再開放註冊。安裝後以後臺儲存的 SMTP 設定為準。
:::

如果 DNS、80 連接埠或憑證申請失敗，安裝器不會把商城以明文 HTTP 方式開放。修復問題後重新執行 `sudo dujiao-next-manager install`，腳本會從保留的階段繼續。

主要資料位置：

| 路徑 | 內容 |
| --- | --- |
| `/opt/dujiao-next/` | 二進制、`config.yml`、SQLite、上傳檔案與日誌 |
| `/etc/dujiao-next/install-state.json` | 安裝階段和受管資源（不含管理員密碼） |
| `/var/lib/dujiao-next/redis/` | 安裝器獨立 Redis 的 AOF 資料 |
| `/var/backups/dujiao-next/` | 安全解除安裝前強制建立的復原備份 |

解除安裝不會移除可能由其他服務共用的 apt 套件。腳本只有在包含 `config.yml`、SQLite 和 `uploads` 的備份成功且校驗通過後才會刪除應用程式；其中 `config.yml` 內的 `app.secret_key` 是復原加密資料所必需的，請與資料庫一同保管。

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
| `app.secret_key` | 敏感設定加密密鑰，**必改且不能與 JWT 密鑰相同** | `openssl rand -hex 32` 輸出 |
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
Restart=always
RestartSec=3
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

::: warning 從 v1.3.1 及更早版本升級：先改 Restart=always
如果你的 unit 現在是 `Restart=on-failure`，**在使用後臺一鍵升級之前**先改成 `Restart=always` 並執行 `systemctl daemon-reload`。

原因是一鍵升級的執行者是**當前正在運行的舊程式**：它替換掉磁碟上的二進制之後，仍由它自己處理「立即重啟」。舊程式裡沒有新版本的退出碼邏輯，它會正常退出（退出碼 0），而 `Restart=on-failure` 對正常退出不做任何處理 —— 服務就此停在那裡，需要你手動 `systemctl start dujiao` 才能起來。

`Restart=always` 對任何退出都會拉起，因此改完之後連這一次升級也是全自動的。改成 `always` 不影響 `systemctl stop`，顯式停止仍然正常停服。

新版本跑起來之後，後續升級兩種策略都能正常工作。
:::

::: tip Restart= 決定後臺「一鍵重啟」能否使用
後臺「系統更新」裡的一鍵重啟，是讓當前行程退出、由 systemd 拉起新二進制。因此 unit 的 `Restart=` 策略必須允許自動拉起：

| `Restart=` | 一鍵重啟 | 說明 |
| --- | --- | --- |
| `always` | ✅ 推薦 | 任何退出都拉起；`systemctl stop` 仍能正常停服 |
| `on-failure` | ✅ 可用 | 自更新重啟以專用非零退出碼退出，會被拉起 |
| `on-success` / `on-abnormal` / `on-abort` | ❌ | 只認乾淨退出或信號，不認退出碼 |
| `no` | ❌ | 退出即停服（這也是 systemd 的默認值，不寫 `Restart=` 就是它） |

另外，若你在 unit 裡寫了 `SuccessExitStatus=70` 或 `RestartPreventExitStatus=70`，一鍵重啟同樣會失效 —— 70 正是自更新使用的退出碼。

程式啟動時會讀取本 unit 的這三項配置並據此決定是否放出重啟按鈕。**查不到配置時按「不能重啟」處理**，後臺會改為提示你手動執行 `systemctl restart dujiao`。
:::

## 9. 升級

1. `systemctl stop dujiao`
2. 備份：`cp -r db uploads config.yml /backup/`
3. 下載新版 tar.gz，替換 `dujiao-next` 二進制
4. `systemctl start dujiao`

資料庫遷移自動完成。前端也隨二進制一起更新，不需要另外替換靜態檔案。

::: tip 手工替換不會清理一鍵升級留下的備份
如果你之前用過後臺一鍵升級，目錄裡會留著 `dujiao-next.backup` 和 `dujiao-next.backup.json`。手工替換二進制不會動它們，所以後臺「系統更新」裡顯示的回滾目標仍然是**上一次一鍵升級前**的那一版，可能比你現在跑的版本舊好幾個版本。不想保留就直接刪掉這兩個檔案，回滾入口會隨之消失。
:::

### 回滾

後臺一鍵升級會把舊二進制留成 `dujiao-next.backup`。回滾有兩條路徑：

- **後臺能打開時**：進「系統更新」點回滾。
- **新版本起不來時**：後臺本身也打不開，改在終端執行：

  ```bash
  cd /opt/dujiao
  ./dujiao-next rollback
  systemctl restart dujiao
  ```

  這條命令不讀 `config.yml`、不連資料庫，只做本地檔案替換，所以配置寫錯或資料庫連不上都不影響恢復。

::: warning 什麼時候需要加 `--force`
資料庫遷移一旦開始，舊程式就未必讀得懂新的表結構，所以下面三種情況命令列都會**直接拒絕**回滾，後臺則會先彈風險確認：

| 情況 | 為什麼拒絕 |
| --- | --- |
| 新版本已經完整啟動過 | 遷移肯定跑完了 |
| 新版本在遷移中途失敗 | 遷移在第一條 SQL 之前就已記錄，schema 可能改了一半 |
| 找不到升級記錄，或記錄損壞 | 無法證明遷移沒跑過 |

**第三種最常見**：從 v1.3.1 及更早版本一鍵升級上來的**第一次**，執行替換的是沒有這套記錄邏輯的舊程式，目錄裡只會留下一個 `dujiao-next.backup`。也就是說，如果你是從 v1.3.1 升上來、新版本又起不來，上面那條 `./dujiao-next rollback` **一定**會印出「已拒絕回滾」，這是預期行為，不是命令壞了。

確認要承擔風險時先備份資料庫，再加 `--force`：

```bash
cp -r db /backup/          # SQLite；PostgreSQL 請用 pg_dump
./dujiao-next rollback --force
systemctl restart dujiao
```
:::

### 啟動時提示「無法可靠記錄升級狀態」

服務起不來，日誌裡是這一句：

```
无法可靠记录升级状态，已在数据库迁移前中止启动: open update lock: ... permission denied
```

意思是安裝目錄裡還留著一鍵升級的狀態檔案（`dujiao-next.backup`、`dujiao-next.backup.json`），但**服務帳號對安裝目錄沒有寫權限**，程式沒法把「資料庫遷移已經開始」記下來。

這時候程式會**在動資料庫之前主動停下**：如果放它繼續跑，遷移改完 schema 卻沒有任何記錄，之後一次普通回滾就會被錯誤放行，把舊程式配上新庫。

常見於安裝目錄屬主是 `root`、而 unit 裡寫了 `User=dujiao` 的部署。按提示二選一：

```bash
# 1) 讓服務帳號可寫（推薦，保留回滾能力）
sudo chown -R dujiao /opt/dujiao

# 2) 確認不再需要這個回滾點，刪掉狀態檔案
sudo rm -f /opt/dujiao/dujiao-next.backup /opt/dujiao/dujiao-next.backup.json
sudo systemctl restart dujiao
```

如果日誌裡是「另一个升级或回滚正在进行」，那只是兩個行程同時起來搶鎖，等幾秒重啟即可，不用改任何檔案。

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
