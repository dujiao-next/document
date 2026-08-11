# `config.yml` 详细解释与推荐配置

> 更新时间：2026-08-11
>
> 适用范围：当前 `dujiao-next` 主分支；字段与默认值以 `internal/config/config.go` 为准。

## 1. 配置加载规则

后端启动时按以下顺序取值：

1. 使用系统默认值（代码内置默认）
2. 读取 `config.yml`
3. 读取环境变量覆盖（例如 `server.port` ⇢ `SERVER_PORT`）

程序依次在当前目录、上一级目录和 `./etc` 中查找 `config.yml`。文件不存在或读取失败时会记录警告，并继续使用环境变量和代码默认值；但如果没有通过环境变量提供三个有效运行时密钥，后续安全校验仍会终止启动。生产部署建议保留一份受权限保护、纳入备份的配置文件。

除 `bootstrap` 的 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD` 外，环境变量名通常由完整配置键转为大写并把 `.` 替换成 `_`。例如 `app.secret_key` 对应 `APP_SECRET_KEY`。

## 2. 先看结论：数据库选型建议

- **开发环境**：优先 `sqlite`（部署简单、零依赖）
- **生产环境**：优先 `postgres`（并发、可靠性、可观测性更好）

如果你使用 `sqlite` 上生产，必须接受：

- 写并发能力较弱
- 单机/单盘强绑定
- 横向扩容与高可用能力受限

## 3. 配置模板

启动前先执行三次下面的命令，并把三次不同的输出分别填入 `app.secret_key`、`jwt.secret` 和 `user_jwt.secret`：

```bash
openssl rand -hex 32
```

三个运行时密钥必须彼此不同。默认值、已知占位值、少于 32 个字符或相互重复都会使服务拒绝启动，因此下面模板中的尖括号内容不能原样保留。

## 3.1 Demo A：本地开发（SQLite）

适用场景：单机开发、低并发测试。

```yaml
app:
  secret_key: "<第 1 个 openssl 输出>"

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
  secret: "<第 2 个 openssl 输出>"
  expire_hours: 24

user_jwt:
  secret: "<第 3 个 openssl 输出>"
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
app:
  secret_key: "<第 1 个 openssl 输出>"

server:
  host: 0.0.0.0
  port: 8080
  mode: release
  # 下面仅适用于反向代理与服务运行在同一台主机
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
  secret: "<第 2 个 openssl 输出>"
  expire_hours: 24

user_jwt:
  secret: "<第 3 个 openssl 输出>"
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
| `secret_key` | string | `change-me-32-byte-secret-key!!` | AES-256 加密根密钥，用于保护支付密钥、Bot Token 等敏感数据 | **使用 `openssl rand -hex 32` 单独生成** |
| `totp_issuer` | string | `Dujiao-Next` | 管理员和用户 2FA 验证器中显示的发行方名称 | 使用稳定的站点名称，避免 `&` 等特殊字符 |

`app.secret_key` 部署后不可随意更换，否则数据库中已加密的数据将无法解密。它必须与两个 JWT 密钥不同，并与数据库一起备份。

## 5.1 `server`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `host` | string | `0.0.0.0` | 监听地址 | `0.0.0.0` |
| `port` | string | `8080` | 服务端口 | `8080` |
| `mode` | string | `debug` | 运行模式：`debug`/`release` | 生产用 `release` |
| `trusted_proxies` | []string | `127.0.0.1/32`、`::1/128` | Gin 可以信任并从其转发头解析客户端 IP 的代理 IP/CIDR | 只列出真实反向代理；无代理时设为 `[]` |

`trusted_proxies` 留空表示完全不信任转发头，直接使用 TCP 来源地址。Docker、负载均衡器或 CDN 部署必须填写真实代理网段；`0.0.0.0/0` 和 `::/0` 会信任任意来源，程序会直接拒绝。该字段只控制客户端 IP 解析，不等同于 `reseller.trusted_forwarded_host`。

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
| `jwt.secret` | string | `change-me-in-production` | 管理员 Token 签名密钥 | 使用 `openssl rand -hex 32` 单独生成 |
| `jwt.expire_hours` | int | `24` | 管理员 Token 过期时间（小时） | `24` |
| `user_jwt.secret` | string | `user-change-me-in-production` | 用户 Token 签名密钥 | 使用 `openssl rand -hex 32` 单独生成 |
| `user_jwt.expire_hours` | int | `24` | 普通用户 Token 过期时间（小时） | `24` |
| `user_jwt.remember_me_expire_hours` | int | `168` | “记住我”用户 Token 过期时间 | `168`（7 天） |

`app.secret_key`、`jwt.secret`、`user_jwt.secret` 只要有一个过弱、仍是已知占位值或与另一个重复，启动就会失败。

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
| `upstream_sync_interval` | duration string | `5m`（业务兜底） | 上游商品库存定时同步间隔 | 使用 Go duration，如 `5m`、`1h` |

提示：如果 `queue.enabled=true` 但 Redis 不可达，异步任务（如邮件）会失败或堆积。

补充：

- 默认启动模式是 `all`（API + Worker）。
- 当 `queue.enabled=false` 时，请使用 `-mode api` 启动；否则 Worker 无法初始化。
- 后台“上游同步”设置一旦保存，会覆盖 `upstream_sync_interval`；后台允许的有效范围为 5～1440 分钟。

## 5.7 `upload`

| 字段 | 类型 | 代码默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `max_size` | int64 | `10485760` | 上传大小上限（字节） | 10MB 或按业务收紧 |
| `allowed_types` | []string | JPEG、PNG、GIF、WebP | 允许的 MIME | 仅保留必要类型 |
| `allowed_extensions` | []string | `.jpg`、`.jpeg`、`.png`、`.gif`、`.webp` | 允许的扩展名 | 与 MIME 对齐 |
| `max_width` / `max_height` | int | `4096` | 位图宽高上限 | `4096` |

官方 `config.yml.example` 额外启用了 SVG（`image/svg+xml` / `.svg`）；如果业务不需要 SVG，建议从允许列表移除。

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

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `allowed_origins` | []string | `["*"]` | 允许来源 | 生产只列真实 Origin |
| `allowed_methods` | []string | GET、POST、PUT、DELETE、OPTIONS、PATCH | 允许方法 | 保持最小集 |
| `allowed_headers` | []string | 见 `config.yml.example` | 允许请求头 | 按业务保留 |
| `allow_credentials` | bool | `true` | 是否允许携带凭证 | 与前端策略匹配 |
| `max_age` | int | `600` | 预检缓存秒数 | `600` |

补充：

- 当前实现中，当 `allow_credentials=true` 且列表包含 `*` 时，服务会把任意请求的 `Origin` 原样回显。这等价于允许所有来源携带凭证，生产环境必须改为精确的协议、域名和端口列表。

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

| 字段 | 类型 | 代码默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否启用邮件 | 完成发信测试后开启 |
| `host` | string | `""` | SMTP 主机 | 按服务商配置 |
| `port` | int | `587` | SMTP 端口 | STARTTLS 常用 587，SSL 常用 465 |
| `username` / `password` | string | `""` | SMTP 账号与密码/授权码 | 使用独立授权码 |
| `from` / `from_name` | string | `""` | 发件地址与发件人名称 | 使用可验证的企业域名邮箱 |
| `use_tls` | bool | `true` | 使用 STARTTLS | 与 `use_ssl` 只能开启一个 |
| `use_ssl` | bool | `false` | 连接时直接使用 TLS | 与 `use_tls` 只能开启一个 |
| `verify_code.expire_minutes` | int | `10` | 验证码有效期（分钟） | `10` |
| `verify_code.send_interval_seconds` | int | `60` | 同一目标最短发送间隔（秒） | `60` |
| `verify_code.max_attempts` | int | `5` | 最大校验尝试次数 | `5` |
| `verify_code.length` | int | `6` | 数字验证码长度（4～10） | `6` |

官方示例使用 465/SSL 并带占位 SMTP 信息；这不是代码默认值，必须按邮件服务商要求选择 TLS 或 SSL。

## 5.12 `bootstrap`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `default_admin_username` | string | `""` | 首次初始化管理员用户名 | 显式设置自己的管理员账号 |
| `default_admin_password` | string | `""` | 首次初始化管理员密码 | 设置符合 `security.password_policy` 的强密码 |

补充：

- 仅当数据库 `admins` 表为空时，首次启动才会尝试创建默认管理员。
- 优先级：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`（环境变量） > `bootstrap.default_admin_username` / `bootstrap.default_admin_password`（`config.yml`） > 系统默认值。
- 若运行在 `release` 模式且环境变量与 `config.yml` 都未提供管理员密码，系统会跳过默认管理员初始化。
- `release` 模式下，已知默认密码或不符合当前密码策略的密码会使启动失败；非 `release` 模式会记录警告。

## 5.13 `order`

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `payment_expire_minutes` | int | `15` | 待支付订单超时分钟数 | `15~30` |
| `max_refund_days` | int | `30` | 管理员执行手动退款记录或退款到钱包的最长期限；从支付时间（缺失时从创建时间）起算 | 按售后政策设置；`0` 表示不限期，最大 `3650` |

补充：

- 两个字段都可能被后台“订单设置”覆盖（见下方“运行时覆盖优先级”）。
- 手动退款只写退款记录并更新订单状态，不会调用原支付渠道；“退款到钱包”会把金额计入站内钱包。若需退回原外部支付方式，仍由商户自行处理。

## 5.14 `telegram_auth`（可选）

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否启用 Telegram 登录 | 配置完成后开启 |
| `bot_username` | string | `""` | Bot 用户名（不带 `@`） | 例如 `dujiao_login_bot` |
| `bot_token` | string | `""` | Bot Token；OIDC 也会从其数字前缀解析 `client_id` | 由 BotFather 生成并保密 |
| `client_secret` | string | `""` | Telegram OIDC Client Secret | 在 BotFather 的 Web Login 中生成并保密 |
| `oidc_redirect_uri` | string | `""` | Telegram OIDC 回调页面 | `https://商城域名/auth/telegram/callback` |
| `mini_app_url` | string | `""` | Telegram Mini App 页面地址 | 与 BotFather Web App URL 保持一致 |
| `login_expire_seconds` | int | `300` | 登录数据有效期（30～86400 秒） | `300` |
| `replay_ttl_seconds` | int | `300` | 重放保护时长（60～86400 秒） | `300` |

只填写 `bot_token` 时使用旧版 Login Widget；同时填写有效的 `client_secret` 和 `oidc_redirect_uri` 后切换到新版 OIDC。OIDC 回调地址必须是合法的 HTTP(S) URL，并同时加入 BotFather 的 Allowed URLs。`mini_app_url` 只控制 Mini App 入口，不会开启网页登录。

## 5.15 `google_auth`（可选）

Google 账号一键登录使用 Google Identity Services，不会申请 Gmail 邮件读取、发送等权限。

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否启用 Google 账号登录 | 配置完成后开启 |
| `client_id` | string | `""` | Google OAuth 2.0 Web Client ID（不是 Client Secret） | 使用独立的生产环境客户端 |

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

当前官方 `config.yml.example` 没有展开此段，但代码和后台设置均已完整支持。默认 `provider=none` 且所有场景关闭。

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `provider` | `none` | `none`、`image` 或 `turnstile` |
| `scenes.login` | `false` | 登录 |
| `scenes.register_send_code` | `false` | 注册发送邮箱验证码 |
| `scenes.reset_send_code` | `false` | 重置密码发送邮箱验证码 |
| `scenes.guest_create_order` | `false` | 游客创建订单 |
| `scenes.gift_card_redeem` | `false` | 礼品卡兑换 |
| `image.length` | `5` | 图片验证码字符数（4～8） |
| `image.width` / `image.height` | `240` / `80` | 图片尺寸，宽至少 100、高至少 40 |
| `image.noise_count` / `image.show_line` | `2` / `2` | 噪点数与干扰线数 |
| `image.expire_seconds` | `300` | 有效期（30～3600 秒） |
| `image.max_store` | `10240` | 内存中最多保留的验证码数量，至少 100 |
| `turnstile.site_key` / `secret_key` | `""` | Cloudflare Turnstile 密钥；启用 Turnstile 时两者必填 |
| `turnstile.verify_url` | Cloudflare 官方校验地址 | 服务端验证地址 |
| `turnstile.timeout_ms` | `2000` | 服务端验证超时（500～10000ms） |

Turnstile 示例：

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

如果开启任一 `scenes.*`，`provider` 不能保持 `none`。后台保存的验证码设置会整体覆盖本段。

## 5.17 `reseller`（可选）

| 字段 | 类型 | 默认值 | 说明 | 推荐 |
| --- | --- | --- | --- | --- |
| `enabled` | bool | `false` | 是否启用分销商/白标租户解析 | 完成域名、DNS、TLS 和租户验收后开启 |
| `main_hosts` | []string | `localhost`、`127.0.0.1`、`::1` | 始终按主站处理的域名 | 列出全部正式主站域名，不含协议和路径 |
| `trusted_forwarded_host` | bool | `false` | 是否优先使用 `X-Forwarded-Host` 解析租户 | 仅在可信代理覆盖该请求头且后端不能被直连时开启 |
| `subdomain_base` | string | `""` | 分配系统二级域名的基础域名 | 例如 `shop.example.com`，并预先配置 wildcard DNS/TLS |
| `self_apply_enabled` | bool | `true` | 是否允许普通用户自助申请成为分销商 | 按运营策略设置 |
| `settlement_confirm_days` | int | `7` | 分销利润转为可提现前的确认天数 | `0` 表示即时，范围 0～3650 |

启用后，请求 Host 命中 `main_hosts` 时按主站处理；未命中时只解析数据库中已激活且已验证的分销域名，未知域名不会静默回落为主站。`trusted_forwarded_host` 与 `server.trusted_proxies` 是两套独立开关，前者信任租户域名头，后者信任客户端 IP 头。更多业务配置见[分销商功能说明](/guide/reseller)。

## 5.18 运行时覆盖优先级（重要）

以下配置支持在后台“设置”中动态修改，且优先级高于 `config.yml`：

- SMTP（邮件）配置
- 验证码配置
- Telegram 登录配置
- Google 登录配置
- 订单配置（`payment_expire_minutes`、`max_refund_days`）
- 上游同步间隔（后台保存后覆盖 `queue.upstream_sync_interval`）

数据库中没有对应设置时，`config.yml` 才作为兜底。后台保存过设置后，即使重启服务，数据库值仍优先；如果修改 `config.yml` 后行为没有变化，请先检查后台设置或清除对应持久化项。

## 6. 环境变量映射示例

- `APP_SECRET_KEY=...`
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
- `TELEGRAM_AUTH_OIDC_REDIRECT_URI=https://shop.example.com/auth/telegram/callback`（需保留 YAML 中对应的空键；官方示例已包含）
- `RESELLER_ENABLED=true`

规则：配置键中的 `.` 会被转换为 `_`。环境变量覆盖只对代码默认值或已加载 YAML 中可识别的键可靠生效；因此以环境变量为主的部署仍应保留最小 YAML，并包含 `telegram_auth.client_secret`、`telegram_auth.oidc_redirect_uri`、`telegram_auth.mini_app_url` 等官方示例中的空键。列表、映射等复杂值在环境变量中的解析也不如标量直观，`trusted_proxies`、`allowed_origins`、`queues` 等建议继续写在 YAML 中。

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
- 日志显示“运行时密钥过弱、重复或仍为默认值”并退出
  - 分别重新生成 `app.secret_key`、`jwt.secret`、`user_jwt.secret`，确保三者不同且每个至少 32 个字符
- 客户端 IP 都显示为反向代理地址，或可被伪造
  - 校准 `server.trusted_proxies`；只填写真实代理的 IP/CIDR，禁止信任所有网段
- 修改配置后仍使用旧的邮件、登录、验证码、订单或上游同步设置
  - 检查后台持久化设置，它们的优先级高于 `config.yml`

## 8. 部署前检查清单

- [ ] `server.mode=release`
- [ ] `app.secret_key`、`jwt.secret`、`user_jwt.secret` 已替换为三个不同的高强度随机值，并安全备份 `app.secret_key`
- [ ] `server.trusted_proxies` 只包含真实代理地址/网段；无代理时已设为空列表
- [ ] 数据库驱动与 DSN 配置符合环境（SQLite/PostgreSQL）
- [ ] 连接池参数与数据库规格匹配
- [ ] Redis/队列可用（如已启用）
- [ ] 若使用默认启动模式 `all`，请确认 `queue.enabled=true` 且队列 Redis 可达
- [ ] 若计划关闭队列，请确认使用 `-mode api` 启动，并知晓异步任务能力会受影响
- [ ] `web.admin_path` 已改掉默认值 `/admin`
- [ ] CORS 已限制到真实业务域名
- [ ] 邮件配置已做真实发信验证（如已启用）
- [ ] 若启用 Telegram OIDC，BotFather Allowed URLs、`client_secret` 与回调地址已经过真实登录验证
- [ ] 若启用分销模式，`main_hosts`、`subdomain_base`、DNS/TLS 和代理 Host 信任边界已完成验收
