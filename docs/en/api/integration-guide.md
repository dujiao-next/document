---
outline: deep
---

# Site Integration Guide

> Last Updated: 2026-03-01

This guide explains how Dujiao-Next sites connect to each other for product syndication, from API access setup to live procurement orders.

## 1. Understand the Two Roles

- Integrator site (Site A): pulls upstream products, sells them locally, and creates procurement orders after customer checkout.
- Upstream site (Site B): exposes Open API endpoints, accepts procurement requests, and charges the connected user's wallet.

## 2. Standard Flow (A integrates B)

1. A user on Site B enables API access and generates Access Key / Secret.
2. Site A admin creates an integration connection using Site B address and credentials.
3. Site A validates the connection, pulls products, and creates product mappings.
4. After a customer places an order on Site A, Site A creates a procurement order on Site B.
5. Site B processes the order and deducts wallet balance from that connected user.

## 3. What Site B (Upstream) Must Do

### 3.1 Set Open API URL

Admin path: `System Settings -> Branding & Site`
Set Open API URL, for example:

- `https://api.example.com/api/open/v1`

This URL is shown on the user API access page and shared with integrator sites.

### 3.2 User enables API access and creates tokens

Frontend path: `Personal Center -> API Access`

Users can:

- Enable API access
- Create multiple tokens (Access Key / Secret)
- Set token expiration
- Enable/disable or delete tokens

Note: `Secret` is displayed only once when created.

## 4. How Site A Creates a Connection

Admin path: `Site Integration -> Connections -> Create`

Recommended values:

| Field | What to fill |
| --- | --- |
| Connection Name | Any readable name |
| Site URL | Site B root URL, e.g. `https://b.example.com` |
| Protocol Type | Keep default (Dujiao OpenAPI v1) |
| Protocol Version | Keep default `v1` |
| Access Key | Access Key from Site B user token |
| Secret | Secret from Site B user token |
| Callback URL | Optional, recommended to use a public URL on Site A |

Important:

- For `Site URL`, use root URL only. Do not append `/api/open/v1` manually.

## 5. Product Pull and Mapping

Admin path: `Site Integration -> Mappings`

Recommended process:

1. Select a connection and pull upstream products.
2. Map local products to upstream product/SKU.
3. Configure local price and display content based on your business strategy.
4. Enable mapping only after validation.

## 6. Order and Charging Behavior

- Once a user places an order on Site A, a procurement order is created on Site B.
- Site B deducts the connected user's wallet balance.
- If balance is insufficient, procurement fails immediately.
- If stock is insufficient or product is unavailable, procurement also fails immediately.

Notes:

- If "auto-disable mapping on low balance" is not enabled, products are not auto-unlisted, but orders still return failure.
- Frontend users do not see third-party source details; source data is backend-visible only.

## 7. Operations Checklist

### Site A (Integrator) key pages

- `Site Integration -> Integration Orders`: status, error reasons, retries
- `Site Integration -> Webhook Logs`: callback processing status

### Site B (Upstream) key pages

- `Site Integration -> Connected Users`: API-enabled users and token usage
- `Site Integration -> Integration Orders`: filter `source=inbound` to view inbound procurement

## 8. Common Issues

### Q1: Connection test returns 401

Check:

- Access Key / Secret mismatch
- Token disabled or expired
- Site URL not publicly reachable

### Q2: Order API returns signature or bad request errors

Check:

- Required signature headers are present
- Write requests include `X-DJ-Idempotency-Key`
- Timestamp is not skewed too much

### Q3: Customer order succeeds but procurement fails

Common causes:

- Insufficient wallet balance on Site B
- Upstream out of stock
- Wrong mapping (product ID / SKU ID mismatch)

