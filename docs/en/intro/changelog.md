# Changelog

## [v1.0.2] - 2026-04-12

### Update Details:
- Added scenario-based payment channel limits with consistent wallet and checkout availability, making payment choices more flexible and predictable.
- Streamlined order submission by removing redundant stock checks, so checkout and payment handoff feels smoother.
- Added upstream category sync with automatic local category creation, reducing manual cleanup during product integration.
- Added site name and site URL variables to email templates, giving merchants more complete outbound notifications.
- Added configurable order interception rules with flexible exemptions for selected bot-order cases, making unusual order handling easier to control.
- Improved admin profit display and payment-channel guidance text, so daily operations and configuration changes are clearer.

## [v1.0.1] - 2026-04-06

### Update Details:
- Added custom callback address configuration and refined the related setup flow, making external system integrations more flexible.
- Improved the media library with multi-image upload, multi-select, and physical deletion for faster bulk asset management in the admin panel.
- Fixed membership level icon display issues so related asset selection and presentation are more stable.
- Improved automatic login inside Telegram Mini App for a smoother entry flow in Telegram scenarios.
- Fixed low-stock threshold and inventory alert interval checks for auto-delivered products, while refining product deletion, dashboard trends, and editor details for steadier daily admin operations.

## [v1.0.0] - 2026-04-02

### Update Details:
- Added a media library with unified asset management for payment channel icons, membership level icons, and synced product images, making admin maintenance more centralized.
- Improved procurement order visibility, upstream and downstream product connections, and async sync jobs so bulk operations and site-integration workflows are smoother and more stable.
- Added custom exchange-rate conversion for payment channels, with options to restrict channel usage by scenario or allow wallet-balance-only payments for more flexible billing rules.
- Added a configurable order status notification switch, plus better recharge order visibility, payment status pages, and mobile order details so users can track orders and payment results more clearly.
- Added a storefront footer site introduction, current version display, admin user notes, and total user balance statistics for a more complete operational overview.

## [v0.1.8] - 2026-03-30

### Update Details:
- Improved automated fulfillment and email delivery flows so oversized fulfillment content is truncated in-page with full-result downloads available, while large email payloads are now sent as attachments automatically.
- Fixed membership-level issues so default levels for new users, upgrade trigger rules, and equal-sort threshold checks are more accurate, with clearer member discount display on the storefront.
- Improved admin order management and manual submission display so labels, field ordering, and notification content in order details are clearer for faster processing.
- Improved site-connection management with clearer exchange-rate profit visibility and more stable concurrent upstream sync behavior, reducing disruptions during product synchronization.
- Improved Telegram bot broadcast management while also refining storefront product detail, payment, wallet, and category presentation flows for smoother cross-device use.

## [v0.1.7] - 2026-03-28

### Update Details:
- Added custom navigation settings and on-demand toggles for blog and public pages, making storefront homepage and navigation content easier to tailor to different business needs.
- Added product cost-price support and improved dashboard and order-related profit reporting, so operating costs and margins are easier to track.
- Fixed failures during large batch card-secret imports for a more stable bulk inventory loading workflow.
- Fixed incorrect inventory alerts and mapped-product publish status detection so product sync and stock monitoring results are more accurate.
- Improved the SKU deletion flow to reduce maintenance-related errors and keep admin operations more stable.

## [v0.1.6] - 2026-03-27

### Update Details:
- Added automatic pricing and sync controls for site integration, including custom exchange-rate conversion across upstream and downstream connections.
- Added exchange-rate conversion and target currency settings for PayPal, making cross-currency collection scenarios easier to launch.
- Added customizable order notification email templates so merchants can tailor reminder content to different business scenarios.
- Improved SKU alerts, mapped-product inventory checks, and SVG image upload support for smoother product management and asset setup.
- Improved storefront browsing and checkout flows with quantity selection, one-click card-secret copying, and fixes for list-filter overlay, long card-secret overflow, and Telegram-related loading issues in restricted regions.

## [v0.1.5] - 2026-03-25

### Update Details:
- Added template switching with a list-mode storefront so customers can browse products faster and place orders more smoothly.
- Added a quick-buy flow with modal and drawer entry points, while improving cart prompts and purchase interactions.
- Added icon support for payment channels and improved the admin payment-channel list for clearer payment selection and management.
- Improved card-secret search, import, and inventory management workflows so bulk handling in the admin panel is faster and more stable.
- Improved the admin dashboard, mobile list-mode presentation, and notification queue stability for smoother daily operations.

## [v0.1.4] - 2026-03-23

### Update Details:
- Added baseline Telegram Mini App support for smoother login, payment, wallet, and navigation flows inside Telegram.
- Upgraded the notification center into a dedicated workflow for channel and template setup, delivery history review, and test sends.
- Improved the checkout and wallet payment experience with clearer fee details, payment method display, and result feedback.
- Streamlined API access requests, card-secret operations, and order fulfillment flows for faster daily admin work.
- Improved weak-network loading and mobile banner behavior so storefront browsing and page transitions feel smoother on phones.

## [v0.1.3] - 2026-03-21

### Update Details:
- Added OKPay as a payment channel, giving merchants another collection option for new checkout scenarios.
- Added a configurable exchange-rate base so site pricing and payment amount conversion are more flexible.
- Added a configurable registration switch so admins can control storefront signup availability more easily.
- Improved EPay redirect-mode compatibility so payment return flows work more smoothly on supported channels.
- Improved admin mobile adaptation, product-list quick actions, and card-secret guidance for faster daily operations.
- Unified sort ordering and improved storefront product image display for a more consistent browsing experience.

## [v0.1.2] - 2026-03-17

### Update Details:
- Added a membership level system and clearer membership benefit displays so users can understand available perks and discounts at a glance.
- Added end-to-end second-level category support, allowing admins to assign products by leaf category and customers to browse category hierarchies more clearly.
- Added server-side time calibration to reduce issues caused by client clock drift, making time-sensitive flows more reliable.
- Improved storefront product card layout, icon display, and rendering details for a more consistent and smoother browsing experience.

## [v0.1.1] - 2026-03-13

### Update Details:
- Added Telegram channel affiliate features so users can open promotion access, review commission data, and submit withdrawal requests with a more complete conversion flow.
- Added direct gift card redemption inside Telegram channels, with wallet balance and transaction history updating together for a smoother top-up flow.
- Added fixed fee support for payment channels, with fee information shown across admin, public, and channel checkout flows for clearer pricing rules.
- Enhanced Telegram broadcast and message delivery capabilities with image and file attachments for more flexible bulk outreach.
- Improved bot message callbacks, the Telegram management page, and third-party account display, while fixing payment record field display issues for a clearer and more stable admin experience.

## [v0.1.0] - 2026-03-11

### Update Details:
- Added a Telegram Bot control center in the admin panel for unified bot setup, runtime monitoring, and channel client management.
- Enabled product browsing, order placement, and wallet-related flows through Telegram Bot for a more complete in-chat transaction experience.
- Added Telegram user broadcast messaging, with support for sending messages to all users or selected recipients more efficiently.
- Improved validation in the cart, product detail, and checkout flows so purchase limits and stock feedback are more accurate.
- Fixed duplicate gateway order number conflicts and payment request context issues to make payment creation and callbacks more reliable.
