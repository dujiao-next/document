# 支付配置與回調指南

> 更新時間：2026-02-11

本文檔覆蓋：

1. 目前支持的支付方式
2. 後臺如何配置（含字段解釋）
3. 回調地址與 Webhook 填寫
4. 注意事項與常見坑

## 1. 目前支持的支付方式

## 1.1 總覽

| 提供方 | `provider_type` | `channel_type` | `interaction_mode` | 場景說明 |
| --- | --- | --- | --- | --- |
| 易支付 | `epay` | `wechat` / `wxpay` / `alipay` / `qqpay` | `qr` / `redirect` | 聚合支付通道 |
| BEpusdt | `epusdt` | `usdt-trc20` / `usdc-trc20` / `trx` | `redirect` | 加密貨幣支付（USDT/USDC/TRX） |
| 官方 | `official` | `paypal` | `redirect` | PayPal Checkout 跳轉支付 |
| 官方 | `official` | `stripe` | `redirect` | Stripe Checkout 跳轉支付 |
| 官方 | `official` | `alipay` | `qr` / `wap` / `page` | 支付寶當面付 / 手機網站 / 電腦網站 |
| 官方 | `official` | `wechat` | `qr` / `redirect` | 微信 Native（二維碼）/ H5 |

## 1.2 你關心的三類官方支付映射

- **當面付**：`official + alipay + qr`
- **手機網站支付**：
  - `official + alipay + wap`
  - `official + wechat + redirect`（H5）
- **電腦網站支付**：
  - `official + alipay + page`
  - `official + paypal + redirect`
  - `official + stripe + redirect`

## 2. 後臺如何配置（含字段解釋）

配置入口：`後臺 → 支付管理 → 支付渠道`。

## 2.1 通用字段

| 字段 | 說明 |
| --- | --- |
| `name` | 渠道顯示名（前臺支付方式列表展示） |
| `provider_type` | `official` 或 `epay` |
| `channel_type` | 渠道類型（如 `paypal` / `stripe` / `alipay` / `wechat`） |
| `interaction_mode` | 交互模式（如 `qr`、`redirect`、`wap`、`page`） |
| `fee_rate` | 手續費比例（0~100） |
| `is_active` | 是否啟用 |
| `sort_order` | 排序值（越大越靠前） |
| `config_json` | 渠道專屬配置 |

## 2.2 PayPal（official + paypal + redirect）

### 必填項

- `client_id`
- `client_secret`
- `base_url`
- `return_url`
- `cancel_url`

### 建議項

- `webhook_id`（強烈建議，開啟 Webhook 簽名校驗）
- `brand_name`
- `locale`

### 示例 `config_json`

```json
{
  "client_id": "YOUR_PAYPAL_CLIENT_ID",
  "client_secret": "YOUR_PAYPAL_CLIENT_SECRET",
  "base_url": "https://api-m.sandbox.paypal.com",
  "return_url": "https://shop.example.com/pay",
  "cancel_url": "https://shop.example.com/pay",
  "webhook_id": "YOUR_WEBHOOK_ID"
}
```

## 2.3 Stripe（official + stripe + redirect）

### 必填項

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`
- `payment_method_types`（至少 1 個，默認 `card`）

### 示例 `config_json`

```json
{
  "secret_key": "sk_test_xxx",
  "publishable_key": "pk_test_xxx",
  "webhook_secret": "whsec_xxx",
  "success_url": "https://shop.example.com/pay",
  "cancel_url": "https://shop.example.com/pay",
  "api_base_url": "https://api.stripe.com",
  "payment_method_types": ["card"]
}
```

## 2.4 支付寶（official + alipay）

### 必填項

- `app_id`
- `private_key`
- `alipay_public_key`
- `gateway_url`
- `notify_url`
- `sign_type`（`RSA2` / `RSA`，推薦 `RSA2`）

### 條件必填

- 當 `interaction_mode` 為 `wap` 或 `page`：`return_url` 必填
- 當 `interaction_mode` 為 `qr`（當面付）：`return_url` 可空（建議仍配置）

### 示例 `config_json`

```json
{
  "app_id": "YOUR_APP_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "alipay_public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "gateway_url": "https://openapi.alipay.com/gateway.do",
  "notify_url": "https://api.example.com/api/v1/payments/callback",
  "return_url": "https://shop.example.com/pay",
  "sign_type": "RSA2"
}
```

## 2.5 微信支付（official + wechat）

### 必填項

- `appid`
- `mchid`
- `merchant_serial_no`
- `merchant_private_key`
- `api_v3_key`（必須 32 位）
- `notify_url`

### 條件必填

- 當 `interaction_mode = redirect`（H5 支付）：`h5_redirect_url` 必填
- 當 `interaction_mode = qr`（Native）：`h5_redirect_url` 可空

### 可選項

- `h5_type`：`WAP` / `IOS` / `ANDROID`（默認 `WAP`）
- `h5_wap_url`
- `h5_wap_name`

### 示例 `config_json`

```json
{
  "appid": "wx1234567890",
  "mchid": "1900000109",
  "merchant_serial_no": "4A3B2C1D...",
  "merchant_private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "api_v3_key": "32chars_api_v3_key_xxxxxxxxxxxx",
  "notify_url": "https://api.example.com/api/v1/payments/callback?channel_id=12",
  "h5_redirect_url": "https://shop.example.com/pay",
  "h5_type": "WAP",
  "h5_wap_url": "https://shop.example.com",
  "h5_wap_name": "Dujiao-Next"
}
```

## 2.6 BEpusdt（usdt-trc20 / usdc-trc20 / trx）

### 必填項

- `gateway_url`：BEpusdt 網關地址
- `auth_token`：BEpusdt API Token
- `notify_url`：異步回調地址
- `return_url`：支付成功跳轉地址

### 可選項

- `fiat`：法幣類型，默認 `CNY`（支持 `CNY` / `USD`）
- `trade_type`：交易類型（會根據 `channel_type` 自動設置，通常無需手動配置）

### 示例 `config_json`

```json
{
  "gateway_url": "https://usdt.example.com",
  "auth_token": "your_bepusdt_api_token",
  "fiat": "CNY",
  "notify_url": "https://api.example.com/api/v1/payments/callback",
  "return_url": "https://shop.example.com/pay"
}
```

### 支付方式說明

BEpusdt 支持三種加密貨幣支付方式，每種方式需要單獨創建支付渠道：

| `channel_type` | 幣種 | `trade_type`（自動設置） | 說明 |
| --- | --- | --- | --- |
| `usdt-trc20` | USDT (TRC20) | `usdt.trc20` | 波場網絡 USDT |
| `usdc-trc20` | USDC (TRC20) | `usdc.trc20` | 波場網絡 USDC |
| `trx` | TRX | `tron.trx` | 波場原生代幣 |

**注意**：
- `trade_type` 會根據 `channel_type` 自動設置，無需在配置中填寫
- `notify_url` 路徑必須是 `/api/v1/payments/callback`
- `return_url` 路徑必須是 `/pay`（不是 `/order` 或 `/payment`）
- 只支持 `redirect` 交互模式，統一跳轉到 BEpusdt 收銀臺頁面

### 支付流程

1. 用戶選擇 BEpusdt 支付方式
2. 系統創建支付訂單並跳轉到 BEpusdt 收銀臺
3. 用戶在 BEpusdt 收銀臺完成支付（掃碼或轉賬）
4. 支付成功後，BEpusdt 發送異步回調通知
5. 用戶自動跳轉回商城訂單詳情頁

## 3. 回調地址配置與 Webhook 填寫

假設你的 API 對外地址是 `https://api.example.com`，則 API 回調基址為：

- `https://api.example.com/api/v1`

## 3.1 通用回調入口（支付寶 / 微信 / 易支付 / BEpusdt）

- 回調地址：`POST https://api.example.com/api/v1/payments/callback`
- 支持 `GET` 僅用於兼容和調試，不建議支付平臺生產回調用 GET。

建議填寫：

- 支付寶 `notify_url`：`https://api.example.com/api/v1/payments/callback`
- 微信 `notify_url`：`https://api.example.com/api/v1/payments/callback?channel_id=你的渠道ID`
- 易支付 `notify_url`：`https://api.example.com/api/v1/payments/callback`
- BEpusdt `notify_url`：`https://api.example.com/api/v1/payments/callback`

## 3.2 PayPal Webhook

- Webhook 地址：`POST https://api.example.com/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`
- `channel_id` 在當前實現中是必填（後端會校驗 query 參數）。

後臺配置聯動：

- PayPal 控制檯創建 Webhook 後，複製 `Webhook ID` 填到渠道 `webhook_id` 字段。
- 若 `webhook_id` 為空，後端不會執行 PayPal Webhook 簽名校驗。

建議訂閱事件（覆蓋成功/失敗/處理中）：

- `CHECKOUT.ORDER.COMPLETED`
- `CHECKOUT.ORDER.APPROVED`
- `CHECKOUT.ORDER.DENIED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.DECLINED`
- `PAYMENT.CAPTURE.FAILED`

## 3.3 Stripe Webhook

- Webhook 地址：`POST https://api.example.com/api/v1/payments/webhook/stripe?channel_id=你的渠道ID`
- `channel_id` 非強制，但**強烈建議填寫**（多 Stripe 渠道時可避免匹配歧義）。

後臺配置聯動：

- Stripe 控制檯創建 Endpoint 後，複製 `Signing secret` 到 `webhook_secret`。

建議訂閱事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.processing`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## 3.4 前臺回跳地址建議（return/success/cancel）

推薦統一填前臺支付頁：

- `https://shop.example.com/pay`

說明：

- 官方渠道（PayPal / Stripe / Alipay / WeChat H5）創建支付時，後端會自動追加 `order_no` 等查詢參數。
- 因此前臺無需手工拼接訂單號，直接配置 `/pay` 即可。

## 4. 注意事項

1. **幣種注意**
   - 官方支付寶與微信在當前實現下使用人民幣（`CNY`）。
   - 這兩個渠道請按人民幣場景配置，不要依賴外幣。

2. **多渠道注意**
   - 同一支付提供方存在多個啟用渠道時，Webhook URL 建議帶 `channel_id`。
   - 特別是 PayPal，`channel_id` 未傳會直接參數錯誤。

3. **微信私鑰格式注意**
   - `merchant_private_key` 支持 PEM 文本與 `\n` 轉義格式。
   - 常見報錯 `pem decode failed` 多為密鑰內容不完整或被錯誤裁剪。

4. **回調可達性**
   - 支付平臺必須能公網訪問你的 API 回調地址。
   - 生產環境建議全鏈路 HTTPS。

5. **冪等與重複通知**
   - 支付平臺可能重複回調，後端已做支付狀態冪等處理。
   - 仍建議你在平臺側保持標準重試策略，不要自定義異常重放邏輯。

6. **聯調優先級**
   - 先驗證“下單成功返回支付連結/二維碼”。
   - 再驗證“異步回調能更新支付狀態”。
   - 最後驗證“前臺 `/pay` 回跳後自動完成支付狀態捕獲（PayPal/Stripe）”。
