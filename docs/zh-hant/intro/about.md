# 關於 Dujiao-Next

> 更新時間：2026-02-16  

## 1. 項目定位

Dujiao-Next 是一套面向「數字商品銷售與交付」場景的開源系統，適用於：

- 數字卡密售賣
- 賬號/密鑰類商品銷售
- 虛擬服務或人工交付型商品
- 需要前後臺分離與二次開發的獨立站業務

## 2. 核心能力

### 2.1 多端架構

- `api/`：後端服務（Go + Gin + GORM）
- `user/`：用戶前臺（Vue 3 + Vite + TypeScript）
- `admin/`：後臺管理（Vue 3 + Vite + TypeScript）
- `Document/`：官方文檔（VitePress）

### 2.2 支付能力

- 支持支付寶、微信支付、PayPal、Stripe 等官方支付接入
- 支持同步回跳 + 異步回調/webhook
- 統一支付渠道配置與狀態流轉

### 2.3 交付能力

- 自動交付（如卡密）
- 人工交付（可配置表單收集收貨信息/業務信息）
- 訂單內可追蹤交付記錄

### 2.4 權限與運營

- 管理員後臺與角色權限（Casbin）
- 商品、訂單、支付、用戶、文章、Banner、活動等運營模塊
- 可視化管理站點配置

## 3. 為什麼選擇 Dujiao-Next

- **開箱可用**：具備完整業務鏈路，不是隻有 Demo 頁面。
- **技術棧現代**：前後端技術都易於擴展維護。
- **二開友好**：前臺 API 清晰，便於你獨立開發新模板。
- **可持續演進**：支付、交付、權限、日誌等模塊已經具備工程化基礎。

## 4. 適用團隊

- 想快速上線數字商品業務的個人/小團隊
- 希望保留系統自主可控能力的企業團隊
- 需要在現有系統上做定製開發的技術團隊


## 5. Demo 站點

- 前臺：https://demo.dujiao-next.com
- 後臺：https://demo-admin.dujiao-next.com
- 後臺測試管理員賬號：`test`
- 後臺測試管理員密碼：`Test123456`

## 6. 開源倉庫與貢獻

- API（主項目）：https://github.com/dujiao-next/dujiao-next
- User（用戶前臺）：https://github.com/dujiao-next/user
- Admin（後臺）：https://github.com/dujiao-next/admin
- Document（文檔）：https://github.com/dujiao-next/document
- Community Projects（社群共享專案）：https://github.com/dujiao-next/community-projects

如果你希望補充功能、修復問題或改進文檔，歡迎直接提交 PR。
