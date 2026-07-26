# `config.yml` Detailed Explanation and Recommended Configuration

> Last Updated: 2026-03-28

## 1. Configuration Loading Rules

When the backend starts, values are taken in the following order:

1. Use built-in default values
2. Read `config.yml`
3. Read environment variables to override (e.g., `server.port` ⇢ `SERVER_PORT`)

## 2. Conclusion First: Database Selection Recommendations

- **Development Environment**: Prefer `sqlite` (simple deployment, zero dependencies)
- **Production Environment**: Prefer `postgres` (better concurrency, reliability, and observability)

If you use `sqlite` in production, you must accept:

- Weak write concurrency
- Strong binding to single machine/disk
- Limited horizontal scaling and high availability

## 3. Copyable Demo Configurations

## 3.1 Demo A: Local Development (SQLite)

Applicable Scenarios: Single-machine development, low concurrency testing.

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
SQLite Key Reminders:

- It is **recommended to set `max_open_conns` to 1**, otherwise `database is locked` errors may occur during high-concurrency writes.
- `_journal_mode=WAL` can improve read-write concurrency experience (commonly used on a single machine).
- It is not recommended to place the SQLite data file on an unstable network drive (may cause lock exceptions).

## 3.2 Demo B: Production Environment (PostgreSQL)

Applicable scenarios: official business, predictable concurrent traffic.

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
PostgreSQL Key Reminders:

- Do not set `max_open_conns` higher than PostgreSQL's `max_connections` limit
- It's recommended to reserve some connections for DBA/monitoring/migration tasks to prevent the business from exhausting the connection pool
- It's recommended to set `conn_max_lifetime_seconds` to avoid occasional errors caused by long-lived connections being reclaimed by intermediate network devices
- It's recommended to explicitly configure `TimeZone` to prevent order times and log times from being misaligned

## 3.3 Demo C: Low-Traffic Production (PostgreSQL Low Resource)

Applicable Scenarios: Lightweight business, low-spec cloud hosts.

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
## 4. How to Adjust Connection Pool Parameters

The following recommendations apply to general scenarios in the current project (API, backend operations, payment callbacks).

- `max_open_conns`
  - Meaning: Maximum number of simultaneously open connections
  - SQLite recommendation: `1`
  - PostgreSQL recommendation: `20~100` (adjust according to business volume and DB specs)
- `max_idle_conns`
  - Meaning: Number of idle connections retained in the pool
  - Recommendation: Usually set to `20%~40%` of `max_open_conns`
- `conn_max_lifetime_seconds`
  - Meaning: Maximum lifetime of a single connection
  - Recommendation: `900~3600`; `0` means no limit
- `conn_max_idle_time_seconds`
  - Meaning: Maximum idle time for idle connections
  - Recommendation: `300~1200`; `0` means no limit

Common incorrect combinations:

- `max_idle_conns > max_open_conns` (meaningless and potentially misleading)
- Setting `max_open_conns` too high in PostgreSQL, causing `too many clients` errors
- Setting `max_open_conns` to multiple connections in SQLite, leading to increased lock conflicts

## 5. Explanation of Group Fields

## 5.0 `app`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `secret_key` | string | `change-me-32-byte-secret-key!!` | AES-256 encryption key for encrypting payment keys, Bot Tokens and other sensitive data | **Must be changed to a random 32-byte string** |

> This key must not be changed after deployment, otherwise previously encrypted data will become unreadable.

## 5.1 `server`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | Listening address | `0.0.0.0` |
| `port` | string | `8080` | Service port | `8080` |
| `mode` | string | `debug` | Running mode: `debug`/`release` | Use `release` for production |

## 5.2 `log`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `dir` | string | `""` | Log directory; if empty, `logs` in the running directory is used | Explicitly specify in production |
| `filename` | string | `app.log` | Log file name | `app.log` |
| `max_size_mb` | int | `100` | Maximum size per file in MB | `100` |
| `max_backups` | int | `7` | Number of files to retain | `7~14` |
| `max_age_days` | int | `30` | Retention period in days | `30` |
| `compress` | bool | `true` | Whether to compress archives | `true` |

## 5.3 `database`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `driver` | string | `sqlite` | `sqlite` or `postgres` | Use `postgres` in production |
| `dsn` | string | `./db/dujiao.db` | Database connection string | Configure according to environment |
| `pool.max_open_conns` | int | `1` | Maximum open connections | SQLite=1; Postgres=20~100 |
| `pool.max_idle_conns` | int | `1` | Maximum idle connections | 5~20 or 20%~40% of open connections |
| `pool.conn_max_lifetime_seconds` | int | `0` | Maximum connection lifetime (seconds, 0=no limit) | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | `0` | Maximum idle connection lifetime (seconds, 0=no limit) | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| Field | Type | Default | Description | Recommended |
| --- | --- | --- | --- | --- |
| `secret` | string | `change-me-in-production` | Signing key | At least a 32-character random string |
| `expire_hours` | int | `24` | Token expiration time (hours) | `24` |
| `remember_me_expire_hours` | int | `168` | Used only by `user_jwt`, remember me expiration time | `168` (7 days) |

## 5.5 `redis`

| Field | Type | Default | Description | Recommended |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | Whether to enable Redis | Recommended `true` in production |
| `host` | string | `127.0.0.1` | Redis address | Set according to environment |
| `port` | int | `6379` | Redis port | `6379` |
| `password` | string | `""` | Redis password | Must be set in production |
| `db` | int | `0` | DB index | `0` |
| `prefix` | string | `dj` | Key prefix | `dj` or custom |

## 5.6 `queue`

| Field | Type | Default | Description | Recommended |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | Whether to enable async queue | Recommended `true` |
| `host` | string | `127.0.0.1` | Queue Redis address | Can share but use a different DB from `redis` |
| `port` | int | `6379` | Queue Redis port | `6379` |
| `password` | string | `""` | Redis password | Must be set in production |
| `db` | int | `1` | Queue DB index | `1` |
| `concurrency` | int | `10` | Worker concurrency | 5~20 |
| `queues` | map | `default:10, critical:5` | Queue names and weights | Adjust as needed |

Note: If `queue.enabled=true` but Redis is unreachable, asynchronous tasks (such as emails) may fail or pile up.

Additional notes:

- The default startup mode is `all` (API + Worker).
- If `queue.enabled=false`, start with `-mode api`; otherwise Worker initialization will fail.

## 5.7 `upload`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `max_size` | int64 | Maximum upload size (bytes) | `10485760` (10MB) |
| `allowed_types` | []string | Allowed MIME types | Only necessary types |
| `allowed_extensions` | []string | Allowed file extensions | Match with MIME types |
| `max_width` / `max_height` | int | Maximum image dimensions | `4096` |

## 5.8 `web`

Controls how the embedded frontends are mounted. Since v1.4.0 the storefront and admin panel are embedded in the binary, and this section determines the admin entry path.

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `admin_path` | string | `/admin` | Path prefix for the admin panel | **Change it to something hard to guess** |

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"
```

Additional notes:

- Must start with `/`, must not end with `/`, and must not be `/` itself.
- Each segment may only contain letters, digits and `-` `.` `_` `~` `@`, and must not be `.` or `..`. Colons and asterisks are Gin routing metacharacters (`/:tenant`, `/*admin`) that would make the admin panel swallow storefront paths or fail startup outright, so they are rejected.
- Must not equal, contain, or be contained by `/api`, `/uploads`, or `/health`; otherwise startup fails with an error.
- Validation runs before database initialization: an invalid value exits cleanly rather than leaving you with a migrated schema and a service that will not start.
- A restart is required after changing it: the value is written into the admin page's `<base href>` once at startup.
- The storefront is always mounted at `/` and is not configurable.
- This path is only the "front door" of the admin panel, not a security boundary — endpoint security comes from
  JWT and rate limiting. Changing it filters out automated scanning noise.
- If the binary has no embedded frontends (built with `go build` without `-tags fullstack`), this section has no effect.

## 5.9 `cors`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `allowed_origins` | []string | Allowed origins | Do not use `*` in production |
| `allowed_methods` | []string | Allowed methods | Keep to a minimal set |
| `allowed_headers` | []string | Allowed request headers | Retain according to business needs |
| `allow_credentials` | bool | Whether to allow credentials | Match frontend policy |
| `max_age` | int | Preflight cache duration in seconds | `600` |

Additional notes:

- Browser constraint: when `allow_credentials=true`, `allowed_origins` must not contain `*`.

## 5.10 `security`

| Field | Type | Default | Description | Recommended |
| --- | --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | `300` | Rate limit detection window (seconds) | `300` |
| `login_rate_limit.max_attempts` | int | `5` | Maximum failed attempts within window | `5` |
| `login_rate_limit.block_seconds` | int | `900` | Block duration when limit exceeded (seconds) | `900` |
| `password_policy.min_length` | int | `8` | Minimum password length | `8` or higher |
| `password_policy.require_upper` | bool | `true` | Whether to require uppercase letters | `true` |
| `password_policy.require_lower` | bool | `true` | Whether to require lowercase letters | `true` |
| `password_policy.require_number` | bool | `true` | Whether to require digits | `true` |
| `password_policy.require_special` | bool | `false` | Whether to require special characters | Enable as needed |

## 5.11 `email`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `enabled` | bool | Whether email is enabled | Enable as needed |
| `host`/`port` | string/int | SMTP address | Configure according to provider |
| `username`/`password` | string | SMTP account password/authorization code | Use authorization code |
| `from`/`from_name` | string | Sender address and name | Use company domain email |
| `use_tls`/`use_ssl` | bool | Transport security strategy | Choose one, follow provider documentation |
| `verify_code.*` | mixed | Verification code validity, frequency, length | Default values commonly used |

## 5.12 `bootstrap`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `default_admin_username` | string | Username for first-time default admin initialization | Set it explicitly to your own admin username |
| `default_admin_password` | string | Password for first-time default admin initialization | Set a strong password |

Additional notes:

- The default admin is only created when the `admins` table is empty.
- Priority: `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD` (environment variables) > `bootstrap.default_admin_username` / `bootstrap.default_admin_password` (`config.yml`) > system defaults.
- In `release` mode, if no admin password is provided in either environment variables or `config.yml`, default admin initialization will be skipped.

## 5.13 `order`

| Field | Type | Default | Description | Recommended |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | Timeout in minutes for unpaid orders | `15~30` |

Additional notes:

- The effective value may be overridden by admin settings (see "Runtime Override Priority" below).

## 5.14 `telegram_auth` (optional)

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `enabled` | bool | Enable Telegram login | Enable when needed |
| `bot_username` | string | Bot username (without `@`) | e.g. `dujiao_login_bot` |
| `bot_token` | string | Bot token | Generated by BotFather |
| `login_expire_seconds` | int | Login validity (seconds) | `300` |
| `replay_ttl_seconds` | int | Replay protection TTL (seconds) | `300` |

## 5.15 `captcha` (optional)

`config.yml.example` may not show this section completely, but it is supported by the system.

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
  - `gift_card_redeem`
- `image`: image captcha parameters
- `turnstile`: Cloudflare Turnstile parameters

Example:

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

## 5.16 Runtime Override Priority (Important)

The following items can be changed dynamically in admin settings and have higher priority than `config.yml`:

- SMTP (email) settings
- Captcha settings
- Telegram login settings
- Order payment timeout minutes (`payment_expire_minutes`)

If you changed `config.yml` but behavior did not change, check admin settings first.
## 6. Environment variable mapping example

- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `WEB_ADMIN_PATH=/dj-mgmt-7x9k2`
- `DJ_DEFAULT_ADMIN_USERNAME=admin`
- `DJ_DEFAULT_ADMIN_PASSWORD=<your-strong-password>`
- `REDIS_HOST=127.0.0.1`
- `CAPTCHA_TURNSTILE_SITE_KEY=...`
- `TELEGRAM_AUTH_ENABLED=true`

Rule: '.' in the configuration key is converted to '_'.

## 7. Common faults and troubleshooting

- `database is locked`
  - Common in SQLite multi-concurrent writes
  - Check if 'max_open_conns' is '1' and confirm that the DSN is set to '_busy_timeout'
- `pq: sorry, too many clients already`
  - PostgreSQL connections run out
  - Lowering 'max_open_conns', or raising the database 'max_connections'
- Time display is scrambled (order time does not coincide with log time)
  - Check the 'TimeZone' of PostgreSQL DSN with the system time zone
- Redis/queue is available but the message is not sent
  - Check 'queue.enabled', Redis connectivity, worker started
- Orders stay in "pending payment" and never expire automatically
  - Check whether you started with `-mode api` only, or queue/Redis is unavailable so timeout tasks are not consumed

## 8. Pre-deployment checklist

- [ ] `server.mode=release`
- [ ] 'jwt.secret' and 'user_jwt.secret' have been replaced with high-strength random values
- [ ] Database driver and DSN configuration compliance environment (SQLite/PostgreSQL)
- [ ] The connection pool parameters match the database specifications
- [ ] Redis/queue available (if enabled)
- [ ] If using default startup mode `all`, ensure `queue.enabled=true` and queue Redis is reachable
- [ ] If queue is intentionally disabled, start with `-mode api` and accept reduced async capabilities
- [ ] `web.admin_path` no longer uses the default `/admin`
- [ ] CORS is restricted to real business domains
- [ ] Email configuration has been authenticated (if enabled)
