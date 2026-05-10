# 支付配置與回調指南

> 更新時間：2026-04-04

目標只有兩個：

1. 用戶能順利發起支付
2. 支付完成後，訂單能自動變成「已支付」

## 1. 開始前先準備

先確認你的支付回調入口可以被公網訪問。

系統需要至少兩個網域：

- 前台商城：`user.example.com`（或 `shop.example.com`）
- 管理後台：`admin.example.com`

API 透過各站點的反向代理訪問（如 `user.example.com/api` 和 `admin.example.com/api` 均代理到後端），無需額外網域。

常用地址示例：

- 支付結果通知地址（回調）：`https://user.example.com/api/v1/payments/callback`
- 用戶支付完成返回頁（回跳）：`https://user.example.com/pay`

## 2. 後台操作路徑

進入：

- `後台 → 支付管理 → 支付渠道 → 新建渠道`

每新增一個渠道，記得做三件事：

1. 填商戶參數（各支付平台給你的密鑰/ID）
2. 填回調地址（讓平台把支付結果通知給你）
3. 啟用渠道並設置排序

## 3. 各支付渠道怎麼填

### 3.1 易支付

常用必填：

- 網關地址（gateway_url）
- 商戶ID（merchant_id）
- 商戶密鑰（v1）或私鑰/平台公鑰（v2）
- 支付結果通知地址（notify_url）
- 用戶返回地址（return_url）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`

### 3.2 PayPal

常用必填：

- `client_id`
- `client_secret`
- `base_url`（沙箱或正式環境）
- `return_url`
- `cancel_url`

建議：

- `return_url` 和 `cancel_url` 都填：`https://shop.example.com/pay`
- `webhook_id` 建議填寫（用於校驗）

### 3.3 Stripe

常用必填：

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`

建議：

- `success_url` 與 `cancel_url` 都填：`https://shop.example.com/pay`

### 3.4 支付寶

常用必填：

- `app_id`
- 應用私鑰（private_key）
- 支付寶公鑰（alipay_public_key）
- 網關地址（gateway_url）
- 支付結果通知地址（notify_url）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- 若你使用手機網站/電腦網站支付，也要填 `return_url`：`https://shop.example.com/pay`

### 3.5 微信支付

常用必填：

- `appid`
- `mchid`
- 商戶證書序列號（merchant_serial_no）
- 商戶私鑰（merchant_private_key）
- `api_v3_key`
- 支付結果通知地址（notify_url）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback?channel_id=你的渠道ID`
- 如果是 H5 支付，請再填 `h5_redirect_url`：`https://shop.example.com/pay`

### 3.6 TokenPay

常用必填：

- 網關地址（gateway_url）
- 回調簽名密鑰（notify_secret）
- 支付結果通知地址（notify_url）

常用選填：

- 支付幣種（currency，默認 USDT）
- 支付完成回跳地址（redirect_url）
- 法幣展示幣種（base_currency，默認 CNY）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `redirect_url` 填：`https://shop.example.com/pay`
- 支持幣種請參考官方文檔：<https://github.com/LightCountry/TokenPay/blob/master/Wiki/docs.md>

### 3.7 BEpusdt

常用必填：

- 網關地址（gateway_url）
- API Token（auth_token）
- 支付結果通知地址（notify_url）
- 支付成功回跳地址（return_url）

常用選填：

- 交易類型（trade_type）
- 法幣類型（fiat，常用 CNY / USD）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`
- 支持幣種與交易類型請參考官方文檔：<https://github.com/v03413/BEpusdt/blob/main/docs/api/api.md>

### 3.8 epusdt

> 注意：epusdt 與 BEpusdt 是兩個獨立專案，設定欄位與簽名金鑰互不通用，請勿混用。

常用必填：

- 閘道地址（gateway_url，例 `https://epusdt.example.com`）
- 商戶 PID（pid）
- 簽名金鑰（secret_key）
- 代幣（token，例 `usdt`）
- 網路（network，例 `tron`）
- 支付結果通知地址（notify_url）
- 支付完成回跳地址（return_url）

常用選填：

- 法幣（currency，預設 `cny`）

建議：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`
- 僅支援跳轉模式（redirect）。下單後會跳轉到 epusdt 自帶的託管收銀台完成付款，無需後台再渲染二維碼
- token / network 的可用組合請即時向閘道查詢：`GET <gateway_url>/payments/gmpay/v1/supported-assets`
- 介面規範請參考官方文件：<https://epusdt.com/api/payment.html>

### 3.9 OKPay

常用必填：

- 網關地址（gateway_url，預設 `https://api.okaypay.me/shop`）
- 商戶 ID（merchant_id）
- 商戶密鑰（merchant_token）
- 支付結果通知地址（callback_url）
- 支付完成回跳地址（return_url）

常用選填：

- 支付幣種（coin，支持 `USDT` 或 `TRX`，預設 USDT）
- 匯率（exchange_rate，預設 `1`）
- 商戶展示名稱（display_name）

建議：

- `callback_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`

---

## 3.10 手續費設定

每個支付渠道可獨立設定手續費，用於核算實際到帳金額：

| 欄位 | 說明 |
|------|------|
| 手續費率（fee_rate） | 百分比手續費，如填 `2.00` 表示 2% |
| 固定手續費（fixed_fee） | 每筆固定扣除的金額 |

手續費僅用於後台統計和利潤計算，**不會**增加使用者的支付金額。

---

## 3.11 互動模式

建立支付渠道時需選擇互動模式，不同模式決定使用者的支付體驗：

| 模式 | 標識 | 說明 |
|------|------|------|
| 二維碼 | `qr` | 產生支付二維碼，使用者掃碼支付（適合微信/支付寶等） |
| 跳轉 | `redirect` | 跳轉到支付平台頁面完成支付（適合 PayPal/Stripe 等） |

> 同一支付類型可建立多個渠道使用不同互動模式。例如支付寶可同時設定二維碼和跳轉模式。

## 4. 回調與 Webhook 一張表看懂

### 4.1 通用回調（這幾個都填同一個地址）

適用：

- 支付寶
- 微信支付
- 易支付
- TokenPay
- BEpusdt
- epusdt
- OKPay

填寫地址：

- `POST https://user.example.com/api/v1/payments/callback`

### 4.2 PayPal（單獨 Webhook 地址）

填寫地址：

- `POST https://user.example.com/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`

說明：

- `channel_id` 在當前實現中必須帶上。

### 4.3 Stripe（單獨 Webhook 地址）

填寫地址：

- `POST https://user.example.com/api/v1/payments/webhook/stripe?channel_id=你的渠道ID`

說明：

- `channel_id` 建議帶上，多個 Stripe 渠道時更穩妥。

## 5. 自訂回調路由（可選）

由於本專案是開源的，預設的回調路徑（如 `/api/v1/payments/callback`）是公開可知的，存在被惡意撞庫或模擬回調的風險。你可以在後台自訂回調路由路徑，隱藏預設路徑來增強安全性。

### 5.1 如何設定

進入：

- `後台 → 系統設定 → 回調路由`

可自訂以下 4 條回調路徑：

| 回調類型 | 預設路徑 | 說明 |
|---------|---------|------|
| 支付回調 | `/api/v1/payments/callback` | 支付寶/微信/易支付/TokenPay/BEpusdt/epusdt/OKPay 通用 |
| PayPal Webhook | `/api/v1/payments/webhook/paypal` | PayPal 專用 |
| Stripe Webhook | `/api/v1/payments/webhook/stripe` | Stripe 專用 |
| 上游回調 | `/api/v1/upstream/callback` | 上游供貨商回調 |

留空表示繼續使用預設路徑。

### 5.2 設定規則

- 自訂路徑必須以 `/api/` 開頭，例如：`/api/my-secret-path/pay-notify`
- 4 條路徑不能重複
- 不能與系統已有路由衝突（如 `/api/v1/admin/...`、`/api/v1/public/...`）

### 5.3 設定後注意事項

::: warning 重要
自訂回調路由後，你必須同步更新各支付渠道設定中的異步通知地址（`notify_url` / `callback_url`），將其中的路徑部分替換為你設定的自訂路徑。

例如，你將支付回調路由改為 `/api/my-secret/pay-notify`，則：

- 原來填：`https://user.example.com/api/v1/payments/callback`
- 現在填：`https://user.example.com/api/my-secret/pay-notify`

否則支付平台的回調通知將無法到達你的伺服器。
:::

### 5.4 運作原理

- 設定自訂路由後，對應的預設路徑會自動回傳 404，外部無法探測到
- 未設定的回調類型仍使用預設路徑，互不影響
- 設定儲存後約 5 分鐘內全域生效（或立即生效於當前實例）

## 6. 上線前 5 分鐘自檢

按這個順序測一次：

1. 前台下單，確認能拉起支付頁面/二維碼
2. 完成支付，確認訂單狀態自動更新為「已支付」
3. 支付完成後，確認能回到 `https://shop.example.com/pay`
4. 後台支付記錄裡，確認該筆訂單有對應支付流水

## 7. 常見問題

### Q1：用戶顯示支付成功，但後台訂單沒變

優先檢查：

- 回調地址是否填錯網域/路徑（如果設定了自訂回調路由，請確認各渠道的 `notify_url` 已同步更新）
- API 網域是否可以被公網訪問
- 支付平台後台是否有回調失敗記錄

### Q2：支付完成後沒有回到前台支付頁

優先檢查：

- `return_url` / `success_url` / `cancel_url` / `redirect_url` 是否統一填成 `/pay`

### Q3：同一個支付方式配了多個渠道，結果串單

優先處理：

- PayPal、Stripe 的 Webhook 地址都帶上 `channel_id`
- 後台只保留你正在使用的渠道，避免重複啟用
