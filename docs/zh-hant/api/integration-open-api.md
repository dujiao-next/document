---
outline: deep
---

# 站點對接 Open API 文件

> 更新時間：2026-03-06

本文檔用於對接開發，覆蓋 Dujiao-Next 站點間串貨介面：`/api/v1/upstream/*`。

---

## 1. 基礎資訊

### 1.1 Base URL

```
https://<B站域名>/api/v1/upstream
```

範例：`https://api.example.com/api/v1/upstream`

### 1.2 統一回應結構

**成功回應：**

```json
{
  "ok": true,
  ...
}
```

**失敗回應：**

```json
{
  "ok": false,
  "error_code": "error_code_here",
  "error_message": "human readable message"
}
```

### 1.3 當前實作約束（重要）

- 付款成功後的採購為非同步執行，不阻斷終端使用者付款流程。
- 對接商品（存在啟用上游映射）必須等待上游回調，不允許本地手動/自動交付。
- 本地取消前必須先執行上游取消；若上游回傳不可取消，本地必須拒絕取消與退款。
- 上游採購失敗時，呼叫方應將訂單標記為異常待處理，不應自動做本地取消/退款關閉。

---

## 2. 鑑權與簽名

### 2.1 必要請求標頭

| Header | 說明 |
| --- | --- |
| `Dujiao-Next-Api-Key` | API Key（由 B 站使用者在前台「API 權限」中產生） |
| `Dujiao-Next-Timestamp` | Unix 秒級時間戳 |
| `Dujiao-Next-Signature` | HMAC-SHA256 簽名（hex 小寫） |

### 2.2 簽名演算法

**簽名字串（signString）按如下格式拼接：**

```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{BODY_MD5}
```

各部分說明：

| 佔位符 | 說明 |
| --- | --- |
| `{METHOD}` | HTTP 方法大寫，如 `GET`、`POST` |
| `{PATH}` | 請求路徑（不含域名和查詢參數），如 `/api/v1/upstream/products` |
| `{TIMESTAMP}` | 與請求標頭 `Dujiao-Next-Timestamp` 一致 |
| `{BODY_MD5}` | 請求體的 MD5 雜湊（hex 小寫）。無 body 時為空字串的 MD5：`d41d8cd98f00b204e9800998ecf8427e` |

**最終簽名：**

```
signature = hex_lower(hmac_sha256(signString, api_secret))
```

### 2.3 簽名虛擬碼範例

```python
import hashlib, hmac, time

api_key = "your_api_key"
api_secret = "your_api_secret"
method = "POST"
path = "/api/v1/upstream/orders"
body = b'{"sku_id":1,"quantity":1}'
timestamp = str(int(time.time()))

body_md5 = hashlib.md5(body).hexdigest()
sign_string = f"{method}\n{path}\n{timestamp}\n{body_md5}"
signature = hmac.new(
    api_secret.encode(), sign_string.encode(), hashlib.sha256
).hexdigest()

headers = {
    "Dujiao-Next-Api-Key": api_key,
    "Dujiao-Next-Timestamp": timestamp,
    "Dujiao-Next-Signature": signature,
    "Content-Type": "application/json",
}
```

### 2.4 簽名校驗規則

- 時間戳允許偏差 **±60 秒**。
- API Key 必須處於「已批准且啟用」狀態。
- 所屬使用者帳號必須處於正常狀態。

---

## 3. 介面清單

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/ping` | 連通性檢查 |
| `GET` | `/products` | 拉取商品列表 |
| `GET` | `/products/:id` | 拉取商品詳情 |
| `POST` | `/orders` | 建立採購單（錢包自動扣款） |
| `GET` | `/orders/:id` | 查詢採購單 |
| `POST` | `/orders/:id/cancel` | 取消採購單 |

**回調介面（B 站 → A 站）：**

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `POST` | `/upstream/callback` | B 站向 A 站推送訂單狀態變更與交付內容 |

---

## 4. 核心介面說明

### 4.1 POST `/ping`

連通性檢查，同時回傳對接帳戶的錢包餘額與幣種。

**請求：** 無需請求體。

**回應欄位：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | 是否連通 |
| `site_name` | string | 站點名稱 |
| `protocol_version` | string | 協議版本，當前為 `"1.0"` |
| `user_id` | number | 對接使用者 ID |
| `balance` | string | 錢包可用餘額 |
| `currency` | string | 站點幣種（如 `CNY`、`USD`） |

**回應範例：**

```json
{
  "ok": true,
  "site_name": "My Shop",
  "protocol_version": "1.0",
  "user_id": 42,
  "balance": "1000.00",
  "currency": "CNY"
}
```

---

### 4.2 GET `/products`

拉取上游商品列表（僅回傳已上架商品）。

**Query 參數：**

| 參數 | 類型 | 必填 | 預設 | 說明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 1 | 頁碼 |
| `page_size` | number | 否 | 20 | 每頁條數（1～100） |

**回應欄位：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `items` | array | 商品陣列（見下方 Product 結構） |
| `total` | number | 總數 |
| `page` | number | 當前頁碼 |
| `page_size` | number | 每頁條數 |

#### Product 結構

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `id` | number | 商品 ID（下單時透過 SKU ID 引用） |
| `slug` | string | URL Slug |
| `title` | object | 多語言標題，如 `{"zh-CN":"標題","en":"Title"}` |
| `description` | object | 多語言描述 |
| `content` | object | 多語言詳情內容 |
| `seo_meta` | object | SEO 元資訊 |
| `images` | string[] | 圖片 URL 列表 |
| `tags` | string[] | 標籤列表 |
| `price_amount` | string | 商品基準價格 |
| `fulfillment_type` | string | 交付類型：`auto`（自動發貨）/ `manual`（人工交付）/ `upstream`（上游對接） |
| `manual_form_schema` | object | 人工交付表單結構（`manual` 類型商品需要買家填寫的表單） |
| `is_active` | boolean | 是否上架 |
| `category_id` | number | 分類 ID |
| `skus` | array | SKU 列表（見下方 SKU 結構） |
| `created_at` | string | 建立時間（ISO 8601） |
| `updated_at` | string | 更新時間（ISO 8601） |

#### SKU 結構

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `id` | number | SKU ID（**下單時使用此 ID**） |
| `sku_code` | string | SKU 編碼 |
| `spec_values` | object | 規格值，如 `{"顏色":"紅色","容量":"128GB"}` |
| `price_amount` | string | SKU 價格 |
| `stock_status` | string | 庫存狀態：`unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| `stock_quantity` | number | 庫存數量（-1 = 無限） |
| `is_active` | boolean | 是否啟用 |

::: tip 庫存狀態說明
- `unlimited`：無限庫存（`stock_quantity = -1`）
- `in_stock`：充足（`> 20`）
- `low_stock`：低庫存（`1 ~ 20`）
- `out_of_stock`：售罄（`0`）
:::

**回應範例：**

```json
{
  "ok": true,
  "items": [
    {
      "id": 1,
      "slug": "example-product",
      "title": { "zh-CN": "示例商品", "en": "Example Product" },
      "description": { "zh-CN": "這是一個範例" },
      "content": {},
      "seo_meta": {},
      "images": ["https://example.com/img1.jpg"],
      "tags": ["hot"],
      "price_amount": "9.90",
      "fulfillment_type": "auto",
      "manual_form_schema": null,
      "is_active": true,
      "category_id": 1,
      "skus": [
        {
          "id": 1,
          "sku_code": "DEFAULT",
          "spec_values": {},
          "price_amount": "9.90",
          "stock_status": "in_stock",
          "stock_quantity": 100,
          "is_active": true
        }
      ],
      "created_at": "2026-03-01T12:00:00Z",
      "updated_at": "2026-03-01T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### 4.3 GET `/products/:id`

按商品 ID 查詢詳情。

**路徑參數：**

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| `id` | number | 商品 ID |

**回應欄位：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `product` | object | Product 結構（同 4.2 節） |

**錯誤碼：**

| error_code | HTTP 狀態碼 | 說明 |
| --- | --- | --- |
| `product_not_found` | 404 | 商品不存在 |
| `product_unavailable` | 404 | 商品已下架 |

---

### 4.4 POST `/orders`

建立採購單。系統會自動使用對接使用者的錢包餘額付款，無需額外支付流程。

**請求體：**

| 欄位 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| `sku_id` | number | 是 | SKU ID（來自商品列表中的 `skus[].id`） |
| `quantity` | number | 是 | 購買數量，必須 ≥ 1 |
| `manual_form_data` | object | 否 | 人工交付表單資料（當商品為 `manual` 類型時必填） |
| `downstream_order_no` | string | 否 | 下游訂單號（建議全域唯一，用於冪等和回調匹配） |
| `trace_id` | string | 否 | 呼叫方追蹤 ID |
| `callback_url` | string | 否 | 回調通知地址（必須為公網可存取的 HTTP/HTTPS 地址） |

::: warning 冪等性
同一個 API Key + 同一個 `downstream_order_no` 不允許重複建立，重複提交會回傳既有訂單的資訊。
:::

**成功回應（`ok: true`）：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | `true` |
| `order_id` | number | 上游訂單 ID |
| `order_no` | string | 上游訂單號 |
| `status` | string | 訂單狀態（通常為 `paid`） |
| `amount` | string | 訂單金額 |
| `currency` | string | 幣種 |

**成功回應範例：**

```json
{
  "ok": true,
  "order_id": 101,
  "order_no": "DJ20260301120000ABCD",
  "status": "paid",
  "amount": "9.90",
  "currency": "CNY"
}
```

**業務失敗（HTTP 200，`ok: false`）：**

```json
{
  "ok": false,
  "order_id": 101,
  "order_no": "DJ20260301120000ABCD",
  "status": "canceled",
  "error_code": "payment_failed",
  "error_message": "wallet payment failed: insufficient balance"
}
```

說明：當錢包餘額不足或付款失敗時，系統自動取消訂單並回傳 `ok: false`。

**錯誤碼彙總：**

| error_code | HTTP 狀態碼 | 說明 |
| --- | --- | --- |
| `bad_request` | 400 | 請求參數無效 |
| `invalid_callback_url` | 400 | 回調地址非法（內網/localhost 等） |
| `sku_unavailable` | 400 | SKU 不存在或已下架 |
| `product_unavailable` | 400 | 商品不可用 |
| `insufficient_balance` | 402 | 錢包餘額不足 |
| `insufficient_stock` | 409 | 庫存不足 |
| `payment_failed` | 200 | 錢包付款失敗（`ok: false`） |

---

### 4.5 GET `/orders/:id`

查詢採購單詳情。

**路徑參數：**

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| `id` | number | 訂單 ID（來自建立訂單時回傳的 `order_id`） |

**回應欄位：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `order_id` | number | 訂單 ID |
| `order_no` | string | 訂單號 |
| `status` | string | 訂單狀態 |
| `amount` | string | 訂單金額 |
| `currency` | string | 幣種 |
| `items` | array | 訂單商品列表（見下表） |
| `fulfillment` | object | 交付資訊（已交付時才有，見下表） |

**`items[]` 欄位：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `product_id` | number | 商品 ID |
| `sku_id` | number | SKU ID |
| `title` | object | 多語言標題 |
| `quantity` | number | 數量 |
| `unit_price` | string | 單價 |
| `total_price` | string | 小計 |
| `fulfillment_type` | string | 交付類型 |

**`fulfillment` 欄位（僅 status 為 `delivered` 時出現）：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `type` | string | 交付類型（`auto` / `manual`） |
| `status` | string | 交付狀態（`delivered`） |
| `payload` | string | 交付內容（卡密等純文字） |
| `delivery_data` | object | 結構化交付資料 |
| `delivered_at` | string | 交付時間（ISO 8601） |

**回應範例：**

```json
{
  "ok": true,
  "order_id": 101,
  "order_no": "DJ20260301120000ABCD",
  "status": "completed",
  "amount": "9.90",
  "currency": "CNY",
  "items": [
    {
      "product_id": 1,
      "sku_id": 1,
      "title": { "zh-CN": "示例商品" },
      "quantity": 1,
      "unit_price": "9.90",
      "total_price": "9.90",
      "fulfillment_type": "auto"
    }
  ],
  "fulfillment": {
    "type": "auto",
    "status": "delivered",
    "payload": "ABCD-EFGH-1234-5678",
    "delivery_data": null,
    "delivered_at": "2026-03-01T12:01:00Z"
  }
}
```

---

### 4.6 POST `/orders/:id/cancel`

取消採購單。

**路徑參數：**

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| `id` | number | 訂單 ID |

**請求：** 無需請求體。

**成功回應：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `ok` | boolean | `true` |
| `order_id` | number | 訂單 ID |
| `order_no` | string | 訂單號 |
| `status` | string | 取消後的狀態（`canceled`） |

**錯誤碼：**

| error_code | HTTP 狀態碼 | 說明 |
| --- | --- | --- |
| `order_not_found` | 404 | 訂單不存在 |
| `cancel_not_allowed` | 409 | 當前狀態不可取消（已付款/已完成/已交付等） |

---

## 5. 回調介面

### 5.1 POST `/api/v1/upstream/callback`

B 站主動向 A 站推送訂單狀態變更與交付內容。

**回調觸發時機：**

- 訂單狀態變更（已付款 → 已完成、已取消等）
- 交付內容產生（自動發卡、手動交付完成）

**回調鑑權方式：**

B 站使用 A 站的對接連線中設定的 `api_key` / `api_secret` 進行簽名，A 站用同樣的演算法驗證。

**請求標頭：**

| Header | 說明 |
| --- | --- |
| `Dujiao-Next-Api-Key` | A 站在「對接連線」中設定的 API Key |
| `Dujiao-Next-Timestamp` | Unix 秒級時間戳 |
| `Dujiao-Next-Signature` | HMAC-SHA256 簽名 |

**請求體：**

| 欄位 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| `event` | string | 否 | 事件類型 |
| `order_id` | number | 是 | B 站訂單 ID |
| `order_no` | string | 否 | B 站訂單號 |
| `downstream_order_no` | string | 是 | A 站本地訂單號（用於匹配採購單） |
| `status` | string | 是 | 訂單狀態 |
| `fulfillment` | object | 否 | 交付資訊（見下表） |
| `timestamp` | number | 否 | 事件時間戳 |

**`fulfillment` 子物件：**

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| `type` | string | 交付類型（`auto` / `manual`） |
| `status` | string | 交付狀態（`delivered`） |
| `payload` | string | 交付內容（卡密、文字等） |
| `delivery_data` | object | 結構化交付資料 |
| `delivered_at` | string | 交付時間（ISO 8601） |

**回調狀態映射：**

| 上游 status | A 站處理為 |
| --- | --- |
| `delivered` / `completed` | `delivered`（觸發本地交付） |
| `canceled` | `canceled`（觸發本地取消） |
| 其他 | 透傳原值 |

**回調成功回應：**

```json
{ "ok": true, "message": "received" }
```

**回調失敗回應：**

```json
{ "ok": false, "message": "reason" }
```

---

## 6. 訂單狀態說明

| 狀態 | 說明 |
| --- | --- |
| `pending` | 待付款 |
| `paid` | 已付款（等待交付） |
| `processing` | 處理中 |
| `completed` | 已完成 |
| `canceled` | 已取消 |
| `refunded` | 已退款 |
| `exception` | 異常 |

---

## 7. 錯誤碼彙總

### 7.1 鑑權錯誤（HTTP 401 / 403）

| error_code | 說明 |
| --- | --- |
| `missing_auth_headers` | 缺少簽名請求標頭 |
| `invalid_timestamp` | 時間戳格式錯誤 |
| `timestamp_expired` | 時間戳過期（超過 ±60 秒） |
| `invalid_signature` | 簽名驗證失敗 |
| `invalid_api_key` | API Key 無效或已停用 |
| `user_disabled` | API Key 所屬使用者已被封禁 |

### 7.2 業務錯誤

| error_code | HTTP 狀態碼 | 說明 |
| --- | --- | --- |
| `bad_request` | 400 | 請求參數無效 |
| `invalid_callback_url` | 400 | 回調地址非法 |
| `sku_unavailable` | 400 | SKU 不存在或不可用 |
| `product_unavailable` | 400 | 商品不存在或不可用 |
| `product_not_found` | 404 | 商品不存在 |
| `order_not_found` | 404 | 訂單不存在 |
| `insufficient_balance` | 402 | 錢包餘額不足 |
| `insufficient_stock` | 409 | 庫存不足 |
| `cancel_not_allowed` | 409 | 訂單不可取消 |
| `payment_failed` | 200 | 錢包付款失敗（`ok: false`） |
| `internal_error` | 500 | 伺服器內部錯誤 |

---

## 8. 對接流程與最佳實踐

### 8.1 標準對接流程

```
1. B 站使用者開通 API 權限，產生 API Key / Secret
2. A 站管理員建立「對接連線」，填寫 B 站地址與憑證
3. A 站呼叫 POST /ping 測試連通性
4. A 站呼叫 GET /products 拉取商品列表
5. A 站在管理後台建立商品映射（本地商品 → 上游商品/SKU）
6. 終端使用者在 A 站下單付款 → A 站非同步呼叫 POST /orders 向 B 站採購
7. B 站處理訂單並交付 → 透過回調通知 A 站
8. A 站根據回調更新本地訂單狀態
```

### 8.2 冪等與重試

- `downstream_order_no` 作為冪等鍵：相同 API Key + 相同 `downstream_order_no` 只會建立一次訂單。
- 建議對所有寫操作實作指數退避重試（如 1s → 2s → 4s）。
- 查詢介面可輪詢但應控制頻率。

### 8.3 回調可靠性

- B 站在建立訂單時傳入 `callback_url`，交付/狀態變更時 B 站會主動推送。
- 建議 A 站同時實作輪詢兜底：定期呼叫 `GET /orders/:id` 檢查訂單狀態。
- 回調可能因網路問題失敗，A 站應做好冪等處理。

### 8.4 安全要求

- `callback_url` 不允許指向內網地址（localhost、127.0.0.1、私有 IP 段等）。
- 簽名使用 HMAC-SHA256，Secret 僅在建立時展示一次，請妥善保管。
- 建議所有通訊使用 HTTPS。

---

## 9. 簽名驗證範例

### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/md5"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "time"
)

func sign(secret, method, path string, timestamp int64, body []byte) string {
    h := md5.New()
    h.Write(body)
    bodyMD5 := hex.EncodeToString(h.Sum(nil))
    signString := fmt.Sprintf("%s\n%s\n%d\n%s", method, path, timestamp, bodyMD5)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(signString))
    return hex.EncodeToString(mac.Sum(nil))
}

func main() {
    secret := "your_api_secret"
    method := "POST"
    path := "/api/v1/upstream/orders"
    body := []byte(`{"sku_id":1,"quantity":1}`)
    ts := time.Now().Unix()

    sig := sign(secret, method, path, ts, body)
    fmt.Println("Signature:", sig)
    fmt.Println("Timestamp:", ts)
}
```

### Python

```python
import hashlib, hmac, time, json, requests

api_key = "your_api_key"
api_secret = "your_api_secret"
base_url = "https://api.example.com"

def sign(secret: str, method: str, path: str, timestamp: int, body: bytes) -> str:
    body_md5 = hashlib.md5(body).hexdigest()
    sign_string = f"{method}\n{path}\n{timestamp}\n{body_md5}"
    return hmac.new(
        secret.encode(), sign_string.encode(), hashlib.sha256
    ).hexdigest()

def api_request(method: str, path: str, body: dict = None):
    ts = int(time.time())
    body_bytes = json.dumps(body).encode() if body else b""
    sig = sign(api_secret, method, path, ts, body_bytes)
    headers = {
        "Dujiao-Next-Api-Key": api_key,
        "Dujiao-Next-Timestamp": str(ts),
        "Dujiao-Next-Signature": sig,
        "Content-Type": "application/json",
    }
    resp = requests.request(method, base_url + path, headers=headers, data=body_bytes)
    return resp.json()

# 測試連通
print(api_request("POST", "/api/v1/upstream/ping"))

# 拉取商品
print(api_request("GET", "/api/v1/upstream/products"))

# 建立訂單
print(api_request("POST", "/api/v1/upstream/orders", {
    "sku_id": 1,
    "quantity": 1,
    "downstream_order_no": "A-20260301-001",
    "callback_url": "https://a-site.example.com/api/v1/upstream/callback",
}))
```

### PHP

```php
<?php
function dujiaoSign(string $secret, string $method, string $path, int $timestamp, string $body): string {
    $bodyMD5 = md5($body);
    $signString = "{$method}\n{$path}\n{$timestamp}\n{$bodyMD5}";
    return hash_hmac('sha256', $signString, $secret);
}

$apiKey = 'your_api_key';
$apiSecret = 'your_api_secret';
$baseUrl = 'https://api.example.com';

$method = 'POST';
$path = '/api/v1/upstream/orders';
$body = json_encode(['sku_id' => 1, 'quantity' => 1, 'downstream_order_no' => 'A-001']);
$timestamp = time();
$signature = dujiaoSign($apiSecret, $method, $path, $timestamp, $body);

$ch = curl_init($baseUrl . $path);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Dujiao-Next-Api-Key: {$apiKey}",
        "Dujiao-Next-Timestamp: {$timestamp}",
        "Dujiao-Next-Signature: {$signature}",
    ],
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```
