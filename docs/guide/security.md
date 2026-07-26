---
outline: deep
---

# 安全最佳实践

> 更新时间：2026-03-28

本指南介绍 Dujiao-Next 生产环境的安全配置建议。

---

## 1. 密钥配置

### 1.1 应用密钥

`config.yml` 中的 `app.secret_key` 用于 AES-256 加密敏感数据（如支付渠道密钥、Bot Token 等）。

```yaml
app:
  secret_key: "你的32字节随机密钥"
```

**要求：**
- 必须修改默认值
- 长度为 32 字节
- 使用随机生成的字符串
- 生产环境部署后不可随意更换（否则已加密数据无法解密）

生成随机密钥：

```bash
openssl rand -base64 32 | head -c 32
```

### 1.2 JWT 密钥

管理员和用户使用独立的 JWT 密钥：

```yaml
jwt:
  secret: "管理员JWT密钥-请修改"
  expire_hours: 24

user_jwt:
  secret: "用户JWT密钥-请修改"
  expire_hours: 24
  remember_me_expire_hours: 168
```

**建议：**
- 管理员和用户使用不同的密钥
- 密钥长度不少于 32 字符
- 管理员 Token 过期时间建议不超过 24 小时

---

## 2. 登录安全

### 2.1 登录限流

系统内置登录限流防暴力破解：

```yaml
security:
  login_rate_limit:
    window_seconds: 300      # 检测窗口（默认 5 分钟）
    max_attempts: 5           # 最大失败次数
    block_seconds: 900        # 锁定时长（默认 15 分钟）
```

同一账号在 `window_seconds` 内连续失败 `max_attempts` 次后，锁定 `block_seconds` 秒。

> 登录限流依赖 Redis，关闭 Redis 后此功能不可用。

### 2.2 密码策略

```yaml
security:
  password_policy:
    min_length: 8             # 最短长度
    require_upper: true       # 必须包含大写字母
    require_lower: true       # 必须包含小写字母
    require_number: true      # 必须包含数字
    require_special: false    # 是否要求特殊字符
```

密码策略在用户注册和修改密码时生效。建议生产环境至少保持默认配置。

---

## 3. 验证码

系统支持两种验证码方案：

### 3.1 图片验证码

```yaml
captcha:
  provider: "image"
  scenes:
    login: true
    register_send_code: true
    reset_send_code: true
    guest_create_order: true
  image:
    length: 5
    expire_seconds: 300
```

### 3.2 Cloudflare Turnstile

```yaml
captcha:
  provider: "turnstile"
  scenes:
    login: true
    register_send_code: true
  turnstile:
    site_key: "你的站点密钥"
    secret_key: "你的密钥"
```

**建议：** 生产环境至少为登录和注册场景开启验证码。Turnstile 体验更好，图片验证码不依赖外部服务。

---

## 4. HTTPS 与 CORS

### 4.1 强制 HTTPS

生产环境必须使用 HTTPS：

- 在 Nginx 配置 SSL 证书
- 配置 HTTP 到 HTTPS 的强制跳转
- 支付回调地址必须使用 HTTPS

### 4.2 CORS 配置

收紧 CORS，仅允许你的前端域名：

```yaml
cors:
  allowed_origins:
    - "https://shop.example.com"   # 前台与后台同域，只需要这一个
  allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
  allow_credentials: true
  max_age: 600
```

**注意：** 默认 `allowed_origins` 为 `["*"]`（允许所有来源），生产环境务必修改。

---

## 5. 服务器模式

生产环境务必将服务器设为 release 模式：

```yaml
server:
  mode: release
```

`debug` 模式会输出详细调试信息，可能泄露敏感数据。

---

## 6. 文件上传

限制上传文件的类型和大小：

```yaml
upload:
  max_size: 10485760           # 最大 10MB
  allowed_types:
    - "image/jpeg"
    - "image/png"
    - "image/gif"
    - "image/webp"
  allowed_extensions:
    - ".jpg"
    - ".jpeg"
    - ".png"
    - ".gif"
    - ".webp"
  max_width: 4096
  max_height: 4096
```

系统同时校验文件 MIME 类型和扩展名，防止非图片文件上传。

---

## 7. 数据安全

### 7.1 敏感数据加密

以下数据使用 AES-256-GCM 加密存储：

- 支付渠道密钥（ChannelSecret）
- Telegram Bot Token
- 站点对接密钥（ConnectionSecret）

### 7.2 密码存储

用户和管理员密码使用 bcrypt 哈希存储，不可逆。

### 7.3 API 签名

站点对接 API 使用 HMAC-SHA256 签名验证请求，防止篡改。

---

## 8. 生产部署检查清单

部署到生产环境前，确认以下事项：

- [ ] 修改 `app.secret_key` 为随机 32 字节密钥
- [ ] 修改 `jwt.secret` 和 `user_jwt.secret` 为随机密钥
- [ ] 修改 `bootstrap` 中的默认管理员密码
- [ ] 设置 `server.mode` 为 `release`
- [ ] 配置 HTTPS 并强制跳转
- [ ] 收紧 CORS `allowed_origins` 为实际域名
- [ ] 开启登录验证码
- [ ] 确认 Redis 已启用（登录限流和异步任务需要）
- [ ] 确认支付回调地址使用 HTTPS
- [ ] 确认日志目录已正确配置
