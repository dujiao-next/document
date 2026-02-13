# 術語統一表

> 更新時間：2026-02-12

本頁用於統一 Dujiao-Next 文件中的中英文術語，降低溝通與協作成本。

## 1. 核心術語對照

| 簡體術語 | English Term | 繁體術語 | 使用說明 |
| --- | --- | --- | --- |
| 前臺 | User Frontend | 前臺 | 面向終端使用者的站點（原 `web`，現統一為 `user`） |
| 後台 | Admin Panel | 後台 | 管理員使用的管理系統（原 `admin-web`，現統一為 `admin`） |
| 後端 / API | API Service | 後端 / API | 業務介面服務（倉庫：`dujiao-next`） |
| 文件站 | Documentation | 文件站 | 官方文件站點（倉庫：`document`） |
| 商品 | Product | 商品 | 可售賣實體（數位或人工交付） |
| 訂單 | Order | 訂單 | 使用者購買後生成的交易記錄 |
| 人工交付 | Manual Fulfillment | 人工交付 | 由管理員人工處理交付（如發貨、線下處理） |
| 自動交付 | Automatic Fulfillment | 自動交付 | 系統在支付成功後自動下發內容 |
| 支付渠道 | Payment Channel | 支付渠道 | 後台配置的支付方式（支付寶/微信/PayPal/Stripe 等） |
| 同步回跳 | Sync Return URL | 同步回跳 | 使用者支付完成後瀏覽器跳轉地址 |
| 非同步回調 | Async Notify/Webhook | 非同步回調 | 支付平台服務端通知地址（用於最終狀態確認） |
| 權限策略 | Authorization Policy | 權限策略 | 角色訪問 API/選單的授權規則 |
| 角色繼承 | Role Inheritance | 角色繼承 | 角色之間的權限繼承關係 |
| 贊助商 | Sponsor | 贊助商 | 在文件中展示品牌資訊的合作方 |

## 2. 專案命名約定

- 專案總稱統一為：`Dujiao-Next`
- 專案簡稱統一為：`D&N`
- 使用者端命名統一為：`User`（不再使用 `Web`）
- 管理端命名統一為：`Admin`
- 後端服務命名統一為：`API`

## 3. 連結與倉庫命名

- API：<https://github.com/dujiao-next/dujiao-next>
- User：<https://github.com/dujiao-next/user>
- Admin：<https://github.com/dujiao-next/admin>
- Document：<https://github.com/dujiao-next/document>

## 4. 文件撰寫建議

- 新增文件時，優先複用本頁術語，避免同義詞混用。
- 涉及介面能力時，優先使用「同步回跳 / 非同步回調（Webhook）」標準表達。
- 涉及產品端區分時，統一使用 `User` 與 `Admin`。
