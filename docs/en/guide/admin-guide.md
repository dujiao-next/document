---
outline: deep
---

# Admin Panel Guide

> Updated: 2026-03-28

This guide introduces the core features and workflows of the Dujiao-Next admin panel, helping administrators get started with day-to-day operations quickly.

---

## 1. Logging In

- Default address: `http://localhost:5174` (development) or your deployed admin domain
- Log in with your admin credentials
- On first deployment, the admin account is configured under the `bootstrap` section in `config.yml`

---

## 2. Dashboard

After logging in, you will see the dashboard overview page with key metrics:

### 2.1 Core Metrics

| Metric | Description |
|--------|-------------|
| Total Orders | Number of orders created within the period |
| Paid Orders | Number of orders with successful payments |
| Completed Orders | Number of delivered/completed orders |
| Pending Payment | Number of orders awaiting payment |
| GMV (Gross Merchandise Value) | Total amount of paid orders |
| Total Cost | Total cost of goods sold |
| Profit | GMV - Total Cost |
| Profit Margin | Profit / GMV x 100% |
| Payment Success Rate | Successful payments / Payment attempts |
| New Users | Number of newly registered users within the period |

### 2.2 Conversion Funnel

The dashboard displays the full conversion pipeline from order creation to completion:

```
Order Created -> Payment Initiated -> Payment Succeeded -> Order Paid -> Order Completed
```

Two key conversion metrics are included: Payment Conversion Rate and Completion Rate.

### 2.3 Inventory Alerts

The system automatically detects and alerts on:

- Number of out-of-stock products
- Number of low-stock products (including at the SKU level)
- Pending payment order backlog
- Abnormal payment failure rates

### 2.4 Rankings and Trends

- **Trend Charts**: Daily trends for order count, payment amount, profit, etc.
- **Product Rankings**: Best-selling products ranked by sales volume and revenue
- **Payment Channel Rankings**: Usage frequency and conversion rate by payment channel

> Dashboard data is cached for 45 seconds. Click "Refresh" to get the latest data. Time range filtering is supported (Today / 7 Days / 30 Days / Custom, up to 90 days).

---

## 3. Product Management

### 3.1 Creating a Product

Create products from the "Product Management" page in admin. Key fields:

| Field | Description |
|-------|-------------|
| Category | Product category |
| Slug | Unique URL identifier for storefront access |
| Title / Description / Details | Supports multiple languages (zh-CN / zh-TW / en-US) |
| Delivery instructions | Rich text, multilingual. Shown **only after payment succeeds** — on the order detail, delivery email, and Telegram bot message. Use for private content: account format, login steps, support contact, activation tutorials, etc. |
| Price | Base selling price |
| Cost Price | Used for profit calculation |
| Images | Product display images (multiple supported) |
| Tags | Used for search and filtering |
| Purchase Type | `guest` (allow guest purchases) or `member` (registered users only) |
| Max Per Order | Maximum quantity per order (0 = unlimited) |
| Delivery Type | `auto` (automatic card delivery) or `manual` (manual fulfillment) |
| Manual Stock | Stock quantity when delivery type is `manual` (-1 = unlimited) |
| Allow Affiliate | Whether to include in affiliate commission calculation |
| Sort Order | Higher values appear first |

### 3.2 SKU Variants

Products support multiple SKU variants (e.g., different specs, durations):

- Each SKU has its own price, cost price, and stock
- SKUs can be enabled/disabled independently
- For auto-delivery products, stock is determined by the number of card secrets per SKU

### 3.3 Delivery Types

| Type | Description | Stock Management |
|------|-------------|-----------------|
| `auto` | Automatically delivers card secrets after payment | Determined by card secret count |
| `manual` | Admin fulfills manually | Manually set stock quantity |

### 3.4 SEO Settings

Each product supports multilingual SEO metadata configuration for search engine optimization.

---

## 4. Category Management

- Create and manage product categories
- Category names support multiple languages
- Icons and sort order can be configured
- Every product must belong to a category

---

## 5. Order Management

### 5.1 Order Statuses

| Status | Identifier | Description |
|--------|------------|-------------|
| Pending Payment | `pending_payment` | Order placed, awaiting payment |
| Paid | `paid` | Payment successful, awaiting delivery |
| Processing | `processing` | Delivery in progress |
| Delivered | `delivered` | Manual delivery completed |
| Completed | `completed` | Automatic delivery completed |
| Canceled | `canceled` | Canceled by user or admin |
| Expired | `expired` | Expired due to payment timeout |

### 5.2 Order Operations

- **View Details**: Order info, product details, payment records, delivery records
- **Manual Delivery**: Manually enter delivery content for `manual` type products
- **Refund to Wallet**: Refund paid amount to user's wallet (partial refunds supported)
- **View Related Info**: Payment records, commission records, linked orders, etc.

### 5.3 Multi-Product Orders

Orders containing multiple products are automatically split into parent and child orders:
- The parent order holds overall information
- Child orders are split by product/delivery type
- Child orders are fulfilled independently; parent order status updates automatically

---

## 6. Payment Management

### 6.1 Payment Channel Configuration

Configure payment methods from the "Payment Channels" page in admin. See the [Payment Configuration Guide](/en/payment/guide) for details.

### 6.2 Payment Records

- View all payment records and statuses
- Filter by time, status, or channel
- Export payment data

---

## 7. User Management

### 7.1 User List

- View all registered user information
- Search by email or status
- View user login logs

### 7.2 User Operations

| Operation | Description |
|-----------|-------------|
| Enable/Disable | Toggle user status individually or in bulk |
| Edit Profile | Modify user display name and other info |
| Adjust Balance | Manually add or deduct wallet balance |
| Set Level | Manually assign membership level |
| View Wallet | View user balance and transaction history |
| View Coupons | View user coupon usage |

---

## 8. Content Management

### 8.1 Banner Management

- Create homepage carousel banners
- Supports multilingual titles
- Configurable link type (no link / internal link / external link)
- Supports sort order and enable/disable toggle

### 8.2 Articles / Announcements

- Publish blog articles or site announcements
- Supports Markdown format with multilingual content
- Article types: `blog` or `notice`
- Supports publish/unpublish

---

## 9. System Settings

The "Settings" page in admin provides centralized site-wide configuration:

| Setting | Description |
|---------|-------------|
| Site Configuration | Site name, currency, language, feature toggles, etc. |
| SMTP Email | Email server configuration with test email support |
| CAPTCHA | Image CAPTCHA or Cloudflare Turnstile |
| Telegram Login | Telegram OAuth login configuration |
| Notification Center | Email/Telegram notification channel configuration |
| Order Email Templates | Custom order status notification email templates |
| Affiliate Settings | Commission rates, confirmation period, withdrawal configuration |
| Telegram Bot | Bot feature configuration (requires Bot service purchase) |

---

## 10. Permission Management (RBAC)

The system supports role-based access control:

### 10.1 Admin Management

- Create, edit, and delete admin accounts
- Assign roles to admins

### 10.2 Roles and Permissions

- Create custom roles
- Assign specific permissions to roles (e.g., "View Orders Only", "Manage Products")
- View the available permissions catalog

### 10.3 Audit Logs

All admin operations are recorded in audit logs, including:
- Operator and operation type
- Target object and changes made
- IP address and timestamp
