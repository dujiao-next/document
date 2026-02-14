---
outline: deep
---

# User 前臺 API 文檔

> 更新時間：2026-02-11

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

> 以下對象用於後續各介面“返回結構”引用。

### 2.1 PublicProduct

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 商品 ID |
| category_id | number | 分類 ID |
| slug | string | 商品唯一標識 |
| title | object | 多語言標題，例如 `{ "zh-CN": "...", "en-US": "..." }` |
| description | object | 多語言摘要 |
| content | object | 多語言詳情內容 |
| price_amount | string | 商品價格金額（字符串金額，如 `"99.00"`） |
| price_currency | string | 價格幣種 |
| images | string[] | 商品圖片列表 |
| tags | string[] | 標籤列表 |
| purchase_type | string | 購買身份限制：`guest` / `member` |
| fulfillment_type | string | 交付類型：`manual` / `auto` |
| manual_form_schema | object | 人工交付表單 Schema |
| manual_stock_total | number | 人工庫存總量（0 表示不限制） |
| manual_stock_locked | number | 人工庫存鎖定量 |
| manual_stock_sold | number | 人工庫存已售量 |
| is_active | boolean | 是否上架 |
| sort_order | number | 排序 |
| created_at | string | 創建時間 |
| updated_at | string | 更新時間 |
| category | object | 分類信息（可選） |
| promotion_id | number | 命中的活動 ID（可選） |
| promotion_name | string | 活動名稱（可選） |
| promotion_type | string | 活動類型（可選） |
| promotion_price_amount | string | 活動價金額（可選） |
| promotion_price_currency | string | 活動價幣種（可選） |
| manual_stock_available | number | 人工可用庫存 |
| auto_stock_available | number | 自動可用庫存 |
| stock_status | string | 庫存狀態：`unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| is_sold_out | boolean | 是否售罄 |

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
| is_published | boolean | 是否發佈 |
| published_at | string/null | 發佈時間 |
| created_at | string | 創建時間 |

### 2.3 Banner

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | Banner ID |
| name | string | 後臺名稱 |
| position | string | 投放位置（如 `home_hero`） |
| title | object | 多語言標題 |
| subtitle | object | 多語言副標題 |
| image | string | 主圖 |
| mobile_image | string | 移動端圖 |
| link_type | string | 跳轉類型：`none` / `internal` / `external` |
| link_value | string | 跳轉值 |
| open_in_new_tab | boolean | 是否新窗口打開 |
| is_active | boolean | 是否啟用 |
| start_at | string/null | 生效時間 |
| end_at | string/null | 結束時間 |
| sort_order | number | 排序 |
| created_at | string | 創建時間 |
| updated_at | string | 更新時間 |

### 2.4 Category

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 分類 ID |
| slug | string | 分類唯一標識 |
| name | object | 多語言名稱 |
| sort_order | number | 排序 |
| created_at | string | 創建時間 |

### 2.5 UserProfile

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 用戶 ID |
| email | string | 郵箱 |
| nickname | string | 暱稱 |
| email_verified_at | string/null | 郵箱驗證時間 |
| locale | string | 語言（如 `zh-CN`） |

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
| login_source | string | 登錄來源（當前為 `web`） |
| request_id | string | 請求追蹤 ID |
| created_at | string | 記錄創建時間 |

### 2.7 OrderPreview

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| currency | string | 幣種 |
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
| id | number | 訂單 ID |
| order_no | string | 訂單號（推薦用於查詢） |
| parent_id | number/null | 父訂單 ID |
| user_id | number | 用戶 ID，遊客訂單一般為 0 |
| guest_email | string | 遊客郵箱（遊客訂單） |
| guest_locale | string | 遊客語言 |
| status | string | 訂單狀態：`pending_payment` / `paid` / `fulfilling` / `partially_delivered` / `delivered` / `completed` / `canceled` |
| currency | string | 訂單幣種 |
| original_amount | string | 原價 |
| discount_amount | string | 優惠金額 |
| promotion_discount_amount | string | 活動優惠金額 |
| total_amount | string | 實付金額 |
| coupon_id | number/null | 優惠券 ID |
| promotion_id | number/null | 活動 ID |
| client_ip | string | 下單 IP |
| expires_at | string/null | 待支付過期時間 |
| paid_at | string/null | 支付成功時間 |
| canceled_at | string/null | 取消時間 |
| created_at | string | 創建時間 |
| updated_at | string | 更新時間 |
| items | OrderItem[] | 訂單項 |
| fulfillment | Fulfillment | 交付記錄（可選） |
| children | Order[] | 子訂單列表（可選） |

### 2.10 OrderItem

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 訂單項 ID |
| order_id | number | 訂單 ID |
| product_id | number | 商品 ID |
| title | object | 商品標題快照 |
| tags | string[] | 商品標籤快照 |
| unit_price | string | 單價 |
| quantity | number | 數量 |
| total_price | string | 小計 |
| coupon_discount_amount | string | 優惠券分攤金額 |
| promotion_discount_amount | string | 活動優惠金額 |
| promotion_id | number/null | 活動 ID |
| promotion_name | string | 活動名稱（可選） |
| fulfillment_type | string | 交付類型 |
| manual_form_schema_snapshot | object | 人工交付表單 Schema 快照 |
| manual_form_submission | object | 用戶提交的人工表單值（已做清洗） |
| created_at | string | 創建時間 |
| updated_at | string | 更新時間 |

### 2.11 Fulfillment

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| id | number | 交付記錄 ID |
| order_id | number | 訂單 ID |
| type | string | 交付類型：`auto` / `manual` |
| status | string | 交付狀態：`pending` / `delivered` |
| payload | string | 文本交付內容 |
| delivery_data | object | 結構化交付信息（例如物流單號、下載信息等） |
| delivered_by | number/null | 交付管理員 ID |
| delivered_at | string/null | 交付時間 |
| created_at | string | 創建時間 |
| updated_at | string | 更新時間 |

### 2.12 PaymentLaunch

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| payment_id | number | 支付記錄 ID |
| order_id | number | 訂單 ID（`latest` 介面返回） |
| channel_id | number | 支付渠道 ID（`latest` 介面返回） |
| provider_type | string | 提供方：`official` / `epay` |
| channel_type | string | 渠道：`alipay` / `wechat` / `paypal` / `stripe` 等 |
| interaction_mode | string | 交互方式：`qr` / `redirect` / `wap` / `page` |
| pay_url | string | 跳轉支付連結（redirect/wap/page） |
| qr_code | string | 二維碼內容（qr） |
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
    "contact": {
      "telegram": "https://t.me/dujiaostudio",
      "whatsapp": "https://wa.me/1234567890"
    },
    "site_name": "Dujiao-Next",
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
    }
  }
}
```

#### 返回結構（data）

| 字段 | 類型 | 說明 |
| --- | --- | --- |
| languages | string[] | 站點啟用語言列表 |
| contact | object | 聯繫方式配置 |
| payment_channels | object[] | 前臺可用支付渠道列表 |
| captcha | object | 驗證碼公開配置 |
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
      "id": 1001,
      "category_id": 10,
      "slug": "netflix-plus",
      "title": { "zh-CN": "奈飛會員" },
      "description": { "zh-CN": "全區可用" },
      "content": { "zh-CN": "詳情說明" },
      "price_amount": "99.00",
      "price_currency": "CNY",
      "images": ["/uploads/product/1.png"],
      "tags": ["熱門"],
      "purchase_type": "member",
      "fulfillment_type": "manual",
      "manual_form_schema": { "fields": [] },
      "manual_stock_total": 100,
      "manual_stock_locked": 2,
      "manual_stock_sold": 10,
      "is_active": true,
      "sort_order": 100,
      "created_at": "2026-02-10T10:00:00Z",
      "updated_at": "2026-02-10T10:00:00Z",
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
    "id": 1001,
    "slug": "netflix-plus",
    "title": { "zh-CN": "奈飛會員" },
    "price_amount": "99.00",
    "price_currency": "CNY",
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
      "is_published": true,
      "published_at": "2026-02-11T10:00:00Z",
      "created_at": "2026-02-11T09:00:00Z"
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
    "is_published": true,
    "published_at": "2026-02-11T10:00:00Z",
    "created_at": "2026-02-11T09:00:00Z"
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
      "name": "首頁頭圖",
      "position": "home_hero",
      "title": { "zh-CN": "歡迎來到 D&N" },
      "subtitle": { "zh-CN": "穩定交付" },
      "image": "/uploads/banner/hero.png",
      "mobile_image": "/uploads/banner/hero-mobile.png",
      "link_type": "internal",
      "link_value": "/products",
      "open_in_new_tab": false,
      "is_active": true,
      "start_at": null,
      "end_at": null,
      "sort_order": 100,
      "created_at": "2026-02-11T08:00:00Z",
      "updated_at": "2026-02-11T08:00:00Z"
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
      "slug": "memberships",
      "name": { "zh-CN": "會員服務" },
      "sort_order": 100,
      "created_at": "2026-02-10T10:00:00Z"
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
    "locale": "zh-CN"
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
    "locale": "zh-CN"
  }
}
```

#### 返回結構（data）

- `data`：`UserProfile`

---

### 5.4 發送更換郵箱驗證碼

**介面**：`POST /me/email/send-verify-code`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| kind | string | 是 | `old`（發到舊郵箱）/ `new`（發到新郵箱） |
| new_email | string | 條件必填 | 當 `kind=new` 時必填 |

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

### 5.5 更換郵箱

**介面**：`POST /me/email/change`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| new_email | string | 是 | 新郵箱 |
| old_code | string | 是 | 舊郵箱驗證碼 |
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
    "locale": "zh-CN"
  }
}
```

#### 返回結構（data）

- `data`：`UserProfile`

---

### 5.6 修改密碼

**介面**：`PUT /me/password`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| old_password | string | 是 | 舊密碼 |
| new_password | string | 是 | 新密碼 |

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
    "id": 501,
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
        "id": 9001,
        "order_id": 501,
        "product_id": 1001,
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
      "id": 501,
      "order_no": "DN202602110001",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "created_at": "2026-02-11T12:00:00Z",
      "items": [
        {
          "id": 9001,
          "order_id": 501,
          "product_id": 1001,
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

### 6.4 訂單詳情（按 ID）

**介面**：`GET /orders/:id`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | 訂單 ID |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 501,
    "order_no": "DN202602110001",
    "status": "pending_payment",
    "currency": "CNY",
    "total_amount": "99.00",
    "items": [
      {
        "id": 9001,
        "order_id": 501,
        "product_id": 1001,
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

### 6.5 訂單詳情（按訂單號）

**介面**：`GET /orders/by-order-no/:order_no`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 訂單號 |

#### 成功響應示例

與 `GET /orders/:id` 一致。

#### 返回結構（data）

- `data`：`Order`

---

### 6.6 取消訂單

**介面**：`POST /orders/:id/cancel`

**認證**：是

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | 訂單 ID |

#### Body 參數

無

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 501,
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

### 6.7 創建支付單

**介面**：`POST /payments`

**認證**：是

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_id | number | 是 | 訂單 ID |
| channel_id | number | 是 | 支付渠道 ID |

#### 請求示例

```json
{
  "order_id": 501,
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

- `data`：`PaymentLaunch`（創建支付時通常不含 `order_id/channel_id` 字段）

---

### 6.8 捕獲支付結果

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

### 6.9 獲取最新待支付記錄

**介面**：`GET /payments/latest`

**認證**：是

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| order_id | number | 是 | 訂單 ID |

#### 成功響應示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "payment_id": 3001,
    "order_id": 501,
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

與 `POST /orders` 一致（遊客單的 `user_id=0`，`guest_email` 有值）。

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
      "id": 601,
      "order_no": "DN202602110002",
      "user_id": 0,
      "guest_email": "guest@example.com",
      "status": "pending_payment",
      "currency": "CNY",
      "total_amount": "99.00",
      "items": [
        {
          "id": 9101,
          "order_id": 601,
          "product_id": 1001,
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

### 7.4 遊客訂單詳情（按 ID）

**介面**：`GET /guest/orders/:id`

**認證**：否

#### Path 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | number | 是 | 訂單 ID |

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

### 7.5 遊客訂單詳情（按訂單號）

**介面**：`GET /guest/orders/by-order-no/:order_no`

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

與 `GET /guest/orders/:id` 一致。

#### 返回結構（data）

- `data`：`Order`

---

### 7.6 遊客創建支付單

**介面**：`POST /guest/payments`

**認證**：否

#### Body 參數

| 字段 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| order_id | number | 是 | 訂單 ID |
| channel_id | number | 是 | 支付渠道 ID |

#### 請求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "order_id": 601,
  "channel_id": 10
}
```

#### 成功響應示例

與 `POST /payments` 返回結構一致。

#### 返回結構（data）

- `data`：`PaymentLaunch`

---

### 7.7 遊客捕獲支付結果

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

### 7.8 遊客獲取最新待支付記錄

**介面**：`GET /guest/payments/latest`

**認證**：否

#### Query 參數

| 參數 | 類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| email | string | 是 | 遊客郵箱 |
| order_password | string | 是 | 查詢密碼 |
| order_id | number | 是 | 訂單 ID |

#### 成功響應示例

與 `GET /payments/latest` 一致。

#### 返回結構（data）

- `data`：`PaymentLaunch`

---

## 8. 前臺接入建議

### 8.1 訂單詳情優先使用 `order_no`

儘量使用：

- `GET /orders/by-order-no/:order_no`
- `GET /guest/orders/by-order-no/:order_no`

避免在前臺長期依賴自增 `id`。

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

可顯著降低“已支付但頁面未及時更新”的感知問題。

---

## 9. 非前臺主動調用介面（說明）

以下回調介面一般由支付平臺服務器調用，前臺模板無需主動請求：

- `POST /payments/callback`
- `GET /payments/callback`
- `POST /payments/webhook/paypal`
- `POST /payments/webhook/stripe`
