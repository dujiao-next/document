---
outline: deep
---

# User Frontend API Documentation

> Last Updated: 2026-03-31

This document covers all current frontend APIs in `user/src/api/index.ts`, with field definitions based on the following implementations:

- `api/internal/router/router.go`
- `api/internal/http/handlers/public/*.go`
- `api/internal/models/*.go`

## Open Source Repository Links

- API (Main Project): https://github.com/dujiao-next/dujiao-next
- User (Frontend): https://github.com/dujiao-next/user
- Admin (Backend): https://github.com/dujiao-next/admin
- Document (Documentation): https://github.com/dujiao-next/document

---

## 0. API Changelog

### 0.0.1 Public API Response DTO Simplification and Security Hardening (2026-03-31)

#### Breaking Changes

- All order-related endpoints no longer return the auto-increment `id` field (`Order.id`, `OrderItem.id`, `Fulfillment.id`); `order_no` is now the sole order identifier.
- Order detail route changed from `GET /orders/:id` to `GET /orders/:order_no`; cancel route changed from `POST /orders/:id/cancel` to `POST /orders/:order_no/cancel`; fulfillment download changed from `GET /orders/:id/fulfillment/download` to `GET /orders/:order_no/fulfillment/download`.
- Guest order detail route changed from `GET /guest/orders/:id` to `GET /guest/orders/:order_no`; fulfillment download likewise.
- Legacy routes `GET /orders/by-order-no/:order_no` and `GET /guest/orders/by-order-no/:order_no` have been removed; use `GET /orders/:order_no` directly.
- Payment endpoints `POST /payments` and `GET /payments/latest` request parameter `order_id` changed to `order_no` (string type). Guest payment endpoints likewise.
- `GET /payments/latest` response field `order_id` changed to `order_no`.

#### Removed Fields

The following fields have been permanently removed from Public API responses; the frontend should no longer depend on them:

- **Order**: `id`, `parent_id`, `user_id`, `coupon_id`, `promotion_id`, `client_ip`, `updated_at`
- **OrderItem**: `id`, `order_id`, `delivered_by`, `created_at`, `updated_at`
- **Fulfillment**: `id`, `order_id`, `delivered_by`, `created_at`, `updated_at`
- **PublicProduct**: `cost_price_amount`, `manual_stock_locked`, `manual_stock_sold`, `is_active`, `sort_order`, `created_at`, `updated_at`, `is_affiliate_enabled`, `is_mapped`, `seo_meta`
- **PublicSKU**: `cost_price_amount`, `product_id`, `manual_stock_locked`, `auto_stock_total`, `auto_stock_locked`, `auto_stock_sold`, `sort_order`, `created_at`, `updated_at`
- **Banner**: `name`, `is_active`, `start_at`, `end_at`, `sort_order`, `created_at`, `updated_at`
- **Post**: `is_published`, `created_at`
- **Category**: `created_at`
- **WalletTransaction**: `order_id`
- **AffiliateCommission**: `order_id`

#### New Fields

- **Order**: `member_discount_amount`, `wallet_paid_amount`, `online_paid_amount`, `refunded_amount`
- **OrderItem**: `sku_snapshot`, `member_discount_amount`
- **Fulfillment**: `payload_line_count`
- **UserProfile**: `member_level_id`, `total_recharged`, `total_spent`
- **Category**: `parent_id`, `icon`

---

### 0.0 Promotion System Enhancement: Tiered Rules + Frontend Display (2026-03-09)

#### New Fields

- `PublicProduct` now includes a `promotion_rules` field (type `PromotionRule[]`), returning all active promotion rules for the product.
- This field is populated even when the current SKU unit price does not meet the rule threshold, allowing the frontend to display "buy more to get a discount" hints.

#### Tiered Promotion Rules

- A single product can have multiple promotion rules with different `min_amount` thresholds, creating tiered discounts.
- The backend matches from highest to lowest threshold against the purchase subtotal (`unit price × quantity`), applying the highest tier that qualifies.
- Example:
  - Rule A: `min_amount=50`, 1% off
  - Rule B: `min_amount=150`, 2% off
  - Subtotal 49 → no discount; 100 → Rule A (1% off); 200 → Rule B (2% off)
- Single-rule scenarios behave identically to before — no breaking changes.

#### Promotion Types

| type | Meaning | Calculation (per item) |
| --- | --- | --- |
| `percent` | Percentage discount | unit price = original × (100 - value) / 100 |
| `fixed` | Fixed amount reduction | unit price = original - value |
| `special_price` | Direct price override | unit price = value |

> **Note:** All discounts apply to the **per-item unit price**, not the order total. `min_amount` is the subtotal threshold (`unit price × quantity`); once met, each item receives the corresponding discount.

---

### 0.1 v0.0.3-beta API Changes (2026-02-22)

#### Unified Currency Strategy

- The site now supports only one currency, sourced from `site_config.currency` (default: `CNY`).
- Currency must be a 3-letter uppercase code (e.g. `CNY`, `USD`); invalid values are normalized to `CNY`.
- Amount-related APIs (order preview, orders, payments, wallet) now consistently use this site currency.

#### Breaking Field Changes

- `PublicProduct.price_currency` has been removed.
- `PublicProduct.promotion_price_currency` has been removed.
- If your frontend still reads these fields, switch to `currency` from `GET /public/config`.

#### Multi-SKU Input Added for Admin Product APIs

- Admin product create/update APIs now support a `skus` array for multi-variant pricing and stock.
- Compatibility behavior:
  - Without `skus`: handled as single-SKU mode (legacy `price_amount` + `manual_stock_total`).
  - With `skus`: handled as multi-SKU mode, product price/stock are derived from SKUs.
- In multi-SKU mode, backend validation enforces:
  - `sku_code` must be unique within the same product (case-insensitive);
  - each SKU `price_amount` must be greater than 0;
  - at least one active SKU (`is_active=true`) must exist.

#### Promotion Price Extended to SKU Level

- `PublicProduct` now includes a `skus` field (type `PublicSKU[]`), each SKU containing its own `promotion_price_amount`.
- Promotions are still configured at the product level, but promotion prices are calculated independently based on each SKU's original price.
- The product-level `promotion_price_amount` is now the lowest promotion price among all SKUs (for list page display).
- Order processing logic is unaffected (already calculates per-SKU pricing).

---

## 1. General Conventions

### 1.1 Base URL

- API Prefix: `/api/v1`
- All paths in this document omit `/api/v1`; please append it when making requests.

### 1.2 Authentication

User authenticated endpoints require the following:

```http
Authorization: Bearer <user_token>
```

### 1.3 Unified Response Structure

#### Successful Response

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {},
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_page": 5
  }
}
```

#### Failed Response

```json
{
  "status_code": 400,
  "msg": "invalid request parameters",
  "data": {
    "request_id": "01HR..."
  }
}
```

#### Top-Level Field Description

| Field | Type | Description |
| --- | --- | --- |
| status_code | number | Business status code, `0` indicates success, non-`0` indicates failure |
| msg | string | Business message |
| data | object/array/null | Business data |
| pagination | object | Pagination information, only returned by paginated APIs |

### 1.4 Pagination Parameter Convention

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| page | number | No | 1 | Page number, minimum 1 |
| page_size | number | No | 20 | Number of items per page, maximum 100 |

### 1.5 Common Request Structure

#### CaptchaPayload (Captcha Payload)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| captcha_id | string | No | Image captcha ID (used when provider=image) |
| captcha_code | string | No | Image captcha text (used when provider=image) |
| turnstile_token | string | No | Turnstile Token (used when provider=turnstile) |

#### OrderItemInput (Order Item)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| product_id | number | Yes | Product ID |
| quantity | number | Yes | Purchase quantity (>0) |
| fulfillment_type | string | No | Fulfillment type, recommended values: `manual` / `auto` |

#### ManualFormData (Manual Fulfillment Form Values)

`manual_form_data` is an object where the Key is `product_id` and the Value is the form submission data for that product.

```json
{
  "1001": {
    "receiver_name": "John Doe",
    "phone": "13277745648",
    "address": "Shenzhen, Guangdong..."
  }
}
```

---

## 2. Data Object Field Dictionary

> The following objects are referenced in the "response structure" of subsequent interfaces.

### 2.1 PublicProduct

| Field | Type | Description |
| --- | --- | --- |
| category_id | number | Category ID |
| slug | string | Unique product identifier |
| title | object | Multilingual title |
| description | object | Multilingual summary |
| content | object | Multilingual detailed content |
| price_amount | string | Product price amount |
| images | string[] | List of product images |
| tags | string[] | List of tags |
| purchase_type | string | Purchase access restriction: `guest` / `member` |
| max_purchase_quantity | number | Maximum purchase quantity per order (0 means unlimited) |
| fulfillment_type | string | Delivery type: `manual` / `auto` |
| manual_form_schema | object | Manual delivery form schema |
| manual_stock_available | number | Manually available stock |
| auto_stock_available | number | Automatically available stock |
| stock_status | string | Stock status: `unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| is_sold_out | boolean | Whether sold out |
| category | Category | Category information |
| skus | PublicSKU[] | SKU list |
| promotion_id | number | Applied promotion ID (optional) |
| promotion_name | string | Promotion name (optional) |
| promotion_type | string | Promotion type (optional) |
| promotion_price_amount | string | Promotion price amount (optional) |
| promotion_rules | PromotionRule[] | Promotion rules list (optional) |
| member_prices | MemberLevelPrice[] | Member level price list (optional) |

#### 2.1.1 PublicSKU

Each element in the `skus[]` array has the following structure:

| Field | Type | Description |
| --- | --- | --- |
| id | number | SKU ID (use this ID when placing orders) |
| sku_code | string | SKU code (unique within the same product) |
| spec_values | object | Specification values (multilingual) |
| price_amount | string | SKU original price |
| manual_stock_total | number | Manual stock total (`-1` means unlimited) |
| manual_stock_sold | number | Manual stock sold quantity |
| auto_stock_available | number | Auto-delivery stock available |
| upstream_stock | number | Upstream stock (`-1` = unlimited, `0` = sold out) |
| is_active | boolean | Whether enabled |
| promotion_price_amount | string | SKU promotion price amount (optional) |
| member_price_amount | string | Member price amount (optional) |

#### 2.1.2 PromotionRule

Each element in the `promotion_rules[]` array has the following structure:

| Field | Type | Description |
| --- | --- | --- |
| id | number | Promotion rule ID |
| name | string | Promotion name |
| type | string | Promotion type: `percent` / `fixed` / `special_price` |
| value | string | Promotion value (string amount/percentage, e.g., `"2.00"` or `"5.00"`) |
| min_amount | string | Threshold amount (purchase subtotal = unit price × quantity, e.g., `"200.00"`; `"0.00"` means no threshold) |

> **Promotion types and discount calculation:**
>
> | type | Meaning | Discount calculation (per item) |
> | --- | --- | --- |
> | `percent` | Percentage discount | unit price = original × (100 - value) / 100 |
> | `fixed` | Fixed amount reduction | unit price = original - value |
> | `special_price` | Direct price override | unit price = value |
>
> - All discounts apply to the **per-item unit price**, not the order total.
> - `min_amount` is the purchase subtotal threshold (`unit price × quantity`); once met, each item receives the corresponding discount.
> - A product can have multiple rules with different `min_amount` thresholds to create tiered discounts. The backend matches from highest to lowest, applying the best qualifying tier.

> **Promotion price calculation:** Promotions are configured at the product level, with prices calculated independently for each SKU. For example, if a product has a "2% off" promotion, a 99.00 SKU will have a promotion price of 97.02, while a 77.00 SKU will have a promotion price of 75.46. The product-level `promotion_price_amount` is the lowest promotion price among all SKUs, suitable for list page display. `promotion_rules` returns all active rules (sorted by `min_amount` ascending), even when the current price does not meet the threshold, for frontend promotion hints.

### 2.2 Post

| Field | Type | Description |
| --- | --- | --- |
| id | number | Article ID |
| slug | string | Unique article identifier |
| type | string | Type: `blog` / `notice` |
| title | object | Multilingual title |
| summary | object | Multilingual summary |
| content | object | Multilingual content |
| thumbnail | string | Thumbnail URL |
| published_at | string/null | Publication time |

### 2.3 Banner

| Field | Type | Description |
| --- | --- | --- |
| id | number | Banner ID |
| position | string | Placement position (e.g., `home_hero`) |
| title | object | Multilingual title |
| subtitle | object | Multilingual subtitle |
| image | string | Main image |
| mobile_image | string | Mobile image |
| link_type | string | Link type: `none` / `internal` / `external` |
| link_value | string | Link value |
| open_in_new_tab | boolean | Open in a new tab |

### 2.4 Category

| Field | Type | Description |
| --- | --- | --- |
| id | number | Category ID |
| parent_id | number | Parent category ID (0 means top-level) |
| slug | string | Unique category identifier |
| name | object | Multilingual name |
| icon | string | Category icon |
| sort_order | number | Sort order |

### 2.5 UserProfile

| Field | Type | Description |
| --- | --- | --- |
| id | number | User ID |
| email | string | Email |
| nickname | string | Nickname |
| email_verified_at | string/null | Email verification time |
| locale | string | Language (e.g., `zh-CN`) |
| member_level_id | number | Member level ID |
| total_recharged | string | Total recharged amount |
| total_spent | string | Total spent amount |
| email_change_mode | string | Email change mode: `bind_only` / `change_with_old_and_new` |
| password_change_mode | string | Password change mode: `set_without_old` / `change_with_old` |

### 2.6 UserLoginLog

| Field | Type | Description |
| --- | --- | --- |
| id | number | Log ID |
| user_id | number | User ID (may be 0 if failed) |
| email | string | Login email |
| status | string | Login result: `success` / `failed` |
| fail_reason | string | Failure reason enum |
| client_ip | string | Client IP |
| user_agent | string | Client UA |
| login_source | string | Login source: `web` / `telegram` |
| request_id | string | Request trace ID |
| created_at | string | Record creation time |

### 2.7 OrderPreview

| Field | Type | Description |
| --- | --- | --- |
| currency | string | Currency (site-wide unified, sourced from `site_config.currency`) |
| original_amount | string | Original total amount |
| discount_amount | string | Total discount amount |
| promotion_discount_amount | string | Promotion discount amount |
| total_amount | string | Total payable amount |
| items | OrderPreviewItem[] | Preview order items |

### 2.8 OrderPreviewItem

| Field | Type | Description |
| --- | --- | --- |
| product_id | number | Product ID |
| title | object | Product title snapshot (multilingual) |
| tags | string[] | Product tags snapshot |
| unit_price | string | Unit price |
| quantity | number | Quantity |
| total_price | string | Subtotal |
| coupon_discount_amount | string | Coupon discount allocation amount |
| promotion_discount_amount | string | Promotion discount allocation amount |
| fulfillment_type | string | Fulfillment type |

### 2.9 Order

| Field | Type | Description |
| --- | --- | --- |
| order_no | string | Order number |
| guest_email | string | Guest email (for guest orders) |
| guest_locale | string | Guest language |
| status | string | Order status: `pending_payment` / `paid` / `fulfilling` / `partially_delivered` / `delivered` / `completed` / `canceled` |
| currency | string | Order currency |
| original_amount | string | Original price |
| discount_amount | string | Discount amount |
| member_discount_amount | string | Member discount amount |
| promotion_discount_amount | string | Promotional discount amount |
| total_amount | string | Amount paid |
| wallet_paid_amount | string | Wallet payment amount |
| online_paid_amount | string | Online payment amount |
| refunded_amount | string | Refunded amount |
| expires_at | string/null | Payment expiry time |
| paid_at | string/null | Payment success time |
| canceled_at | string/null | Cancellation time |
| created_at | string | Creation time |
| items | OrderItem[] | Order items |
| fulfillment | Fulfillment | Delivery record (optional) |
| children | Order[] | List of sub-orders (optional) |

### 2.10 OrderItem

| Field | Type | Description |
| --- | --- | --- |
| title | object | Product title snapshot |
| sku_snapshot | object | SKU snapshot (code/spec) |
| tags | string[] | Product tags snapshot |
| unit_price | string | Unit price |
| quantity | number | Quantity |
| total_price | string | Subtotal |
| coupon_discount_amount | string | Coupon allocation amount |
| member_discount_amount | string | Member discount allocation amount |
| promotion_discount_amount | string | Promotion discount amount |
| fulfillment_type | string | Fulfillment type |
| manual_form_schema_snapshot | object | Manual fulfillment form schema snapshot |
| manual_form_submission | object | User-submitted manual form values |

### 2.11 Fulfillment

| Field | Type | Description |
| --- | --- | --- |
| type | string | Delivery type: `auto` / `manual` |
| status | string | Delivery status: `pending` / `delivered` |
| payload | string | Text delivery content |
| payload_line_count | number | Total line count of delivery content |
| delivery_data | object | Structured delivery information |
| delivered_at | string/null | Delivery time |

### 2.12 PaymentLaunch

| Field | Type | Description |
| --- | --- | --- |
| payment_id | number | Payment record ID |
| order_no | string | Order number (returned by `latest` API) |
| channel_id | number | Payment channel ID (returned by `latest` API) |
| provider_type | string | Provider: `official` / `epay` |
| channel_type | string | Channel: `alipay` / `wechat` / `paypal` / `stripe`, etc. |
| interaction_mode | string | Interaction mode: `qr` / `redirect` / `wap` / `page` |
| pay_url | string | Redirect payment link |
| qr_code | string | QR code content |
| expires_at | string/null | Payment order expiration time |

---

## 3. Public APIs (No login required)

### 3.1 Get site configuration

**Endpoint**: `GET /public/config`

**Authentication**: No

#### Request Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "languages": ["zh-CN", "zh-TW", "en-US"],
    "currency": "CNY",
    "contact": {
      "telegram": "https://t.me/dujiaostudio",
      "whatsapp": "https://wa.me/1234567890"
    },
    "site_name": "Dujiao-Next",
    "scripts": [
      {
        "name": "Plausible",
        "enabled": true,
        "position": "head",
        "code": "<script defer data-domain=\"localhost\" src=\"https://xxx.com/js/script.js\"></script>"
      }
    ],
    "payment_channels": [
      {
        "id": 1,
        "name": "Alipay Desktop",
        "provider_type": "official",
        "channel_type": "alipay",
        "interaction_mode": "page",
        "fee_rate": "0.00"
      }
    ],
    "captcha": {
      "provider": "turnstile",
      "scenes": {
        "login": true,
        "register_send_code": true,
        "reset_send_code": false,
        "guest_create_order": false
      },
      "turnstile": {
        "site_key": "0x4AAA..."
      }
    },
    "telegram_auth": {
      "enabled": true,
      "bot_username": "dujiao_auth_bot"
    }
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| languages | string[] | List of enabled site languages |
| currency | string | Site-wide currency (3-letter uppercase code, e.g. `CNY`) |
| contact | object | Contact configuration |
| scripts | object[] | Custom frontend JS script configuration |
| payment_channels | object[] | List of available payment channels on the frontend |
| captcha | object | Public captcha configuration |
| telegram_auth | object | Public Telegram login config (`enabled`, `bot_username`) |
| other fields | any | Public fields from the backend site settings (dynamically extended) |

---

### 3.2 Product List

**Endpoint**: `GET /public/products`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| page | number | No | Page number |
| page_size | number | No | Number of items per page (max 100) |
| category_id | string | No | Category ID |
| search | string | No | Search keyword (title, etc.) |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "category_id": 10,
      "slug": "netflix-plus",
      "title": { "zh-CN": "Netflix Membership" },
      "description": { "zh-CN": "Available in all regions" },
      "content": { "zh-CN": "Detailed description" },
      "price_amount": "99.00",
      "images": ["/uploads/product/1.png"],
      "tags": ["Popular"],
      "purchase_type": "member",
      "fulfillment_type": "manual",
      "manual_form_schema": { "fields": [] },
      "manual_stock_available": 88,
      "auto_stock_available": 0,
      "stock_status": "in_stock",
      "is_sold_out": false
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### Response Structure (data)

- `data`: `PublicProduct[]`
- `pagination`: Pagination object (see general conventions)

---

### 3.3 Product Details

**Endpoint**: `GET /public/products/:slug`

**Authentication**: No

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| slug | string | Yes | Product slug |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "slug": "netflix-plus",
    "title": { "zh-CN": "Netflix Membership" },
    "price_amount": "99.00",
    "fulfillment_type": "manual",
    "manual_form_schema": {
      "fields": [
        {
          "key": "receiver_name",
          "type": "text",
          "required": true,
          "label": { "zh-CN": "Recipient" }
        }
      ]
    },
    "manual_stock_available": 88,
    "auto_stock_available": 0,
    "stock_status": "in_stock",
    "is_sold_out": false
  }
}
```

#### Response Structure (data)

- `data`: `PublicProduct`

---

### 3.4 Article List

**Endpoint**: `GET /public/posts`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| page | number | No | Page number |
| page_size | number | No | Number of items per page |
| type | string | No | Article type: `blog` / `notice` |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "slug": "release-2026-02",
      "type": "notice",
      "title": { "zh-CN": "Release Update" },
      "summary": { "zh-CN": "Added payment channels" },
      "content": { "zh-CN": "Detailed content" },
      "thumbnail": "/uploads/post/1.png",
      "published_at": "2026-02-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### Response Structure (data)

- `data`: `Post[]`
- `pagination`: Pagination object

---

### 3.5 Article Details

**Endpoint**: `GET /public/posts/:slug`

**Authentication**: No

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| slug | string | Yes | Article slug |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 1,
    "slug": "release-2026-02",
    "type": "notice",
    "title": { "zh-CN": "Release Update" },
    "summary": { "zh-CN": "Added payment channels" },
    "content": { "zh-CN": "Detailed content" },
    "thumbnail": "/uploads/post/1.png",
    "published_at": "2026-02-11T10:00:00Z"
  }
}
```

#### Response Structure (data)

- `data`: `Post`

---

### 3.6 Banner List

**Endpoint**: `GET /public/banners`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| position | string | No | `home_hero` | Banner position |
| limit | number | No | 10 | Maximum 50 |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "position": "home_hero",
      "title": { "zh-CN": "Welcome to D&N" },
      "subtitle": { "zh-CN": "Reliable fulfillment" },
      "image": "/uploads/banner/hero.png",
      "mobile_image": "/uploads/banner/hero-mobile.png",
      "link_type": "internal",
      "link_value": "/products",
      "open_in_new_tab": false
    }
  ]
}
```

#### Response Structure (data)

- `data`: `Banner[]`

---

### 3.7 Category List

**Endpoint**: `GET /public/categories`

**Authentication**: No

#### Request Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 10,
      "parent_id": 0,
      "slug": "memberships",
      "name": { "zh-CN": "Membership Services" },
      "icon": "",
      "sort_order": 100
    }
  ]
}
```

#### Response Structure (data)

- `data`: `Category[]`

---

### 3.8 Get Image CAPTCHA Challenge

**Endpoint**: `GET /public/captcha/image`

**Authentication**: No

#### Request Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "captcha_id": "9f2b2be147df4f6eb6f8",
    "image_base64": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| captcha_id | string | ID of this CAPTCHA |
| image_base64 | string | Base64 image (data URL) |

---

## 4. Authentication API (No Login Required)

### 4.1 Send Email Verification Code

**Endpoint**: `POST /auth/send-verify-code`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Email address |
| purpose | string | Yes | Purpose of the verification code: `register` / `reset` |
| captcha_payload | object | No | CAPTCHA parameters (see common structure) |

#### Request Example

```json
{
  "email": "user@example.com",
  "purpose": "register",
  "captcha_payload": {
    "captcha_id": "",
    "captcha_code": "",
    "turnstile_token": ""
  }
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| sent | boolean | Whether the send was successful |

---

### 4.2 User Registration

**Endpoint**: `POST /auth/register`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Email |
| password | string | Yes | Password |
| code | string | Yes | Email verification code |
| agreement_accepted | boolean | Yes | Whether the agreement is accepted, must be `true` |

#### Request Example

```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "code": "123456",
  "agreement_accepted": true
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "user@example.com",
      "nickname": "user",
      "email_verified_at": "2026-02-11T10:00:00Z"
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-18T10:00:00Z"
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| user | object | Registered user information (`id/email/nickname/email_verified_at`) |
| token | string | User JWT |
| expires_at | string | Token expiration time (RFC3339) |

---

### 4.3 User Login

**Endpoint**: `POST /auth/login`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Email |
| password | string | Yes | Password |
| remember_me | boolean | No | Whether to extend login session |
| captcha_payload | object | No | Captcha parameters (see common structure) |

#### Request Example

```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "remember_me": true,
  "captcha_payload": {
    "captcha_id": "",
    "captcha_code": "",
    "turnstile_token": ""
  }
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "user@example.com",
      "nickname": "user",
      "email_verified_at": "2026-02-11T10:00:00Z"
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-25T10:00:00Z"
  }
}
```

#### Response Structure (data)

Consistent with the registration interface: `user + token + expires_at`

---

### 4.4 Forgot Password

**Endpoint**: `POST /auth/forgot-password`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Email |
| code | string | Yes | Email verification code |
| new_password | string | Yes | New password |

#### Request Example

```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "NewStrongPass123"
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "reset": true
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| reset | boolean | Whether the reset was successful |

---

### 4.5 Telegram Login

**Endpoint**: `POST /auth/telegram/login`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Telegram user ID |
| first_name | string | No | First name |
| last_name | string | No | Last name |
| username | string | No | Telegram username |
| photo_url | string | No | Telegram avatar URL |
| auth_date | number | Yes | Telegram auth timestamp (seconds) |
| hash | string | Yes | Telegram login signature |

#### Request Example

```json
{
  "id": 123456789,
  "first_name": "Dujiao",
  "last_name": "User",
  "username": "dujiao_user",
  "photo_url": "https://t.me/i/userpic/320/xxx.jpg",
  "auth_date": 1739250000,
  "hash": "f1b2c3..."
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "telegram_123456789@login.local",
      "nickname": "telegram_123456789",
      "email_verified_at": null
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-25T10:00:00Z"
  }
}
```

#### Response Structure (data)

Same as registration: `user + token + expires_at`

> On first Telegram login without an existing binding, the system auto-creates an account and signs in directly.

---

## 5. Login User Profile API (Bearer Token Required)

### 5.1 Get Current User

**Endpoint**: `GET /me`

**Authentication**: Yes

#### Request Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "user@example.com",
    "nickname": "user",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### Response Structure (data)

- `data`: `UserProfile`

---

### 5.2 Login Log List

**Endpoint**: `GET /me/login-logs`

**Authentication**: Yes

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| page | number | No | Page number |
| page_size | number | No | Number of items per page |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "user_id": 101,
      "email": "user@example.com",
      "status": "success",
      "fail_reason": "",
      "client_ip": "127.0.0.1",
      "user_agent": "Mozilla/5.0",
      "login_source": "web",
      "request_id": "01HR...",
      "created_at": "2026-02-11T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### Response Structure (data)

- `data`: `UserLoginLog[]`
- `pagination`: Pagination object

---

### 5.3 Update User Profile

**Endpoint**: `PUT /me/profile`

**Authentication**: Required

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| nickname | string | No | Nickname |
| locale | string | No | Language, e.g., `zh-CN` |

> At least one of `nickname` or `locale` must be provided.

#### Request Example

```json
{
  "nickname": "new-nickname",
  "locale": "zh-CN"
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "user@example.com",
    "nickname": "new-nickname",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### Response Structure (data)

- `data`: `UserProfile`

---

### 5.4 Get Telegram Binding Status

**Endpoint**: `GET /me/telegram`

**Authentication**: Yes

#### Request Parameters

None

#### Successful Response Example (Bound)

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": true,
    "provider": "telegram",
    "provider_user_id": "123456789",
    "username": "dujiao_user",
    "avatar_url": "https://t.me/i/userpic/320/xxx.jpg",
    "auth_at": "2026-02-20T12:00:00Z",
    "updated_at": "2026-02-20T12:00:00Z"
  }
}
```

#### Successful Response Example (Unbound)

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": false
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| bound | boolean | Whether Telegram is bound |
| provider | string | OAuth provider (`telegram` when bound) |
| provider_user_id | string | Telegram user ID (string) |
| username | string | Telegram username |
| avatar_url | string | Telegram avatar URL |
| auth_at | string | Telegram authorization time |
| updated_at | string | Binding updated time |

> When `bound=false`, only the `bound` field is returned.

---

### 5.5 Bind Telegram

**Endpoint**: `POST /me/telegram/bind`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Telegram user ID |
| first_name | string | No | First name |
| last_name | string | No | Last name |
| username | string | No | Telegram username |
| photo_url | string | No | Telegram avatar URL |
| auth_date | number | Yes | Telegram auth timestamp (seconds) |
| hash | string | Yes | Telegram login signature |

#### Request Example

```json
{
  "id": 123456789,
  "first_name": "Dujiao",
  "last_name": "User",
  "username": "dujiao_user",
  "photo_url": "https://t.me/i/userpic/320/xxx.jpg",
  "auth_date": 1739250000,
  "hash": "f1b2c3..."
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": true,
    "provider": "telegram",
    "provider_user_id": "123456789",
    "username": "dujiao_user",
    "avatar_url": "https://t.me/i/userpic/320/xxx.jpg",
    "auth_at": "2026-02-20T12:00:00Z",
    "updated_at": "2026-02-20T12:00:00Z"
  }
}
```

#### Response Structure (data)

Same as `GET /me/telegram` (bound case).

---

### 5.6 Unbind Telegram

**Endpoint**: `DELETE /me/telegram/unbind`

**Authentication**: Yes

#### Request Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "unbound": true
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| unbound | boolean | Whether unbinding succeeded |

> If the user has not bound a real email yet (`email_change_mode=bind_only`), unbinding Telegram is not allowed.

---

### 5.7 Send Verification Code to Change Email

**Endpoint**: `POST /me/email/send-verify-code`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| kind | string | Yes | `old` (send to old email) / `new` (send to new email) |
| new_email | string | Conditionally required | Required when `kind=new` |

> When `email_change_mode=bind_only`, `kind=old` is not available. Use `kind=new` to bind a real email.

#### Request Example

```json
{
  "kind": "new",
  "new_email": "new@example.com"
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| sent | boolean | Whether the sending was successful |

---

### 5.8 Change Email

**Endpoint**: `POST /me/email/change`

**Authentication**: Required

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| new_email | string | Yes | New email |
| old_code | string | Conditionally required | Required when `email_change_mode=change_with_old_and_new`; optional and ignored when `bind_only` |
| new_code | string | Yes | Verification code of the new email |

#### Request Example

```json
{
  "new_email": "new@example.com",
  "old_code": "123456",
  "new_code": "654321"
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "new@example.com",
    "nickname": "user",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### Response Structure (data)

- `data`: `UserProfile`

---

### 5.9 Change Password

**Endpoint**: `PUT /me/password`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| old_password | string | Conditionally required | Required when `password_change_mode=change_with_old`; optional when `set_without_old` |
| new_password | string | Yes | New password |

> For accounts auto-created via Telegram that have never set a password, `password_change_mode=set_without_old`; only `new_password` is needed.

#### Request Example

```json
{
  "old_password": "OldPass123",
  "new_password": "NewPass123"
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "updated": true
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| updated | boolean | Whether the update was successful |

---

## 6. User Order and Payment API (Requires Bearer Token)

### 6.1 Order Amount Preview

**Endpoint**: `POST /orders/preview`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| items | OrderItemInput[] | Yes | Order items |
| coupon_code | string | No | Coupon code |
| manual_form_data | object | No | Values submitted from manual delivery form (see general structure) |

#### Request Example

```json
{
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "coupon_code": "SPRING2026",
  "manual_form_data": {
    "1001": {
      "receiver_name": "John Doe",
      "phone": "13277745648",
      "address": "Nanshan District, Shenzhen, Guangdong"
    }
  }
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "currency": "CNY",
    "original_amount": "99.00",
    "discount_amount": "10.00",
    "promotion_discount_amount": "5.00",
    "total_amount": "84.00",
    "items": [
      {
        "product_id": 1001,
        "title": { "zh-CN": "Netflix Membership" },
        "tags": ["Popular"],
        "unit_price": "99.00",
        "quantity": 1,
        "total_price": "99.00",
        "coupon_discount_amount": "10.00",
        "promotion_discount_amount": "5.00",
        "fulfillment_type": "manual"
      }
    ]
  }
}
```

#### Response Structure (data)

- `data`: `OrderPreview`

---

### 6.2 Create Order

**Endpoint**: `POST /orders`

**Authentication**: Yes

#### Body Parameters

Same as `POST /orders/preview`.

#### Request Example

```json
{
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "John Doe",
      "phone": "13277745648",
      "address": "Nanshan District, Shenzhen, Guangdong"
    }
  }
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "original_amount": "99.00",
    "discount_amount": "0.00",
    "promotion_discount_amount": "0.00",
    "total_amount": "99.00",
    "expires_at": "2026-02-11T12:30:00Z",
    "items": [
      {
        "title": { "zh-CN": "Netflix Membership" },
        "quantity": 1,
        "unit_price": "99.00",
        "total_price": "99.00",
        "coupon_discount_amount": "0.00",
        "promotion_discount_amount": "0.00",
        "fulfillment_type": "manual",
        "manual_form_schema_snapshot": {
          "fields": [
            { "key": "receiver_name", "type": "text", "required": true }
          ]
        },
        "manual_form_submission": {
          "receiver_name": "John Doe"
        }
      }
    ]
  }
}
```

#### Response Structure (data)

- `data`: `Order`

---

### 6.3 Order List

**Endpoint**: `GET /orders`

**Authentication**: Yes

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| page | number | No | Page number |
| page_size | number | No | Number of items per page |
| status | string | No | Status filter (see `Order.status` enum) |
| order_no | string | No | Fuzzy search by order number |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "order_no": "DN202602110001",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "created_at": "2026-02-11T12:00:00Z",
      "items": [
        {
          "title": { "zh-CN": "Netflix Membership" },
          "quantity": 1,
          "unit_price": "99.00",
          "total_price": "99.00",
          "coupon_discount_amount": "0.00",
          "promotion_discount_amount": "0.00",
          "fulfillment_type": "manual",
          "manual_form_schema_snapshot": {},
          "manual_form_submission": {}
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### Response Structure (data)

- `data`: `Order[]`
- `pagination`: Pagination object

---

### 6.4 Order Details

**Endpoint**: `GET /orders/:order_no`

**Authentication**: Yes

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order number |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "total_amount": "99.00",
    "items": [
      {
        "title": { "zh-CN": "Netflix Membership" },
        "quantity": 1,
        "unit_price": "99.00",
        "total_price": "99.00",
        "coupon_discount_amount": "0.00",
        "promotion_discount_amount": "0.00",
        "fulfillment_type": "manual",
        "manual_form_schema_snapshot": {},
        "manual_form_submission": {}
      }
    ],
    "fulfillment": null,
    "children": []
  }
}
```

#### Response Structure (data)

- `data`: `Order`

---

### 6.5 Cancel Order

**Endpoint**: `POST /orders/:order_no/cancel`

**Authentication**: Yes

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order number |

#### Body Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "canceled",
    "currency": "CNY",
    "total_amount": "99.00",
    "canceled_at": "2026-02-11T12:10:00Z"
  }
}
```

#### Response Structure (data)

- `data`: `Order`

---

### 6.6 Create Payment Order

**Endpoint**: `POST /payments`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order number |
| channel_id | number | Yes | Payment Channel ID |

#### Request Example

```json
{
  "order_no": "DN202602110001",
  "channel_id": 10
}
```

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "provider_type": "official",
    "channel_type": "alipay",
    "interaction_mode": "page",
    "pay_url": "https://openapi.alipay.com/gateway.do?...",
    "qr_code": "",
    "expires_at": "2026-02-11T12:30:00Z"
  }
}
```

#### Response Structure (data)

- `data`: `PaymentLaunch` (usually does not include `order_no/channel_id` fields when creating a payment)

---

### 6.7 Capture Payment Result

**Endpoint**: `POST /payments/:id/capture`

**Authentication**: Yes

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Payment record ID |

#### Body Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "status": "success"
  }
}
```

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| payment_id | number | Payment record ID |
| status | string | Payment status: `initiated` / `pending` / `success` / `failed` / `expired` |

---

### 6.8 Get Latest Pending Payment Record

**Endpoint**: `GET /payments/latest`

**Authentication**: Yes

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order number |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "order_no": "DN202602110001",
    "channel_id": 10,
    "provider_type": "official",
    "channel_type": "alipay",
    "interaction_mode": "page",
    "pay_url": "https://openapi.alipay.com/gateway.do?...",
    "qr_code": "",
    "expires_at": "2026-02-11T12:30:00Z"
  }
}
```

#### Response Structure (data)

- `data`: `PaymentLaunch`

---

## 7. Guest Orders and Payment Interface

> Guest order access credentials: `email + order_password`.

### 7.1 Guest Order Preview

**Endpoint**: `POST /guest/orders/preview`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |
| items | OrderItemInput[] | Yes | Order items |
| coupon_code | string | No | Coupon code |
| manual_form_data | object | No | Submitted values for manual delivery form |
| captcha_payload | object | No | Captcha parameters (not validated in current preview, can be ignored) |

#### Request Example

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "John Doe",
      "phone": "13277745648",
      "address": "Nanshan District, Shenzhen, Guangdong"
    }
  }
}
```

#### Successful Response Example

Same as `POST /orders/preview`.

#### Response Structure (data)

- `data`: `OrderPreview`

---

### 7.2 Guest Creates Order

**Endpoint**: `POST /guest/orders`

**Authentication**: No

#### Body Parameters

Same as `POST /guest/orders/preview`.

#### Request Example

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "John Doe",
      "phone": "13277745648",
      "address": "Nanshan District, Shenzhen, Guangdong"
    }
  },
  "captcha_payload": {
    "captcha_id": "abc",
    "captcha_code": "x7g5",
    "turnstile_token": ""
  }
}
```

#### Successful Response Example

Same as `POST /orders` (for guest orders, `user_id=0`, `guest_email` has a value).

#### Response Structure (data)

- `data`: `Order`

---

### 7.3 Guest Order List

**Endpoint**: `GET /guest/orders`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |
| order_no | string | No | Order number, if provided, queries by order number and returns 0/1 record |
| page | number | No | Page number |
| page_size | number | No | Number of items per page |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "order_no": "DN202602110002",
      "guest_email": "guest@example.com",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "items": [
        {
          "title": { "zh-CN": "Netflix Membership" },
          "quantity": 1,
          "unit_price": "99.00",
          "total_price": "99.00",
          "coupon_discount_amount": "0.00",
          "promotion_discount_amount": "0.00",
          "fulfillment_type": "manual",
          "manual_form_schema_snapshot": {},
          "manual_form_submission": {}
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### Response Structure (data)

- `data`: `Order[]`
- `pagination`: Pagination object

---

### 7.4 Guest Order Details

**Endpoint**: `GET /guest/orders/:order_no`

**Authentication**: No

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order number |

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |

#### Successful Response Example

Same structure as user order details.

#### Response Structure (data)

- `data`: `Order`

---

### 7.5 Guest Create Payment

**Endpoint**: `POST /guest/payments`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |
| order_no | string | Yes | Order number |
| channel_id | number | Yes | Payment channel ID |

#### Request Example

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "order_no": "DN202602110002",
  "channel_id": 10
}
```

#### Successful Response Example

Matches the structure returned by `POST /payments`.

#### Response Structure (data)

- `data`: `PaymentLaunch`

---

### 7.6 Guest Capture Payment Result

**Endpoint**: `POST /guest/payments/:id/capture`

**Authentication**: No

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Payment record ID |

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |

#### Request Example

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass"
}
```

#### Successful Response Example

Same as `POST /payments/:id/capture`.

#### Response Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| payment_id | number | Payment record ID |
| status | string | Payment status |

---

### 7.7 Guest Get Latest Pending Payment Record

**Endpoint**: `GET /guest/payments/latest`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |
| order_no | string | Yes | Order number |

#### Successful Response Example

Same as `GET /payments/latest`.

#### Response Structure (data)

- `data`: `PaymentLaunch`

---

## 8. Frontend Integration Recommendations

### 8.1 All Order Endpoints Use `order_no`

All user-facing order endpoints now use `order_no` as the identifier, no longer exposing auto-increment IDs:

- `GET /orders/:order_no` — Order details
- `POST /orders/:order_no/cancel` — Cancel order
- `GET /orders/:order_no/fulfillment/download` — Download fulfillment content
- `GET /guest/orders/:order_no` — Guest order details
- `GET /guest/orders/:order_no/fulfillment/download` — Guest download fulfillment content
- `POST /payments`, `GET /payments/latest` — Use `order_no` parameter

### 8.2 Unified Error Handling

The frontend must check both:

- HTTP status (network layer)
- `status_code` (business layer)

When `status_code != 0`, please read the `msg` for prompts and record `data.request_id` for troubleshooting.

### 8.3 Payment Success Page and Polling

It is recommended to combine the payment process as follows:

1. After initiating payment, redirect to `pay_url` or display `qr_code`
2. After payment completion and redirect, call `capture`
3. Then call `latest` as a fallback polling check

This can significantly reduce the perceived issue of "payment made but the page not updating in time."

---

## 9. Interfaces Not Actively Called by the Frontend (Explanation)

### 9.1 Payment Platform Callback Interfaces

The following callback interfaces are generally called by the payment platform's server, so the frontend template does not need to actively request them:

- `POST /payments/callback`
- `GET /payments/callback`
- `POST /payments/webhook/paypal`
- `POST /payments/webhook/stripe`

### 9.2 Admin Telegram Login Settings APIs

The following endpoints are for the admin panel and are not frontend user APIs:

#### 9.2.1 Get Telegram Login Settings

**Endpoint**: `GET /admin/settings/telegram-auth`

**Authentication**: Admin token

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "enabled": true,
    "bot_username": "dujiao_auth_bot",
    "bot_token": "",
    "has_bot_token": true,
    "login_expire_seconds": 300,
    "replay_ttl_seconds": 300
  }
}
```

> `bot_token` is always masked as an empty string. Use `has_bot_token` to check whether a token is configured.

#### 9.2.2 Update Telegram Login Settings

**Endpoint**: `PUT /admin/settings/telegram-auth`

**Authentication**: Admin token

#### Body Parameters (Patch)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| enabled | boolean | No | Whether Telegram login is enabled |
| bot_username | string | No | Telegram bot username (without `@`) |
| bot_token | string | No | Telegram bot token (empty string will not overwrite existing value) |
| login_expire_seconds | number | No | Login validity window (30-86400 seconds) |
| replay_ttl_seconds | number | No | Replay-protection TTL (60-86400 seconds) |

#### Request Example

```json
{
  "enabled": true,
  "bot_username": "dujiao_auth_bot",
  "bot_token": "123456:ABCDEF",
  "login_expire_seconds": 300,
  "replay_ttl_seconds": 300
}
```

#### Successful Response

Same structure as `GET /admin/settings/telegram-auth` (masked).

### 9.3 Admin Product Multi-SKU APIs

The following endpoints are used by the admin panel and are not frontend user APIs.

#### 9.3.1 Create Product (Multi-SKU Supported)

**Endpoint**: `POST /admin/products`
**Authentication**: Admin token

#### Key Body Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| category_id | number | Yes | Category ID |
| slug | string | Yes | Unique product slug |
| title | object | Yes | Localized title |
| price_amount | number | Yes | Product price in single-SKU mode; when using multi-SKU, you can pass `0` or any placeholder value, final value is derived from SKUs |
| fulfillment_type | string | No | `manual` / `auto` |
| manual_stock_total | number | No | Total manual stock in single-SKU mode |
| skus | array | No | Multi-SKU array; empty or omitted means single-SKU mode |

#### `skus[]` Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | No | Pass when updating an existing SKU; omit for new SKU |
| sku_code | string | Yes | SKU code (unique within the same product) |
| spec_values | object | No | SKU display labels (e.g. localized `{"en-US":"Standard","zh-CN":"标准版"}`) |
| price_amount | number | Yes | SKU price (must be greater than 0) |
| manual_stock_total | number | No | SKU manual stock (effective in manual fulfillment mode) |
| is_active | boolean | No | Whether SKU is active, default `true` |
| sort_order | number | No | Sort weight, default `0`; higher value appears earlier |

#### Request Example (Single-SKU Compatible)

```json
{
  "category_id": 1,
  "slug": "vpn-monthly",
  "title": {
    "zh-CN": "VPN 月付",
    "zh-TW": "VPN 月付",
    "en-US": "VPN Monthly"
  },
  "price_amount": 29.9,
  "fulfillment_type": "manual",
  "manual_stock_total": 100
}
```

#### Request Example (Multi-SKU)

```json
{
  "category_id": 1,
  "slug": "vpn-subscription",
  "title": {
    "zh-CN": "VPN 订阅",
    "zh-TW": "VPN 訂閱",
    "en-US": "VPN Subscription"
  },
  "price_amount": 0,
  "fulfillment_type": "manual",
  "skus": [
    {
      "sku_code": "STANDARD",
      "spec_values": {
        "zh-CN": "标准版",
        "zh-TW": "標準版",
        "en-US": "Standard"
      },
      "price_amount": 29.9,
      "manual_stock_total": 100,
      "is_active": true,
      "sort_order": 10
    },
    {
      "sku_code": "PRO",
      "spec_values": {
        "zh-CN": "专业版",
        "zh-TW": "專業版",
        "en-US": "Pro"
      },
      "price_amount": 49.9,
      "manual_stock_total": 80,
      "is_active": true,
      "sort_order": 20
    }
  ]
}
```

#### 9.3.2 Update Product (Multi-SKU Supported)

**Endpoint**: `PUT /admin/products/:id`
**Authentication**: Admin token

Request body is the same as `POST /admin/products`; to update existing SKUs, pass their `id` in `skus[]`.

#### 9.3.3 Backend Derivation Rules

- When `skus` is not empty:
  - product display price is auto-derived from the lowest active SKU price;
  - in manual fulfillment mode, product manual stock total is auto-summed from active SKU `manual_stock_total`.
- When `skus` is empty:
  - legacy single-SKU mode applies, and product-level price/stock fields are used.

#### 9.3.4 Admin UI Operation Guide

1. Open Admin `Product Management`, then create or edit a product.
2. In the `SKU configuration` section, add one or more SKUs and fill code, labels, price, stock, status, and sort order.
3. Once SKU mode is configured, product-level `price/manual stock` fields are informational; effective values come from SKUs.
4. Save and verify SKU selection/display on the frontend product detail page.

### 9.4 Affiliate APIs

These endpoints support frontend affiliate center features and admin affiliate review workflows.

#### 9.4.1 Order APIs Add `affiliate_code`

The request body of the following endpoints supports optional `affiliate_code` (affiliate ID):

- `POST /orders/preview`
- `POST /orders`
- `POST /guest/orders/preview`
- `POST /guest/orders`

Field definition:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| affiliate_code | string | No | Affiliate ID (for example `AB12CD34`) used for commission attribution |

#### 9.4.2 Public Click Tracking

**Endpoint**: `POST /public/affiliate/click`
**Authentication**: None

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| affiliate_code | string | Yes | Affiliate ID |
| visitor_key | string | No | Visitor identifier (can be persisted by frontend) |
| landing_path | string | No | Landing path (for example `/?aff=AB12CD34`) |
| referrer | string | No | Referrer page URL |

Successful response:

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "ok": true
  }
}
```

#### 9.4.3 User Affiliate Center APIs (Bearer Token Required)

##### A) Open Affiliate

- **Endpoint**: `POST /affiliate/open`
- **Description**: Returns the affiliate profile after activation (including affiliate ID).

##### B) Get Affiliate Dashboard

- **Endpoint**: `GET /affiliate/dashboard`

Key `data` fields:

| Field | Type | Description |
| --- | --- | --- |
| opened | boolean | Whether affiliate is activated |
| affiliate_code | string | Affiliate ID |
| promotion_path | string | Promotion path (for example `/?aff=AB12CD34`) |
| click_count | number | Click count |
| valid_order_count | number | Valid order count |
| conversion_rate | number | Conversion rate (percentage value) |
| pending_commission | string | Pending commission |
| available_commission | string | Withdrawable commission |
| withdrawn_commission | string | Withdrawn commission |

##### C) Get My Commission Records

- **Endpoint**: `GET /affiliate/commissions`
- **Query params**: `page`, `page_size`, `status`
- **status values**: `pending_confirm` / `available` / `rejected` / `withdrawn`

##### D) Get My Withdraw Records

- **Endpoint**: `GET /affiliate/withdraws`
- **Query params**: `page`, `page_size`, `status`
- **status values**: `pending_review` / `rejected` / `paid`

##### E) Apply for Withdraw

- **Endpoint**: `POST /affiliate/withdraws`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| amount | string | Yes | Withdraw amount (string amount with 2 decimal places) |
| channel | string | Yes | Withdraw channel |
| account | string | Yes | Withdraw account |

#### 9.4.4 Admin Affiliate Settings APIs

##### A) Get Affiliate Settings

- **Endpoint**: `GET /admin/settings/affiliate`
- **Authentication**: Admin token

##### B) Update Affiliate Settings

- **Endpoint**: `PUT /admin/settings/affiliate`
- **Authentication**: Admin token

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| enabled | boolean | Yes | Whether affiliate is enabled |
| commission_rate | number | Yes | Commission rate (0-100, up to 2 decimals) |
| confirm_days | number | Yes | Commission confirmation days (0-3650) |
| min_withdraw_amount | number | Yes | Minimum withdraw amount (>=0) |
| withdraw_channels | string[] | Yes | Withdraw channel list |

#### 9.4.5 Admin Affiliate Management APIs

The following endpoints all require Admin token:

| Endpoint | Description |
| --- | --- |
| `GET /admin/affiliates/users` | Affiliate user list |
| `GET /admin/affiliates/commissions` | Commission record list |
| `GET /admin/affiliates/withdraws` | Withdraw request list |
| `POST /admin/affiliates/withdraws/:id/reject` | Reject withdraw request |
| `POST /admin/affiliates/withdraws/:id/pay` | Mark withdraw as paid |

Notes:

- `POST /admin/affiliates/withdraws/:id/reject` body supports `{ "reason": "rejection reason" }`
- `POST /admin/affiliates/withdraws/:id/pay` requires no extra body fields
