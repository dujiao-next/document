# `config.yml` 详细解释与推荐配置

> 更新时间：2026-03-28

## 1. 配置加载规则

后端启动时按以下顺序取值：

1. 使用系统默认值（代码内置默认）
2. 读取 `config.yml`
3. 读取环境变量覆盖（例如 `server.port` ⇢ `SERVER_PORT`）

## 2. 先看结论：数据库选型建议

- **开发环境**：优先 `sqlite`（部署简单、零依赖）
- **生产环境**：优先 `postgres`（并发、可靠性、可观测性更好）

如果你使用 `sqlite` 上生产，必须接受：

- 写并发能力较弱
- 单机/单盘强绑定
- 横向扩容与高可用能力受限

## 3. 可直接复制的 Demo 配置

## 3.1 Demo A：本地开发（SQLite）

适用场景：单机开发、低并发测试。

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

SQLite 重点提醒：

- `max_open_conns` **建议固定为 1**，否则高并发写入时容易出现 `database is locked`
- `_journal_mode=WAL` 可提升读写并发体验（单机下常用）
- 不建议把 SQLite 数据文件放在不稳定网络盘（可能导致锁异常）

## 3.2 Demo B：生产环境（PostgreSQL）

适用场景：正式业务、可预期并发流量。

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

PostgreSQL 重点提醒：

- `max_open_conns` 不要超过 PostgreSQL 的 `max_connections` 预算
- 建议预留连接给 DBA/监控/迁移任务，避免业务把连接池吃满
- 建议设置 `conn_max_lifetime_seconds`，避免长期连接被中间网络设备回收后出现偶发错误
- `TimeZone` 建议显式配置，避免订单时间与日志时间错位

## 3.3 Demo C：小流量生产（PostgreSQL 低资源）

适用场景：轻量业务、低配置云主机。

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

## 4. 连接池参数如何调

以下建议适用于当前项目（API + 后台操作 + 支付回调）的一般场景。

- `max_open_conns`
  - 含义：最大同时打开连接数
  - SQLite 推荐：`1`
  - PostgreSQL 推荐：`20~100`（按业务量和 DB 规格调整）
- `max_idle_conns`
  - 含义：连接池内保留的空闲连接数
  - 建议：通常设为 `max_open_conns` 的 `20%~40%`
- `conn_max_lifetime_seconds`
  - 含义：单连接最大生存时间
  - 建议：`900~3600`；`0` 表示不限制
- `conn_max_idle_time_seconds`
  - 含义：空闲连接最大空闲时间
  - 建议：`300~1200`；`0` 表示不限制

常见错误搭配：

- `max_idle_conns > max_open_conns`（无意义且易误导）
- PostgreSQL 把 `max_open_conns` 拉太高，导致 `too many clients`
- SQLite 将 `max_open_conns` 设置为多连接，导致锁冲突增多

## 5. 分组字段说明

## 5.0 `app`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `secret_key` | string | `change-me-32-byte-secret-key!!` | AES-256 加密密钥，用于加密支付密钥、Bot Token 等敏感数据 | **必须修改为随机 32 字节字符串** |

> 此密钥部署后不可随意更换，否则已加密数据将无法解密。

## 5.1 `server`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | 监听地址 | `0.0.0.0` |
| `port` | string | `8080` | 服务端口 | `8080` |
| `mode` | string | `debug` | 运行模式：`debug`/`release` | 生产用 `release` |

## 5.2 `log`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `dir` | string | `""` | 日志目录；空字符串时使用运行目录下 `logs` | 生产建议显式指定 |
| `filename` | string | `app.log` | 日志文件名 | `app.log` |
| `max_size_mb` | int | `100` | 单文件最大 MB | `100` |
| `max_backups` | int | `7` | 保留文件数 | `7~14` |
| `max_age_days` | int | `30` | 保留天数 | `30` |
| `compress` | bool | `true` | 是否压缩归档 | `true` |

## 5.3 `database`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `driver` | string | `sqlite` | `sqlite` 或 `postgres` | 生产建议 `postgres` |
| `dsn` | string | `./db/dujiao.db` | 数据库连接串 | 按环境配置 |
| `pool.max_open_conns` | int | `1` | 最大打开连接数 | SQLite=1；Postgres=20~100 |
| `pool.max_idle_conns` | int | `1` | 最大空闲连接数 | 5~20 或 open 的 20%~40% |
| `pool.conn_max_lifetime_seconds` | int | `0` | 连接最大生命周期（秒，0=不限制） | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | `0` | 空闲连接最大生命周期（秒，0=不限制） | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `secret` | string | `change-me-in-production` | 签名密钥 | 至少 32 位随机字符串 |
| `expire_hours` | int | `24` | Token 过期时间（小时） | `24` |
| `remember_me_expire_hours` | int | `168` | 仅 `user_jwt` 使用，记住我过期时间 | `168`（7 天） |

## 5.5 `redis`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否启用 Redis | 生产建议 `true` |
| `host` | string | `127.0.0.1` | Redis 地址 | 按环境设置 |
| `port` | int | `6379` | Redis 端口 | `6379` |
| `password` | string | `""` | Redis 密码 | 生产必须设置 |
| `db` | int | `0` | DB 索引 | `0` |
| `prefix` | string | `dj` | 键前缀 | `dj` 或自定义 |

## 5.6 `queue`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `true` | 是否启用异步队列 | 建议 `true` |
| `host` | string | `127.0.0.1` | 队列 Redis 地址 | 可与 `redis` 共用不同 DB |
| `port` | int | `6379` | 队列 Redis 端口 | `6379` |
| `password` | string | `""` | Redis 密码 | 生产必须设置 |
| `db` | int | `1` | 队列 DB 索引 | `1` |
| `concurrency` | int | `10` | Worker 并发数 | 5~20 |
| `queues` | map | `default:10, critical:5` | 队列名称与权重 | 按需调整 |

提示：如果 `queue.enabled=true` 但 Redis 不可达，异步任务（如邮件）会失败或堆积。

补充：

- 默认启动模式是 `all`（API + Worker）。
- 当 `queue.enabled=false` 时，请使用 `-mode api` 启动；否则 Worker 无法初始化。

## 5.7 `upload`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `max_size` | int64 | 上传大小上限（字节） | `10485760`（10MB） |
| `allowed_types` | []string | 允许 MIME | 仅必要类型 |
| `allowed_extensions` | []string | 允许后缀 | 与 MIME 对齐 |
| `max_width` / `max_height` | int | 图片尺寸上限 | `4096` |

## 5.8 `web`

控制内嵌前端的挂载方式。自 v1.4.0 起用户前台与管理后台已 embed 进二进制，这一段决定后台入口路径。

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `admin_path` | string | `/admin` | 管理后台的路径前缀 | **改成不易猜测的字符串** |

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"
```

补充：

- 必须以 `/` 开头、不能以 `/` 结尾，且不能是 `/`。
- 每一段只能由字母、数字和 `-` `.` `_` `~` `@` 组成，且不能是 `.` 或 `..`。冒号和星号是 Gin 的路由元字符（`/:tenant`、`/*admin`），会让后台吞掉用户前台的路径或直接启动失败，因此一律拒绝。
- 不能与 `/api`、`/uploads`、`/health` 冲突或互为前缀，否则启动时会直接报错退出。
- 校验在数据库初始化之前完成：配置不合法会干净地退出，不会留下「已迁移但起不来」的状态。
- 改动后必须重启进程：该路径在启动时被一次性写进后台页面的 `<base href>`。
- 用户前台固定挂在 `/`，不可配置。
- 这个路径只是后台入口的「门牌」，不构成鉴权边界 —— 接口安全由 JWT + 限流保证，
  改路径的意义是过滤自动化扫描噪音。
- 若二进制不含内嵌前端（自行 `go build` 未加 `-tags fullstack`），本段不生效。

## 5.9 `cors`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `allowed_origins` | []string | 允许来源 | 生产不要用 `*` |
| `allowed_methods` | []string | 允许方法 | 保持最小集 |
| `allowed_headers` | []string | 允许请求头 | 按业务保留 |
| `allow_credentials` | bool | 是否允许携带凭证 | 与前端策略匹配 |
| `max_age` | int | 预检缓存秒数 | `600` |

补充：

- 浏览器限制：当 `allow_credentials=true` 时，`allowed_origins` 不能包含 `*`。

## 5.10 `security`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | `300` | 限流检测窗口（秒） | `300` |
| `login_rate_limit.max_attempts` | int | `5` | 窗口内最大失败次数 | `5` |
| `login_rate_limit.block_seconds` | int | `900` | 超限封禁时长（秒） | `900` |
| `password_policy.min_length` | int | `8` | 密码最短长度 | `8` 或更高 |
| `password_policy.require_upper` | bool | `true` | 是否要求大写字母 | `true` |
| `password_policy.require_lower` | bool | `true` | 是否要求小写字母 | `true` |
| `password_policy.require_number` | bool | `true` | 是否要求数字 | `true` |
| `password_policy.require_special` | bool | `false` | 是否要求特殊字符 | 按需开启 |

## 5.11 `email`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用邮件 | 按需开启 |
| `host`/`port` | string/int | SMTP 地址 | 按服务商配置 |
| `username`/`password` | string | SMTP 账号密码/授权码 | 使用授权码 |
| `from`/`from_name` | string | 发件地址与发件人名 | 使用企业域名邮箱 |
| `use_tls`/`use_ssl` | bool | 传输安全策略 | 二选一，按服务商文档 |
| `verify_code.*` | mixed | 验证码有效期、频率、长度 | 常用默认值 |

## 5.12 `bootstrap`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `default_admin_username` | string | 首次初始化管理员用户名 | 建议显式设置为你自己的管理员账号 |
| `default_admin_password` | string | 首次初始化管理员密码 | 建议设置强密码 |

补充：

- 仅当数据库 `admins` 表为空时，首次启动才会尝试创建默认管理员。
- 优先级：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`（环境变量） > `bootstrap.default_admin_username` / `bootstrap.default_admin_password`（`config.yml`） > 系统默认值。
- 若运行在 `release` 模式且环境变量与 `config.yml` 都未提供管理员密码，系统会跳过默认管理员初始化。

## 5.13 `order`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | 待支付订单超时分钟数 | `15~30` |

补充：

- 实际生效值可能会被后台系统设置覆盖（见下方“运行时覆盖优先级”）。

## 5.14 `telegram_auth`（可选）

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用 Telegram 登录 | 按需开启 |
| `bot_username` | string | Bot 用户名（不带 `@`） | 例如 `dujiao_login_bot` |
| `bot_token` | string | Bot Token | 由 BotFather 生成 |
| `login_expire_seconds` | int | 登录有效期（秒） | `300` |
| `replay_ttl_seconds` | int | 重放保护时长（秒） | `300` |

## 5.15 `google_auth`（可选）

Google 账号一键登录使用 Google Identity Services，不会申请 Gmail 邮件读取、发送等权限。

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用 Google 账号登录 | 配置完成后开启 |
| `client_id` | string | Google OAuth 2.0 Web Client ID（不是 Client Secret） | 使用独立的生产环境客户端 |

示例：

```yaml
google_auth:
  enabled: true
  client_id: "1234567890-xxxx.apps.googleusercontent.com"
```

还需要在 Google Cloud Console 对应 Web 客户端的 **Authorized JavaScript origins** 中登记所有实际访问来源，例如：

- 主站：`https://shop.example.com`
- 每个白标站点：`https://brand.example.net`
- 本地开发：`http://localhost:5173`

来源必须包含协议和端口（若有），但不包含路径。主站和每个白标站点必须分别登记，不能只登记主站。

桌面浏览器与 Android 使用 popup/FedCM；iOS/iPadOS 使用 Google Identity Services 的 redirect `form_post`。因此还必须为每个实际域名精确登记对应的 **Authorized redirect URI**：

- 主站：`https://shop.example.com/api/v1/auth/google/redirect/callback`
- 白标站点：`https://brand.example.net/api/v1/auth/google/redirect/callback`

redirect URI 必须与浏览器实际访问的协议、域名、端口和路径完全一致，并与前台保持同源。iOS/iPadOS redirect 流程依赖已启用且可用的 Redis 7，以 `GETDEL` 原子消费一次性 state/handoff；Redis 不可用时 redirect 登录和绑定会返回服务不可用，但桌面/Android 的 popup 登录不依赖该状态存储。

Google Client ID 会通过公开配置下发到浏览器，不属于密钥。禁止把 Client Secret 写入该配置；本功能也不申请 Gmail API scope。

## 5.16 `captcha`（可选）

`config.yml.example` 可能未完整展示该段，但系统已支持。

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
  - `gift_card_redeem`
- `image`: 图片验证码参数
- `turnstile`: Cloudflare Turnstile 参数

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

## 5.17 运行时覆盖优先级（重要）

以下配置支持在后台“设置”中动态修改，且优先级高于 `config.yml`：

- SMTP（邮件）配置
- 验证码配置
- Telegram 登录配置
- Google 登录配置
- 订单支付超时分钟数（`payment_expire_minutes`）

如果你修改了 `config.yml` 但页面行为没有变化，请优先检查后台对应设置项。

## 6. 环境变量映射示例

- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `WEB_ADMIN_PATH=/dj-mgmt-7x9k2`
- `DJ_DEFAULT_ADMIN_USERNAME=admin`
- `DJ_DEFAULT_ADMIN_PASSWORD=<你的强密码>`
- `REDIS_HOST=127.0.0.1`
- `CAPTCHA_TURNSTILE_SITE_KEY=...`
- `TELEGRAM_AUTH_ENABLED=true`

规则：配置键中的 `.` 会被转换为 `_`。

## 7. 常见故障与排查

- `database is locked`
  - 常见于 SQLite 多并发写入
  - 检查 `max_open_conns` 是否为 `1`，并确认 DSN 已设置 `_busy_timeout`
- `pq: sorry, too many clients already`
  - PostgreSQL 连接数耗尽
  - 下调 `max_open_conns`，或提升数据库 `max_connections`
- 时间显示错乱（订单时间与日志时间不一致）
  - 检查 PostgreSQL DSN 的 `TimeZone` 与系统时区
- Redis/队列可用但邮件未发送
  - 检查 `queue.enabled`、Redis 连通性、worker 是否启动
- 订单长期停留在“待支付”，不自动过期
  - 检查是否以 `-mode api` 单独启动，或 `queue.enabled`/Redis 不可用导致超时任务未消费

## 8. 部署前检查清单

- [ ] `server.mode=release`
- [ ] `jwt.secret` 与 `user_jwt.secret` 已替换为高强度随机值
- [ ] 数据库驱动与 DSN 配置符合环境（SQLite/PostgreSQL）
- [ ] 连接池参数与数据库规格匹配
- [ ] Redis/队列可用（如已启用）
- [ ] 若使用默认启动模式 `all`，请确认 `queue.enabled=true` 且队列 Redis 可达
- [ ] 若计划关闭队列，请确认使用 `-mode api` 启动，并知晓异步任务能力会受影响
- [ ] `web.admin_path` 已改掉默认值 `/admin`
- [ ] CORS 已限制到真实业务域名
- [ ] 邮件配置已做真实发信验证（如已启用）
