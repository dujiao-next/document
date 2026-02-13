# `config.yml` Detailed Explanation and Recommended Configuration

> Last Updated: 2026-02-11

## 1. Configuration Loading Rules

When the backend starts, values are taken in the following order:

1. Read `config.yml`
2. Read environment variables to override (e.g., `server.port` ⇢ `SERVER_PORT`)

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

## 5.1 `server`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `host` | string | Listening address | `0.0.0.0` |
| `port` | string | Service port | `8080` |
| `mode` | string | Running mode: `debug`/`release` | Use `release` for production |

## 5.2 `log`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `dir` | string | Log directory; if empty, `logs` in the running directory is used | Explicitly specify in production |
| `filename` | string | Log file name | `app.log` |
| `max_size_mb` | int | Maximum size per file in MB | `100` |
| `max_backups` | int | Number of files to retain | `7~14` |
| `max_age_days` | int | Retention period in days | `30` |
| `compress` | bool | Whether to compress archives | `true` |

## 5.3 `database`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `driver` | string | `sqlite` or `postgres` | Use `postgres` in production |
| `dsn` | string | Database connection string | Configure according to environment |
| `pool.max_open_conns` | int | Maximum open connections | SQLite=1; Postgres=20~100 |
| `pool.max_idle_conns` | int | Maximum idle connections | 5~20 or 20%~40% of open connections |
| `pool.conn_max_lifetime_seconds` | int | Maximum connection lifetime (seconds, 0=no limit) | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | Maximum idle connection lifetime (seconds, 0=no limit) | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `secret` | string | Signing key | At least a 32-character random string |
| `expire_hours` | int | Token expiration time (hours) | `24` |
| `remember_me_expire_hours` | int | Used only by `user_jwt`, remember me expiration time | `168` |

## 5.5 `redis`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `enabled` | bool | Whether to enable Redis | Recommended `true` in production |
| `host`/`port` | string/int | Redis address | Set according to environment |
| `password` | string | Redis password | Must be set in production |
| `db` | int | DB index | `0` |
| `prefix` | string | Key prefix | `dj` or custom |

## 5.6 `queue`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `enabled` | bool | Whether to enable async queue | Recommended `true` |
| `host`/`port` | string/int | Queue Redis address | Can share but use a different DB from `redis` |
| `password` | string | Redis password | Must be set in production |
| `db` | int | Queue DB index | Default `1` |
| `concurrency` | int | Worker concurrency | 5~20 |
| `queues` | map[string]int | Queue weights | `default:10`, `critical:5` |

Note: If `queue.enabled=true` but Redis is unreachable, asynchronous tasks (such as emails) may fail or pile up.

## 5.7 `upload`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `max_size` | int64 | Maximum upload size (bytes) | `10485760` (10MB) |
| `allowed_types` | []string | Allowed MIME types | Only necessary types |
| `allowed_extensions` | []string | Allowed file extensions | Match with MIME types |
| `max_width` / `max_height` | int | Maximum image dimensions | `4096` |

## 5.8 `cors`

| Field | Type | Description | Recommendation |
| --- | --- | --- | --- |
| `allowed_origins` | []string | Allowed origins | Do not use `*` in production |
| `allowed_methods` | []string | Allowed methods | Keep to a minimal set |
| `allowed_headers` | []string | Allowed request headers | Retain according to business needs |
| `allow_credentials` | bool | Whether to allow credentials | Match frontend policy |
| `max_age` | int | Preflight cache duration in seconds | `600` |

## 5.9 `security`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | Rate limit window (seconds) | `300` |
| `login_rate_limit.max_attempts` | int | Maximum number of attempts | `5` |
| `login_rate_limit.block_seconds` | int | Block duration when limit exceeded (seconds) | `900` |
| `password_policy.*` | mixed | Password complexity policy | Increase according to company requirements |

## 5.10 `email`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `enabled` | bool | Whether email is enabled | Enable as needed |
| `host`/`port` | string/int | SMTP address | Configure according to provider |
| `username`/`password` | string | SMTP account password/authorization code | Use authorization code |
| `from`/`from_name` | string | Sender address and name | Use company domain email |
| `use_tls`/`use_ssl` | bool | Transport security strategy | Choose one, follow provider documentation |
| `verify_code.*` | mixed | Verification code validity, frequency, length | Default values commonly used |

## 5.11 `order`

| Field | Type | Description | Recommended |
| --- | --- | --- | --- |
| `payment_expire_minutes` | int | Timeout in minutes for unpaid orders | `15~30` |

## 5.12 `captcha` (optional)

`config.yml.example` may not show this section completely, but it is supported by the system.

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
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
  turnstile:
    site_key: "<your-site-key>"
    secret_key: "<your-secret-key>"
    verify_url: "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    timeout_ms: 2000
```
## 6. Environment variable mapping example

- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `REDIS_HOST=127.0.0.1`

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

## 8. Pre-deployment checklist

- [ ] `server.mode=release`
- [ ] 'jwt.secret' and 'user_jwt.secret' have been replaced with high-strength random values
- [ ] Database driver and DSN configuration compliance environment (SQLite/PostgreSQL)
- [ ] The connection pool parameters match the database specifications
- [ ] Redis/queue available (if enabled)
- [ ] CORS is restricted to real business domains
- [ ] Email configuration has been authenticated (if enabled)