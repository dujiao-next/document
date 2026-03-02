---
outline: deep
---

# Site Integration Open API

> Last Updated: 2026-03-01

This document describes the Dujiao-Next site-integration API endpoints under `/api/open/v1/*`.

## 1. Basics

### 1.1 Base URL

- Example: `https://api.example.com/api/open/v1`

### 1.2 Unified Response Envelope

Success:

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {}
}
```

Failure:

```json
{
  "status_code": 401,
  "msg": "unauthorized",
  "data": {
    "request_id": "01HR..."
  }
}
```

## 2. Authentication and Signature

### 2.1 Required Headers

| Header | Description |
| --- | --- |
| `X-DJ-Access-Key` | Access key |
| `X-DJ-Timestamp` | Unix timestamp (seconds) |
| `X-DJ-Nonce` | Random nonce, must be unique per request |
| `X-DJ-Signature` | HMAC-SHA256 signature (lowercase hex) |
| `X-DJ-Sign-Method` | Fixed value: `HMAC-SHA256` |
| `X-DJ-Idempotency-Key` | Required for write APIs (POST/PUT/PATCH/DELETE) |

### 2.2 Signature String

Build the sign string in this exact order (newline separated):

```text
UPPER_METHOD
PATH
CANONICAL_QUERY
SHA256_HEX(BODY_BYTES)
TIMESTAMP
NONCE
```

Signature algorithm:

```text
signature = hex_lower(hmac_sha256(sign_string, secret))
```

Validation behavior:

- Allowed timestamp skew is about ±300 seconds.
- Nonce cannot be reused within its TTL window.
- Reusing the same `X-DJ-Idempotency-Key` on write APIs will be rejected.

## 3. Endpoint List

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/site/ping` | Connectivity check |
| `GET` | `/products` | Pull product list |
| `GET` | `/products/:product_id` | Get product details |
| `GET` | `/wallet/balance` | Query connected wallet balance |
| `POST` | `/orders` | Create procurement order |
| `GET` | `/orders/:client_order_no` | Query procurement order |
| `POST` | `/orders/:client_order_no/cancel` | Cancel procurement order |
| `POST` | `/callbacks/order-status` | Push order status callback |
| `POST` | `/callbacks/delivery` | Push delivery callback |
| `POST` | `/callbacks/refund` | Push refund callback |

## 4. Core Endpoints

### 4.1 GET `/site/ping`

Response `data` fields:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | Connectivity status |
| `connection_id` | number | Connection ID |
| `protocol_type` | string | Protocol type |
| `protocol_version` | string | Protocol version |
| `server_time` | number | Server unix time |

### 4.2 GET `/products`

Query params:

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | number | No | 1 | Page number |
| `page_size` | number | No | 20 | Page size, max 100 |
| `search` | string | No | - | Keyword search |

Response `data` contains: `items`, `page`, `page_size`, `total`, `has_more`.

Key fields in `items[]`:

| Field | Type | Description |
| --- | --- | --- |
| `upstream_product_id` | string | Upstream product ID |
| `upstream_sku_id` | string | Default SKU ID |
| `title` | string | Product title (locale-fallback applied) |
| `price` | string | Price string |
| `currency` | string | Currency |
| `stock_status` | string | `unlimited`/`in_stock`/`low_stock`/`out_of_stock` |
| `is_sold_out` | boolean | Sold-out flag |
| `skus` | array | SKU list |

### 4.3 GET `/products/:product_id`

- Returns details by upstream product ID.
- Structure is the same as one item in `/products`.

### 4.4 GET `/wallet/balance`

Response `data` fields:

| Field | Type | Description |
| --- | --- | --- |
| `wallet_user_id` | number | User ID bound for wallet charging |
| `currency` | string | Currency |
| `available_balance` | string | Available balance |

### 4.5 POST `/orders`

Request body:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `client_order_no` | string | Yes | Integrator order number (globally unique recommended) |
| `upstream_product_id` | string | Yes | Upstream product ID |
| `upstream_sku_id` | string | No | Upstream SKU ID (defaults to first active SKU) |
| `quantity` | number | Yes | Quantity, must be greater than 0 |
| `buyer_context` | object | No | Passthrough context (local order metadata) |

Accepted response example:

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "accepted": true,
    "client_order_no": "A-20260301-001",
    "upstream_order_no": "UP20260301120000abcd",
    "status": "accepted",
    "procurement_amount": "9.90",
    "currency": "CNY"
  }
}
```

Business failure example (still HTTP 200, `status_code=0`):

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "accepted": false,
    "client_order_no": "A-20260301-002",
    "upstream_order_no": "",
    "status": "failed",
    "procurement_amount": "9.90",
    "currency": "CNY",
    "error_code": "UPSTREAM_INSUFFICIENT_BALANCE",
    "error_message": "insufficient balance"
  }
}
```

### 4.6 GET `/orders/:client_order_no`

Returns the same order fields as `POST /orders`; use it for polling.

### 4.7 POST `/orders/:client_order_no/cancel`

Response includes:

- regular order fields (same as `POST /orders`)
- `canceled` (boolean)

If cancellation is not allowed, it may return:

- `error_code=UPSTREAM_ORDER_NOT_CANCELABLE`

## 5. Callback Endpoints

### 5.1 POST `/callbacks/order-status`

Used for upstream order status callbacks.

### 5.2 POST `/callbacks/delivery`

Used for delivery payload callbacks (cards, links, text, etc.).

### 5.3 POST `/callbacks/refund`

Used for refund/failure callbacks.

Callback payload should include at least one order locator:

- `upstream_order_no`
- `client_order_no`
- `buyer_context.local_order_id`

Recommended callback fields:

| Field | Description |
| --- | --- |
| `event_id` | Unique event ID for deduplication |
| `status` | Status value, e.g. `processing`, `delivered`, `failed` |
| `error_code` / `error_message` | Failure reason |
| `payload` | Delivery content or extension data |

Success callback response:

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "ack": true,
    "event_id": "evt-001",
    "duplicate": false,
    "updated": true
  }
}
```

## 6. Status and Error Codes

### 6.1 Procurement `status`

- `pending`
- `accepted`
- `failed`
- `canceled`

### 6.2 Standard `error_code`

- `UPSTREAM_INSUFFICIENT_BALANCE`: insufficient upstream wallet balance
- `UPSTREAM_PRODUCT_UNAVAILABLE`: product or SKU unavailable
- `UPSTREAM_STOCK_INSUFFICIENT`: insufficient stock
- `UPSTREAM_ORDER_NOT_CANCELABLE`: order cannot be canceled

## 7. Idempotency and Retry Recommendations

- Keep `client_order_no` unique. Duplicate submits return the existing order result.
- Use a new `X-DJ-Idempotency-Key` for each write request.
- Use backoff when polling (e.g. 1s/2s/4s) to avoid high-frequency requests.

