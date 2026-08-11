---
outline: deep
---

# 常见问题（FAQ）

> 更新时间：2026-03-28

---

## 1. 部署与启动

### Q：启动时提示端口被占用

检查 `config.yml` 中的 `server.port`（默认 8080）是否被其他进程占用：

```bash
lsof -i :8080
```

修改端口或停止占用进程后重新启动。

### Q：Docker 容器启动后无法访问

1. 确认容器正在运行：`docker compose ps`
2. 检查端口映射是否正确
3. 查看容器日志：`docker compose logs -f dujiao-next`
4. 确认防火墙是否放行了对应端口

### Q：首次启动后管理员账号是什么

在 `config.yml` 的 `bootstrap` 节点配置初始管理员：

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: your-password
```

首次启动时系统自动创建该账号。如果已启动过，修改此配置不会生效，需要通过数据库手动修改。

---

## 2. 数据库

### Q：SQLite 并发写入报错 "database is locked"

SQLite 不支持并发写入。解决方案：

1. **连接池设为 1**（推荐）：
   ```yaml
   database:
     driver: sqlite
     pool:
       max_open_conns: 1
       max_idle_conns: 1
   ```
2. 如果并发量较高，建议切换到 PostgreSQL

### Q：如何从 SQLite 迁移到 PostgreSQL

1. 导出 SQLite 数据
2. 修改 `config.yml` 中的数据库配置：
   ```yaml
   database:
     driver: postgres
     dsn: "host=127.0.0.1 user=dujiao password=xxx dbname=dujiao port=5432 sslmode=disable"
   ```
3. 重启服务，系统会自动创建表结构
4. 导入数据到 PostgreSQL

> 建议在站点流量较大时尽早迁移到 PostgreSQL。

### Q：PostgreSQL 连接池该怎么配

推荐配置：

```yaml
database:
  driver: postgres
  pool:
    max_open_conns: 25
    max_idle_conns: 10
    conn_max_lifetime_seconds: 3600
    conn_max_idle_time_seconds: 600
```

根据实际并发量调整 `max_open_conns`。

---

## 3. Redis

### Q：Redis 连接失败

1. 确认 Redis 服务正在运行：`redis-cli ping`
2. 检查 `config.yml` 中的 Redis 地址、端口和密码
3. 如果使用 Docker，确认网络互通
4. 检查 Redis 是否设置了 `requirepass`，密码是否匹配

### Q：可以不用 Redis 吗

Redis 用于缓存和异步任务队列。可以在 `config.yml` 中关闭：

```yaml
redis:
  enabled: false
queue:
  enabled: false
```

> 关闭后以下功能将不可用：登录限流、自动发卡（异步）、订单超时取消（异步）、通知推送（异步）、分销佣金确认（定时）、上游库存同步（定时）。建议生产环境保持开启。

---

## 4. 支付相关

### Q：用户支付成功，但订单状态没有更新

按以下顺序排查：

1. **回调地址**：确认支付渠道配置的 `notify_url` / `callback_url` 是否正确
2. **公网可达**：确认回调地址可被支付平台访问（不能是 localhost）
3. **HTTPS**：部分支付平台要求回调地址为 HTTPS
4. **支付平台日志**：在支付平台后台查看回调发送记录和返回状态
5. **应用日志**：查看后端日志中是否有回调请求和处理错误

### Q：支付页面/二维码无法打开

1. 检查支付渠道的商户参数是否填写正确
2. 检查网关地址（gateway_url）是否正确
3. 确认支付渠道已启用
4. 查看后端日志中的具体错误信息

### Q：PayPal / Stripe Webhook 不生效

1. 确认 Webhook URL 带上了 `channel_id` 参数：
   - PayPal：`/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`
   - Stripe：`/api/v1/payments/webhook/stripe?channel_id=你的渠道ID`
2. 确认在支付平台后台正确配置了 Webhook URL
3. 确认 `webhook_id`（PayPal）或 `webhook_secret`（Stripe）已填写

---

## 5. 邮件

### Q：邮件发送失败

1. 先检查后台邮件设置是否已启用；数据库中的后台设置优先于 `config.yml`，未保存过后台设置时才回退到 `email.enabled`
2. 检查 SMTP 配置是否正确（host、port、username、password）
3. 确认 SSL/TLS 设置与邮件服务商要求一致：
   - 端口 465 通常使用 `use_ssl: true`
   - 端口 587 通常使用 `use_tls: true`
4. 后台「设置 → SMTP 邮件」中点击「发送测试邮件」验证
5. 检查发件人地址（from）是否与邮箱账号匹配

### Q：验证码邮件收不到

1. 检查邮件是否进入了垃圾邮件文件夹
2. 确认发送间隔（`send_interval_seconds`，默认 60 秒）是否已过
3. 确认发送次数未超限（`max_attempts`，默认 5 次）
4. 查看后端日志确认邮件是否发送成功

---

## 6. 卡密与交付

### Q：自动交付失败，提示库存不足

1. 后台检查对应商品/SKU 的可用卡密数量
2. 如果卡密不足，补充导入卡密后在订单中手动触发交付
3. 建议开启库存预警通知，提前补充卡密

### Q：CSV 导入卡密报错

1. 确认 CSV 文件包含 `secret` 列头（不区分大小写）
2. 确认文件编码为 UTF-8
3. 确认每行只有一条卡密内容
4. 检查是否有空行或格式错误

---

## 7. 前端

### Q：前台访问报 API 错误

1. 开发环境确认后端服务正在运行（默认 localhost:8080）
2. 确认 Vite 开发配置的代理设置正确（`/api` 代理到后端）
3. 生产环境确认 Nginx 反向代理配置正确

### Q：生产构建后页面空白

1. 确认构建命令执行成功（`npm run build`）
2. 确认 Nginx 配置的 `root` 指向正确的构建产物目录
3. 确认 `try_files` 配置正确（SPA 需要将所有路由回退到 `index.html`）
