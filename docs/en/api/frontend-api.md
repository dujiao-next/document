---
outline: deep
---

# User Frontend API Documentation

> Last Updated: 2026-02-22

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

## 0. v0.0.3-beta API Changes (2026-02-22)

### 0.1 Unified Currency Strategy

- The site now supports only one currency, sourced from `site_config.currency` (default: `CNY`).
- Currency must be a 3-letter uppercase code (e.g. `CNY`, `USD`); invalid values are normalized to `CNY`.
- Amount-related APIs (order preview, orders, payments, wallet) now consistently use this site currency.

### 0.2 Breaking Field Changes

- `PublicProduct.price_currency` has been removed.
- `PublicProduct.promotion_price_currency` has been removed.
- If your frontend still reads these fields, switch to `currency` from `GET /public/config`.

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
| id | number | Product ID |
| category_id | number | Category ID |
| slug | string | Unique product identifier |
| title | object | Multilingual title, e.g., `{ "zh-CN": "...", "en-US": "..." }` |
| description | object | Multilingual summary |
| content | object | Multilingual detailed content |
| price_amount | string | Product price amount (string format, e.g., `"99.00"`) |
| images | string[] | List of product images |
| tags | string[] | List of tags |
| purchase_type | string | Purchase access restriction: `guest` / `member` |
| fulfillment_type | string | Delivery type: `manual` / `auto` |
| manual_form_schema | object | Manual delivery form schema |
| manual_stock_total | number | Total manual stock (0 means unlimited) |
| manual_stock_locked | number | Manual stock locked quantity |
| manual_stock_sold | number | Manual stock sold quantity |
| is_active | boolean | Whether the product is active |
| sort_order | number | Sort order |
| created_at | string | Creation time |
| updated_at | string | Update time |
| category | object | Category information (optional) |
| promotion_id | number | Applied promotion ID (optional) |

| promotion_name | string | Promotion name (optional) |
| promotion_type | string | Promotion type (optional) |
| promotion_price_amount | string | Promotion price amount (optional) |
| manual_stock_available | number | Manually available stock |
| auto_stock_available | number | Automatically available stock |
| stock_status | string | Stock status: `unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| is_sold_out | boolean | Whether sold out |

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
| is_published | boolean | Whether published |
| published_at | string/null | Publication time |
| created_at | string | Creation time |

### 2.3 Banner

| Field | Type | Description |
| --- | --- | --- |
| id | number | Banner ID |
| name | string | Backend name |
| position | string | Placement position (e.g., `home_hero`) |
| title | object | Multilingual title |
| subtitle | object | Multilingual subtitle |
| image | string | Main image |
| mobile_image | string | Mobile image |
| link_type | string | Link type: `none` / `internal` / `external` |
| link_value | string | Link value |
| open_in_new_tab | boolean | Open in a new tab |
| is_active | boolean | Is active |
| start_at | string/null | Start time |
| end_at | string/null | End time |
| sort_order | number | Sort order |
| created_at | string | Creation time |
| updated_at | string | Update time |

### 2.4 Category

| Field | Type | Description |
| --- | --- | --- |
| id | number | Category ID |
| slug | string | Unique category identifier |
| name | object | Multilingual name |
| sort_order | number | Sort order |
| created_at | string | Creation time |

### 2.5 UserProfile

| Field | Type | Description |
| --- | --- | --- |
| id | number | User ID |
| email | string | Email |
| nickname | string | Nickname |
| email_verified_at | string/null | Email verification time |
| locale | string | Language (e.g., `zh-CN`) |
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
| id | number | Order ID |
| order_no | string | Order number (recommended for queries) |
| parent_id | number/null | Parent order ID |
| user_id | number | User ID, generally 0 for guest orders |
| guest_email | string | Guest email (for guest orders) |
| guest_locale | string | Guest language |
| status | string | Order status: `pending_payment` / `paid` / `fulfilling` / `partially_delivered` / `delivered` / `completed` / `canceled` |
| currency | string | Order currency (site-wide unified, sourced from `site_config.currency`) |
| original_amount | string | Original price |
| discount_amount | string | Discount amount |
| promotion_discount_amount | string | Promotional discount amount |
| total_amount | string | Amount paid |
| coupon_id | number/null | Coupon ID |
| promotion_id | number/null | Promotion ID |
| client_ip | string | Order IP |
| expires_at | string/null | Payment expiry time |
| paid_at | string/null | Payment success time |
| canceled_at | string/null | Cancellation time |
| created_at | string | Creation time |
| updated_at | string | Update time |
| items | OrderItem[] | Order items |

| fulfillment | Fulfillment | Delivery record (optional) |
| children | Order[] | List of sub-orders (optional) |

### 2.10 OrderItem

| Field | Type | Description |
| --- | --- | --- |
| id | number | Order item ID |
| order_id | number | Order ID |
| product_id | number | Product ID |
| title | object | Product title snapshot |
| tags | string[] | Product tags snapshot |
| unit_price | string | Unit price |
| quantity | number | Quantity |
| total_price | string | Subtotal |
| coupon_discount_amount | string | Coupon allocation amount |
| promotion_discount_amount | string | Promotion discount amount |
| promotion_id | number/null | Promotion ID |
| promotion_name | string | Promotion name (optional) |
| fulfillment_type | string | Fulfillment type |
| manual_form_schema_snapshot | object | Manual fulfillment form schema snapshot |
| manual_form_submission | object | User-submitted manual form values (cleaned) |
| created_at | string | Creation time |
| updated_at | string | Update time |

### 2.11 Fulfillment

| Field | Type | Description |
| --- | --- | --- |
| id | number | Delivery record ID |
| order_id | number | Order ID |
| type | string | Delivery type: `auto` / `manual` |
| status | string | Delivery status: `pending` / `delivered` |
| payload | string | Text delivery content |
| delivery_data | object | Structured delivery information (e.g., tracking number, download info, etc.) |
| delivered_by | number/null | Delivery administrator ID |
| delivered_at | string/null | Delivery time |
| created_at | string | Creation time |
| updated_at | string | Update time |

### 2.12 PaymentLaunch

| Field | Type | Description |
| --- | --- | --- |
| payment_id | number | Payment record ID |
| order_id | number | Order ID (returned by `latest` API) |
| channel_id | number | Payment channel ID (returned by `latest` API) |
| provider_type | string | Provider: `official` / `epay` |
| channel_type | string | Channel: `alipay` / `wechat` / `paypal` / `stripe`, etc. |
| interaction_mode | string | Interaction mode: `qr` / `redirect` / `wap` / `page` |
| pay_url | string | Redirect payment link (redirect/wap/page) |
| qr_code | string | QR code content (qr) |
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
      "id": 1001,
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
      "manual_stock_total": 100,
      "manual_stock_locked": 2,
      "manual_stock_sold": 10,
      "is_active": true,
      "sort_order": 100,
      "created_at": "2026-02-10T10:00:00Z",
      "updated_at": "2026-02-10T10:00:00Z",
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

#### Example of Successful Response

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 1001,
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
      "is_published": true,
      "published_at": "2026-02-11T10:00:00Z",
      "created_at": "2026-02-11T09:00:00Z"
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
    "is_published": true,
    "published_at": "2026-02-11T10:00:00Z",
    "created_at": "2026-02-11T09:00:00Z"
  }
}
```
#### Return Structure (data)

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

#### Example of Successful Response

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "name": "Homepage Hero Banner",
      "position": "home_hero",
      "title": { "zh-CN": "Welcome to D&N" },
      "subtitle": { "zh-CN": "Reliable fulfillment" },
      "image": "/uploads/banner/hero.png",
      "mobile_image": "/uploads/banner/hero-mobile.png",
      "link_type": "internal",
      "link_value": "/products",
      "open_in_new_tab": false,
      "is_active": true,
      "start_at": null,
      "end_at": null,
      "sort_order": 100,
      "created_at": "2026-02-11T08:00:00Z",
      "updated_at": "2026-02-11T08:00:00Z"
    }
  ]
}
```
#### Return Structure (data)

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
      "slug": "memberships",
      "name": { "zh-CN": "Membership Services" },
      "sort_order": 100,
      "created_at": "2026-02-10T10:00:00Z"
    }
  ]
}
```
#### Return Structure (data)

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
#### Return Structure (data)

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
#### Return Structure (data)

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
#### Return Structure (data)

Consistent with the registration interface: `user   token   expires_at`

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
#### Return Structure (data)

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
#### Return Structure (data)

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
#### Return Structure (data)

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
    "id": 501,
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
        "id": 9001,
        "order_id": 501,
        "product_id": 1001,
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
#### Return Structure (data)

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

#### Example of Successful Response

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 501,
      "order_no": "DN202602110001",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "created_at": "2026-02-11T12:00:00Z",
      "items": [
        {
          "id": 9001,
          "order_id": 501,
          "product_id": 1001,
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

### 6.4 Order Details (by ID)

**Endpoint**: `GET /orders/:id`

**Authentication**: Required

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Order ID |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 501,
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "total_amount": "99.00",
    "items": [
      {
        "id": 9001,
        "order_id": 501,
        "product_id": 1001,
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

### 6.5 Order Details (by Order Number)

**Endpoint**: `GET /orders/by-order-no/:order_no`

**Authentication**: Yes

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_no | string | Yes | Order Number |

#### Successful Response Example

Same as `GET /orders/:id`.

#### Response Structure (data)

- `data`: `Order`

---

### 6.6 Cancel Order

**Endpoint**: `POST /orders/:id/cancel`

**Authentication**: Yes

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Order ID |

#### Body Parameters

None

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 501,
    "order_no": "DN202602110001",
    "status": "canceled",
    "currency": "CNY",
    "total_amount": "99.00",
    "canceled_at": "2026-02-11T12:10:00Z"
  }
}
```
#### Return Structure (data)

- `data`: `Order`

---

### 6.7 Create Payment Order

**Endpoint**: `POST /payments`

**Authentication**: Yes

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| order_id | number | Yes | Order ID |
| channel_id | number | Yes | Payment Channel ID |

#### Request Example

```json
{
  "order_id": 501,
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
#### Return Structure (data)

- `data`: `PaymentLaunch` (usually does not include `order_id/channel_id` fields when creating a payment)

---

### 6.8 Capture Payment Result

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
#### Return Structure (data)

| Field | Type | Description |
| --- | --- | --- |
| payment_id | number | Payment record ID |
| status | string | Payment status: `initiated` / `pending` / `success` / `failed` / `expired` |

---

### 6.9 Get Latest Pending Payment Record

**Endpoint**: `GET /payments/latest`

**Authentication**: Yes

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| order_id | number | Yes | Order ID |

#### Successful Response Example

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "order_id": 501,
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
#### Return Structure (data)

- `data`: `PaymentLaunch`

---

## 7. Guest Orders and Payment Interface

> Guest order access credentials: `email   order_password`.

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

#### Return Structure (data)

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
      "id": 601,
      "order_no": "DN202602110002",
      "user_id": 0,
      "guest_email": "guest@example.com",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "items": [
        {
          "id": 9101,
          "order_id": 601,
          "product_id": 1001,
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

### 7.4 Guest Order Details (by ID)

**Endpoint**: `GET /guest/orders/:id`

**Authentication**: No

#### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | number | Yes | Order ID |

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

### 7.5 Guest Order Details (by Order Number)

**Endpoint**: `GET /guest/orders/by-order-no/:order_no`

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

Same as `GET /guest/orders/:id`.

#### Response Structure (data)

- `data`: `Order`

---

### 7.6 Guest Create Payment

**Endpoint**: `POST /guest/payments`

**Authentication**: No

#### Body Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Visitor's email |
| order_password | string | Yes | Query password |
| order_id | number | Yes | Order ID |
| channel_id | number | Yes | Payment channel ID |

#### Request Example

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "order_id": 601,
  "channel_id": 10
}
```
#### Successful Response Example

Matches the structure returned by `POST /payments`.

#### Response Structure (data)

- `data`: `PaymentLaunch`

---

### 7.7 Guest Capture Payment Result

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

### 7.8 Guest Fetching Latest Pending Payment Record

**Endpoint**: `GET /guest/payments/latest`

**Authentication**: No

#### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| email | string | Yes | Guest email |
| order_password | string | Yes | Query password |
| order_id | number | Yes | Order ID |

#### Successful Response Example

Same as `GET /payments/latest`.

#### Response Structure (data)

- `data`: `PaymentLaunch`

---

## 8. Frontend Integration Recommendations

### 8.1 Prefer Using `order_no` for Order Details

Whenever possible, use:

- `GET /orders/by-order-no/:order_no`
- `GET /guest/orders/by-order-no/:order_no`

Avoid relying on the auto-increment `id` on the frontend long-term.

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

It can significantly reduce the perceived issue of 'payment made but the page not updating in time.'

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
