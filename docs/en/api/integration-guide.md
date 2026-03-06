---
outline: deep
---

# Site Integration Guide

> Last updated: 2026-03-06

This guide explains how to set up site-to-site integration (cross-selling) between Dujiao-Next instances, helping you quickly go from "applying for credentials" to "async procurement + multi-level callbacks".

For API endpoint details and signature algorithms, see the [Open API Reference](./integration-open-api.md).

## 1. Roles and Flow

| Role | Description |
| --- | --- |
| Integrator (Site A) | Pulls upstream products and sells them locally. Acts as the **buyer** calling the upstream API |
| Provider (Site B) | Provides products and API access. Receives procurement requests from A and processes them locally |
| Further Upstream (C/D/...) | B may also procure from its own upstream, forming a multi-level chain |

Notes:

- The system supports mixed cart orders — a single parent order can contain both local products and products from multiple upstream sources (split into sub-orders).
- Procurement order `source_type` distinguishes:
  - `outbound`: this site procures from upstream;
  - `inbound`: this site receives procurement from downstream.

## 2. Standard Flow

```
Site A (Integrator)                Site B (Provider)
───────────────────                ─────────────────
1. Admin creates connection ─────→
2. Test connection (POST /ping) ─→  Verify signature, return site info
3. Pull product list ────────────→  Return available products & SKUs
4. Create product mappings
5. End user places order + pays
6. Async procurement (POST /orders)→ Wallet deduction, create local order
7.                ←──────────────── Callback notification (status/delivery)
8. Update local order status
```

If Site B's product also has an upstream mapping, B will continue to asynchronously procure from Site C. The chain can extend indefinitely. Once the final fulfillment node delivers, status and delivery content are passed back level by level via callbacks until reaching Site A.

## 3. What the Provider (Site B) Needs to Do

### 3.1 Manage API Credentials

Admin path: `System → API Credentials`

Each user can have at most one set of API credentials (API Key + API Secret). Credentials require admin approval before they can be used.

**User side:**

- Apply for API credentials in the frontend user center
- After applying, the status is "Pending Review" — usable only after admin approval
- `API Secret` is shown only once at creation time — save it immediately

**Admin side:**

- View all user credential applications in the admin panel
- Review actions: Approve / Reject (with optional rejection reason)
- Can enable or disable approved credentials at any time

### 3.2 Configure Site Information

Ensure your site is publicly accessible. The integrator will use your site URL + `/api/v1/upstream` as the API endpoint.

## 4. How the Integrator (Site A) Configures

### 4.1 Create a Connection

Admin path: `Integration → Site Connections → Create`

| Field | Description |
| --- | --- |
| Connection Name | Custom name to identify the upstream site |
| Site URL | Root URL of Site B, e.g. `https://b.example.com` |
| Protocol | Use the default (Dujiao OpenAPI) |
| API Key | API Key from Site B's user |
| API Secret | API Secret from Site B's user |
| Callback URL | Public URL where Site A receives callbacks |
| Max Retries | Maximum retry count for failed procurements |
| Retry Intervals | Wait time between retries (seconds), supports multi-level configuration |

Notes:

- Enter the root URL for "Site URL" — the system will automatically append the `/api/v1/upstream` prefix.
- After creation, click "Test Connection" to verify the configuration.

### 4.2 Pull Products and Create Mappings

Admin path: `Integration → Product Mappings`

Workflow:

1. Select an established connection and click "Sync Products" to pull the upstream product list.
2. Select upstream products to map, establishing the relationship between local and upstream products/SKUs.
3. Batch import of mappings is supported.
4. Set local pricing and display information according to your business strategy.
5. Once mappings are enabled, products will automatically display upstream inventory.

Mapping notes:

- After mapping, the local product's fulfillment type is automatically marked as "upstream".
- The product list shows real-time upstream stock, displayed as either "Auto Delivery" or "Manual Delivery" (depending on the upstream product's actual fulfillment type).
- You can sync upstream product information and stock at any time.

### 4.3 Procurement Order Management

Admin path: `Integration → Procurement Orders`

Manage all procurement orders sent to upstream:

- View procurement status (Pending / Completed / Failed / Cancelled)
- View failure reasons and retry history
- Manually retry failed procurement orders
- Filter by source connection, status, etc.

### 4.4 Reconciliation Center

Admin path: `Integration → Reconciliation Center`

The reconciliation feature helps verify procurement data consistency:

- Initiate reconciliation by time period
- Reconciliation types: Amount reconciliation / Full reconciliation
- View reconciliation results and discrepancy details

## 5. Business Rules

### 5.1 Delivery Rules

- Delivery of mapped products relies entirely on upstream callbacks — **local manual delivery and local auto delivery are not allowed**.
- After upstream delivery, the system automatically updates the local order status and delivery content via callback.
- Frontend users will not see any "upstream integration" labels — source information is only visible in the admin panel.

### 5.2 Cancellation Rules

- Cancellation must follow "upstream first, local second":
  - When an outbound procurement order exists, the upstream cancel API is called first;
  - If upstream returns that cancellation is not possible, local cancellation and refund are also denied.

### 5.3 Error Handling

- When upstream procurement fails, the system only marks it as an exception for admin handling — **it will not automatically cancel or refund**.
- Async procurement and callback chains do not affect the user's normal order experience.
- Admins can view failure reasons in Procurement Order Management and manually retry.

## 6. Signature Authentication

All API requests use HMAC-SHA256 signature authentication with the following headers:

| Header | Description |
| --- | --- |
| `Dujiao-Next-Api-Key` | API Key |
| `Dujiao-Next-Timestamp` | Unix timestamp (seconds) |
| `Dujiao-Next-Signature` | HMAC-SHA256 signature |

Signature string format:

```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{MD5(BODY)}
```

- Timestamp must be within **60 seconds** of server time
- For detailed signature algorithms and code examples, see the [Open API Reference](./integration-open-api.md)

## 7. FAQ

### Q1: Test connection returns 401

Check the following:

- Is the API Key / API Secret entered correctly?
- Has the credential been approved by the admin?
- Is the credential currently enabled?
- Is the site URL publicly accessible?

### Q2: Signature error when placing an order

Check the following:

- Does the request include all three required signature headers (`Dujiao-Next-Api-Key`, `Dujiao-Next-Timestamp`, `Dujiao-Next-Signature`)?
- Is the timestamp within 60 seconds of the current time?
- Is the signature string format correct (check Body MD5 calculation)?

### Q3: User order succeeds but procurement fails

Common causes:

- Insufficient wallet balance for Site B's integration user
- Upstream product out of stock or delisted
- Incorrect product mapping (product ID / SKU ID mismatch)

Resolution:

- Check the failure reason in "Procurement Orders"
- Fix the issue and manually retry the procurement

### Q4: Why can't I manually fulfill a mapped product?

Mapped products are declared as dependent on upstream fulfillment. The system enforces waiting for upstream callbacks to prevent local and upstream state inconsistencies.

### Q5: Why didn't the order cancel after clicking the cancel button?

Cancellation of integration orders first attempts upstream cancellation. If the upstream cannot cancel, the local system will also deny cancellation to ensure financial and state consistency.

### Q6: How do I update upstream product stock and pricing?

On the "Product Mappings" page, select the corresponding connection and click "Sync Products" to pull the latest product information, stock, and pricing from upstream.
