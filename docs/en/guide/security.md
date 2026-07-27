---
outline: deep
---

# Security Best Practices

> Updated: 2026-03-28

This guide covers security configuration recommendations for Dujiao-Next in production environments.

---

## 1. Secret Keys

### 1.1 Application Secret Key

The `app.secret_key` in `config.yml` is used for AES-256 encryption of sensitive data (such as payment channel keys, Bot Tokens, etc.).

```yaml
app:
  secret_key: "your-32-byte-random-secret-key"
```

**Requirements:**
- Must be changed from the default value
- Must be exactly 32 bytes in length
- Use a randomly generated string
- Do not change after production deployment (encrypted data will become unrecoverable)

Generate a random key:

```bash
openssl rand -base64 32 | head -c 32
```

### 1.2 JWT Secret Keys

Admins and users use separate JWT secret keys:

```yaml
jwt:
  secret: "admin-jwt-secret-change-this"
  expire_hours: 24

user_jwt:
  secret: "user-jwt-secret-change-this"
  expire_hours: 24
  remember_me_expire_hours: 168
```

**Recommendations:**
- Use different secrets for admin and user tokens
- Secret length should be at least 32 characters
- Admin token expiry should not exceed 24 hours

---

## 2. Login Security

### 2.1 Login Rate Limiting

The system includes built-in login rate limiting to prevent brute-force attacks:

```yaml
security:
  login_rate_limit:
    window_seconds: 300      # Detection window (default 5 minutes)
    max_attempts: 5           # Maximum failed attempts
    block_seconds: 900        # Lockout duration (default 15 minutes)
```

When the same account fails `max_attempts` times within `window_seconds`, the account is locked for `block_seconds`.

> Login rate limiting requires Redis. This feature is unavailable when Redis is disabled.

### 2.2 Password Policy

```yaml
security:
  password_policy:
    min_length: 8             # Minimum length
    require_upper: true       # Must contain uppercase letters
    require_lower: true       # Must contain lowercase letters
    require_number: true      # Must contain digits
    require_special: false    # Whether to require special characters
```

The password policy is enforced during user registration and password changes. It is recommended to keep at least the default configuration in production.

---

## 3. CAPTCHA

The system supports two CAPTCHA providers:

### 3.1 Image CAPTCHA

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
    site_key: "your-site-key"
    secret_key: "your-secret-key"
```

**Recommendation:** Enable CAPTCHA for at least login and registration in production. Turnstile provides a better user experience, while image CAPTCHA does not depend on external services.

---

## 4. HTTPS & CORS

### 4.1 Enforce HTTPS

HTTPS is mandatory for production environments:

- Configure SSL certificates in Nginx
- Set up HTTP-to-HTTPS redirection
- Payment callback URLs must use HTTPS

### 4.2 CORS Configuration

Restrict CORS to only allow your site domain:

```yaml
cors:
  allowed_origins:
    - "https://shop.example.com"   # storefront and admin share one domain
  allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
  allow_credentials: true
  max_age: 600
```

**Note:** The default `allowed_origins` is `["*"]` (all origins allowed). This must be changed for production.

---

## 5. Server Mode

Always set the server to release mode in production:

```yaml
server:
  mode: release
```

`debug` mode outputs detailed debugging information that may expose sensitive data.

---

## 6. File Uploads

Restrict uploaded file types and sizes:

```yaml
upload:
  max_size: 10485760           # Maximum 10MB
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

The system validates both MIME type and file extension to prevent non-image file uploads.

---

## 7. Data Security

### 7.1 Sensitive Data Encryption

The following data is encrypted at rest using AES-256-GCM:

- Payment channel secrets (ChannelSecret)
- Telegram Bot Tokens
- Site connection secrets (ConnectionSecret)

### 7.2 Password Storage

User and admin passwords are stored as bcrypt hashes and cannot be reversed.

### 7.3 API Signature Verification

The site connection API uses HMAC-SHA256 signatures to verify requests and prevent tampering.

---

## 8. Production Deployment Checklist

Before deploying to production, verify the following:

- [ ] Changed `app.secret_key` to a random 32-byte key
- [ ] Changed `jwt.secret` and `user_jwt.secret` to random secrets
- [ ] Changed the default admin password in `bootstrap`
- [ ] Set `server.mode` to `release`
- [ ] Configured HTTPS with forced redirection
- [ ] Restricted CORS `allowed_origins` to actual domain names
- [ ] Enabled login CAPTCHA
- [ ] Confirmed Redis is enabled (required for login rate limiting and async tasks)
- [ ] Confirmed payment callback URLs use HTTPS
- [ ] Confirmed log directory is properly configured
