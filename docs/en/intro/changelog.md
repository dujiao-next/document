# Changelog

## [v0.0.5-beta] - 2026-02-25

### Update Details:
- Added a gift card system: admin now supports gift card generation, status management, filtering, batch status updates, and export; user center now includes a gift card redeem page (with motion effects), supports scene-based captcha switch (image captcha/Turnstile), and credits redeemed amount to wallet balance automatically.
- Updated gift card currency strategy: gift card generation in admin now automatically inherits the site-wide currency and removes manual currency input, preventing currency configuration mismatch.
- Payment callback security hotfix: callback entry now only accepts recognized and signature-verified provider callbacks (WeChat/Alipay/Epay/EPUSDT), preventing forged callbacks from incorrectly marking orders or wallet recharges as paid; `GET /payments/callback` remains available for Epay compatibility, while unrecognized requests always return `fail` and do not update payment state.

## [v0.0.4-beta] - 2026-02-25

### Update Details:
- Added category icon support across the stack: category icon upload in admin, and icon rendering in user sidebar and product cards.
- Added end-to-end SKU support: product management, inventory display, and checkout flow are aligned on SKU-level handling.
- Improved auto-delivery stock logic: inventory calculation and display rules for auto-delivery products are now consistent, including a fix for auto stock count input handling.
- Strengthened discount safeguards and checkout validation: improved promotion configuration hints and order amount validation to reduce misconfiguration that can lead to abnormal or zero-price orders.
- Enhanced admin refund verification: added paid-status validation before refunding an order to wallet balance.
- Fixed payment redirection issues in specific scenarios after payment completion.
- Fixed stale frontend asset loading issues: reduced page errors caused by requesting outdated chunks after deployment.
- Unified site-wide currency fields: API, admin, and user-side currency fields and display logic are now consistent.
- Added SEO meta configuration support for more complete site-level SEO metadata management.
- Additional UX and stability improvements across admin management, card secret management, shopping cart experience, and email delivery flow.

## [v0.0.3-beta] - 2026-02-22

### Update Details:
- Added a user wallet system: balance management, recharge, and wallet transaction details (including recharge, payment, refund rollback, and other fund movements).
- Upgraded order payment flow: supports balance-only payment, combined balance + online payment, and online-only payment; deducted balance is automatically returned when payment fails or the order is canceled.
- Added admin wallet management capabilities: view each user's balance and wallet details, manually increase/decrease user balance, and process order refunds to wallet balance only.
- Added Telegram login: first-time Telegram login without an existing account binding now auto-creates an account and signs in directly.
- Added Telegram bind/unbind in Security Center: logged-in users can bind or unbind Telegram; Telegram-created accounts without a real bound email cannot unbind Telegram.
- Improved account security flow: added `email_change_mode` and `password_change_mode` in profile responses, supporting "bind new email only" and "set password without old password (first setup)".
- Optimized User Center navigation: left menu order is now "Overview / My Orders / My Wallet / Security Center / Profile Settings", with matching icons added.

## [v0.0.2.Beta] - 2026-02-15

### Update Details:
- Integrated Bepusdt payment [865d142](https://github.com/dujiao-next/admin/commit/865d1427d14bf6f48b8e3cd261812a5d527336d0)
- Optimized backend experience [ce1f3f5](https://github.com/dujiao-next/admin/commit/ce1f3f542e0147e677b0af81c69f07f129410519)
- Optimized frontend color scheme for a more restrained and professional aesthetic [ee307d](https://github.com/dujiao-next/user/commit/ee307d670130850e9019ed793b76e9dd3523e28a)
- Various minor optimizations and user experience enhancements

## [v0.0.1.Beta] - 2026-02-11

### Added
- Added: First release!
