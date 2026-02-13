# `config.yml` 詳細解釋與推薦配置

> 更新時間：2026-02-11

## 1. 配置加載規則

後端啟動時按以下順序取值：

1. 讀取 `config.yml`
2. 讀取環境變量覆蓋（例如 `server.port` ⇢ `SERVER_PORT`）

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

## 5.1 `server`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `host` | string | 監聽地址 | `0.0.0.0` |
| `port` | string | 服務端口 | `8080` |
| `mode` | string | 運行模式：`debug`/`release` | 生產用 `release` |

## 5.2 `log`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `dir` | string | 日誌目錄；空字符串時使用運行目錄下 `logs` | 生產建議顯式指定 |
| `filename` | string | 日誌文件名 | `app.log` |
| `max_size_mb` | int | 單文件最大 MB | `100` |
| `max_backups` | int | 保留文件數 | `7~14` |
| `max_age_days` | int | 保留天數 | `30` |
| `compress` | bool | 是否壓縮歸檔 | `true` |

## 5.3 `database`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `driver` | string | `sqlite` 或 `postgres` | 生產建議 `postgres` |
| `dsn` | string | 數據庫連接串 | 按環境配置 |
| `pool.max_open_conns` | int | 最大打開連接數 | SQLite=1；Postgres=20~100 |
| `pool.max_idle_conns` | int | 最大空閒連接數 | 5~20 或 open 的 20%~40% |
| `pool.conn_max_lifetime_seconds` | int | 連接最大生命週期（秒，0=不限制） | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | 空閒連接最大生命週期（秒，0=不限制） | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `secret` | string | 簽名密鑰 | 至少 32 位隨機字符串 |
| `expire_hours` | int | Token 過期時間（小時） | `24` |
| `remember_me_expire_hours` | int | 僅 `user_jwt` 使用，記住我過期時間 | `168` |

## 5.5 `redis`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否啟用 Redis | 生產建議 `true` |
| `host`/`port` | string/int | Redis 地址 | 按環境設置 |
| `password` | string | Redis 密碼 | 生產必須設置 |
| `db` | int | DB 索引 | `0` |
| `prefix` | string | 鍵前綴 | `dj` 或自定義 |

## 5.6 `queue`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否啟用異步隊列 | 建議 `true` |
| `host`/`port` | string/int | 隊列 Redis 地址 | 可與 `redis` 共用不同 DB |
| `password` | string | Redis 密碼 | 生產必須設置 |
| `db` | int | 隊列 DB 索引 | 默認 `1` |
| `concurrency` | int | Worker 併發數 | 5~20 |
| `queues` | map[string]int | 隊列權重 | `default:10`, `critical:5` |

提示：如果 `queue.enabled=true` 但 Redis 不可達，異步任務（如郵件）會失敗或堆積。

## 5.7 `upload`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `max_size` | int64 | 上傳大小上限（字節） | `10485760`（10MB） |
| `allowed_types` | []string | 允許 MIME | 僅必要類型 |
| `allowed_extensions` | []string | 允許後綴 | 與 MIME 對齊 |
| `max_width` / `max_height` | int | 圖片尺寸上限 | `4096` |

## 5.8 `cors`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `allowed_origins` | []string | 允許來源 | 生產不要用 `*` |
| `allowed_methods` | []string | 允許方法 | 保持最小集 |
| `allowed_headers` | []string | 允許請求頭 | 按業務保留 |
| `allow_credentials` | bool | 是否允許攜帶憑證 | 與前端策略匹配 |
| `max_age` | int | 預檢緩存秒數 | `600` |

## 5.9 `security`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | 限流窗口（秒） | `300` |
| `login_rate_limit.max_attempts` | int | 最大嘗試次數 | `5` |
| `login_rate_limit.block_seconds` | int | 超限封禁時長（秒） | `900` |
| `password_policy.*` | mixed | 密碼複雜度策略 | 按企業要求提升 |

## 5.10 `email`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否啟用郵件 | 按需開啟 |
| `host`/`port` | string/int | SMTP 地址 | 按服務商配置 |
| `username`/`password` | string | SMTP 賬號密碼/授權碼 | 使用授權碼 |
| `from`/`from_name` | string | 發件地址與發件人名 | 使用企業域名郵箱 |
| `use_tls`/`use_ssl` | bool | 傳輸安全策略 | 二選一，按服務商文檔 |
| `verify_code.*` | mixed | 驗證碼有效期、頻率、長度 | 常用默認值 |

## 5.11 `order`

| 字段 | 類型 | 說明 | 推薦 |
| --- | --- | --- | --- |
| `payment_expire_minutes` | int | 待支付訂單超時分鐘數 | `15~30` |

## 5.12 `captcha`（可選）

`config.yml.example` 可能未完整展示該段，但系統已支持。

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
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
  turnstile:
    site_key: "<your-site-key>"
    secret_key: "<your-secret-key>"
    verify_url: "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    timeout_ms: 2000
```

## 6. 環境變量映射示例

- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `REDIS_HOST=127.0.0.1`

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

## 8. 部署前檢查清單

- [ ] `server.mode=release`
- [ ] `jwt.secret` 與 `user_jwt.secret` 已替換為高強度隨機值
- [ ] 數據庫驅動與 DSN 配置符合環境（SQLite/PostgreSQL）
- [ ] 連接池參數與數據庫規格匹配
- [ ] Redis/隊列可用（如已啟用）
- [ ] CORS 已限制到真實業務域名
- [ ] 郵件配置已做真實發信驗證（如已啟用）
