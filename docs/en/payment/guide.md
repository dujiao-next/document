# Payment Configuration and Callback Guide

> Updated: 2026-02-11

This document covers:

1. Currently supported payment methods
2. How to configure channels in the admin panel (with field descriptions)
3. Callback and webhook configuration
4. Important notes and common pitfalls

## 1. Supported Payment Methods

## 1.1 Overview

| Provider | `provider_type` | `channel_type` | `interaction_mode` | Scenario |
| --- | --- | --- | --- | --- |
| EPay | `epay` | `wechat` / `wxpay` / `alipay` / `qqpay` | `qr` / `redirect` | Aggregated payment gateway |
| Official | `official` | `paypal` | `redirect` | PayPal Checkout redirect |
| Official | `official` | `stripe` | `redirect` | Stripe Checkout redirect |
| Official | `official` | `alipay` | `qr` / `wap` / `page` | Alipay Face-to-Face / WAP / Desktop |
| Official | `official` | `wechat` | `qr` / `redirect` | WeChat Native (QR) / H5 |

## 1.2 Mapping for Main Official Payment Modes

- **Face-to-face payment**: `official + alipay + qr`
- **Mobile web payment**:
  - `official + alipay + wap`
  - `official + wechat + redirect` (H5)
- **Desktop web payment**:
  - `official + alipay + page`
  - `official + paypal + redirect`
  - `official + stripe + redirect`

## 2. Admin Configuration (with Field Descriptions)

Configuration entry: `Admin → Payment Management → Payment Channels`.

## 2.1 Common Fields

| Field | Description |
| --- | --- |
| `name` | Display name shown on the checkout page |
| `provider_type` | `official` or `epay` |
| `channel_type` | Channel type, e.g. `paypal` / `stripe` / `alipay` / `wechat` |
| `interaction_mode` | Interaction mode, e.g. `qr`, `redirect`, `wap`, `page` |
| `fee_rate` | Fee ratio (0~100) |
| `is_active` | Whether enabled |
| `sort_order` | Sort value (higher appears first) |
| `config_json` | Channel-specific configuration |

## 2.2 PayPal (`official + paypal + redirect`)

### Required

- `client_id`
- `client_secret`
- `base_url`
- `return_url`
- `cancel_url`

### Recommended

- `webhook_id` (strongly recommended for webhook signature verification)
- `brand_name`
- `locale`

### Example `config_json`

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

## 2.3 Stripe (`official + stripe + redirect`)

### Required

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`
- `payment_method_types` (at least one, default `card`)

### Example `config_json`

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

## 2.4 Alipay (`official + alipay`)

### Required

- `app_id`
- `private_key`
- `alipay_public_key`
- `gateway_url`
- `notify_url`
- `sign_type` (`RSA2` / `RSA`, `RSA2` recommended)

### Conditionally Required

- When `interaction_mode` is `wap` or `page`: `return_url` is required
- When `interaction_mode` is `qr` (face-to-face): `return_url` is optional (still recommended)

### Example `config_json`

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

## 2.5 WeChat Pay (`official + wechat`)

### Required

- `appid`
- `mchid`
- `merchant_serial_no`
- `merchant_private_key`
- `api_v3_key` (must be 32 characters)
- `notify_url`

### Conditionally Required

- When `interaction_mode = redirect` (H5): `h5_redirect_url` is required
- When `interaction_mode = qr` (Native): `h5_redirect_url` is optional

### Optional

- `h5_type`: `WAP` / `IOS` / `ANDROID` (default `WAP`)
- `h5_wap_url`
- `h5_wap_name`

### Example `config_json`

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

## 3. Callback and Webhook Configuration

Assume your public API domain is `https://api.example.com`, then your callback base path is:

- `https://api.example.com/api/v1`

## 3.1 Generic Callback Endpoint (Alipay / WeChat / EPay)

- Callback URL: `POST https://api.example.com/api/v1/payments/callback`
- `GET` is only for compatibility/debug and is not recommended for production callbacks.

Recommended settings:

- Alipay `notify_url`: `https://api.example.com/api/v1/payments/callback`
- WeChat `notify_url`: `https://api.example.com/api/v1/payments/callback?channel_id=YOUR_CHANNEL_ID`
- EPay `notify_url`: `https://api.example.com/api/v1/payments/callback`

## 3.2 PayPal Webhook

- Webhook URL: `POST https://api.example.com/api/v1/payments/webhook/paypal?channel_id=YOUR_CHANNEL_ID`
- In current implementation, `channel_id` is required (validated by backend query parser).

Backend linkage:

- After creating a webhook in PayPal Console, copy `Webhook ID` to channel field `webhook_id`.
- If `webhook_id` is empty, backend signature verification for PayPal webhooks is skipped.

Recommended events:

- `CHECKOUT.ORDER.COMPLETED`
- `CHECKOUT.ORDER.APPROVED`
- `CHECKOUT.ORDER.DENIED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.DECLINED`
- `PAYMENT.CAPTURE.FAILED`

## 3.3 Stripe Webhook

- Webhook URL: `POST https://api.example.com/api/v1/payments/webhook/stripe?channel_id=YOUR_CHANNEL_ID`
- `channel_id` is optional but strongly recommended when multiple Stripe channels are enabled.

Backend linkage:

- After creating an endpoint in Stripe Console, copy `Signing secret` into `webhook_secret`.

Recommended events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.processing`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## 3.4 Frontend Return URLs (return/success/cancel)

Recommended unified path:

- `https://shop.example.com/pay`

Notes:

- For official channels (PayPal / Stripe / Alipay / WeChat H5), backend appends query parameters like `order_no` automatically when creating payment links.
- You do not need to manually concatenate order numbers on the frontend.

## 4. Notes and Pitfalls

1. **Currency**
   - Alipay and WeChat official channels currently run in RMB (`CNY`) in this implementation.
   - Configure these channels for RMB use cases.

2. **Multiple channels**
   - When multiple channels from the same provider are enabled, webhook URLs should include `channel_id`.
   - Especially for PayPal, missing `channel_id` causes parameter validation errors.

3. **WeChat private key format**
   - `merchant_private_key` supports plain PEM text and `\n`-escaped format.
   - `pem decode failed` usually indicates incomplete or corrupted key content.

4. **Callback reachability**
   - Payment platforms must be able to access your callback URLs from the public network.
   - Use full HTTPS in production.

5. **Idempotency and repeated notifications**
   - Payment providers may retry notifications; backend already handles idempotent payment state updates.
   - Keep provider-side retries standard; avoid custom duplicate replay logic.

6. **Integration testing order**
   - First verify that order creation returns a valid payment URL/QR code.
   - Then verify asynchronous callbacks can update payment status.
   - Finally verify `/pay` auto-capture of latest status after return (PayPal/Stripe).
