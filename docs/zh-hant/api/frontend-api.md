---
outline: deep
---

# User 前臺 API 文檔

> 更新時間：2026-03-31

本文檔覆蓋 `user/src/api/index.ts` 當前全部前臺 API，字段定義以以下實現為準：

- `api/internal/router/router.go`
- `api/internal/http/handlers/public/*.go`
- `api/internal/models/*.go`

## 開源倉庫地址

- API（主項目）：https://github.com/dujiao-next/dujiao-next
- User（用戶前臺）：https://github.com/dujiao-next/user
- Admin（後臺）：https://github.com/dujiao-next/admin
- Document（文檔）：https://github.com/dujiao-next/document

---

## 0. API 變更日誌

### 0.0.1 Public API Response DTO 精簡與安全加固（2026-03-31）

#### 破壞性變更

- 所有訂單相關介面不再返回自增 `id` 字段（`Order.id`、`OrderItem.id`、`Fulfillment.id`），統一使用 `order_no` 作為訂單標識。
- 訂單詳情路由從 `GET /orders/:id` 改為 `GET /orders/:order_no`；取消路由從 `POST /orders/:id/cancel` 改為 `POST /orders/:order_no/cancel`；交付下載從 `GET /orders/:id/fulfillment/download` 改為 `GET /orders/:order_no/fulfillment/download`。
- 遊客訂單詳情路由從 `GET /guest/orders/:id` 改為 `GET /guest/orders/:order_no`；交付下載同理。
- 舊路由 `GET /orders/by-order-no/:order_no` 和 `GET /guest/orders/by-order-no/:order_no` 已刪除，直接使用 `GET /orders/:order_no`。
- 支付介面 `POST /payments` 和 `GET /payments/latest` 的請求參數 `order_id` 改為 `order_no`（string 類型）。遊客支付介面同理。
- `GET /payments/latest` 響應中 `order_id` 改為 `order_no`。

#### 移除的字段

以下字段從 Public API 響應中永久移除，前端不應再依賴：

- **Order**: `id`、`parent_id`、`user_id`、`coupon_id`、`promotion_id`、`client_ip`、`updated_at`
- **OrderItem**: `id`、`order_id`、`delivered_by`、`created_at`、`updated_at`
- **Fulfillment**: `id`、`order_id`、`delivered_by`、`created_at`、`updated_at`
- **PublicProduct**: `cost_price_amount`、`manual_stock_locked`、`manual_stock_sold`、`is_active`、`sort_order`、`created_at`、`updated_at`、`is_affiliate_enabled`、`is_mapped`、`seo_meta`
- **PublicSKU**: `cost_price_amount`、`product_id`、`manual_stock_locked`、`auto_stock_total`、`auto_stock_locked`、`auto_stock_sold`、`sort_order`、`created_at`、`updated_at`
- **Banner**: `name`、`is_active`、`start_at`、`end_at`、`sort_order`、`created_at`、`updated_at`
- **Post**: `is_published`、`created_at`
- **Category**: `created_at`
- **WalletTransaction**: `order_id`
- **AffiliateCommission**: `order_id`

#### 新增的字段

- **Order**: `member_discount_amount`、`wallet_paid_amount`、`online_paid_amount`、`refunded_amount`
- **OrderItem**: `sku_snapshot`、`member_discount_amount`
- **Fulfillment**: `payload_line_count`
- **UserProfile**: `member_level_id`、`total_recharged`、`total_spent`
- **Category**: `parent_id`、`icon`

---

### 0.0 活動價系統改進：階梯規則 + 前端展示優化（2026-03-09）

#### 新增字段

- `PublicProduct` 新增 `promotion_rules` 字段（類型 `PromotionRule[]`），返回該商品所有生效中的活動規則。
- 即使當前 SKU 單價未滿足活動門檻，該字段也會返回資料，便於前端展示「多買可享折扣」等活動提示。

#### 階梯活動規則

- 同一商品支援配置多條活動規則（不同 `min_amount` 門檻），形成階梯折扣。
- 後端按購買小計（`單價 × 數量`）從高到低匹配門檻，取滿足條件的最高檔規則計算折扣。
- 範例：
  - 規則 A：`min_amount=50`，優惠 1%
  - 規則 B：`min_amount=150`，優惠 2%
  - 購買金額 49 → 無折扣；100 → 匹配規則 A（1%）；200 → 匹配規則 B（2%）
- 單條規則場景行為不變，無破壞性變更。

#### 活動類型說明

| type | 含義 | 計算方式 |
| --- | --- | --- |
| `percent` | 百分比折扣 | 每件單價 = 原價 × (100 - value) / 100 |
| `fixed` | 固定金額減免 | 每件單價 = 原價 - value |
| `special_price` | 直降特價 | 每件單價 = value |

> **注意：** 所有折扣均作用於**單件商品價格**，而非訂單總金額。`min_amount` 是購買小計門檻（`單價 × 數量`），達到門檻後每件商品享受對應折扣。

---

## 1. 通用約定

### 1.1 Base URL

- API 前綴：`/api/v1`
- 本文中的路徑均省略 `/api/v1`，調用時請自行拼接。

### 1.2 鑑權

用戶登錄態介面需攜帶：

```http
Authorization: Bearer <user_token>
```

### 1.3 統一響應結構

#### 成功響應

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {},
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_page": 5
  }
}
```

#### 失敗響應

```json
{
  "status_code": 400,
  "msg": "請求參數錯誤",
  "data": {
    "request_id": "01HR..."
  }
}
```

#### 頂層字段說明

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| status_code | number | 業務狀態碼，`0` 表示成功，非 `0` 表示失敗 |
| msg | string | 業務提示信息 |
| data | object/array/null | 業務數據 |
| pagination | object | 分頁信息，僅分頁介面返回 |

### 1.4 分頁參數約定

| 參數 | 類型 | 必填 | 默認 | 說明 |
| --- | --- | --- | --- | --- |
| page | number | 否 | 1 | 頁碼，最小 1 |
| page_size | number | 否 | 20 | 每頁條數，最大 100 |

### 1.5 通用請求結構

#### CaptchaPayload（驗證碼載荷）

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| captcha_id | string | 否 | 圖片驗證碼 ID（provider=image 時使用） |
| captcha_code | string | 否 | 圖片驗證碼文本（provider=image 時使用） |
| turnstile_token | string | 否 | Turnstile Token（provider=turnstile 時使用） |

#### OrderItemInput（訂單項）

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| product_id | number | 是 | 商品 ID |
| quantity | number | 是 | 購買數量（>0） |
| fulfillment_type | string | 否 | 交付類型，推薦值：`manual` / `auto` |

#### ManualFormData（人工交付表單值）

`manual_form_data` 是對象，Key 為 `product_id`，Value 為該商品的表單提交數據。

```json
{
  "1001": {
    "receiver_name": "張三",
    "phone": "13277745648",
    "address": "廣東省深圳市..."
  }
}
```

---

## 2. 數據對象字段字典

> 以下對象用於後續各介面「返回結構」引用。

### 2.1 PublicProduct

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| category_id | number | 分類 ID |
| slug | string | 商品唯一標識 |
| title | object | 多語言標題 |
| description | object | 多語言摘要 |
| content | object | 多語言詳情內容 |
| price_amount | string | 商品價格金額 |
| images | string[] | 商品圖片列表 |
| tags | string[] | 標籤列表 |
| purchase_type | string | 購買身份限制：`guest` / `member` |
| min_purchase_quantity | number | 單次最小購買數量（0 表示不限） |
| max_purchase_quantity | number | 單次最大購買數量（0 表示不限） |
| fulfillment_type | string | 交付類型：`manual` / `auto` |
| manual_form_schema | object | 人工交付表單 Schema |
| manual_stock_available | number | 人工可用庫存 |
| auto_stock_available | number | 自動可用庫存 |
| stock_status | string | 庫存狀態：`unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| is_sold_out | boolean | 是否售罄 |
| category | Category | 分類信息 |
| skus | PublicSKU[] | SKU 列表 |
| promotion_id | number | 命中的活動 ID（可選） |
| promotion_name | string | 活動名稱（可選） |
| promotion_type | string | 活動類型（可選） |
| promotion_price_amount | string | 活動價金額（可選） |
| promotion_rules | PromotionRule[] | 活動規則列表（可選） |
| member_prices | MemberLevelPrice[] | 會員等級價格列表（可選） |

#### 2.1.1 PublicSKU

`skus[]` 陣列中每個元素的結構如下：

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | SKU ID（下單時使用此 ID） |
| sku_code | string | SKU 編碼（同商品內唯一） |
| spec_values | object | 規格值（多語言） |
| price_amount | string | SKU 原價 |
| manual_stock_total | number | 人工庫存總量（`-1` 表示無限庫存） |
| manual_stock_sold | number | 人工庫存已售量 |
| auto_stock_available | number | 自動發貨庫存可用量 |
| upstream_stock | number | 上游庫存（`-1` 表示無限，`0` 表示售罄） |
| is_active | boolean | 是否啟用 |
| promotion_price_amount | string | SKU 活動價金額（可選） |
| member_price_amount | string | 會員價金額（可選） |

#### 2.1.2 PromotionRule

`promotion_rules[]` 陣列中每個元素的結構如下：

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 活動規則 ID |
| name | string | 活動名稱 |
| type | string | 活動類型：`percent` / `fixed` / `special_price` |
| value | string | 活動數值（字串金額/百分比，如 `"2.00"` 或 `"5.00"`） |
| min_amount | string | 觸發門檻金額（購買小計 = 單價 × 數量，如 `"200.00"`；`"0.00"` 表示無門檻） |

> **活動類型與折扣計算：**
>
> | type | 含義 | 折扣計算（作用於每件單價） |
> | --- | --- | --- |
> | `percent` | 百分比折扣 | 單價 = 原價 × (100 - value) / 100 |
> | `fixed` | 固定金額減免 | 單價 = 原價 - value |
> | `special_price` | 直降特價 | 單價 = value |
>
> - 所有折扣均作用於**單件商品價格**，而非訂單總金額。
> - `min_amount` 是購買小計門檻（`單價 × 數量`），達到門檻後每件商品享受對應折扣。
> - 同一商品可配置多條不同 `min_amount` 的規則，形成階梯折扣。後端從高到低匹配，取滿足條件的最高檔。

> **促銷價計算說明：** 促銷活動以商品為維度配置，促銷價下沉到每個 SKU 獨立計算。例如某商品配置了「優惠 2%」促銷，99 元的 SKU 促銷價為 97.02，77 元的 SKU 促銷價為 75.46。產品級的 `promotion_price_amount` 取所有 SKU 中的最低促銷價，適用於列表頁展示。`promotion_rules` 返回所有生效規則（按 `min_amount` 升序），即使當前單價未滿足門檻也會返回，便於前端展示活動提示。

### 2.2 Post

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 文章 ID |
| slug | string | 文章唯一標識 |
| type | string | 類型：`blog` / `notice` |
| title | object | 多語言標題 |
| summary | object | 多語言摘要 |
| content | object | 多語言內容 |
| thumbnail | string | 縮略圖 URL |
| published_at | string/null | 發佈時間 |

### 2.3 Banner

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | Banner ID |
| position | string | 投放位置（如 `home_hero`） |
| title | object | 多語言標題 |
| subtitle | object | 多語言副標題 |
| image | string | 主圖 |
| mobile_image | string | 移動端圖 |
| link_type | string | 跳轉類型：`none` / `internal` / `external` |
| link_value | string | 跳轉值 |
| open_in_new_tab | boolean | 是否新窗口打開 |

### 2.4 Category

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 分類 ID |
| parent_id | number | 父分類 ID（0 表示一級分類） |
| slug | string | 分類唯一標識 |
| name | object | 多語言名稱 |
| icon | string | 分類圖標 |
| sort_order | number | 排序 |

### 2.5 UserProfile

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 用戶 ID |
| email | string | 郵箱 |
| nickname | string | 暱稱 |
| email_verified_at | string/null | 郵箱驗證時間 |
| locale | string | 語言（如 `zh-CN`） |
| member_level_id | number | 會員等級 ID |
| total_recharged | string | 累計充值金額 |
| total_spent | string | 累計消費金額 |
| email_change_mode | string | 郵箱變更模式：`bind_only` / `change_with_old_and_new` |
| password_change_mode | string | 密碼變更模式：`set_without_old` / `change_with_old` |

### 2.6 UserLoginLog

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 日誌 ID |
| user_id | number | 用戶 ID（失敗時可能為 0） |
| email | string | 登錄郵箱 |
| status | string | 登錄結果：`success` / `failed` |
| fail_reason | string | 失敗原因枚舉 |
| client_ip | string | 客戶端 IP |
| user_agent | string | 客戶端 UA |
| login_source | string | 登錄來源：`web` / `telegram` |
| request_id | string | 請求追蹤 ID |
| created_at | string | 記錄創建時間 |

### 2.7 OrderPreview

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| currency | string | 幣種（全站統一，來源 `site_config.currency`） |
| original_amount | string | 原價總額 |
| discount_amount | string | 總優惠金額 |
| promotion_discount_amount | string | 活動優惠金額 |
| total_amount | string | 應付總額 |
| items | OrderPreviewItem[] | 預覽訂單項 |

### 2.8 OrderPreviewItem

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| product_id | number | 商品 ID |
| title | object | 商品標題快照（多語言） |
| tags | string[] | 商品標籤快照 |
| unit_price | string | 單價 |
| quantity | number | 數量 |
| total_price | string | 小計 |
| coupon_discount_amount | string | 優惠券分攤金額 |
| promotion_discount_amount | string | 活動分攤金額 |
| fulfillment_type | string | 交付類型 |

### 2.9 Order

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| order_no | string | 訂單號 |
| guest_email | string | 遊客郵箱（遊客訂單） |
| guest_locale | string | 遊客語言 |
| status | string | 訂單狀態：`pending_payment` / `paid` / `fulfilling` / `partially_delivered` / `delivered` / `completed` / `canceled` |
| currency | string | 訂單幣種 |
| original_amount | string | 原價 |
| discount_amount | string | 優惠金額 |
| member_discount_amount | string | 會員優惠金額 |
| promotion_discount_amount | string | 活動優惠金額 |
| total_amount | string | 實付金額 |
| wallet_paid_amount | string | 錢包支付金額 |
| online_paid_amount | string | 線上支付金額 |
| refunded_amount | string | 已退款金額 |
| expires_at | string/null | 待支付過期時間 |
| paid_at | string/null | 支付成功時間 |
| canceled_at | string/null | 取消時間 |
| created_at | string | 創建時間 |
| items | OrderItem[] | 訂單項 |
| fulfillment | Fulfillment | 交付記錄（可選） |
| children | Order[] | 子訂單列表（可選） |

### 2.10 OrderItem

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| title | object | 商品標題快照 |
| sku_snapshot | object | SKU 快照（編碼/規格） |
| tags | string[] | 商品標籤快照 |
| unit_price | string | 單價 |
| quantity | number | 數量 |
| total_price | string | 小計 |
| coupon_discount_amount | string | 優惠券分攤金額 |
| member_discount_amount | string | 會員優惠分攤金額 |
| promotion_discount_amount | string | 活動優惠金額 |
| fulfillment_type | string | 交付類型 |
| manual_form_schema_snapshot | object | 人工交付表單 Schema 快照 |
| manual_form_submission | object | 用戶提交的人工表單值 |

### 2.11 Fulfillment

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| type | string | 交付類型：`auto` / `manual` |
| status | string | 交付狀態：`pending` / `delivered` |
| payload | string | 文本交付內容 |
| payload_line_count | number | 交付內容總行數 |
| delivery_data | object | 結構化交付信息 |
| delivered_at | string/null | 交付時間 |

### 2.12 PaymentLaunch

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| payment_id | number | 支付記錄 ID |
| order_no | string | 訂單號（`latest` 介面返回） |
| channel_id | number | 支付渠道 ID（`latest` 介面返回） |
| provider_type | string | 提供方：`official` / `epay` |
| channel_type | string | 渠道：`alipay` / `wechat` / `paypal` / `stripe` 等 |
| interaction_mode | string | 交互方式：`qr` / `redirect` / `wap` / `page` |
| pay_url | string | 跳轉支付連結 |
| qr_code | string | 二維碼內容 |
| expires_at | string/null | 支付單過期時間 |

---

## 3. 公共介面（無需登錄）

### 3.1 獲取站點配置

**介面**：`GET /public/config`

**認證**：否

#### 請求參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "languages": ["zh-CN", "zh-TW", "en-US"],
    "currency": "CNY",
    "contact": {
      "telegram": "https://t.me/dujiaostudio",
      "whatsapp": "https://wa.me/1234567890"
    },
    "site_name": "Dujiao-Next",
    "scripts": [
      {
        "name": "Plausible",
        "enabled": true,
        "position": "head",
        "code": "<script defer data-domain=\"localhost\" src=\"https://xxx.com/js/script.js\"></script>"
      }
    ],
    "payment_channels": [
      {
        "id": 1,
        "name": "支付寶電腦站",
        "provider_type": "official",
        "channel_type": "alipay",
        "interaction_mode": "page",
        "fee_rate": "0.00"
      }
    ],
    "captcha": {
      "provider": "turnstile",
      "scenes": {
        "login": true,
        "register_send_code": true,
        "reset_send_code": false,
        "guest_create_order": false
      },
      "turnstile": {
        "site_key": "0x4AAA..."
      }
    },
    "telegram_auth": {
      "enabled": true,
      "bot_username": "dujiao_auth_bot"
    }
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| languages | string[] | 站點啟用語言列表 |
| currency | string | 全站幣種（3 位大寫代碼，如 `CNY`） |
| contact | object | 聯繫方式配置 |
| scripts | object[] | 前臺自訂 JS 腳本配置 |
| payment_channels | object[] | 前臺可用支付渠道列表 |
| captcha | object | 驗證碼公開配置 |
| telegram_auth | object | Telegram 登錄公開配置（`enabled`、`bot_username`） |
| 其他字段 | any | 後臺站點設置中的公開字段（動態擴展） |

---

### 3.2 商品列表

**介面**：`GET /public/products`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| page | number | 否 | 頁碼 |
| page_size | number | 否 | 每頁條數（最大 100） |
| category_id | string | 否 | 分類 ID |
| search | string | 否 | 搜索關鍵詞（標題等） |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "category_id": 10,
      "slug": "netflix-plus",
      "title": { "zh-CN": "奈飛會員" },
      "description": { "zh-CN": "全區可用" },
      "content": { "zh-CN": "詳情說明" },
      "price_amount": "99.00",
      "images": ["/uploads/product/1.png"],
      "tags": ["熱門"],
      "purchase_type": "member",
      "fulfillment_type": "manual",
      "manual_form_schema": { "fields": [] },
      "manual_stock_available": 88,
      "auto_stock_available": 0,
      "stock_status": "in_stock",
      "is_sold_out": false
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### 返回結構（data）

- `data`：`PublicProduct[]`
- `pagination`：分頁對象（見通用約定）

---

### 3.3 商品詳情

**介面**：`GET /public/products/:slug`

**認證**：否

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| slug | string | 是 | 商品 slug |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "slug": "netflix-plus",
    "title": { "zh-CN": "奈飛會員" },
    "price_amount": "99.00",
    "fulfillment_type": "manual",
    "manual_form_schema": {
      "fields": [
        {
          "key": "receiver_name",
          "type": "text",
          "required": true,
          "label": { "zh-CN": "收件人" }
        }
      ]
    },
    "manual_stock_available": 88,
    "auto_stock_available": 0,
    "stock_status": "in_stock",
    "is_sold_out": false
  }
}
```

#### 返回結構（data）

- `data`：`PublicProduct`

---

### 3.4 文章列表

**介面**：`GET /public/posts`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| page | number | 否 | 頁碼 |
| page_size | number | 否 | 每頁條數 |
| type | string | 否 | 文章類型：`blog` / `notice` |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "slug": "release-2026-02",
      "type": "notice",
      "title": { "zh-CN": "版本更新" },
      "summary": { "zh-CN": "新增支付渠道" },
      "content": { "zh-CN": "詳細內容" },
      "thumbnail": "/uploads/post/1.png",
      "published_at": "2026-02-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### 返回結構（data）

- `data`：`Post[]`
- `pagination`：分頁對象

---

### 3.5 文章詳情

**介面**：`GET /public/posts/:slug`

**認證**：否

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章 slug |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 1,
    "slug": "release-2026-02",
    "type": "notice",
    "title": { "zh-CN": "版本更新" },
    "summary": { "zh-CN": "新增支付渠道" },
    "content": { "zh-CN": "詳細內容" },
    "thumbnail": "/uploads/post/1.png",
    "published_at": "2026-02-11T10:00:00Z"
  }
}
```

#### 返回結構（data）

- `data`：`Post`

---

### 3.6 Banner 列表

**介面**：`GET /public/banners`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 默認 | 說明 |
| --- | --- | --- | --- | --- |
| position | string | 否 | `home_hero` | Banner 位置 |
| limit | number | 否 | 10 | 最大 50 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "position": "home_hero",
      "title": { "zh-CN": "歡迎來到 D&N" },
      "subtitle": { "zh-CN": "穩定交付" },
      "image": "/uploads/banner/hero.png",
      "mobile_image": "/uploads/banner/hero-mobile.png",
      "link_type": "internal",
      "link_value": "/products",
      "open_in_new_tab": false
    }
  ]
}
```

#### 返回結構（data）

- `data`：`Banner[]`

---

### 3.7 分類列表

**介面**：`GET /public/categories`

**認證**：否

#### 請求參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 10,
      "parent_id": 0,
      "slug": "memberships",
      "name": { "zh-CN": "會員服務" },
      "icon": "",
      "sort_order": 100
    }
  ]
}
```

#### 返回結構（data）

- `data`：`Category[]`

---

### 3.8 獲取圖片驗證碼挑戰

**介面**：`GET /public/captcha/image`

**認證**：否

#### 請求參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "captcha_id": "9f2b2be147df4f6eb6f8",
    "image_base64": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| captcha_id | string | 本次驗證碼 ID |
| image_base64 | string | Base64 圖片（data URL） |

---

## 4. 認證介面（無需登錄）

### 4.1 發送郵箱驗證碼

**介面**：`POST /auth/send-verify-code`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 郵箱 |
| purpose | string | 是 | 驗證碼用途：`register` / `reset` |
| captcha_payload | object | 否 | 驗證碼參數（見通用結構） |

#### 請求示例

```json
{
  "email": "user@example.com",
  "purpose": "register",
  "captcha_payload": {
    "captcha_id": "",
    "captcha_code": "",
    "turnstile_token": ""
  }
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| sent | boolean | 是否發送成功 |

---

### 4.2 用戶註冊

**介面**：`POST /auth/register`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 郵箱 |
| password | string | 是 | 密碼 |
| code | string | 是 | 郵箱驗證碼 |
| agreement_accepted | boolean | 是 | 是否同意協議，必須為 `true` |

#### 請求示例

```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "code": "123456",
  "agreement_accepted": true
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "user@example.com",
      "nickname": "user",
      "email_verified_at": "2026-02-11T10:00:00Z"
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-18T10:00:00Z"
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| user | object | 註冊用戶信息（`id/email/nickname/email_verified_at`） |
| token | string | 用戶 JWT |
| expires_at | string | Token 過期時間（RFC3339） |

---

### 4.3 用戶登錄

**介面**：`POST /auth/login`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 郵箱 |
| password | string | 是 | 密碼 |
| remember_me | boolean | 否 | 是否延長登錄態 |
| captcha_payload | object | 否 | 驗證碼參數（見通用結構） |

#### 請求示例

```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "remember_me": true,
  "captcha_payload": {
    "captcha_id": "",
    "captcha_code": "",
    "turnstile_token": ""
  }
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "user@example.com",
      "nickname": "user",
      "email_verified_at": "2026-02-11T10:00:00Z"
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-25T10:00:00Z"
  }
}
```

#### 返回結構（data）

與註冊介面一致：`user + token + expires_at`

---

### 4.4 忘記密碼

**介面**：`POST /auth/forgot-password`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 郵箱 |
| code | string | 是 | 郵箱驗證碼 |
| new_password | string | 是 | 新密碼 |

#### 請求示例

```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "NewStrongPass123"
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "reset": true
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| reset | boolean | 是否重置成功 |

---

### 4.5 Telegram 登錄

**介面**：`POST /auth/telegram/login`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | Telegram 用戶 ID |
| first_name | string | 否 | 名 |
| last_name | string | 否 | 姓 |
| username | string | 否 | Telegram 用戶名 |
| photo_url | string | 否 | Telegram 頭像 URL |
| auth_date | number | 是 | Telegram 授權時間戳（秒） |
| hash | string | 是 | Telegram 登錄簽名 |

#### 請求示例

```json
{
  "id": 123456789,
  "first_name": "Dujiao",
  "last_name": "User",
  "username": "dujiao_user",
  "photo_url": "https://t.me/i/userpic/320/xxx.jpg",
  "auth_date": 1739250000,
  "hash": "f1b2c3..."
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": 101,
      "email": "telegram_123456789@login.local",
      "nickname": "telegram_123456789",
      "email_verified_at": null
    },
    "token": "eyJhbGciOi...",
    "expires_at": "2026-02-25T10:00:00Z"
  }
}
```

#### 返回結構（data）

與註冊介面一致：`user + token + expires_at`

> 首次 Telegram 登錄且未綁定站內帳號時，系統會自動創建帳號並直接登錄。

---

## 5. 登錄用戶資料介面（需 Bearer Token）

### 5.1 獲取當前用戶

**介面**：`GET /me`

**認證**：是

#### 請求參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "user@example.com",
    "nickname": "user",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### 返回結構（data）

- `data`：`UserProfile`

---

### 5.2 登錄日誌列表

**介面**：`GET /me/login-logs`

**認證**：是

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| page | number | 否 | 頁碼 |
| page_size | number | 否 | 每頁條數 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "user_id": 101,
      "email": "user@example.com",
      "status": "success",
      "fail_reason": "",
      "client_ip": "127.0.0.1",
      "user_agent": "Mozilla/5.0",
      "login_source": "web",
      "request_id": "01HR...",
      "created_at": "2026-02-11T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### 返回結構（data）

- `data`：`UserLoginLog[]`
- `pagination`：分頁對象

---

### 5.3 更新用戶資料

**介面**：`PUT /me/profile`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| nickname | string | 否 | 暱稱 |
| locale | string | 否 | 語言，例如 `zh-CN` |

> `nickname` 與 `locale` 至少傳一個。

#### 請求示例

```json
{
  "nickname": "新暱稱",
  "locale": "zh-CN"
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "user@example.com",
    "nickname": "新暱稱",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### 返回結構（data）

- `data`：`UserProfile`

---

### 5.4 獲取 Telegram 綁定狀態

**介面**：`GET /me/telegram`

**認證**：是

#### 請求參數

無

#### 成功響應示例（已綁定）

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": true,
    "provider": "telegram",
    "provider_user_id": "123456789",
    "username": "dujiao_user",
    "avatar_url": "https://t.me/i/userpic/320/xxx.jpg",
    "auth_at": "2026-02-20T12:00:00Z",
    "updated_at": "2026-02-20T12:00:00Z"
  }
}
```

#### 成功響應示例（未綁定）

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": false
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| bound | boolean | 是否已綁定 Telegram |
| provider | string | OAuth 提供方（綁定時為 `telegram`） |
| provider_user_id | string | Telegram 用戶 ID（字串） |
| username | string | Telegram 用戶名 |
| avatar_url | string | Telegram 頭像 URL |
| auth_at | string | Telegram 授權時間 |
| updated_at | string | 綁定資訊更新時間 |

> 當 `bound=false` 時，僅返回 `bound` 字段。

---

### 5.5 綁定 Telegram

**介面**：`POST /me/telegram/bind`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | Telegram 用戶 ID |
| first_name | string | 否 | 名 |
| last_name | string | 否 | 姓 |
| username | string | 否 | Telegram 用戶名 |
| photo_url | string | 否 | Telegram 頭像 URL |
| auth_date | number | 是 | Telegram 授權時間戳（秒） |
| hash | string | 是 | Telegram 登錄簽名 |

#### 請求示例

```json
{
  "id": 123456789,
  "first_name": "Dujiao",
  "last_name": "User",
  "username": "dujiao_user",
  "photo_url": "https://t.me/i/userpic/320/xxx.jpg",
  "auth_date": 1739250000,
  "hash": "f1b2c3..."
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "bound": true,
    "provider": "telegram",
    "provider_user_id": "123456789",
    "username": "dujiao_user",
    "avatar_url": "https://t.me/i/userpic/320/xxx.jpg",
    "auth_at": "2026-02-20T12:00:00Z",
    "updated_at": "2026-02-20T12:00:00Z"
  }
}
```

#### 返回結構（data）

與 `GET /me/telegram`（已綁定）一致。

---

### 5.6 解除綁定 Telegram

**介面**：`DELETE /me/telegram/unbind`

**認證**：是

#### 請求參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "unbound": true
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| unbound | boolean | 是否解除綁定成功 |

> 當用戶尚未綁定真實郵箱（`email_change_mode=bind_only`）時，不允許解除綁定 Telegram。

---

### 5.7 發送更換郵箱驗證碼

**介面**：`POST /me/email/send-verify-code`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| kind | string | 是 | `old`（發到舊郵箱）/ `new`（發到新郵箱） |
| new_email | string | 條件必填 | 當 `kind=new` 時必填 |

> 當 `email_change_mode=bind_only` 時，`kind=old` 不可用，請直接使用 `kind=new` 綁定真實郵箱。

#### 請求示例

```json
{
  "kind": "new",
  "new_email": "new@example.com"
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| sent | boolean | 是否發送成功 |

---

### 5.8 更換郵箱

**介面**：`POST /me/email/change`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| new_email | string | 是 | 新郵箱 |
| old_code | string | 條件必填 | 當 `email_change_mode=change_with_old_and_new` 時必填；當 `bind_only` 時可不傳（服務端忽略） |
| new_code | string | 是 | 新郵箱驗證碼 |

#### 請求示例

```json
{
  "new_email": "new@example.com",
  "old_code": "123456",
  "new_code": "654321"
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "new@example.com",
    "nickname": "user",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN",
    "email_change_mode": "change_with_old_and_new",
    "password_change_mode": "change_with_old"
  }
}
```

#### 返回結構（data）

- `data`：`UserProfile`

---

### 5.9 修改密碼

**介面**：`PUT /me/password`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| old_password | string | 條件必填 | 當 `password_change_mode=change_with_old` 時必填；當 `set_without_old` 時可不傳 |
| new_password | string | 是 | 新密碼 |

> 首次透過 Telegram 自動創建且未設置密碼的帳號，`password_change_mode=set_without_old`，僅需提交 `new_password`。

#### 請求示例

```json
{
  "old_password": "OldPass123",
  "new_password": "NewPass123"
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "updated": true
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| updated | boolean | 是否更新成功 |

---

## 6. 登錄用戶訂單與支付介面（需 Bearer Token）

### 6.1 訂單金額預覽

**介面**：`POST /orders/preview`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| items | OrderItemInput[] | 是 | 訂單項 |
| coupon_code | string | 否 | 優惠碼 |
| manual_form_data | object | 否 | 人工交付表單提交值（見通用結構） |

#### 請求示例

```json
{
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "coupon_code": "SPRING2026",
  "manual_form_data": {
    "1001": {
      "receiver_name": "張三",
      "phone": "13277745648",
      "address": "廣東省深圳市南山區"
    }
  }
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "currency": "CNY",
    "original_amount": "99.00",
    "discount_amount": "10.00",
    "promotion_discount_amount": "5.00",
    "total_amount": "84.00",
    "items": [
      {
        "product_id": 1001,
        "title": { "zh-CN": "奈飛會員" },
        "tags": ["熱門"],
        "unit_price": "99.00",
        "quantity": 1,
        "total_price": "99.00",
        "coupon_discount_amount": "10.00",
        "promotion_discount_amount": "5.00",
        "fulfillment_type": "manual"
      }
    ]
  }
}
```

#### 返回結構（data）

- `data`：`OrderPreview`

---

### 6.2 創建訂單

**介面**：`POST /orders`

**認證**：是

#### Body 參數

與 `POST /orders/preview` 相同。

#### 請求示例

```json
{
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "張三",
      "phone": "13277745648",
      "address": "廣東省深圳市南山區"
    }
  }
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "original_amount": "99.00",
    "discount_amount": "0.00",
    "promotion_discount_amount": "0.00",
    "total_amount": "99.00",
    "expires_at": "2026-02-11T12:30:00Z",
    "items": [
      {
        "title": { "zh-CN": "奈飛會員" },
        "quantity": 1,
        "unit_price": "99.00",
        "total_price": "99.00",
        "coupon_discount_amount": "0.00",
        "promotion_discount_amount": "0.00",
        "fulfillment_type": "manual",
        "manual_form_schema_snapshot": {
          "fields": [
            { "key": "receiver_name", "type": "text", "required": true }
          ]
        },
        "manual_form_submission": {
          "receiver_name": "張三"
        }
      }
    ]
  }
}
```

#### 返回結構（data）

- `data`：`Order`

---

### 6.3 訂單列表

**介面**：`GET /orders`

**認證**：是

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| page | number | 否 | 頁碼 |
| page_size | number | 否 | 每頁條數 |
| status | string | 否 | 狀態過濾（見 `Order.status` 枚舉） |
| order_no | string | 否 | 訂單號模糊查詢 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "order_no": "DN202602110001",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "created_at": "2026-02-11T12:00:00Z",
      "items": [
        {
          "title": { "zh-CN": "奈飛會員" },
          "quantity": 1,
          "unit_price": "99.00",
          "total_price": "99.00",
          "coupon_discount_amount": "0.00",
          "promotion_discount_amount": "0.00",
          "fulfillment_type": "manual",
          "manual_form_schema_snapshot": {},
          "manual_form_submission": {}
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### 返回結構（data）

- `data`：`Order[]`
- `pagination`：分頁對象

---

### 6.4 訂單詳情

**介面**：`GET /orders/:order_no`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "total_amount": "99.00",
    "items": [
      {
        "title": { "zh-CN": "奈飛會員" },
        "quantity": 1,
        "unit_price": "99.00",
        "total_price": "99.00",
        "coupon_discount_amount": "0.00",
        "promotion_discount_amount": "0.00",
        "fulfillment_type": "manual",
        "manual_form_schema_snapshot": {},
        "manual_form_submission": {}
      }
    ],
    "fulfillment": null,
    "children": []
  }
}
```

#### 返回結構（data）

- `data`：`Order`

---

### 6.5 取消訂單

**介面**：`POST /orders/:order_no/cancel`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |

#### Body 參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "order_no": "DN202602110001",
    "status": "canceled",
    "currency": "CNY",
    "total_amount": "99.00",
    "canceled_at": "2026-02-11T12:10:00Z"
  }
}
```

#### 返回結構（data）

- `data`：`Order`

---

### 6.6 創建支付單

**介面**：`POST /payments`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |
| channel_id | number | 是 | 支付渠道 ID |

#### 請求示例

```json
{
  "order_no": "DN202602110001",
  "channel_id": 10
}
```

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "provider_type": "official",
    "channel_type": "alipay",
    "interaction_mode": "page",
    "pay_url": "https://openapi.alipay.com/gateway.do?...",
    "qr_code": "",
    "expires_at": "2026-02-11T12:30:00Z"
  }
}
```

#### 返回結構（data）

- `data`：`PaymentLaunch`（創建支付時通常不含 `order_no/channel_id` 字段）

---

### 6.7 捕獲支付結果

**介面**：`POST /payments/:id/capture`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | 支付記錄 ID |

#### Body 參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "status": "success"
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| payment_id | number | 支付記錄 ID |
| status | string | 支付狀態：`initiated` / `pending` / `success` / `failed` / `expired` |

---

### 6.8 獲取最新待支付記錄

**介面**：`GET /payments/latest`

**認證**：是

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "order_no": "DN202602110001",
    "channel_id": 10,
    "provider_type": "official",
    "channel_type": "alipay",
    "interaction_mode": "page",
    "pay_url": "https://openapi.alipay.com/gateway.do?...",
    "qr_code": "",
    "expires_at": "2026-02-11T12:30:00Z"
  }
}
```

#### 返回結構（data）

- `data`：`PaymentLaunch`

---

## 7. 遊客訂單與支付介面

> 遊客訂單訪問憑證為：`email + order_password`。

### 7.1 遊客訂單預覽

**介面**：`POST /guest/orders/preview`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| items | OrderItemInput[] | 是 | 訂單項 |
| coupon_code | string | 否 | 優惠碼 |
| manual_form_data | object | 否 | 人工交付表單提交值 |
| captcha_payload | object | 否 | 驗證碼參數（當前預覽不會校驗，可忽略） |

#### 請求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "張三",
      "phone": "13277745648",
      "address": "廣東省深圳市南山區"
    }
  }
}
```

#### 成功響應示例

與 `POST /orders/preview` 一致。

#### 返回結構（data）

- `data`：`OrderPreview`

---

### 7.2 遊客創建訂單

**介面**：`POST /guest/orders`

**認證**：否

#### Body 參數

與 `POST /guest/orders/preview` 相同。

#### 請求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "items": [
    {
      "product_id": 1001,
      "quantity": 1,
      "fulfillment_type": "manual"
    }
  ],
  "manual_form_data": {
    "1001": {
      "receiver_name": "張三",
      "phone": "13277745648",
      "address": "廣東省深圳市南山區"
    }
  },
  "captcha_payload": {
    "captcha_id": "abc",
    "captcha_code": "x7g5",
    "turnstile_token": ""
  }
}
```

#### 成功響應示例

與 `POST /orders` 一致（遊客單的 `guest_email` 有值）。

#### 返回結構（data）

- `data`：`Order`

---

### 7.3 遊客訂單列表

**介面**：`GET /guest/orders`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| order_no | string | 否 | 訂單號，傳入時按單號查詢並返回 0/1 條 |
| page | number | 否 | 頁碼 |
| page_size | number | 否 | 每頁條數 |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "order_no": "DN202602110002",
      "guest_email": "guest@example.com",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "items": [
        {
          "title": { "zh-CN": "奈飛會員" },
          "quantity": 1,
          "unit_price": "99.00",
          "total_price": "99.00",
          "coupon_discount_amount": "0.00",
          "promotion_discount_amount": "0.00",
          "fulfillment_type": "manual",
          "manual_form_schema_snapshot": {},
          "manual_form_submission": {}
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_page": 1
  }
}
```

#### 返回結構（data）

- `data`：`Order[]`
- `pagination`：分頁對象

---

### 7.4 遊客訂單詳情

**介面**：`GET /guest/orders/:order_no`

**認證**：否

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |

#### 成功響應示例

與用戶訂單詳情結構一致。

#### 返回結構（data）

- `data`：`Order`

---

### 7.5 遊客創建支付單

**介面**：`POST /guest/payments`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| order_no | string | 是 | 訂單號 |
| channel_id | number | 是 | 支付渠道 ID |

#### 請求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "order_no": "DN202602110002",
  "channel_id": 10
}
```

#### 成功響應示例

與 `POST /payments` 返回結構一致。

#### 返回結構（data）

- `data`：`PaymentLaunch`

---

### 7.6 遊客捕獲支付結果

**介面**：`POST /guest/payments/:id/capture`

**認證**：否

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | 支付記錄 ID |

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |

#### 請求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass"
}
```

#### 成功響應示例

與 `POST /payments/:id/capture` 一致。

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| payment_id | number | 支付記錄 ID |
| status | string | 支付狀態 |

---

### 7.7 遊客獲取最新待支付記錄

**介面**：`GET /guest/payments/latest`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| order_no | string | 是 | 訂單號 |

#### 成功響應示例

與 `GET /payments/latest` 一致。

#### 返回結構（data）

- `data`：`PaymentLaunch`

---

## 8. 前臺接入建議

### 8.1 訂單介面統一使用 `order_no`

所有面向用戶的訂單介面均使用 `order_no` 作為標識符，不再暴露自增 ID：

- `GET /orders/:order_no` — 訂單詳情
- `POST /orders/:order_no/cancel` — 取消訂單
- `GET /orders/:order_no/fulfillment/download` — 下載交付內容
- `GET /guest/orders/:order_no` — 遊客訂單詳情
- `GET /guest/orders/:order_no/fulfillment/download` — 遊客下載交付內容
- `POST /payments`、`GET /payments/latest` — 使用 `order_no` 參數

### 8.2 統一錯誤處理

前端必須同時判斷：

- HTTP 狀態（網絡層）
- `status_code`（業務層）

當 `status_code != 0` 時，請讀取 `msg` 提示並記錄 `data.request_id` 便於排查。

### 8.3 支付成功頁與輪詢

建議支付流程組合使用：

1. 發起支付後跳轉 `pay_url` 或展示 `qr_code`
2. 支付完成回跳後，調用 `capture`
3. 再調用 `latest` 兜底輪詢確認

可顯著降低「已支付但頁面未及時更新」的感知問題。

---

## 9. 非前臺主動調用介面（說明）

### 9.1 支付平臺回調介面

以下回調介面一般由支付平臺服務器調用，前臺模板無需主動請求：

- `POST /payments/callback`
- `GET /payments/callback`
- `POST /payments/webhook/paypal`
- `POST /payments/webhook/stripe`

### 9.2 管理後臺 Telegram 登錄配置介面（Admin）

以下介面由管理後臺調用，不屬於前臺用戶側介面：

#### 9.2.1 獲取 Telegram 登錄配置

**介面**：`GET /admin/settings/telegram-auth`

**認證**：管理員 Token

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "enabled": true,
    "bot_username": "dujiao_auth_bot",
    "bot_token": "",
    "has_bot_token": true,
    "login_expire_seconds": 300,
    "replay_ttl_seconds": 300
  }
}
```

> 返回中的 `bot_token` 會固定為脫敏空字串，是否已配置請以 `has_bot_token` 判斷。

#### 9.2.2 更新 Telegram 登錄配置

**介面**：`PUT /admin/settings/telegram-auth`

**認證**：管理員 Token

#### Body 參數（Patch）

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| enabled | boolean | 否 | 是否啟用 Telegram 登錄 |
| bot_username | string | 否 | Telegram Bot 用戶名（不帶 `@`） |
| bot_token | string | 否 | Telegram Bot Token（傳空字串不會覆蓋既有值） |
| login_expire_seconds | number | 否 | 登錄有效期（30-86400 秒） |
| replay_ttl_seconds | number | 否 | 重放保護時長（60-86400 秒） |

#### 請求示例

```json
{
  "enabled": true,
  "bot_username": "dujiao_auth_bot",
  "bot_token": "123456:ABCDEF",
  "login_expire_seconds": 300,
  "replay_ttl_seconds": 300
}
```

#### 成功響應

返回結構與 `GET /admin/settings/telegram-auth` 一致（脫敏）。

### 9.3 管理後臺商品多 SKU 介面（Admin）

以下介面由管理後臺調用，不屬於前臺使用者側介面。

#### 9.3.1 建立商品（支援多 SKU）

**介面**：`POST /admin/products`
**認證**：管理員 Token

#### Body 關鍵參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| category_id | number | 是 | 分類 ID |
| slug | string | 是 | 商品唯一標識 |
| title | object | 是 | 多語言標題 |
| price_amount | number | 是 | 單規格模式下商品價格；多 SKU 時建議傳 `0` 或任意佔位值，最終以後端 SKU 計算為準 |
| fulfillment_type | string | 否 | `manual` / `auto` |
| manual_stock_total | number | 否 | 單規格模式下人工庫存總量 |
| skus | array | 否 | 多 SKU 陣列，傳空或不傳表示單規格模式 |

#### `skus[]` 字段

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 否 | 更新既有 SKU 時傳；建立新 SKU 可不傳 |
| sku_code | string | 是 | SKU 編碼（同商品內唯一） |
| spec_values | object | 否 | 規格展示文案（如多語言 `{"zh-TW":"標準版","en-US":"Standard"}`） |
| price_amount | number | 是 | SKU 價格（必須大於 0） |
| manual_stock_total | number | 否 | SKU 人工庫存（手動交付模式下生效） |
| is_active | boolean | 否 | 是否啟用，預設 `true` |
| sort_order | number | 否 | 排序權重，預設 `0`；數值越大越靠前 |

#### 請求示例（單規格相容）

```json
{
  "category_id": 1,
  "slug": "vpn-monthly",
  "title": {
    "zh-CN": "VPN 月付",
    "zh-TW": "VPN 月付",
    "en-US": "VPN Monthly"
  },
  "price_amount": 29.9,
  "fulfillment_type": "manual",
  "manual_stock_total": 100
}
```

#### 請求示例（多 SKU）

```json
{
  "category_id": 1,
  "slug": "vpn-subscription",
  "title": {
    "zh-CN": "VPN 订阅",
    "zh-TW": "VPN 訂閱",
    "en-US": "VPN Subscription"
  },
  "price_amount": 0,
  "fulfillment_type": "manual",
  "skus": [
    {
      "sku_code": "STANDARD",
      "spec_values": {
        "zh-CN": "标准版",
        "zh-TW": "標準版",
        "en-US": "Standard"
      },
      "price_amount": 29.9,
      "manual_stock_total": 100,
      "is_active": true,
      "sort_order": 10
    },
    {
      "sku_code": "PRO",
      "spec_values": {
        "zh-CN": "专业版",
        "zh-TW": "專業版",
        "en-US": "Pro"
      },
      "price_amount": 49.9,
      "manual_stock_total": 80,
      "is_active": true,
      "sort_order": 20
    }
  ]
}
```

#### 9.3.2 更新商品（支援多 SKU）

**介面**：`PUT /admin/products/:id`
**認證**：管理員 Token

請求結構與 `POST /admin/products` 一致；若要更新既有 SKU，請在 `skus[]` 中傳對應 `id`。

#### 9.3.3 後端處理規則

- 當 `skus` 非空時：
  - 商品展示價自動取「啟用 SKU 中的最低價」；
  - 若為人工交付，商品人工庫存總量自動彙總「啟用 SKU 的 `manual_stock_total`」。
- 當 `skus` 為空時：
  - 按歷史單規格模式處理，價格與庫存使用商品本身字段。

#### 9.3.4 管理後臺操作指引

1. 進入後臺 `商品管理`，新建或編輯商品。
2. 在「SKU 規格設定」區域新增一個或多個 SKU，填寫編碼、規格文案、價格、庫存、狀態與排序。
3. 若已配置 SKU，商品「價格/人工庫存總量」字段僅作展示參考，實際以 SKU 數據為準。
4. 保存後可在前臺商品詳情頁按 SKU 展示與下單。

### 9.4 推廣返利介面（Affiliate）

以下介面對應前臺返利中心與後臺返利審核能力。

#### 9.4.1 下單介面新增 `affiliate_code` 字段

以下介面的請求體支持附帶 `affiliate_code`（聯盟 ID）：

- `POST /orders/preview`
- `POST /orders`
- `POST /guest/orders/preview`
- `POST /guest/orders`

字段定義：

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| affiliate_code | string | 否 | 推廣聯盟 ID（如 `AB12CD34`），用於訂單返利歸因 |

#### 9.4.2 公開點擊上報

**介面**：`POST /public/affiliate/click`
**認證**：無需登錄

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| affiliate_code | string | 是 | 聯盟 ID |
| visitor_key | string | 否 | 訪客標識（前端可持久化） |
| landing_path | string | 否 | 落地路徑（如 `/?aff=AB12CD34`） |
| referrer | string | 否 | 來源頁 URL |

成功返回：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "ok": true
  }
}
```

#### 9.4.3 用戶返利中心介面（需 Bearer Token）

##### A) 開通返利

- **介面**：`POST /affiliate/open`
- **說明**：開通成功後返回返利檔案（含聯盟 ID）。

##### B) 獲取返利看板

- **介面**：`GET /affiliate/dashboard`

返回 `data` 關鍵字段：

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| opened | boolean | 是否已開通 |
| affiliate_code | string | 聯盟 ID |
| promotion_path | string | 推廣路徑（如 `/?aff=AB12CD34`） |
| click_count | number | 點擊數 |
| valid_order_count | number | 有效訂單數 |
| conversion_rate | number | 轉化率（百分比數值） |
| pending_commission | string | 待確認佣金 |
| available_commission | string | 可提現佣金 |
| withdrawn_commission | string | 已提現佣金 |

##### C) 查詢我的佣金記錄

- **介面**：`GET /affiliate/commissions`
- **參數**：`page`、`page_size`、`status`
- **status 可選值**：`pending_confirm` / `available` / `rejected` / `withdrawn`

##### D) 查詢我的提現記錄

- **介面**：`GET /affiliate/withdraws`
- **參數**：`page`、`page_size`、`status`
- **status 可選值**：`pending_review` / `rejected` / `paid`

##### E) 申請提現

- **介面**：`POST /affiliate/withdraws`

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| amount | string | 是 | 提現金額（字符串金額，保留 2 位小數） |
| channel | string | 是 | 提現渠道 |
| account | string | 是 | 提現賬號 |

#### 9.4.4 管理後臺返利設置（Admin）

##### A) 獲取返利設置

- **介面**：`GET /admin/settings/affiliate`
- **認證**：管理員 Token

##### B) 更新返利設置

- **介面**：`PUT /admin/settings/affiliate`
- **認證**：管理員 Token

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| enabled | boolean | 是 | 是否開啟返利 |
| commission_rate | number | 是 | 返利比例（0-100，支持 2 位小數） |
| confirm_days | number | 是 | 佣金確認天數（0-3650） |
| min_withdraw_amount | number | 是 | 最低提現金額（>=0） |
| withdraw_channels | string[] | 是 | 提現渠道列表 |

#### 9.4.5 管理後臺返利管理（Admin）

以下介面均需管理員 Token：

| 介面 | 說明 |
| --- | --- |
| `GET /admin/affiliates/users` | 返利用戶列表 |
| `GET /admin/affiliates/commissions` | 佣金記錄列表 |
| `GET /admin/affiliates/withdraws` | 提現申請列表 |
| `POST /admin/affiliates/withdraws/:id/reject` | 拒絕提現申請 |
| `POST /admin/affiliates/withdraws/:id/pay` | 標記提現已打款 |

其中：

- `POST /admin/affiliates/withdraws/:id/reject` body 支持 `{ "reason": "拒絕原因" }`
- `POST /admin/affiliates/withdraws/:id/pay` 無需額外 body 字段
