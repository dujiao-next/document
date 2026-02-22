# Changelog

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
