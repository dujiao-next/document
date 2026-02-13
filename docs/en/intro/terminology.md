# Terminology Glossary

> Updated: 2026-02-12

This page standardizes core terms used across Dujiao-Next documentation to reduce ambiguity in collaboration and implementation.

## 1. Core Terms Mapping

| Simplified Chinese | English Term | Traditional Chinese | Notes |
| --- | --- | --- | --- |
| 前台 | User Frontend | 前台 | End-user facing site (`web` is now unified as `user`) |
| 后台 | Admin Panel | 後台 | Admin management interface (`admin-web` is now unified as `admin`) |
| 后端 / API | API Service | 後端 / API | Backend business API service (repo: `dujiao-next`) |
| 文档站 | Documentation | 文件站 | Official docs site (repo: `document`) |
| 商品 | Product | 商品 | Sellable item (digital or manually fulfilled) |
| 订单 | Order | 訂單 | Transaction record created after purchase |
| 人工交付 | Manual Fulfillment | 人工交付 | Delivery handled manually by admins |
| 自动交付 | Automatic Fulfillment | 自動交付 | Delivery completed automatically after successful payment |
| 支付渠道 | Payment Channel | 支付渠道 | Payment method configured in admin panel |
| 同步回跳 | Sync Return URL | 同步回跳 | Browser redirect URL after payment completion |
| 异步回调 | Async Notify/Webhook | 非同步回調 | Server-to-server payment notification endpoint |
| 权限策略 | Authorization Policy | 權限策略 | Access policy for role-based API/menu permissions |
| 角色继承 | Role Inheritance | 角色繼承 | Permission inheritance relationship between roles |
| 赞助商 | Sponsor | 贊助商 | Partner displayed in documentation ad slots |

## 2. Naming Conventions

- Project name: `Dujiao-Next`
- Project short name: `D&N`
- Frontend for end users: `User` (not `Web`)
- Admin frontend: `Admin`
- Backend service: `API`

## 3. Repository Mapping

- API: <https://github.com/dujiao-next/dujiao-next>
- User: <https://github.com/dujiao-next/user>
- Admin: <https://github.com/dujiao-next/admin>
- Document: <https://github.com/dujiao-next/document>

## 4. Writing Guidelines

- Reuse standardized terms from this glossary in new docs.
- Use "Sync Return URL / Async Notify (Webhook)" consistently for payment flows.
- Use `User` and `Admin` consistently when distinguishing product-facing interfaces.
