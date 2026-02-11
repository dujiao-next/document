# `config.yml` 详细解释与推荐配置

> 更新时间：2026-02-11

## 1. 配置加载规则

后端启动时按以下顺序取值：

1. 读取 `config.yml`
2. 读取环境变量覆盖（例如 `server.port` ⇢ `SERVER_PORT`）

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

## 5.1 `server`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `host` | string | 监听地址 | `0.0.0.0` |
| `port` | string | 服务端口 | `8080` |
| `mode` | string | 运行模式：`debug`/`release` | 生产用 `release` |

## 5.2 `log`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `dir` | string | 日志目录；空字符串时使用运行目录下 `logs` | 生产建议显式指定 |
| `filename` | string | 日志文件名 | `app.log` |
| `max_size_mb` | int | 单文件最大 MB | `100` |
| `max_backups` | int | 保留文件数 | `7~14` |
| `max_age_days` | int | 保留天数 | `30` |
| `compress` | bool | 是否压缩归档 | `true` |

## 5.3 `database`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `driver` | string | `sqlite` 或 `postgres` | 生产建议 `postgres` |
| `dsn` | string | 数据库连接串 | 按环境配置 |
| `pool.max_open_conns` | int | 最大打开连接数 | SQLite=1；Postgres=20~100 |
| `pool.max_idle_conns` | int | 最大空闲连接数 | 5~20 或 open 的 20%~40% |
| `pool.conn_max_lifetime_seconds` | int | 连接最大生命周期（秒，0=不限制） | `900~3600` |
| `pool.conn_max_idle_time_seconds` | int | 空闲连接最大生命周期（秒，0=不限制） | `300~1200` |

## 5.4 `jwt` / `user_jwt`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `secret` | string | 签名密钥 | 至少 32 位随机字符串 |
| `expire_hours` | int | Token 过期时间（小时） | `24` |
| `remember_me_expire_hours` | int | 仅 `user_jwt` 使用，记住我过期时间 | `168` |

## 5.5 `redis`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用 Redis | 生产建议 `true` |
| `host`/`port` | string/int | Redis 地址 | 按环境设置 |
| `password` | string | Redis 密码 | 生产必须设置 |
| `db` | int | DB 索引 | `0` |
| `prefix` | string | 键前缀 | `dj` 或自定义 |

## 5.6 `queue`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用异步队列 | 建议 `true` |
| `host`/`port` | string/int | 队列 Redis 地址 | 可与 `redis` 共用不同 DB |
| `password` | string | Redis 密码 | 生产必须设置 |
| `db` | int | 队列 DB 索引 | 默认 `1` |
| `concurrency` | int | Worker 并发数 | 5~20 |
| `queues` | map[string]int | 队列权重 | `default:10`, `critical:5` |

提示：如果 `queue.enabled=true` 但 Redis 不可达，异步任务（如邮件）会失败或堆积。

## 5.7 `upload`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `max_size` | int64 | 上传大小上限（字节） | `10485760`（10MB） |
| `allowed_types` | []string | 允许 MIME | 仅必要类型 |
| `allowed_extensions` | []string | 允许后缀 | 与 MIME 对齐 |
| `max_width` / `max_height` | int | 图片尺寸上限 | `4096` |

## 5.8 `cors`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `allowed_origins` | []string | 允许来源 | 生产不要用 `*` |
| `allowed_methods` | []string | 允许方法 | 保持最小集 |
| `allowed_headers` | []string | 允许请求头 | 按业务保留 |
| `allow_credentials` | bool | 是否允许携带凭证 | 与前端策略匹配 |
| `max_age` | int | 预检缓存秒数 | `600` |

## 5.9 `security`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `login_rate_limit.window_seconds` | int | 限流窗口（秒） | `300` |
| `login_rate_limit.max_attempts` | int | 最大尝试次数 | `5` |
| `login_rate_limit.block_seconds` | int | 超限封禁时长（秒） | `900` |
| `password_policy.*` | mixed | 密码复杂度策略 | 按企业要求提升 |

## 5.10 `email`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `enabled` | bool | 是否启用邮件 | 按需开启 |
| `host`/`port` | string/int | SMTP 地址 | 按服务商配置 |
| `username`/`password` | string | SMTP 账号密码/授权码 | 使用授权码 |
| `from`/`from_name` | string | 发件地址与发件人名 | 使用企业域名邮箱 |
| `use_tls`/`use_ssl` | bool | 传输安全策略 | 二选一，按服务商文档 |
| `verify_code.*` | mixed | 验证码有效期、频率、长度 | 常用默认值 |

## 5.11 `order`

| 字段 | 类型 | 说明 | 推荐 |
| --- | --- | --- | --- |
| `payment_expire_minutes` | int | 待支付订单超时分钟数 | `15~30` |

## 5.12 `captcha`（可选）

`config.yml.example` 可能未完整展示该段，但系统已支持。

- `provider`: `none` / `image` / `turnstile`
- `scenes`:
  - `login`
  - `register_send_code`
  - `reset_send_code`
  - `guest_create_order`
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
  turnstile:
    site_key: "<your-site-key>"
    secret_key: "<your-secret-key>"
    verify_url: "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    timeout_ms: 2000
```

## 6. 环境变量映射示例

- `SERVER_MODE=release`
- `DATABASE_DSN=host=127.0.0.1 ...`
- `JWT_SECRET=...`
- `USER_JWT_SECRET=...`
- `REDIS_HOST=127.0.0.1`

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

## 8. 部署前检查清单

- [ ] `server.mode=release`
- [ ] `jwt.secret` 与 `user_jwt.secret` 已替换为高强度随机值
- [ ] 数据库驱动与 DSN 配置符合环境（SQLite/PostgreSQL）
- [ ] 连接池参数与数据库规格匹配
- [ ] Redis/队列可用（如已启用）
- [ ] CORS 已限制到真实业务域名
- [ ] 邮件配置已做真实发信验证（如已启用）
