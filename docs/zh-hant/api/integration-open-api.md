---
outline: deep
---

# 站點對接 Open API 文件

> 更新時間：2026-03-01

本文檔用於對接開發，覆蓋 Dujiao-Next 站點間串貨介面：`/api/open/v1/*`。

## 1. 基礎資訊

### 1.1 Base URL

- 範例：`https://api.example.com/api/open/v1`

### 1.2 統一回應結構

成功範例：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {}
}
```

失敗範例：

```json
{
  "status_code": 401,
  "msg": "unauthorized",
  "data": {
    "request_id": "01HR..."
  }
}
```

## 2. 鑑權與簽名

### 2.1 必要請求頭

| Header | 說明 |
| --- | --- |
| `X-DJ-Access-Key` | 存取金鑰 |
| `X-DJ-Timestamp` | Unix 秒級時間戳 |
| `X-DJ-Nonce` | 隨機字串，每次請求必須唯一 |
| `X-DJ-Signature` | HMAC-SHA256 簽名（hex 小寫） |
| `X-DJ-Sign-Method` | 固定 `HMAC-SHA256` |
| `X-DJ-Idempotency-Key` | 寫介面必填（POST/PUT/PATCH/DELETE） |

### 2.2 簽名字串規則

簽名原文按以下順序拼接（換行分隔）：

```text
UPPER_METHOD
PATH
CANONICAL_QUERY
SHA256_HEX(BODY_BYTES)
TIMESTAMP
NONCE
```

簽名算法：

```text
signature = hex_lower(hmac_sha256(sign_string, secret))
```

簽名校驗規則：

- 時間戳允許偏差約 ±300 秒。
- Nonce 在有效期內不可重複。
- 寫介面若重複使用同一個 `X-DJ-Idempotency-Key`，請求會被拒絕。

## 3. 介面清單

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/site/ping` | 連通性檢查 |
| `GET` | `/products` | 拉取商品列表 |
| `GET` | `/products/:product_id` | 拉取商品詳情 |
| `GET` | `/wallet/balance` | 查詢對接錢包餘額 |
| `POST` | `/orders` | 建立採購單 |
| `GET` | `/orders/:client_order_no` | 查詢採購單 |
| `POST` | `/orders/:client_order_no/cancel` | 取消採購單 |
| `POST` | `/callbacks/order-status` | 回傳訂單狀態 |
| `POST` | `/callbacks/delivery` | 回傳交付內容 |
| `POST` | `/callbacks/refund` | 回傳退款狀態 |

## 4. 核心介面說明

### 4.1 GET `/site/ping`

回應 `data` 欄位：

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | 是否連通 |
| `connection_id` | number | 連線 ID |
| `protocol_type` | string | 協議類型 |
| `protocol_version` | string | 協議版本 |
| `server_time` | number | 伺服器 Unix 時間戳 |

### 4.2 GET `/products`

請求參數：

| 參數 | 類型 | 必填 | 預設 | 說明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 1 | 頁碼 |
| `page_size` | number | 否 | 20 | 每頁條數，最大 100 |
| `search` | string | 否 | - | 模糊搜尋關鍵字 |

回應 `data` 欄位：`items`、`page`、`page_size`、`total`、`has_more`。

`items[]` 主要欄位：

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `upstream_product_id` | string | 上游商品 ID |
| `upstream_sku_id` | string | 預設 SKU ID |
| `title` | string | 商品標題（已做多語言降級） |
| `price` | string | 價格字串 |
| `currency` | string | 幣種 |
| `stock_status` | string | `unlimited`/`in_stock`/`low_stock`/`out_of_stock` |
| `is_sold_out` | boolean | 是否售罄 |
| `skus` | array | SKU 清單 |

### 4.3 GET `/products/:product_id`

- 按上游商品 ID 查詢詳情。
- 回傳結構與 `/products` 的單個 `items` 元素一致。

### 4.4 GET `/wallet/balance`

回應 `data` 欄位：

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `wallet_user_id` | number | 被扣款錢包所屬使用者 ID |
| `currency` | string | 幣種 |
| `available_balance` | string | 可用餘額 |

### 4.5 POST `/orders`

請求體：

| 欄位 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| `client_order_no` | string | 是 | 對接方訂單號（建議全域唯一） |
| `upstream_product_id` | string | 是 | 上游商品 ID |
| `upstream_sku_id` | string | 否 | 上游 SKU ID（不傳預設首個可用 SKU） |
| `quantity` | number | 是 | 購買數量，必須大於 0 |
| `buyer_context` | object | 否 | 透傳上下文（可放本地訂單資訊） |

成功（受理）範例：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "accepted": true,
    "client_order_no": "A-20260301-001",
    "upstream_order_no": "UP20260301120000abcd",
    "status": "accepted",
    "procurement_amount": "9.90",
    "currency": "CNY"
  }
}
```

業務失敗範例（仍為 HTTP 200，`status_code=0`）：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "accepted": false,
    "client_order_no": "A-20260301-002",
    "upstream_order_no": "",
    "status": "failed",
    "procurement_amount": "9.90",
    "currency": "CNY",
    "error_code": "UPSTREAM_INSUFFICIENT_BALANCE",
    "error_message": "insufficient balance"
  }
}
```

### 4.6 GET `/orders/:client_order_no`

回傳欄位與 `POST /orders` 一致，用於輪詢採購狀態。

### 4.7 POST `/orders/:client_order_no/cancel`

回應欄位：

- 包含訂單狀態欄位（同 `POST /orders`）
- 額外包含 `canceled`（boolean）

若訂單不可取消，可能回傳：

- `error_code=UPSTREAM_ORDER_NOT_CANCELABLE`

## 5. 回調介面

### 5.1 POST `/callbacks/order-status`

用於回傳採購狀態變化。

### 5.2 POST `/callbacks/delivery`

用於回傳交付結果（卡密、連結、文字等）。

### 5.3 POST `/callbacks/refund`

用於回傳退款或失敗結果。

建議回調體至少包含以下之一用於匹配訂單：

- `upstream_order_no`
- `client_order_no`
- `buyer_context.local_order_id`

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `event_id` | 事件唯一 ID（用於去重） |
| `status` | 狀態值（如 `processing`、`delivered`、`failed`） |
| `error_code` / `error_message` | 失敗原因 |
| `payload` | 交付內容或擴展欄位 |

回調成功回應：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "ack": true,
    "event_id": "evt-001",
    "duplicate": false,
    "updated": true
  }
}
```

## 6. 狀態與錯誤碼

### 6.1 採購狀態 `status`

- `pending`
- `accepted`
- `failed`
- `canceled`

### 6.2 標準錯誤碼 `error_code`

- `UPSTREAM_INSUFFICIENT_BALANCE`：上游餘額不足
- `UPSTREAM_PRODUCT_UNAVAILABLE`：商品或 SKU 不可用
- `UPSTREAM_STOCK_INSUFFICIENT`：庫存不足
- `UPSTREAM_ORDER_NOT_CANCELABLE`：訂單不可取消

## 7. 幂等與重試建議

- `client_order_no` 必須唯一，重複提交會回傳既有訂單結果。
- 寫請求必須帶新的 `X-DJ-Idempotency-Key`。
- 查詢介面建議做輪詢退避（如 1s/2s/4s）避免高頻請求。

