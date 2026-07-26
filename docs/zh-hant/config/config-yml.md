# `config.yml` 詳細解釋與推薦配置

> 更新時間：2026-03-28

## 1. 配置加載規則

後端啟動時按以下順序取值：

1. 使用系統默認值（代碼內置默認）
2. 讀取 `config.yml`
3. 讀取環境變量覆蓋（例如 `server.port` ⇢ `SERVER_PORT`）

## 2. 先看結論：數據庫選型建議

- **開發環境**：優先 `sqlite`（部署簡單、零依賴）
- **生產環境**：優先 `postgres`（併發、可靠性、可觀測性更好）

如果你使用 `sqlite` 上生產，必須接受：

- 寫併發能力較弱
- 單機/單盤強綁定
- 橫向擴容與高可用能力受限

## 3. 可直接複製的 Demo 配置

## 3.1 Demo A：本地開發（SQLite）

適用場景：單機開發、低併發測試。

```yaml
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
  secret: "dev-admin-jwt-secret-change-me-please-32chars"
  expire_hours: 24

user_jwt:
  secret: "dev-user-jwt-secret-change-me-please-32chars"
  expire_hours: 24
  remember_me_expire_hours: 168
```

SQLite 重點提醒：

- `max_open_conns` **建議固定為 1**，否則高併發寫入時容易出現 `database is locked`
- `_journal_mode=WAL` 可提升讀寫併發體驗（單機下常用）
- 不建議把 SQLite 數據文件放在不穩定網絡盤（可能導致鎖異常）

## 3.2 Demo B：生產環境（PostgreSQL）

適用場景：正式業務、可預期併發流量。

```yaml
server:
  host: 0.0.0.0
  port: 8080
  mode: release

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
  secret: "replace-with-strong-random-admin-secret-64chars"
  expire_hours: 24

user_jwt:
  secret: "replace-with-strong-random-user-secret-64chars"
  expire_hours: 24
  remember_me_expire_hours: 168
```

PostgreSQL 重點提醒：

- `max_open_conns` 不要超過 PostgreSQL 的 `max_connections` 預算
- 建議預留連接給 DBA/監控/遷移任務，避免業務把連接池吃滿
- 建議設置 `conn_max_lifetime_seconds`，避免長期連接被中間網絡設備回收後出現偶發錯誤
- `TimeZone` 建議顯式配置，避免訂單時間與日誌時間錯位

## 3.3 Demo C：小流量生產（PostgreSQL 低資源）

適用場景：輕量業務、低配置雲主機。

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

## 4. 連接池參數如何調

以下建議適用於當前項目（API + 後臺操作 + 支付回調）的一般場景。

- `max_open_conns`
  - 含義：最大同時打開連接數
  - SQLite 推薦：`1`
  - PostgreSQL 推薦：`20~100`（按業務量和 DB 規格調整）
- `max_idle_conns`
  - 含義：連接池內保留的空閒連接數
  - 建議：通常設為 `max_open_conns` 的 `20%~40%`
- `conn_max_lifetime_seconds`
  - 含義：單連接最大生存時間
  - 建議：`900~3600`；`0` 表示不限制
- `conn_max_idle_time_seconds`
  - 含義：空閒連接最大空閒時間
  - 建議：`300~1200`；`0` 表示不限制

常見錯誤搭配：

- `max_idle_conns > max_open_conns`（無意義且易誤導）
- PostgreSQL 把 `max_open_conns` 拉太高，導致 `too many clients`
- SQLite 將 `max_open_conns` 設置為多連接，導致鎖衝突增多

## 5. 分組字段說明

## 5.0 `app`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `secret_key` | string | `change-me-32-byte-secret-key!!` | AES-256 加密金鑰，用於加密支付金鑰、Bot Token 等敏感數據 | **必須修改為隨機 32 位元組字串** |

> 此金鑰部署後不可隨意更換，否則已加密數據將無法解密。

## 5.1 `server`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | 監聽地址 | `0.0.0.0` |
| `port` | string | `8080` | 服務端口 | `8080` |
| `mode` | string | `debug` | 運行模式：`debug`/`release` | 生產用 `release` |

## 5.2 `log`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `dir` | string | `""` | 日誌目錄；空字串時使用運行目錄下 `logs` | 生產建議顯式指定 |
| `filename` | string | `app.log` | 日誌文件名 | `app.log` |
| `max_size_mb` | int | `100` | 單文件最大 MB | `100` |
| `max_backups` | int | `7` | 保留文件數 | `7~14` |
| `max_age_days` | int | `30` | 保留天數 | `30` |
| `compress` | bool | `true` | 是否壓縮歸檔 | `true` |

## 5.3 `database`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `driver` | string | `sqlite` | `sqlite` 或 `postgres` | 生產建議 `postgres` |
| `dsn` | string | `./db/dujiao.db` | 數據庫連接串 | 按環境配置 |
| `pool.max_open_conns` | int | `1` | 最大打開連接數 | SQLite=1；Postgres=20~100 |
| `pool.max_idle_conns` | int | `1` | 最大空閒連接數 | 5~20 或 open 的 20%~40% |
| `pool.conn_max_lifetime_seconds` | int | `0` | 連接最大生命週期（秒，0=不限制） | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | `0` | 空閒連接最大生命週期（秒，0=不限制） | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `secret` | string | `change-me-in-production` | 簽名金鑰 | 至少 32 位隨機字串 |
| `expire_hours` | int | `24` | Token 過期時間（小時） | `24` |
| `remember_me_expire_hours` | int | `168` | 僅 `user_jwt` 使用，記住我過期時間 | `168`（7 天） |

## 5.5 `redis`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否啟用 Redis | 生產建議 `true` |
| `host` | string | `127.0.0.1` | Redis 地址 | 按環境設置 |
| `port` | int | `6379` | Redis 端口 | `6379` |
| `password` | string | `""` | Redis 密碼 | 生產必須設置 |
| `db` | int | `0` | DB 索引 | `0` |
| `prefix` | string | `dj` | 鍵前綴 | `dj` 或自定義 |

## 5.6 `queue`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否啟用異步隊列 | 建議 `true` |
| `host` | string | `127.0.0.1` | 隊列 Redis 地址 | 可與 `redis` 共用不同 DB |
| `port` | int | `6379` | 隊列 Redis 端口 | `6379` |
| `password` | string | `""` | Redis 密碼 | 生產必須設置 |
| `db` | int | `1` | 隊列 DB 索引 | `1` |
| `concurrency` | int | `10` | Worker 併發數 | 5~20 |
| `queues` | map | `default:10, critical:5` | 隊列名稱與權重 | 按需調整 |

提示：如果 `queue.enabled=true` 但 Redis 不可達，異步任務（如郵件）會失敗或堆積。

補充：

- 默認啟動模式是 `all`（API + Worker）。
- 當 `queue.enabled=false` 時，請使用 `-mode api` 啟動；否則 Worker 無法初始化。

## 5.7 `upload`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `max_size` | int64 | 上傳大小上限（字節） | `10485760`（10MB） |
| `allowed_types` | []string | 允許 MIME | 僅必要類型 |
| `allowed_extensions` | []string | 允許後綴 | 與 MIME 對齊 |
| `max_width` / `max_height` | int | 圖片尺寸上限 | `4096` |

## 5.8 `web`

控制內嵌前端的掛載方式。自 v1.4.0 起用戶前臺與管理後臺已 embed 進二進制，這一段決定後臺入口路徑。

| 欄位 | 類型 | 默認值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `admin_path` | string | `/admin` | 管理後臺的路徑前綴 | **改成不易猜測的字串** |

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"
```

補充：

- 必須以 `/` 開頭、不能以 `/` 結尾，且不能是 `/`。
- 每一段只能由字母、數字和 `-` `.` `_` `~` `@` 組成，且不能是 `.` 或 `..`。冒號和星號是 Gin 的路由元字符（`/:tenant`、`/*admin`），會讓後臺吞掉用戶前臺的路徑或直接啟動失敗，因此一律拒絕。
- 不能與 `/api`、`/uploads`、`/health` 衝突或互為前綴，否則啟動時會直接報錯退出。
- 校驗在資料庫初始化之前完成：配置不合法會乾淨地退出，不會留下「已遷移但起不來」的狀態。
- 改動後必須重啟行程：該路徑在啟動時被一次性寫進後臺頁面的 `<base href>`。
- 用戶前臺固定掛在 `/`，不可配置。
- 這個路徑只是後臺入口的「門牌」，不構成鑑權邊界 —— 介面安全由 JWT + 限流保證，
  改路徑的意義是過濾自動化掃描雜訊。
- 若二進制不含內嵌前端（自行 `go build` 未加 `-tags fullstack`），本段不生效。

## 5.9 `cors`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `allowed_origins` | []string | 允許來源 | 生產不要用 `*` |
| `allowed_methods` | []string | 允許方法 | 保持最小集 |
| `allowed_headers` | []string | 允許請求頭 | 按業務保留 |
| `allow_credentials` | bool | 是否允許攜帶憑證 | 與前端策略匹配 |
| `max_age` | int | 預檢緩存秒數 | `600` |

補充：

- 瀏覽器限制：當 `allow_credentials=true` 時，`allowed_origins` 不能包含 `*`。

## 5.10 `security`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | `300` | 限流檢測窗口（秒） | `300` |
| `login_rate_limit.max_attempts` | int | `5` | 窗口內最大失敗次數 | `5` |
| `login_rate_limit.block_seconds` | int | `900` | 超限封禁時長（秒） | `900` |
| `password_policy.min_length` | int | `8` | 密碼最短長度 | `8` 或更高 |
| `password_policy.require_upper` | bool | `true` | 是否要求大寫字母 | `true` |
| `password_policy.require_lower` | bool | `true` | 是否要求小寫字母 | `true` |
| `password_policy.require_number` | bool | `true` | 是否要求數字 | `true` |
| `password_policy.require_special` | bool | `false` | 是否要求特殊字元 | 按需開啟 |

## 5.11 `email`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否啟用郵件 | 按需開啟 |
| `host`/`port` | string/int | SMTP 地址 | 按服務商配置 |
| `username`/`password` | string | SMTP 賬號密碼/授權碼 | 使用授權碼 |
| `from`/`from_name` | string | 發件地址與發件人名 | 使用企業域名郵箱 |
| `use_tls`/`use_ssl` | bool | 傳輸安全策略 | 二選一，按服務商文檔 |
| `verify_code.*` | mixed | 驗證碼有效期、頻率、長度 | 常用默認值 |

## 5.12 `bootstrap`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `default_admin_username` | string | 首次初始化管理員用戶名 | 建議顯式設置為你自己的管理員賬號 |
| `default_admin_password` | string | 首次初始化管理員密碼 | 建議設置強密碼 |

補充：

- 僅當數據庫 `admins` 表為空時，首次啟動才會嘗試創建默認管理員。
- 優先級：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`（環境變量） > `bootstrap.default_admin_username` / `bootstrap.default_admin_password`（`config.yml`） > 系統默認值。
- 若運行在 `release` 模式且環境變量與 `config.yml` 都未提供管理員密碼，系統會跳過默認管理員初始化。

## 5.13 `order`

| 字段 | 類型 | 預設值 | 說明 | 推薦 |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | 待支付訂單超時分鐘數 | `15~30` |

補充：

- 實際生效值可能會被後台系統設置覆蓋（見下方「運行時覆蓋優先級」）。

## 5.14 `telegram_auth`（可選）

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否啟用 Telegram 登入 | 按需開啟 |
| `bot_username` | string | Bot 用戶名（不帶 `@`） | 例如 `dujiao_login_bot` |
| `bot_token` | string | Bot Token | 由 BotFather 生成 |
| `login_expire_seconds` | int | 登入有效期（秒） | `300` |
| `replay_ttl_seconds` | int | 重放保護時長（秒） | `300` |

## 5.15 `captcha`（可選）

`config.yml.example` 可能未完整展示該段，但系統已支持。

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
  - `gift_card_redeem`
- `image`: 圖片驗證碼參數
- `turnstile`: Cloudflare Turnstile 參數

示例：

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

## 5.16 運行時覆蓋優先級（重要）

以下配置支持在後台「設置」中動態修改，且優先級高於 `config.yml`：

- SMTP（郵件）配置
- 驗證碼配置
- Telegram 登入配置
- 訂單支付超時分鐘數（`payment_expire_minutes`）

如果你修改了 `config.yml` 但頁面行為沒有變化，請優先檢查後台對應設置項。

## 6. 環境變量映射示例

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

規則：配置鍵中的 `.` 會被轉換為 `_`。

## 7. 常見故障與排查

- `database is locked`
  - 常見於 SQLite 多併發寫入
  - 檢查 `max_open_conns` 是否為 `1`，並確認 DSN 已設置 `_busy_timeout`
- `pq: sorry, too many clients already`
  - PostgreSQL 連接數耗盡
  - 下調 `max_open_conns`，或提升數據庫 `max_connections`
- 時間顯示錯亂（訂單時間與日誌時間不一致）
  - 檢查 PostgreSQL DSN 的 `TimeZone` 與系統時區
- Redis/隊列可用但郵件未發送
  - 檢查 `queue.enabled`、Redis 連通性、worker 是否啟動
- 訂單長期停留在「待支付」，不自動過期
  - 檢查是否以 `-mode api` 單獨啟動，或 `queue.enabled`/Redis 不可用導致超時任務未消費

## 8. 部署前檢查清單

- [ ] `server.mode=release`
- [ ] `jwt.secret` 與 `user_jwt.secret` 已替換為高強度隨機值
- [ ] 數據庫驅動與 DSN 配置符合環境（SQLite/PostgreSQL）
- [ ] 連接池參數與數據庫規格匹配
- [ ] Redis/隊列可用（如已啟用）
- [ ] 若使用默認啟動模式 `all`，請確認 `queue.enabled=true` 且隊列 Redis 可達
- [ ] 若計劃關閉隊列，請確認使用 `-mode api` 啟動，並知曉異步任務能力會受影響
- [ ] `web.admin_path` 已改掉默認值 `/admin`
- [ ] CORS 已限制到真實業務域名
- [ ] 郵件配置已做真實發信驗證（如已啟用）
