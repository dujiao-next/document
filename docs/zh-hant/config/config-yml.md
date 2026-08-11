# `config.yml` 詳細解釋與推薦配置

> 更新時間：2026-08-11
>
> 適用範圍：目前 `dujiao-next` 主分支；欄位與程式內建預設值以 `internal/config/config.go` 為準。

## 1. 配置載入規則

後端啟動時按以下順序取值：

1. 使用程式內建預設值
2. 讀取 `config.yml`
3. 使用環境變數覆蓋，例如 `server.port` ⇢ `SERVER_PORT`

程式會依次在目前目錄、上一層目錄和 `./etc` 中尋找 `config.yml`。檔案不存在或讀取失敗時會記錄警告，並繼續使用環境變數與程式預設值；但若沒有透過環境變數提供三個有效的執行時期金鑰，後續安全校驗仍會終止啟動。正式環境建議保留一份權限受限、納入備份的配置檔案。

除了 `bootstrap` 專用的 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`，環境變數名稱通常由完整配置鍵轉成大寫並把 `.` 替換成 `_`。例如 `app.secret_key` 對應 `APP_SECRET_KEY`。

## 2. 資料庫選型建議

- **開發環境**：優先使用 `sqlite`，部署簡單且沒有額外依賴。
- **正式環境**：優先使用 `postgres`，並行處理、可靠性與可觀測性更好。

若在正式環境使用 SQLite，需要接受：

- 寫入並行能力較弱
- 強依賴單一主機與磁碟
- 橫向擴充與高可用能力受限

## 3. 配置範本

啟動前先執行三次以下命令，並把三次不同的輸出分別填入 `app.secret_key`、`jwt.secret` 和 `user_jwt.secret`：

```bash
openssl rand -hex 32
```

三個執行時期金鑰必須彼此不同。內建值、已知預留值、少於 32 個字元或相互重複都會讓服務拒絕啟動，因此以下範本中的尖括號內容不能原樣保留。

## 3.1 Demo A：本機開發（SQLite）

適用於單機開發與低並行測試。

```yaml
app:
  secret_key: "<第 1 個 openssl 輸出>"

server:
  host: 0.0.0.0
  port: 8080
  mode: debug

log:
  dir: ""
  filename: app.log
  max_size_mb: 100
  max_backups: 7
  max_age_days: 30
  compress: true

database:
  driver: sqlite
  dsn: ./db/dujiao.db?_busy_timeout=5000&_journal_mode=WAL&_synchronous=NORMAL
  pool:
    max_open_conns: 1
    max_idle_conns: 1
    conn_max_lifetime_seconds: 0
    conn_max_idle_time_seconds: 0

jwt:
  secret: "<第 2 個 openssl 輸出>"
  expire_hours: 24

user_jwt:
  secret: "<第 3 個 openssl 輸出>"
  expire_hours: 24
  remember_me_expire_hours: 168
```

SQLite 重點提醒：

- `max_open_conns` 建議固定為 `1`，否則多個寫入連線容易出現 `database is locked`。
- `_journal_mode=WAL` 可改善單機讀寫並行體驗。
- 不要把 SQLite 資料檔放在不穩定的網路檔案系統，否則檔案鎖可能不可靠。

## 3.2 Demo B：正式環境（PostgreSQL）

適用於正式業務與可預期的並行流量。

```yaml
app:
  secret_key: "<第 1 個 openssl 輸出>"

server:
  host: 0.0.0.0
  port: 8080
  mode: release
  # 以下值只適用於反向代理與服務位於同一台主機
  trusted_proxies:
    - 127.0.0.1/32
    - ::1/128

log:
  dir: /var/log/dujiao-next
  filename: app.log
  max_size_mb: 100
  max_backups: 14
  max_age_days: 30
  compress: true

database:
  driver: postgres
  dsn: host=127.0.0.1 port=5432 user=dujiao password=CHANGE_ME dbname=dujiao sslmode=disable TimeZone=Asia/Shanghai
  pool:
    max_open_conns: 50
    max_idle_conns: 10
    conn_max_lifetime_seconds: 1800
    conn_max_idle_time_seconds: 600

jwt:
  secret: "<第 2 個 openssl 輸出>"
  expire_hours: 24

user_jwt:
  secret: "<第 3 個 openssl 輸出>"
  expire_hours: 24
  remember_me_expire_hours: 168
```

PostgreSQL 重點提醒：

- `max_open_conns` 不要超過 PostgreSQL 的 `max_connections` 預算。
- 為管理、監控與遷移工作預留連線。
- 建議設定 `conn_max_lifetime_seconds`，避免中間網路設備意外回收長期連線。
- 顯式設定 `TimeZone`，避免訂單時間與日誌時間錯位。

## 3.3 Demo C：低資源 PostgreSQL

小流量正式環境可從以下連線池配置開始：

```yaml
database:
  driver: postgres
  dsn: host=127.0.0.1 port=5432 user=dujiao password=CHANGE_ME dbname=dujiao sslmode=disable TimeZone=Asia/Shanghai
  pool:
    max_open_conns: 20
    max_idle_conns: 5
    conn_max_lifetime_seconds: 1200
    conn_max_idle_time_seconds: 300
```

## 4. 連線池參數調整

以下數值適合作為 API、後臺操作與支付回呼的一般起點：

- `max_open_conns`
  - 最大同時開啟連線數
  - SQLite：`1`
  - PostgreSQL：`20-100`，再按業務量與資料庫規格調整
- `max_idle_conns`
  - 連線池保留的閒置連線數
  - 通常設為 `max_open_conns` 的 20%-40%
- `conn_max_lifetime_seconds`
  - 單一連線最長存活時間
  - 一般為 `900-3600`；`0` 表示不限制
- `conn_max_idle_time_seconds`
  - 連線最長閒置時間
  - 一般為 `300-1200`；`0` 表示不限制

常見錯誤：

- `max_idle_conns > max_open_conns`
- PostgreSQL 的 `max_open_conns` 過高，導致 `too many clients`
- SQLite 開啟多條連線，增加鎖衝突

## 5. 配置分組

## 5.0 `app`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `secret_key` | string | `change-me-32-byte-secret-key!!` | 保護支付金鑰、Bot Token 等敏感資料的 AES-256 根金鑰 | **使用 `openssl rand -hex 32` 單獨產生** |
| `totp_issuer` | string | `Dujiao-Next` | 管理員與使用者 2FA 驗證器中顯示的發行方名稱 | 使用穩定的站點名稱，避免 `&` 等特殊字元 |

部署後不要隨意更換 `app.secret_key`，否則資料庫中已加密的資料將無法解密。此金鑰必須與兩個 JWT 金鑰不同，並與資料庫一起備份。

## 5.1 `server`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | 監聽位址 | `0.0.0.0` |
| `port` | string | `8080` | 服務連接埠 | `8080` |
| `mode` | string | `debug` | 執行模式：`debug` 或 `release` | 正式環境使用 `release` |
| `trusted_proxies` | []string | `127.0.0.1/32`、`::1/128` | Gin 可信任並從其轉發標頭解析客戶端 IP 的代理 IP/CIDR | 只列出真實反向代理；沒有代理時設為 `[]` |

空的 `trusted_proxies` 表示完全不信任轉發標頭，直接使用 TCP 對端位址。Docker、負載平衡器或 CDN 部署必須填入真實代理網段；`0.0.0.0/0` 與 `::/0` 會信任所有來源，程式會直接拒絕。此欄位只控制客戶端 IP 解析，與 `reseller.trusted_forwarded_host` 不同。

## 5.2 `log`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `dir` | string | `""` | 日誌目錄；空值使用執行目錄下的 `logs` | 正式環境建議顯式指定 |
| `filename` | string | `app.log` | 日誌檔名 | `app.log` |
| `max_size_mb` | int | `100` | 單一檔案最大 MB | `100` |
| `max_backups` | int | `7` | 保留的輪替檔案數 | `7-14` |
| `max_age_days` | int | `30` | 保留天數 | `30` |
| `compress` | bool | `true` | 是否壓縮輪替檔案 | `true` |

## 5.3 `database`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `driver` | string | `sqlite` | `sqlite` 或 `postgres` | 正式環境優先 `postgres` |
| `dsn` | string | `./db/dujiao.db` | 資料庫連線字串 | 按環境配置 |
| `pool.max_open_conns` | int | `1` | 最大開啟連線數 | SQLite=1；PostgreSQL=20-100 |
| `pool.max_idle_conns` | int | `1` | 最大閒置連線數 | 5-20，或開啟連線的 20%-40% |
| `pool.conn_max_lifetime_seconds` | int | `0` | 連線最長存活時間；0 為不限制 | `900-3600` |
| `pool.conn_max_idle_time_seconds` | int | `0` | 連線最長閒置時間；0 為不限制 | `300-1200` |

## 5.4 `jwt` / `user_jwt`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `jwt.secret` | string | `change-me-in-production` | 管理員 Token 簽章金鑰 | 使用 `openssl rand -hex 32` 單獨產生 |
| `jwt.expire_hours` | int | `24` | 管理員 Token 有效時數 | `24` |
| `user_jwt.secret` | string | `user-change-me-in-production` | 使用者 Token 簽章金鑰 | 使用 `openssl rand -hex 32` 單獨產生 |
| `user_jwt.expire_hours` | int | `24` | 一般使用者 Token 有效時數 | `24` |
| `user_jwt.remember_me_expire_hours` | int | `168` | 「記住我」使用者 Token 有效時數 | `168`（7 天） |

只要 `app.secret_key`、`jwt.secret`、`user_jwt.secret` 任一過弱、仍為已知預留值或與另一個重複，啟動就會失敗。

## 5.5 `redis`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否啟用 Redis | 正式環境建議啟用 |
| `host` | string | `127.0.0.1` | Redis 位址 | 按環境設定 |
| `port` | int | `6379` | Redis 連接埠 | `6379` |
| `password` | string | `""` | Redis 密碼 | 正式環境設定密碼 |
| `db` | int | `0` | Redis DB 索引 | `0` |
| `prefix` | string | `dj` | 鍵前綴 | `dj` 或部署專用值 |

## 5.6 `queue`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否啟用非同步佇列 | 建議啟用 |
| `host` | string | `127.0.0.1` | 佇列 Redis 位址 | 可與 Redis 共用服務但使用不同 DB |
| `port` | int | `6379` | 佇列 Redis 連接埠 | `6379` |
| `password` | string | `""` | 佇列 Redis 密碼 | 正式環境設定密碼 |
| `db` | int | `1` | 佇列 Redis DB 索引 | `1` |
| `concurrency` | int | `10` | Worker 並行數 | 5-20 |
| `queues` | map | `default:10, critical:5` | 佇列名稱與權重 | 按需調整 |
| `upstream_sync_interval` | duration string | `5m`（業務備援值） | 上游商品庫存定時同步間隔 | 使用 Go duration，例如 `5m` 或 `1h` |

若 `queue.enabled=true` 但 Redis 無法連線，郵件等非同步工作會失敗或堆積。

- 預設啟動模式是 `all`（API + Worker）。
- 當 `queue.enabled=false` 時，請用 `-mode api` 啟動，否則 Worker 無法初始化。
- 後臺儲存「上游同步」設定後，會覆蓋 `upstream_sync_interval`；後臺有效範圍為 5～1440 分鐘。

## 5.7 `upload`

| 欄位 | 類型 | 程式內建預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `max_size` | int64 | `10485760` | 上傳大小上限（位元組） | 10MB 或按業務收緊 |
| `allowed_types` | []string | JPEG、PNG、GIF、WebP | 允許的 MIME | 只保留必要類型 |
| `allowed_extensions` | []string | `.jpg`、`.jpeg`、`.png`、`.gif`、`.webp` | 允許的副檔名 | 與 MIME 對齊 |
| `max_width` / `max_height` | int | `4096` | 點陣圖寬高上限 | `4096` |

官方 `config.yml.example` 額外啟用了 SVG（`image/svg+xml` / `.svg`）；若業務不需要 SVG，建議從兩份允許清單中移除。

## 5.8 `web`

此段控制內嵌前端。fullstack 建置中，使用者前臺固定掛載於 `/`，此欄位決定管理後臺入口。

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `admin_path` | string | `/admin` | 管理後臺路徑前綴 | **改成不易猜測的路徑** |

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"
```

規則與行為：

- 必須以 `/` 開頭、不能以 `/` 結尾，且不能是 `/`。
- 每個路徑段只能包含字母、數字、`-`、`.`、`_`、`~`、`@`，而且不能是 `.` 或 `..`；`:`、`*` 等 Gin 路由元字元會被拒絕。
- 不能與 `/api`、`/uploads`、`/health` 衝突或互為前綴。
- 校驗在資料庫初始化前執行，因此無效路徑會在遷移前退出。
- 修改後必須重新啟動，因為路徑會在啟動時寫入後臺頁面的 `<base href>`。
- 使用者前臺固定掛載於 `/`。
- 此路徑只降低自動掃描雜訊，不是授權邊界；API 仍由 JWT 與限流保護。
- 未使用 `-tags fullstack` 建置的二進位檔不會套用此段。

## 5.9 `cors`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `allowed_origins` | []string | `["*"]` | 允許的來源 | 正式環境列出精確 Origin |
| `allowed_methods` | []string | GET、POST、PUT、DELETE、OPTIONS、PATCH | 允許的方法 | 保留最小集合 |
| `allowed_headers` | []string | 見 `config.yml.example` | 允許的請求標頭 | 只保留業務所需項目 |
| `allow_credentials` | bool | `true` | 是否允許攜帶憑證 | 與前端策略一致 |
| `max_age` | int | `600` | 預檢快取秒數 | `600` |

目前實作中，當 `allow_credentials=true` 且清單包含 `*` 時，服務會原樣回顯任意請求的 `Origin`。這等同允許所有來源攜帶憑證，正式環境必須改成精確的協定、網域和連接埠清單。

## 5.10 `security`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | `300` | 限流視窗秒數 | `300` |
| `login_rate_limit.max_attempts` | int | `5` | 視窗內最大失敗次數 | `5` |
| `login_rate_limit.block_seconds` | int | `900` | 超限後封鎖秒數 | `900` |
| `password_policy.min_length` | int | `8` | 密碼最短長度 | `8` 或更高 |
| `password_policy.require_upper` | bool | `true` | 是否要求大寫字母 | `true` |
| `password_policy.require_lower` | bool | `true` | 是否要求小寫字母 | `true` |
| `password_policy.require_number` | bool | `true` | 是否要求數字 | `true` |
| `password_policy.require_special` | bool | `false` | 是否要求特殊字元 | 按需開啟 |

## 5.11 `email`

| 欄位 | 類型 | 程式內建預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否啟用郵件 | 完成真實寄信測試後再啟用 |
| `host` | string | `""` | SMTP 主機 | 按服務商設定 |
| `port` | int | `587` | SMTP 連接埠 | STARTTLS 常用 587，直接 TLS 常用 465 |
| `username` / `password` | string | `""` | SMTP 帳號與密碼/授權碼 | 使用獨立授權碼 |
| `from` / `from_name` | string | `""` | 寄件位址與寄件人名稱 | 使用已驗證的企業網域信箱 |
| `use_tls` | bool | `true` | 使用 STARTTLS | 與 `use_ssl` 只能開啟一個 |
| `use_ssl` | bool | `false` | 連線時直接使用 TLS | 與 `use_tls` 只能開啟一個 |
| `verify_code.expire_minutes` | int | `10` | 驗證碼有效分鐘數 | `10` |
| `verify_code.send_interval_seconds` | int | `60` | 同一目標最短重寄秒數 | `60` |
| `verify_code.max_attempts` | int | `5` | 最大校驗嘗試次數 | `5` |
| `verify_code.length` | int | `6` | 數字驗證碼長度（4-10） | `6` |

官方範例使用 465/SSL 並帶有預留 SMTP 資料；這不是程式內建預設值，請按郵件服務商要求選擇 TLS 或 SSL。

## 5.12 `bootstrap`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `default_admin_username` | string | `""` | 初次初始化的管理員使用者名稱 | 顯式設定自己的管理員帳號 |
| `default_admin_password` | string | `""` | 初次初始化的管理員密碼 | 使用符合 `security.password_policy` 的強密碼 |

- 只有資料庫 `admins` 表為空時，才會嘗試建立預設管理員。
- 優先順序：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`（環境變數）> `bootstrap.default_admin_username` / `bootstrap.default_admin_password`（`config.yml`）> 系統預設值。
- `release` 模式下，若環境變數與 `config.yml` 都沒有管理員密碼，程式會略過預設管理員初始化。
- `release` 模式下，已知預設密碼或不符合目前密碼策略的密碼會讓啟動失敗；其他模式只記錄警告。

## 5.13 `order`

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | 待支付訂單逾時分鐘數 | `15-30` |
| `max_refund_days` | int | `30` | 管理員執行手動退款記錄或退款到錢包的最長期限；從支付時間（缺少時從建立時間）起算 | 按售後政策設定；`0` 表示不限期，最大 `3650` |

- 兩個欄位都可能被後臺「訂單設定」覆蓋，詳見下方執行時期覆蓋優先順序。
- 手動退款只會寫入退款記錄並更新訂單狀態，不會呼叫原支付渠道；「退款到錢包」會把金額計入站內錢包。若需退回原外部支付方式，仍由商戶自行處理。

## 5.14 `telegram_auth`（可選）

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否啟用 Telegram 登入 | 完成配置後開啟 |
| `bot_username` | string | `""` | Bot 使用者名稱（不含 `@`） | 例如 `dujiao_login_bot` |
| `bot_token` | string | `""` | Bot Token；OIDC 也會從其數字前綴解析 `client_id` | 由 BotFather 產生並保密 |
| `client_secret` | string | `""` | Telegram OIDC Client Secret | 在 BotFather 的 Web Login 中產生並保密 |
| `oidc_redirect_uri` | string | `""` | Telegram OIDC 瀏覽器回呼頁面 | `https://商城網域/auth/telegram/callback` |
| `mini_app_url` | string | `""` | Telegram Mini App 頁面位址 | 與 BotFather Web App URL 保持一致 |
| `login_expire_seconds` | int | `300` | 登入資料有效期（30-86400 秒） | `300` |
| `replay_ttl_seconds` | int | `300` | 重放保護時間（60-86400 秒） | `300` |

只填寫 `bot_token` 時使用舊版 Login Widget；同時填寫有效的 `client_secret` 與 `oidc_redirect_uri` 後切換成 OIDC。回呼位址必須是合法 HTTP(S) URL，並加入 BotFather Allowed URLs。`mini_app_url` 只提供 Mini App 入口，不會啟用網頁登入。

## 5.15 `google_auth`（可選）

Google 帳號登入使用 Google Identity Services，不會申請 Gmail 讀取或寄送權限。

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否啟用 Google 帳號登入 | 完成配置後開啟 |
| `client_id` | string | `""` | Google OAuth 2.0 Web Client ID，不是 Client Secret | 正式環境使用獨立客戶端 |

```yaml
google_auth:
  enabled: true
  client_id: "1234567890-xxxx.apps.googleusercontent.com"
```

在 Google Cloud 對應 Web 客戶端的 **Authorized JavaScript origins** 中登記所有實際來源：

- 主站：`https://shop.example.com`
- 每個白標站：`https://brand.example.net`
- 本機開發：`http://localhost:5173`

來源包含協定與連接埠（如有），但不包含路徑。主站與每個白標站都必須分別登記。

桌面瀏覽器與 Android 使用 popup/FedCM；iOS 與 iPadOS 使用 Google Identity Services redirect `form_post`，因此每個實際網域還要登記精確的 **Authorized redirect URI**：

- 主站：`https://shop.example.com/api/v1/auth/google/redirect/callback`
- 白標站：`https://brand.example.net/api/v1/auth/google/redirect/callback`

回呼 URI 必須與瀏覽器看到的協定、網域、連接埠與路徑完全相同，並與前端同源。iOS/iPadOS redirect 流程需要已啟用且可連線的 Redis 7，因為一次性 state/handoff 會透過 `GETDEL` 原子消費。Redis 故障時 redirect 登入與綁定會暫時不可用，但桌面/Android popup 登入不使用此狀態儲存。

Google Client ID 是會公開給瀏覽器的配置，不是密鑰。不要填入 Client Secret；此功能也不申請 Gmail API scope。

## 5.16 `captcha`（可選）

目前官方 `config.yml.example` 沒有展開此段，但程式與後臺設定都已完整支援。預設 `provider=none` 且所有場景關閉。

| 欄位 | 預設值 | 說明 |
| --- | --- | --- |
| `provider` | `none` | `none`、`image` 或 `turnstile` |
| `scenes.login` | `false` | 登入 |
| `scenes.register_send_code` | `false` | 註冊寄送郵件驗證碼 |
| `scenes.reset_send_code` | `false` | 重設密碼寄送郵件驗證碼 |
| `scenes.guest_create_order` | `false` | 訪客建立訂單 |
| `scenes.gift_card_redeem` | `false` | 禮品卡兌換 |
| `image.length` | `5` | 圖片驗證碼字元數（4-8） |
| `image.width` / `image.height` | `240` / `80` | 圖片尺寸，寬至少 100、高至少 40 |
| `image.noise_count` / `image.show_line` | `2` / `2` | 雜訊點與干擾線數量 |
| `image.expire_seconds` | `300` | 有效期（30-3600 秒） |
| `image.max_store` | `10240` | 記憶體中最多保留的驗證碼數量，至少 100 |
| `turnstile.site_key` / `secret_key` | `""` | Cloudflare Turnstile 金鑰；啟用 Turnstile 時兩者必填 |
| `turnstile.verify_url` | Cloudflare 官方校驗位址 | 伺服器端驗證 URL |
| `turnstile.timeout_ms` | `2000` | 伺服器端驗證逾時（500-10000ms） |

Turnstile 範例：

```yaml
captcha:
  provider: turnstile
  scenes:
    login: true
    register_send_code: true
    reset_send_code: true
    guest_create_order: true
    gift_card_redeem: true
  turnstile:
    site_key: "<your-site-key>"
    secret_key: "<your-secret-key>"
    verify_url: "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    timeout_ms: 2000
```

若開啟任一 `scenes.*`，`provider` 不能保持 `none`。後臺儲存的驗證碼設定會整體覆蓋此段。

## 5.17 `reseller`（可選）

| 欄位 | 類型 | 預設值 | 說明 | 建議 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否啟用分銷商/白標租戶解析 | 完成網域、DNS、TLS 與租戶驗收後開啟 |
| `main_hosts` | []string | `localhost`、`127.0.0.1`、`::1` | 永遠按主站處理的網域 | 列出所有正式主站網域，不含協定與路徑 |
| `trusted_forwarded_host` | bool | `false` | 解析租戶時是否優先使用 `X-Forwarded-Host` | 只有可信代理會覆寫此標頭且後端不能被直連時才開啟 |
| `subdomain_base` | string | `""` | 分配系統二級網域的基礎網域 | 例如 `shop.example.com`，並預先配置 wildcard DNS/TLS |
| `self_apply_enabled` | bool | `true` | 是否允許一般使用者自助申請分銷商 | 按營運策略設定 |
| `settlement_confirm_days` | int | `7` | 分銷利潤轉為可提領前的確認天數 | `0` 表示即時，範圍 0-3650 |

啟用後，請求 Host 命中 `main_hosts` 時按主站處理；其他 Host 只會解析到資料庫內已啟用且已驗證的分銷網域，未知網域不會靜默回落到主站。`trusted_forwarded_host` 與 `server.trusted_proxies` 是兩套獨立的信任開關：前者信任租戶網域標頭，後者信任客戶端 IP 標頭。更多業務配置請參閱[分銷商功能說明](/zh-hant/guide/reseller)。

## 5.18 執行時期覆蓋優先順序

以下設定可在管理後臺修改，且優先於 `config.yml`：

- SMTP 與郵件驗證碼設定
- 驗證碼設定
- Telegram 登入設定
- Google 登入設定
- 訂單設定（`payment_expire_minutes`、`max_refund_days`）
- 上游同步間隔；後臺儲存後會覆蓋 `queue.upstream_sync_interval`

只有資料庫沒有對應設定時，`config.yml` 才是備援值。管理員儲存過設定後，資料庫值會跨重新啟動持續優先；若修改 `config.yml` 沒有效果，請先檢查後臺設定或清除對應的持久化值。

## 6. 環境變數範例

- `APP_SECRET_KEY=...`
- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `WEB_ADMIN_PATH=/dj-mgmt-7x9k2`
- `DJ_DEFAULT_ADMIN_USERNAME=admin`
- `DJ_DEFAULT_ADMIN_PASSWORD=<你的強密碼>`
- `REDIS_HOST=127.0.0.1`
- `CAPTCHA_TURNSTILE_SITE_KEY=...`
- `TELEGRAM_AUTH_ENABLED=true`
- `TELEGRAM_AUTH_OIDC_REDIRECT_URI=https://shop.example.com/auth/telegram/callback`（需保留 YAML 中對應的空鍵；官方範例已包含）
- `RESELLER_ENABLED=true`

規則：配置鍵中的 `.` 會被替換成 `_`。環境變數覆蓋只對程式預設值或已載入 YAML 中可識別的鍵可靠生效；因此以環境變數為主的部署仍應保留最小 YAML，並包含 `telegram_auth.client_secret`、`telegram_auth.oidc_redirect_uri`、`telegram_auth.mini_app_url` 等官方範例中的空鍵。清單與映射在環境變數中的表達方式也較不直觀，`trusted_proxies`、`allowed_origins`、`queues` 等複雜值建議保留在 YAML。

## 7. 常見故障排查

- `database is locked`
  - SQLite 的 `max_open_conns` 保持為 `1`，並在 DSN 中加入 `_busy_timeout`。
- `pq: sorry, too many clients already`
  - 下調 `max_open_conns`，或在合理容量規劃後提升 PostgreSQL `max_connections`。
- 訂單時間與日誌時間不一致
  - 檢查 PostgreSQL DSN 的 `TimeZone` 與主機時區。
- Redis/佇列可連線但郵件沒有寄出
  - 檢查 `queue.enabled`、佇列 Redis 連線與 Worker 是否執行。
- 訂單長期停留在待支付且不逾時
  - 檢查是否只用 `-mode api` 啟動，或佇列/Redis 不可用導致逾時工作未被消費。
- 啟動因執行時期金鑰過弱、重複或仍為預設值而退出
  - 分別重新產生 `app.secret_key`、`jwt.secret`、`user_jwt.secret`，每個至少 32 個字元且三者不同。
- 所有客戶端 IP 都顯示為反向代理，或客戶端 IP 可以被偽造
  - 校準 `server.trusted_proxies`；只填真實代理 IP/CIDR，禁止信任所有網段。
- 修改檔案後，郵件、登入、驗證碼、訂單或上游同步行為仍未改變
  - 檢查持久化的後臺設定，它們的優先順序高於 `config.yml`。

## 8. 部署前檢查清單

- [ ] `server.mode=release`
- [ ] `app.secret_key`、`jwt.secret`、`user_jwt.secret` 已換成三個不同的高熵值，且 `app.secret_key` 已安全備份
- [ ] `server.trusted_proxies` 只包含真實代理位址/網段；沒有代理時為空清單
- [ ] 資料庫驅動與 DSN 符合實際環境
- [ ] 連線池上限符合資料庫容量
- [ ] 啟用 Redis/佇列時已確認可連線
- [ ] 使用預設 `all` 模式時，`queue.enabled=true` 且佇列 Redis 可連線
- [ ] 若刻意關閉佇列，使用 `-mode api` 啟動並了解非同步能力會減少
- [ ] `web.admin_path` 已不再使用預設 `/admin`
- [ ] CORS 已限制到真實業務來源
- [ ] 啟用郵件時已完成真實寄信測試
- [ ] 若啟用 Telegram OIDC，BotFather Allowed URLs、`client_secret` 與回呼已完成真實登入測試
- [ ] 若啟用分銷模式，`main_hosts`、`subdomain_base`、DNS/TLS 與代理 Host 信任邊界已完成驗收
