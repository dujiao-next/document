# Payment Configuration and Callback Guide

> Updated: 2026-04-04

You only need two outcomes:

1. Customers can start payment successfully
2. Orders are marked as paid automatically after payment

## 1. What You Need Before Starting

Make sure your payment callback endpoint is publicly reachable.

The system requires at least two domains:

- User storefront: `user.example.com` (or `shop.example.com`)
- Admin panel: `admin.example.com`

The API is accessed through each site's reverse proxy (e.g., `user.example.com/api` and `admin.example.com/api` both proxy to the backend) and does not require a separate domain.

Common URL examples:

- Payment notification URL (callback): `https://user.example.com/api/v1/payments/callback`
- Customer return page after payment: `https://user.example.com/pay`

## 2. Where to Configure in Admin

Go to:

- `Admin → Payment Management → Payment Channels → Create`

For each channel, do these 3 things:

1. Fill merchant credentials (keys/IDs from the payment provider)
2. Fill callback URL (so the provider can notify your server)
3. Enable the channel and set display order

## 3. What to Fill for Each Payment Provider

### 3.1 EPay

Usually required:

- Gateway URL (`gateway_url`)
- Merchant ID (`merchant_id`)
- Merchant key (v1) or private/public key pair (v2)
- Notification URL (`notify_url`)
- Return URL (`return_url`)

Recommended:

- `notify_url`: `https://user.example.com/api/v1/payments/callback`
- `return_url`: `https://shop.example.com/pay`

### 3.2 PayPal

Usually required:

- `client_id`
- `client_secret`
- `base_url` (sandbox or production)
- `return_url`
- `cancel_url`

Recommended:

- Set both `return_url` and `cancel_url` to `https://shop.example.com/pay`
- Fill `webhook_id` for better webhook verification

### 3.3 Stripe

Usually required:

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`

Recommended:

- Set both `success_url` and `cancel_url` to `https://shop.example.com/pay`

### 3.4 Alipay

Usually required:

- `app_id`
- App private key (`private_key`)
- Alipay public key (`alipay_public_key`)
- Gateway URL (`gateway_url`)
- Notification URL (`notify_url`)

Recommended:

- `notify_url`: `https://user.example.com/api/v1/payments/callback`
- If you use WAP/Desktop payments, also fill `return_url`: `https://shop.example.com/pay`

### 3.5 WeChat Pay

Usually required:

- `appid`
- `mchid`
- Merchant cert serial (`merchant_serial_no`)
- Merchant private key (`merchant_private_key`)
- `api_v3_key`
- Notification URL (`notify_url`)

Recommended:

- `notify_url`: `https://user.example.com/api/v1/payments/callback?channel_id=YOUR_CHANNEL_ID`
- For H5 mode, also fill `h5_redirect_url`: `https://shop.example.com/pay`

### 3.6 TokenPay

Usually required:

- Gateway URL (`gateway_url`)
- Callback signature secret (`notify_secret`)
- Notification URL (`notify_url`)

Common optional fields:

- Currency (`currency`, default USDT)
- Redirect URL after payment (`redirect_url`)
- Fiat display currency (`base_currency`, default CNY)

Recommended:

- `notify_url`: `https://user.example.com/api/v1/payments/callback`
- `redirect_url`: `https://shop.example.com/pay`
- Supported currencies: <https://github.com/LightCountry/TokenPay/blob/master/Wiki/docs.md>

### 3.7 BEpusdt

Usually required:

- Gateway URL (`gateway_url`)
- API token (`auth_token`)
- Notification URL (`notify_url`)
- Return URL (`return_url`)

Common optional fields:

- Trade type (`trade_type`)
- Fiat type (`fiat`, usually CNY or USD)

Recommended:

- `notify_url`: `https://user.example.com/api/v1/payments/callback`
- `return_url`: `https://shop.example.com/pay`
- Supported currencies and trade types: <https://github.com/v03413/BEpusdt/blob/main/docs/api/api.md>

### 3.8 epusdt

> Note: epusdt and BEpusdt are two independent projects. Their config fields and signing keys are not interchangeable — do not mix them.

Usually required:

- Gateway URL (`gateway_url`, e.g. `https://epusdt.example.com`)
- Merchant PID (`pid`)
- Secret key (`secret_key`)
- Token (`token`, e.g. `usdt`)
- Network (`network`, e.g. `tron`)
- Notify URL (`notify_url`)
- Return URL (`return_url`)

Usually optional:

- Currency (`currency`, default `cny`)

Tips:

- `notify_url`: `https://user.example.com/api/v1/payments/callback`
- `return_url`: `https://shop.example.com/pay`
- Redirect-only mode. After placing an order, buyers are redirected to epusdt's hosted checkout to complete payment — no need for the backend to render a QR code.
- Query the live list of supported `token` / `network` combinations from the gateway: `GET <gateway_url>/payments/gmpay/v1/supported-assets`
- API reference: <https://epusdt.com/api/payment.html>

### 3.9 OKPay

Usually required:

- Gateway URL (`gateway_url`, default `https://api.okaypay.me/shop`)
- Merchant ID (`merchant_id`)
- Merchant token (`merchant_token`)
- Callback URL (`callback_url`)
- Return URL (`return_url`)

Common optional fields:

- Payment coin (`coin`, supports `USDT` or `TRX`, default USDT)
- Exchange rate (`exchange_rate`, default `1`)
- Merchant display name (`display_name`)

Recommended:

- `callback_url`: `https://user.example.com/api/v1/payments/callback`
- `return_url`: `https://shop.example.com/pay`

---

## 3.10 Fee Configuration

Each payment channel can have its own fee settings for calculating the actual amount received:

| Field | Description |
|-------|-------------|
| Fee Rate (`fee_rate`) | Percentage fee, e.g., `2.00` means 2% |
| Fixed Fee (`fixed_fee`) | Fixed amount deducted per transaction |

Fees are used only for admin statistics and profit calculation. They do **not** increase the amount the customer pays.

---

## 3.11 Interaction Modes

When creating a payment channel, you must select an interaction mode that determines the customer's payment experience:

| Mode | Identifier | Description |
|------|------------|-------------|
| QR Code | `qr` | Generates a payment QR code for the customer to scan (suitable for WeChat Pay / Alipay, etc.) |
| Redirect | `redirect` | Redirects to the payment platform page to complete payment (suitable for PayPal / Stripe, etc.) |

> The same payment type can have multiple channels using different interaction modes. For example, Alipay can be configured with both QR code and redirect modes simultaneously.

## 4. Callback & Webhook (Easy Reference)

### 4.1 Shared Callback URL (use the same URL)

Applies to:

- Alipay
- WeChat Pay
- EPay
- TokenPay
- BEpusdt
- epusdt
- OKPay

Use:

- `POST https://user.example.com/api/v1/payments/callback`

### 4.2 PayPal (separate webhook URL)

Use:

- `POST https://user.example.com/api/v1/payments/webhook/paypal?channel_id=YOUR_CHANNEL_ID`

Note:

- `channel_id` is required in current implementation.

### 4.3 Stripe (separate webhook URL)

Use:

- `POST https://user.example.com/api/v1/payments/webhook/stripe?channel_id=YOUR_CHANNEL_ID`

Note:

- `channel_id` is strongly recommended if you have multiple Stripe channels.

## 5. Custom Callback Routes (Optional)

Since this project is open source, the default callback paths (e.g., `/api/v1/payments/callback`) are publicly known, which poses a risk of malicious callback simulation or brute-force attacks. You can customize callback route paths in the admin panel to hide the defaults and improve security.

### 5.1 How to Configure

Go to:

- `Admin → Settings → Callback Routes`

You can customize these 4 callback paths:

| Callback Type | Default Path | Description |
|--------------|-------------|-------------|
| Payment Callback | `/api/v1/payments/callback` | Shared by Alipay/WeChat/EPay/TokenPay/BEpusdt/epusdt/OKPay |
| PayPal Webhook | `/api/v1/payments/webhook/paypal` | PayPal only |
| Stripe Webhook | `/api/v1/payments/webhook/stripe` | Stripe only |
| Upstream Callback | `/api/v1/upstream/callback` | Upstream supplier callback |

Leave empty to keep using the default path.

### 5.2 Rules

- Custom paths must start with `/api/`, e.g., `/api/my-secret-path/pay-notify`
- All 4 paths must be unique (no duplicates)
- Must not conflict with existing system routes (e.g., `/api/v1/admin/...`, `/api/v1/public/...`)

### 5.3 After Configuration

::: warning Important
After customizing callback routes, you **must** update the notification URL (`notify_url` / `callback_url`) in each payment channel configuration to match the new path.

For example, if you set the payment callback route to `/api/my-secret/pay-notify`:

- Before: `https://user.example.com/api/v1/payments/callback`
- After: `https://user.example.com/api/my-secret/pay-notify`

Otherwise, payment provider callbacks will not reach your server.
:::

### 5.4 How It Works

- Once a custom route is configured, the corresponding default path automatically returns 404 and becomes undetectable
- Callback types without custom paths continue using defaults — they are independent
- Changes take effect within approximately 5 minutes (or immediately on the current instance)

## 6. 5-Minute Pre-Launch Checklist

Test in this order:

1. Place an order and confirm payment page/QR opens correctly
2. Complete payment and confirm order status becomes paid automatically
3. Confirm customer is redirected to `https://shop.example.com/pay`
4. Confirm payment record appears in admin for that order

## 7. Common Problems

### Q1: Payment succeeded for user, but order is still unpaid in admin

Check first:

- Callback URL typo (domain/path) — if you configured custom callback routes, make sure each channel's `notify_url` has been updated accordingly
- API domain not publicly reachable
- Failed callback logs in payment provider console

### Q2: User does not return to your payment page

Check first:

- `return_url` / `success_url` / `cancel_url` / `redirect_url` are all set to `/pay`

### Q3: Multiple channels under one provider cause mixed callbacks

Fix:

- Always include `channel_id` in PayPal and Stripe webhook URLs
- Keep only channels you actively use enabled
