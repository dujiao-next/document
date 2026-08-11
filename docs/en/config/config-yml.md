# `config.yml` Detailed Explanation and Recommended Configuration

> Last updated: 2026-08-11
>
> Applies to: the current `dujiao-next` main branch. Field names and built-in defaults follow `internal/config/config.go`.

## 1. Configuration Loading Rules

When the backend starts, values are resolved in the following order:

1. Built-in defaults
2. Values from `config.yml`
3. Environment-variable overrides, for example `server.port` ⇢ `SERVER_PORT`

The application looks for `config.yml` in the current directory, its parent directory, and `./etc`. If the file is missing or cannot be read, startup logs a warning and continues with environment variables and built-in defaults. However, the later security check still stops startup unless all three valid runtime secrets are supplied through the environment. A production deployment should keep a permission-protected copy of the file in its backup set.

Except for the special bootstrap variables `DJ_DEFAULT_ADMIN_USERNAME` and `DJ_DEFAULT_ADMIN_PASSWORD`, an environment variable is normally formed from the full configuration key by uppercasing it and replacing `.` with `_`. For example, `app.secret_key` becomes `APP_SECRET_KEY`.

## 2. Database Recommendation

- **Development:** prefer `sqlite` for simple, dependency-free setup.
- **Production:** prefer `postgres` for better concurrency, reliability, and observability.

Using SQLite in production means accepting:

- Lower write concurrency
- A strong dependency on one machine and disk
- Limited horizontal scaling and high-availability options

## 3. Configuration Templates

Before starting the service, run the following command three times and paste the three different outputs into `app.secret_key`, `jwt.secret`, and `user_jwt.secret`:

```bash
openssl rand -hex 32
```

The three runtime secrets must be different. A built-in value, a known placeholder, a value shorter than 32 characters, or a duplicated value makes startup fail. Do not keep the angle-bracket placeholders below.

## 3.1 Demo A: Local Development with SQLite

Use this for single-machine development and low-concurrency testing.

```yaml
app:
  secret_key: "<first openssl output>"

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
  secret: "<second openssl output>"
  expire_hours: 24

user_jwt:
  secret: "<third openssl output>"
  expire_hours: 24
  remember_me_expire_hours: 168
```

SQLite reminders:

- Keep `max_open_conns` at `1`; multiple writers make `database is locked` errors more likely.
- `_journal_mode=WAL` can improve read/write concurrency on a single machine.
- Do not place the SQLite file on an unstable network filesystem; file-lock behavior may be unreliable.

## 3.2 Demo B: Production with PostgreSQL

Use this for production workloads with predictable concurrent traffic.

```yaml
app:
  secret_key: "<first openssl output>"

server:
  host: 0.0.0.0
  port: 8080
  mode: release
  # These values apply only when the reverse proxy runs on the same host
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
  secret: "<second openssl output>"
  expire_hours: 24

user_jwt:
  secret: "<third openssl output>"
  expire_hours: 24
  remember_me_expire_hours: 168
```

PostgreSQL reminders:

- Do not allocate more `max_open_conns` than the PostgreSQL `max_connections` budget.
- Reserve connections for administration, monitoring, and migrations.
- Set `conn_max_lifetime_seconds` so network infrastructure does not unexpectedly reclaim indefinitely long-lived connections.
- Set `TimeZone` explicitly to keep order and log timestamps aligned.

## 3.3 Demo C: Low-Resource PostgreSQL

Use this connection-pool profile for a small production workload on a low-spec server:

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

## 4. Tuning the Connection Pool

These are general starting points for API traffic, admin operations, and payment callbacks:

- `max_open_conns`
  - Maximum number of simultaneously open connections
  - SQLite: `1`
  - PostgreSQL: `20-100`, adjusted to workload and database capacity
- `max_idle_conns`
  - Idle connections retained by the pool
  - Usually 20%-40% of `max_open_conns`
- `conn_max_lifetime_seconds`
  - Maximum connection lifetime
  - Usually `900-3600`; `0` means unlimited
- `conn_max_idle_time_seconds`
  - Maximum time a connection may stay idle
  - Usually `300-1200`; `0` means unlimited

Common mistakes:

- `max_idle_conns > max_open_conns`
- Setting PostgreSQL `max_open_conns` so high that the database returns `too many clients`
- Giving SQLite multiple open connections and increasing lock contention

## 5. Configuration Groups

## 5.0 `app`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `secret_key` | string | `change-me-32-byte-secret-key!!` | Root AES-256 encryption key for payment credentials, Bot Tokens, and other sensitive data | **Generate separately with `openssl rand -hex 32`** |
| `totp_issuer` | string | `Dujiao-Next` | Issuer name shown in administrator and user 2FA authenticator apps | Use a stable site name and avoid special characters such as `&` |

Do not rotate `app.secret_key` casually after deployment. Existing encrypted database values cannot be decrypted with a different key. It must differ from both JWT secrets and must be backed up with the database.

## 5.1 `server`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | Listen address | `0.0.0.0` |
| `port` | string | `8080` | Service port | `8080` |
| `mode` | string | `debug` | Runtime mode: `debug` or `release` | Use `release` in production |
| `trusted_proxies` | []string | `127.0.0.1/32`, `::1/128` | Proxy IP addresses/CIDRs from which Gin may trust forwarded client-IP headers | List only real reverse proxies; use `[]` when there is no proxy |

An empty `trusted_proxies` list disables trust in forwarded headers and uses the TCP peer address. Docker, load balancer, and CDN deployments must use their real proxy networks. The application rejects `0.0.0.0/0` and `::/0` because they trust every source. This setting controls client-IP resolution only; it is separate from `reseller.trusted_forwarded_host`.

## 5.2 `log`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `dir` | string | `""` | Log directory; an empty value uses `logs` under the working directory | Set explicitly in production |
| `filename` | string | `app.log` | Log filename | `app.log` |
| `max_size_mb` | int | `100` | Maximum size of one file in MB | `100` |
| `max_backups` | int | `7` | Number of rotated files to retain | `7-14` |
| `max_age_days` | int | `30` | Retention period in days | `30` |
| `compress` | bool | `true` | Compress rotated files | `true` |

## 5.3 `database`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `driver` | string | `sqlite` | `sqlite` or `postgres` | Prefer `postgres` in production |
| `dsn` | string | `./db/dujiao.db` | Database connection string | Configure for the environment |
| `pool.max_open_conns` | int | `1` | Maximum open connections | SQLite=1; PostgreSQL=20-100 |
| `pool.max_idle_conns` | int | `1` | Maximum idle connections | 5-20, or 20%-40% of open connections |
| `pool.conn_max_lifetime_seconds` | int | `0` | Maximum connection lifetime; 0 is unlimited | `900-3600` |
| `pool.conn_max_idle_time_seconds` | int | `0` | Maximum idle time; 0 is unlimited | `300-1200` |

## 5.4 `jwt` / `user_jwt`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `jwt.secret` | string | `change-me-in-production` | Administrator token signing secret | Generate separately with `openssl rand -hex 32` |
| `jwt.expire_hours` | int | `24` | Administrator token expiration in hours | `24` |
| `user_jwt.secret` | string | `user-change-me-in-production` | User token signing secret | Generate separately with `openssl rand -hex 32` |
| `user_jwt.expire_hours` | int | `24` | Normal user token expiration in hours | `24` |
| `user_jwt.remember_me_expire_hours` | int | `168` | Remember-me user token expiration | `168` (7 days) |

Startup fails if any of `app.secret_key`, `jwt.secret`, or `user_jwt.secret` is weak, is still a known placeholder, or duplicates another secret.

## 5.5 `redis`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | Enable Redis | Recommended in production |
| `host` | string | `127.0.0.1` | Redis host | Configure for the environment |
| `port` | int | `6379` | Redis port | `6379` |
| `password` | string | `""` | Redis password | Set in production |
| `db` | int | `0` | Redis database index | `0` |
| `prefix` | string | `dj` | Key prefix | `dj` or a deployment-specific value |

## 5.6 `queue`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | Enable the asynchronous queue | Recommended |
| `host` | string | `127.0.0.1` | Queue Redis host | May share the Redis server while using a different DB |
| `port` | int | `6379` | Queue Redis port | `6379` |
| `password` | string | `""` | Queue Redis password | Set in production |
| `db` | int | `1` | Queue Redis database index | `1` |
| `concurrency` | int | `10` | Worker concurrency | 5-20 |
| `queues` | map | `default:10, critical:5` | Queue names and weights | Adjust as needed |
| `upstream_sync_interval` | duration string | `5m` (service fallback) | Scheduled upstream product inventory synchronization interval | Use a Go duration such as `5m` or `1h` |

If `queue.enabled=true` but Redis is unavailable, asynchronous work such as email delivery fails or accumulates.

- The default startup mode is `all` (API + Worker).
- When `queue.enabled=false`, start with `-mode api`; otherwise the Worker cannot initialize.
- Once the Upstream Sync setting is saved in the admin panel, it overrides `upstream_sync_interval`. The admin setting accepts 5 to 1,440 minutes.

## 5.7 `upload`

| Field | Type | Built-in default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `max_size` | int64 | `10485760` | Upload size limit in bytes | 10 MB or a tighter business limit |
| `allowed_types` | []string | JPEG, PNG, GIF, WebP | Allowed MIME types | Keep only required types |
| `allowed_extensions` | []string | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | Allowed extensions | Keep aligned with MIME types |
| `max_width` / `max_height` | int | `4096` | Raster image dimension limit | `4096` |

The official `config.yml.example` additionally enables SVG (`image/svg+xml` / `.svg`). Remove SVG from both allowlists if your business does not need it.

## 5.8 `web`

This section controls the embedded frontends. In fullstack builds, the user frontend is mounted at `/` and this setting chooses the admin entry path.

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `admin_path` | string | `/admin` | Admin frontend path prefix | **Use a hard-to-guess path** |

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"
```

Rules and behavior:

- The path must begin with `/`, must not end with `/`, and cannot be `/`.
- Each segment may contain letters, numbers, `-`, `.`, `_`, `~`, and `@`, but cannot be `.` or `..`. Gin route metacharacters such as `:` and `*` are rejected.
- It cannot conflict with or be a prefix of `/api`, `/uploads`, or `/health`.
- Validation happens before database initialization, so an invalid path exits before migrations.
- A change requires a restart because the path is written into the admin page `<base href>` at startup.
- The user frontend remains fixed at `/`.
- The path reduces automated scanning noise but is not an authorization boundary; JWT authentication and rate limiting protect the APIs.
- This section has no effect in a binary built without `-tags fullstack`.

## 5.9 `cors`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `allowed_origins` | []string | `["*"]` | Allowed origins | List exact production origins |
| `allowed_methods` | []string | GET, POST, PUT, DELETE, OPTIONS, PATCH | Allowed methods | Keep the minimum set |
| `allowed_headers` | []string | See `config.yml.example` | Allowed request headers | Keep only what the application needs |
| `allow_credentials` | bool | `true` | Whether credentials are allowed | Match the frontend policy |
| `max_age` | int | `600` | Preflight cache duration in seconds | `600` |

In the current implementation, when `allow_credentials=true` and the list contains `*`, the server reflects any request `Origin`. This effectively permits every origin to send credentialed requests, so production must use exact scheme, host, and port values.

## 5.10 `security`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | `300` | Rate-limit window in seconds | `300` |
| `login_rate_limit.max_attempts` | int | `5` | Maximum failed attempts in the window | `5` |
| `login_rate_limit.block_seconds` | int | `900` | Block duration after the limit is reached | `900` |
| `password_policy.min_length` | int | `8` | Minimum password length | `8` or more |
| `password_policy.require_upper` | bool | `true` | Require an uppercase letter | `true` |
| `password_policy.require_lower` | bool | `true` | Require a lowercase letter | `true` |
| `password_policy.require_number` | bool | `true` | Require a number | `true` |
| `password_policy.require_special` | bool | `false` | Require a special character | Enable as needed |

## 5.11 `email`

| Field | Type | Built-in default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | Enable email | Enable only after a real delivery test |
| `host` | string | `""` | SMTP host | Follow the provider settings |
| `port` | int | `587` | SMTP port | 587 is common for STARTTLS; 465 for implicit TLS |
| `username` / `password` | string | `""` | SMTP account and password/app password | Use a dedicated app password |
| `from` / `from_name` | string | `""` | Sender address and display name | Use a verified business-domain mailbox |
| `use_tls` | bool | `true` | Use STARTTLS | Mutually exclusive with `use_ssl` |
| `use_ssl` | bool | `false` | Use TLS immediately on connect | Mutually exclusive with `use_tls` |
| `verify_code.expire_minutes` | int | `10` | Verification-code lifetime in minutes | `10` |
| `verify_code.send_interval_seconds` | int | `60` | Minimum resend interval per target in seconds | `60` |
| `verify_code.max_attempts` | int | `5` | Maximum verification attempts | `5` |
| `verify_code.length` | int | `6` | Numeric code length (4-10) | `6` |

The official example uses port 465/SSL and placeholder SMTP details. Those are not built-in defaults; choose TLS or SSL according to your provider.

## 5.12 `bootstrap`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `default_admin_username` | string | `""` | Initial administrator username | Set your own administrator username explicitly |
| `default_admin_password` | string | `""` | Initial administrator password | Use a strong password that satisfies `security.password_policy` |

- An administrator is initialized only when the database `admins` table is empty.
- Priority: `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD` (environment) > `bootstrap.default_admin_username` / `bootstrap.default_admin_password` (`config.yml`) > system defaults.
- In `release` mode, if neither the environment nor `config.yml` provides an administrator password, default administrator initialization is skipped.
- In `release` mode, a known default password or one that violates the current password policy makes startup fail. Other modes log a warning.

## 5.13 `order`

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | Pending-payment order timeout in minutes | `15-30` |
| `max_refund_days` | int | `30` | Longest period in which an administrator may record a manual refund or refund to the internal wallet, counted from payment time (or creation time when absent) | Follow the after-sales policy; `0` means unlimited, maximum `3650` |

- Both fields may be overridden by Order Settings in the admin panel. See Runtime Override Priority below.
- A manual refund only creates a refund record and updates order status; it does not call the original payment channel. “Refund to wallet” credits the internal wallet. Returning funds through the original external payment method remains the merchant's responsibility.

## 5.14 `telegram_auth` (Optional)

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | Enable Telegram login | Enable after configuration is complete |
| `bot_username` | string | `""` | Bot username without `@` | For example, `dujiao_login_bot` |
| `bot_token` | string | `""` | Bot Token; OIDC also derives its numeric `client_id` from the token prefix | Generate with BotFather and keep secret |
| `client_secret` | string | `""` | Telegram OIDC Client Secret | Generate under Web Login in BotFather and keep secret |
| `oidc_redirect_uri` | string | `""` | Telegram OIDC browser callback page | `https://store.example.com/auth/telegram/callback` |
| `mini_app_url` | string | `""` | Telegram Mini App page URL | Keep aligned with the BotFather Web App URL |
| `login_expire_seconds` | int | `300` | Login-data validity (30-86400 seconds) | `300` |
| `replay_ttl_seconds` | int | `300` | Replay-protection lifetime (60-86400 seconds) | `300` |

With only `bot_token`, the site uses the legacy Login Widget. Supplying a valid `client_secret` and `oidc_redirect_uri` switches web login to OIDC. The callback must be a valid HTTP(S) URL and must also be added to BotFather Allowed URLs. `mini_app_url` only exposes the Mini App entry; it does not enable web login.

## 5.15 `google_auth` (Optional)

Google sign-in uses Google Identity Services and requests no Gmail read or send permissions.

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | Enable Google account sign-in | Enable after configuration is complete |
| `client_id` | string | `""` | Google OAuth 2.0 Web Client ID, not a Client Secret | Use a dedicated production client |

```yaml
google_auth:
  enabled: true
  client_id: "1234567890-xxxx.apps.googleusercontent.com"
```

Register every real access origin under **Authorized JavaScript origins** in the matching Google Cloud Web client:

- Main site: `https://shop.example.com`
- Each white-label site: `https://brand.example.net`
- Local development: `http://localhost:5173`

An origin includes the scheme and port, if any, but no path. Each main-site and white-label origin must be registered separately.

Desktop browsers and Android use popup/FedCM. iOS and iPadOS use Google Identity Services redirect `form_post`, so also register an exact **Authorized redirect URI** for every real domain:

- Main site: `https://shop.example.com/api/v1/auth/google/redirect/callback`
- White-label site: `https://brand.example.net/api/v1/auth/google/redirect/callback`

The redirect URI must exactly match the scheme, domain, port, and path seen by the browser and must stay same-origin with the frontend. The iOS/iPadOS redirect flow requires enabled, reachable Redis 7 because one-time state/handoff values are atomically consumed with `GETDEL`. Redis failure makes redirect login and binding unavailable, while desktop/Android popup login does not use that state store.

The Google Client ID is public browser configuration, not a secret. Do not add a Client Secret; this feature does not request Gmail API scopes.

## 5.16 `captcha` (Optional)

The official `config.yml.example` currently does not expand this section, but the code and admin settings fully support it. The default is `provider=none` with every scene disabled.

| Field | Default | Description |
| --- | --- | --- |
| `provider` | `none` | `none`, `image`, or `turnstile` |
| `scenes.login` | `false` | Login |
| `scenes.register_send_code` | `false` | Send a registration email code |
| `scenes.reset_send_code` | `false` | Send a password-reset email code |
| `scenes.guest_create_order` | `false` | Guest order creation |
| `scenes.gift_card_redeem` | `false` | Gift-card redemption |
| `image.length` | `5` | Image-captcha character count (4-8) |
| `image.width` / `image.height` | `240` / `80` | Image dimensions; width at least 100 and height at least 40 |
| `image.noise_count` / `image.show_line` | `2` / `2` | Noise-dot and interference-line counts |
| `image.expire_seconds` | `300` | Lifetime (30-3600 seconds) |
| `image.max_store` | `10240` | Maximum in-memory captcha entries, at least 100 |
| `turnstile.site_key` / `secret_key` | `""` | Cloudflare Turnstile keys; both are required when Turnstile is active |
| `turnstile.verify_url` | Cloudflare verification endpoint | Server-side verification URL |
| `turnstile.timeout_ms` | `2000` | Server-side verification timeout (500-10000 ms) |

Turnstile example:

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

If any `scenes.*` switch is enabled, `provider` cannot remain `none`. A captcha configuration saved in the admin panel overrides this entire section.

## 5.17 `reseller` (Optional)

| Field | Type | Default | Description | Recommendation |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | Enable reseller/white-label tenant resolution | Enable only after domain, DNS, TLS, and tenant acceptance testing |
| `main_hosts` | []string | `localhost`, `127.0.0.1`, `::1` | Hosts that are always treated as the main site | List every production main-site hostname without scheme or path |
| `trusted_forwarded_host` | bool | `false` | Prefer `X-Forwarded-Host` when resolving the tenant | Enable only when a trusted proxy overwrites the header and the backend cannot be reached directly |
| `subdomain_base` | string | `""` | Base domain used to assign system subdomains | For example, `shop.example.com`, with wildcard DNS/TLS configured first |
| `self_apply_enabled` | bool | `true` | Let regular users apply for reseller status | Follow the operating policy |
| `settlement_confirm_days` | int | `7` | Confirmation period before reseller profit becomes withdrawable | `0` is immediate; range 0-3650 |

When enabled, a request host in `main_hosts` is treated as the main site. Other hosts resolve only to active, verified reseller domains stored in the database; unknown hosts do not silently fall back to the main site. `trusted_forwarded_host` and `server.trusted_proxies` are separate trust switches: the former trusts a tenant-host header, while the latter trusts client-IP headers. See the [Reseller Guide](/en/guide/reseller) for business configuration.

## 5.18 Runtime Override Priority

The following groups can be changed in admin settings and take priority over `config.yml`:

- SMTP and email verification-code settings
- Captcha settings
- Telegram login settings
- Google login settings
- Order settings (`payment_expire_minutes` and `max_refund_days`)
- Upstream synchronization interval; after the admin value has been saved, it overrides `queue.upstream_sync_interval`

`config.yml` is the fallback only while the database has no corresponding setting. Once an admin setting has been saved, the database value remains authoritative across restarts. If editing `config.yml` has no effect, inspect the admin setting or clear the corresponding persisted value.

## 6. Environment-Variable Examples

- `APP_SECRET_KEY=...`
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
- `TELEGRAM_AUTH_OIDC_REDIRECT_URI=https://shop.example.com/auth/telegram/callback` (keep the matching empty YAML key; the official example includes it)
- `RESELLER_ENABLED=true`

Rule: `.` in the configuration key is converted to `_`. An environment override is reliable only for keys known through built-in defaults or the loaded YAML. An environment-driven deployment should therefore retain a minimal YAML file containing the empty official-example keys such as `telegram_auth.client_secret`, `telegram_auth.oidc_redirect_uri`, and `telegram_auth.mini_app_url`. Lists and maps are also less predictable to express as environment variables, so keep values such as `trusted_proxies`, `allowed_origins`, and `queues` in YAML.

## 7. Troubleshooting

- `database is locked`
  - Keep SQLite `max_open_conns` at `1` and include `_busy_timeout` in the DSN.
- `pq: sorry, too many clients already`
  - Lower `max_open_conns` or raise PostgreSQL `max_connections` with an appropriate capacity plan.
- Order timestamps and log timestamps disagree
  - Check the PostgreSQL DSN `TimeZone` and the host timezone.
- Redis/queue is reachable but email is not delivered
  - Check `queue.enabled`, queue Redis connectivity, and whether a Worker is running.
- Orders remain pending and never expire
  - Check whether the service runs only in `-mode api`, or whether queue/Redis is unavailable and timeout tasks are not consumed.
- Startup exits because runtime secrets are weak, duplicated, or still use defaults
  - Regenerate `app.secret_key`, `jwt.secret`, and `user_jwt.secret` separately; make each at least 32 characters and ensure all three differ.
- Every client IP appears as the reverse proxy, or client IPs can be spoofed
  - Correct `server.trusted_proxies`; list only real proxy IPs/CIDRs and never trust all networks.
- Editing the file does not change email, login, captcha, order, or upstream-sync behavior
  - Check the persisted admin settings, which have higher priority than `config.yml`.

## 8. Pre-Deployment Checklist

- [ ] `server.mode=release`
- [ ] `app.secret_key`, `jwt.secret`, and `user_jwt.secret` are three different high-entropy values, and `app.secret_key` is safely backed up
- [ ] `server.trusted_proxies` contains only real proxy addresses/networks, or is an empty list when no proxy is used
- [ ] The database driver and DSN match the environment
- [ ] Connection-pool limits match database capacity
- [ ] Redis and the queue are reachable when enabled
- [ ] When using the default `all` mode, `queue.enabled=true` and queue Redis is reachable
- [ ] When intentionally disabling the queue, the service starts with `-mode api` and the reduced asynchronous capability is understood
- [ ] `web.admin_path` no longer uses the default `/admin`
- [ ] CORS is restricted to actual business origins
- [ ] Email has passed a real delivery test when enabled
- [ ] If Telegram OIDC is enabled, BotFather Allowed URLs, `client_secret`, and the callback have passed a real login test
- [ ] If reseller mode is enabled, `main_hosts`, `subdomain_base`, DNS/TLS, and the proxy Host trust boundary have passed acceptance testing
