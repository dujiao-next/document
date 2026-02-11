# 支付配置与回调指南

> 更新时间：2026-02-11

本文档覆盖：

1. 目前支持的支付方式
2. 后台如何配置（含字段解释）
3. 回调地址与 Webhook 填写
4. 注意事项与常见坑

## 1. 目前支持的支付方式

## 1.1 总览

| 提供方 | `provider_type` | `channel_type` | `interaction_mode` | 场景说明 |
| --- | --- | --- | --- | --- |
| 易支付 | `epay` | `wechat` / `wxpay` / `alipay` / `qqpay` | `qr` / `redirect` | 聚合支付通道 |
| 官方 | `official` | `paypal` | `redirect` | PayPal Checkout 跳转支付 |
| 官方 | `official` | `stripe` | `redirect` | Stripe Checkout 跳转支付 |
| 官方 | `official` | `alipay` | `qr` / `wap` / `page` | 支付宝当面付 / 手机网站 / 电脑网站 |
| 官方 | `official` | `wechat` | `qr` / `redirect` | 微信 Native（二维码）/ H5 |

## 1.2 你关心的三类官方支付映射

- **当面付**：`official + alipay + qr`
- **手机网站支付**：
  - `official + alipay + wap`
  - `official + wechat + redirect`（H5）
- **电脑网站支付**：
  - `official + alipay + page`
  - `official + paypal + redirect`
  - `official + stripe + redirect`

## 2. 后台如何配置（含字段解释）

配置入口：`后台 → 支付管理 → 支付渠道`。

## 2.1 通用字段

| 字段 | 说明 |
| --- | --- |
| `name` | 渠道显示名（前台支付方式列表展示） |
| `provider_type` | `official` 或 `epay` |
| `channel_type` | 渠道类型（如 `paypal` / `stripe` / `alipay` / `wechat`） |
| `interaction_mode` | 交互模式（如 `qr`、`redirect`、`wap`、`page`） |
| `fee_rate` | 手续费比例（0~100） |
| `is_active` | 是否启用 |
| `sort_order` | 排序值（越大越靠前） |
| `config_json` | 渠道专属配置 |

## 2.2 PayPal（official + paypal + redirect）

### 必填项

- `client_id`
- `client_secret`
- `base_url`
- `return_url`
- `cancel_url`

### 建议项

- `webhook_id`（强烈建议，开启 Webhook 签名校验）
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

### 必填项

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`
- `payment_method_types`（至少 1 个，默认 `card`）

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

## 2.4 支付宝（official + alipay）

### 必填项

- `app_id`
- `private_key`
- `alipay_public_key`
- `gateway_url`
- `notify_url`
- `sign_type`（`RSA2` / `RSA`，推荐 `RSA2`）

### 条件必填

- 当 `interaction_mode` 为 `wap` 或 `page`：`return_url` 必填
- 当 `interaction_mode` 为 `qr`（当面付）：`return_url` 可空（建议仍配置）

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

### 必填项

- `appid`
- `mchid`
- `merchant_serial_no`
- `merchant_private_key`
- `api_v3_key`（必须 32 位）
- `notify_url`

### 条件必填

- 当 `interaction_mode = redirect`（H5 支付）：`h5_redirect_url` 必填
- 当 `interaction_mode = qr`（Native）：`h5_redirect_url` 可空

### 可选项

- `h5_type`：`WAP` / `IOS` / `ANDROID`（默认 `WAP`）
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

## 3. 回调地址配置与 Webhook 填写

假设你的 API 对外地址是 `https://api.example.com`，则 API 回调基址为：

- `https://api.example.com/api/v1`

## 3.1 通用回调入口（支付宝 / 微信 / 易支付）

- 回调地址：`POST https://api.example.com/api/v1/payments/callback`
- 支持 `GET` 仅用于兼容和调试，不建议支付平台生产回调用 GET。

建议填写：

- 支付宝 `notify_url`：`https://api.example.com/api/v1/payments/callback`
- 微信 `notify_url`：`https://api.example.com/api/v1/payments/callback?channel_id=你的渠道ID`
- 易支付 `notify_url`：`https://api.example.com/api/v1/payments/callback`

## 3.2 PayPal Webhook

- Webhook 地址：`POST https://api.example.com/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`
- `channel_id` 在当前实现中是必填（后端会校验 query 参数）。

后台配置联动：

- PayPal 控制台创建 Webhook 后，复制 `Webhook ID` 填到渠道 `webhook_id` 字段。
- 若 `webhook_id` 为空，后端不会执行 PayPal Webhook 签名校验。

建议订阅事件（覆盖成功/失败/处理中）：

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
- `channel_id` 非强制，但**强烈建议填写**（多 Stripe 渠道时可避免匹配歧义）。

后台配置联动：

- Stripe 控制台创建 Endpoint 后，复制 `Signing secret` 到 `webhook_secret`。

建议订阅事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.processing`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## 3.4 前台回跳地址建议（return/success/cancel）

推荐统一填前台支付页：

- `https://shop.example.com/pay`

说明：

- 官方渠道（PayPal / Stripe / Alipay / WeChat H5）创建支付时，后端会自动追加 `order_no` 等查询参数。
- 因此前台无需手工拼接订单号，直接配置 `/pay` 即可。

## 4. 注意事项

1. **币种注意**
   - 官方支付宝与微信在当前实现下使用人民币（`CNY`）。
   - 这两个渠道请按人民币场景配置，不要依赖外币。

2. **多渠道注意**
   - 同一支付提供方存在多个启用渠道时，Webhook URL 建议带 `channel_id`。
   - 特别是 PayPal，`channel_id` 未传会直接参数错误。

3. **微信私钥格式注意**
   - `merchant_private_key` 支持 PEM 文本与 `\n` 转义格式。
   - 常见报错 `pem decode failed` 多为密钥内容不完整或被错误裁剪。

4. **回调可达性**
   - 支付平台必须能公网访问你的 API 回调地址。
   - 生产环境建议全链路 HTTPS。

5. **幂等与重复通知**
   - 支付平台可能重复回调，后端已做支付状态幂等处理。
   - 仍建议你在平台侧保持标准重试策略，不要自定义异常重放逻辑。

6. **联调优先级**
   - 先验证“下单成功返回支付链接/二维码”。
   - 再验证“异步回调能更新支付状态”。
   - 最后验证“前台 `/pay` 回跳后自动完成支付状态捕获（PayPal/Stripe）”。
