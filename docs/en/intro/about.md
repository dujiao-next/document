# About Dujiao-Next

> Updated: 2026-02-11  

## 1. Project positioning

Dujiao-Next is an open source system for the "digital goods sales and delivery" scenario, suitable for:

- Digital card sales
- Account/key product sales
- Virtual services or manually delivered goods
- Independent website business that requires separation of front and back office and secondary development

## 2. Core competencies

### 2.1 Multi-terminal architecture

- 'api/': Backend service (Go Gin GORM)
- 'user/': User front (Vue 3 Vite TypeScript)
- 'admin/': Background management (Vue 3 Vite TypeScript)
- 'Document/': Official Document (VitePress)

### 2.2 Ability to pay

- Supports official payment access such as Alipay, WeChat Pay, PayPal, and Stripe
- Supports synchronous callbacks and asynchronous callbacks/webhooks
- Unified payment channel configuration and status flow

### 2.3 Deliverability

- Automated delivery (e.g. camify)
- Manual delivery (configurable form to collect receipt/business information)
- Traceable delivery records within the order

### 2.4 Permissions and Operations

- Admin Admin & Role Permissions (Casbin)
- Operation modules such as products, orders, payments, users, articles, banners, and events
- Visually manage site configuration

## 3. Why Dujiao-Next

- **Available out of the box**: It has a complete business link, not just a demo page.
- **Modern Technology Stack**: Both front-end and back-end technologies are easy to scale and maintain.
- **Two-Open Friendly**: The front desk API is clear, making it easy for you to develop new templates independently.
- **Sustainable Evolution**: Modules such as payment, delivery, permissions, logs, etc. already have an engineering foundation.

## 4. Applicable teams

- Individuals/small teams who want to quickly launch a digital goods business
- Enterprise teams that want to retain the autonomy and control of their systems
- Technical teams that need to do custom development on existing systems

## 5. Open source repositories and contributions

- API (Main Project): https://github.com/dujiao-next/dujiao-next
- User (Frontend): https://github.com/dujiao-next/user
- Admin (Backend): https://github.com/dujiao-next/admin
- Document (Documentation): https://github.com/dujiao-next/document

If you would like to add features, fix issues, or improve the documentation, you are welcome to submit a PR directly.