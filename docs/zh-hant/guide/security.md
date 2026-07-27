---
outline: deep
---

# 安全最佳實踐

> 更新時間：2026-03-28

本指南介紹 Dujiao-Next 正式環境的安全設定建議。

---

## 1. 金鑰設定

### 1.1 應用金鑰

`config.yml` 中的 `app.secret_key` 用於 AES-256 加密敏感資料（如支付渠道金鑰、Bot Token 等）。

```yaml
app:
  secret_key: "你的32位元組隨機金鑰"
```

**要求：**
- 必須修改預設值
- 長度為 32 位元組
- 使用隨機產生的字串
- 正式環境部署後不可隨意更換（否則已加密資料無法解密）

產生隨機金鑰：

```bash
openssl rand -base64 32 | head -c 32
```

### 1.2 JWT 金鑰

管理員和使用者使用獨立的 JWT 金鑰：

```yaml
jwt:
  secret: "管理員JWT金鑰-請修改"
  expire_hours: 24

user_jwt:
  secret: "使用者JWT金鑰-請修改"
  expire_hours: 24
  remember_me_expire_hours: 168
```

**建議：**
- 管理員和使用者使用不同的金鑰
- 金鑰長度不少於 32 字元
- 管理員 Token 過期時間建議不超過 24 小時

---

## 2. 登入安全

### 2.1 登入限流

系統內建登入限流防暴力破解：

```yaml
security:
  login_rate_limit:
    window_seconds: 300      # 偵測視窗（預設 5 分鐘）
    max_attempts: 5           # 最大失敗次數
    block_seconds: 900        # 鎖定時長（預設 15 分鐘）
```

同一帳號在 `window_seconds` 內連續失敗 `max_attempts` 次後，鎖定 `block_seconds` 秒。

> 登入限流依賴 Redis，關閉 Redis 後此功能不可用。

### 2.2 密碼策略

```yaml
security:
  password_policy:
    min_length: 8             # 最短長度
    require_upper: true       # 必須包含大寫字母
    require_lower: true       # 必須包含小寫字母
    require_number: true      # 必須包含數字
    require_special: false    # 是否要求特殊字元
```

密碼策略在使用者註冊和修改密碼時生效。建議正式環境至少保持預設設定。

---

## 3. 驗證碼

系統支援兩種驗證碼方案：

### 3.1 圖片驗證碼

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
    site_key: "你的站點金鑰"
    secret_key: "你的金鑰"
```

**建議：** 正式環境至少為登入和註冊場景開啟驗證碼。Turnstile 體驗更好，圖片驗證碼不依賴外部服務。

---

## 4. HTTPS 與 CORS

### 4.1 強制 HTTPS

正式環境必須使用 HTTPS：

- 在 Nginx 設定 SSL 憑證
- 設定 HTTP 到 HTTPS 的強制跳轉
- 支付回呼位址必須使用 HTTPS

### 4.2 CORS 設定

收緊 CORS，僅允許你的站點網域：

```yaml
cors:
  allowed_origins:
    - "https://shop.example.com"   # 前臺與後臺同網域，只需要這一個
  allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
  allow_credentials: true
  max_age: 600
```

**注意：** 預設 `allowed_origins` 為 `["*"]`（允許所有來源），正式環境務必修改。

---

## 5. 伺服器模式

正式環境務必將伺服器設為 release 模式：

```yaml
server:
  mode: release
```

`debug` 模式會輸出詳細除錯資訊，可能洩露敏感資料。

---

## 6. 檔案上傳

限制上傳檔案的類型和大小：

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

系統同時校驗檔案 MIME 類型和副檔名，防止非圖片檔案上傳。

---

## 7. 資料安全

### 7.1 敏感資料加密

以下資料使用 AES-256-GCM 加密儲存：

- 支付渠道金鑰（ChannelSecret）
- Telegram Bot Token
- 站點對接金鑰（ConnectionSecret）

### 7.2 密碼儲存

使用者和管理員密碼使用 bcrypt 雜湊儲存，不可逆。

### 7.3 API 簽章

站點對接 API 使用 HMAC-SHA256 簽章驗證請求，防止篡改。

---

## 8. 正式部署檢查清單

部署到正式環境前，確認以下事項：

- [ ] 修改 `app.secret_key` 為隨機 32 位元組金鑰
- [ ] 修改 `jwt.secret` 和 `user_jwt.secret` 為隨機金鑰
- [ ] 修改 `bootstrap` 中的預設管理員密碼
- [ ] 設定 `server.mode` 為 `release`
- [ ] 設定 HTTPS 並強制跳轉
- [ ] 收緊 CORS `allowed_origins` 為實際網域
- [ ] 開啟登入驗證碼
- [ ] 確認 Redis 已啟用（登入限流和非同步任務需要）
- [ ] 確認支付回呼位址使用 HTTPS
- [ ] 確認日誌目錄已正確設定
