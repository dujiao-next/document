---
outline: deep
---

# User 前台 API 文档

> 更新时间：2026-02-11

本文档覆盖 `user/src/api/index.ts` 当前全部前台 API，字段定义以以下实现为准：

- `api/internal/router/router.go`
- `api/internal/http/handlers/public/*.go`
- `api/internal/models/*.go`

## 开源仓库地址

- API（主项目）：https://github.com/dujiao-next/dujiao-next
- User（用户前台）：https://github.com/dujiao-next/user
- Admin（后台）：https://github.com/dujiao-next/admin
- Document（文档）：https://github.com/dujiao-next/document

---

## 1. 通用约定

### 1.1 Base URL

- API 前缀：`/api/v1`
- 本文中的路径均省略 `/api/v1`，调用时请自行拼接。

### 1.2 鉴权

用户登录态接口需携带：

```http
Authorization: Bearer <user_token>
```

### 1.3 统一响应结构

#### 成功响应

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

#### 失败响应

```json
{
  "status_code": 400,
  "msg": "请求参数错误",
  "data": {
    "request_id": "01HR..."
  }
}
```

#### 顶层字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| status_code | number | 业务状态码，`0` 表示成功，非 `0` 表示失败 |
| msg | string | 业务提示信息 |
| data | object/array/null | 业务数据 |
| pagination | object | 分页信息，仅分页接口返回 |

### 1.4 分页参数约定

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| page | number | 否 | 1 | 页码，最小 1 |
| page_size | number | 否 | 20 | 每页条数，最大 100 |

### 1.5 通用请求结构

#### CaptchaPayload（验证码载荷）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| captcha_id | string | 否 | 图片验证码 ID（provider=image 时使用） |
| captcha_code | string | 否 | 图片验证码文本（provider=image 时使用） |
| turnstile_token | string | 否 | Turnstile Token（provider=turnstile 时使用） |

#### OrderItemInput（订单项）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| product_id | number | 是 | 商品 ID |
| quantity | number | 是 | 购买数量（>0） |
| fulfillment_type | string | 否 | 交付类型，推荐值：`manual` / `auto` |

#### ManualFormData（人工交付表单值）

`manual_form_data` 是对象，Key 为 `product_id`，Value 为该商品的表单提交数据。

```json
{
  "1001": {
    "receiver_name": "张三",
    "phone": "13277745648",
    "address": "广东省深圳市..."
  }
}
```

---

## 2. 数据对象字段字典

> 以下对象用于后续各接口“返回结构”引用。

### 2.1 PublicProduct

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 商品 ID |
| category_id | number | 分类 ID |
| slug | string | 商品唯一标识 |
| title | object | 多语言标题，例如 `{ "zh-CN": "...", "en-US": "..." }` |
| description | object | 多语言摘要 |
| content | object | 多语言详情内容 |
| price_amount | string | 商品价格金额（字符串金额，如 `"99.00"`） |
| price_currency | string | 价格币种 |
| images | string[] | 商品图片列表 |
| tags | string[] | 标签列表 |
| purchase_type | string | 购买身份限制：`guest` / `member` |
| fulfillment_type | string | 交付类型：`manual` / `auto` |
| manual_form_schema | object | 人工交付表单 Schema |
| manual_stock_total | number | 人工库存总量（0 表示不限制） |
| manual_stock_locked | number | 人工库存锁定量 |
| manual_stock_sold | number | 人工库存已售量 |
| is_active | boolean | 是否上架 |
| sort_order | number | 排序 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| category | object | 分类信息（可选） |
| promotion_id | number | 命中的活动 ID（可选） |
| promotion_name | string | 活动名称（可选） |
| promotion_type | string | 活动类型（可选） |
| promotion_price_amount | string | 活动价金额（可选） |
| promotion_price_currency | string | 活动价币种（可选） |
| manual_stock_available | number | 人工可用库存 |
| auto_stock_available | number | 自动可用库存 |
| stock_status | string | 库存状态：`unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| is_sold_out | boolean | 是否售罄 |

### 2.2 Post

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 文章 ID |
| slug | string | 文章唯一标识 |
| type | string | 类型：`blog` / `notice` |
| title | object | 多语言标题 |
| summary | object | 多语言摘要 |
| content | object | 多语言内容 |
| thumbnail | string | 缩略图 URL |
| is_published | boolean | 是否发布 |
| published_at | string/null | 发布时间 |
| created_at | string | 创建时间 |

### 2.3 Banner

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | Banner ID |
| name | string | 后台名称 |
| position | string | 投放位置（如 `home_hero`） |
| title | object | 多语言标题 |
| subtitle | object | 多语言副标题 |
| image | string | 主图 |
| mobile_image | string | 移动端图 |
| link_type | string | 跳转类型：`none` / `internal` / `external` |
| link_value | string | 跳转值 |
| open_in_new_tab | boolean | 是否新窗口打开 |
| is_active | boolean | 是否启用 |
| start_at | string/null | 生效时间 |
| end_at | string/null | 结束时间 |
| sort_order | number | 排序 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

### 2.4 Category

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 分类 ID |
| slug | string | 分类唯一标识 |
| name | object | 多语言名称 |
| sort_order | number | 排序 |
| created_at | string | 创建时间 |

### 2.5 UserProfile

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 用户 ID |
| email | string | 邮箱 |
| nickname | string | 昵称 |
| email_verified_at | string/null | 邮箱验证时间 |
| locale | string | 语言（如 `zh-CN`） |

### 2.6 UserLoginLog

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 日志 ID |
| user_id | number | 用户 ID（失败时可能为 0） |
| email | string | 登录邮箱 |
| status | string | 登录结果：`success` / `failed` |
| fail_reason | string | 失败原因枚举 |
| client_ip | string | 客户端 IP |
| user_agent | string | 客户端 UA |
| login_source | string | 登录来源（当前为 `web`） |
| request_id | string | 请求追踪 ID |
| created_at | string | 记录创建时间 |

### 2.7 OrderPreview

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| currency | string | 币种 |
| original_amount | string | 原价总额 |
| discount_amount | string | 总优惠金额 |
| promotion_discount_amount | string | 活动优惠金额 |
| total_amount | string | 应付总额 |
| items | OrderPreviewItem[] | 预览订单项 |

### 2.8 OrderPreviewItem

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| product_id | number | 商品 ID |
| title | object | 商品标题快照（多语言） |
| tags | string[] | 商品标签快照 |
| unit_price | string | 单价 |
| quantity | number | 数量 |
| total_price | string | 小计 |
| coupon_discount_amount | string | 优惠券分摊金额 |
| promotion_discount_amount | string | 活动分摊金额 |
| fulfillment_type | string | 交付类型 |

### 2.9 Order

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 订单 ID |
| order_no | string | 订单号（推荐用于查询） |
| parent_id | number/null | 父订单 ID |
| user_id | number | 用户 ID，游客订单一般为 0 |
| guest_email | string | 游客邮箱（游客订单） |
| guest_locale | string | 游客语言 |
| status | string | 订单状态：`pending_payment` / `paid` / `fulfilling` / `partially_delivered` / `delivered` / `completed` / `canceled` |
| currency | string | 订单币种 |
| original_amount | string | 原价 |
| discount_amount | string | 优惠金额 |
| promotion_discount_amount | string | 活动优惠金额 |
| total_amount | string | 实付金额 |
| coupon_id | number/null | 优惠券 ID |
| promotion_id | number/null | 活动 ID |
| client_ip | string | 下单 IP |
| expires_at | string/null | 待支付过期时间 |
| paid_at | string/null | 支付成功时间 |
| canceled_at | string/null | 取消时间 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| items | OrderItem[] | 订单项 |
| fulfillment | Fulfillment | 交付记录（可选） |
| children | Order[] | 子订单列表（可选） |

### 2.10 OrderItem

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 订单项 ID |
| order_id | number | 订单 ID |
| product_id | number | 商品 ID |
| title | object | 商品标题快照 |
| tags | string[] | 商品标签快照 |
| unit_price | string | 单价 |
| quantity | number | 数量 |
| total_price | string | 小计 |
| coupon_discount_amount | string | 优惠券分摊金额 |
| promotion_discount_amount | string | 活动优惠金额 |
| promotion_id | number/null | 活动 ID |
| promotion_name | string | 活动名称（可选） |
| fulfillment_type | string | 交付类型 |
| manual_form_schema_snapshot | object | 人工交付表单 Schema 快照 |
| manual_form_submission | object | 用户提交的人工表单值（已做清洗） |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

### 2.11 Fulfillment

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | number | 交付记录 ID |
| order_id | number | 订单 ID |
| type | string | 交付类型：`auto` / `manual` |
| status | string | 交付状态：`pending` / `delivered` |
| payload | string | 文本交付内容 |
| delivery_data | object | 结构化交付信息（例如物流单号、下载信息等） |
| delivered_by | number/null | 交付管理员 ID |
| delivered_at | string/null | 交付时间 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

### 2.12 PaymentLaunch

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| payment_id | number | 支付记录 ID |
| order_id | number | 订单 ID（`latest` 接口返回） |
| channel_id | number | 支付渠道 ID（`latest` 接口返回） |
| provider_type | string | 提供方：`official` / `epay` |
| channel_type | string | 渠道：`alipay` / `wechat` / `paypal` / `stripe` 等 |
| interaction_mode | string | 交互方式：`qr` / `redirect` / `wap` / `page` |
| pay_url | string | 跳转支付链接（redirect/wap/page） |
| qr_code | string | 二维码内容（qr） |
| expires_at | string/null | 支付单过期时间 |

---

## 3. 公共接口（无需登录）

### 3.1 获取站点配置

**接口**：`GET /public/config`

**认证**：否

#### 请求参数

无

#### 成功响应示例

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
        "name": "支付宝电脑站",
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

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| languages | string[] | 站点启用语言列表 |
| contact | object | 联系方式配置 |
| payment_channels | object[] | 前台可用支付渠道列表 |
| captcha | object | 验证码公开配置 |
| 其他字段 | any | 后台站点设置中的公开字段（动态扩展） |

---

### 3.2 商品列表

**接口**：`GET /public/products`

**认证**：否

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页条数（最大 100） |
| category_id | string | 否 | 分类 ID |
| search | string | 否 | 搜索关键词（标题等） |

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1001,
      "category_id": 10,
      "slug": "netflix-plus",
      "title": { "zh-CN": "奈飞会员" },
      "description": { "zh-CN": "全区可用" },
      "content": { "zh-CN": "详情说明" },
      "price_amount": "99.00",
      "price_currency": "CNY",
      "images": ["/uploads/product/1.png"],
      "tags": ["热门"],
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

#### 返回结构（data）

- `data`：`PublicProduct[]`
- `pagination`：分页对象（见通用约定）

---

### 3.3 商品详情

**接口**：`GET /public/products/:slug`

**认证**：否

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| slug | string | 是 | 商品 slug |

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 1001,
    "slug": "netflix-plus",
    "title": { "zh-CN": "奈飞会员" },
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

#### 返回结构（data）

- `data`：`PublicProduct`

---

### 3.4 文章列表

**接口**：`GET /public/posts`

**认证**：否

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页条数 |
| type | string | 否 | 文章类型：`blog` / `notice` |

#### 成功响应示例

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
      "content": { "zh-CN": "详细内容" },
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

#### 返回结构（data）

- `data`：`Post[]`
- `pagination`：分页对象

---

### 3.5 文章详情

**接口**：`GET /public/posts/:slug`

**认证**：否

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| slug | string | 是 | 文章 slug |

#### 成功响应示例

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
    "content": { "zh-CN": "详细内容" },
    "thumbnail": "/uploads/post/1.png",
    "is_published": true,
    "published_at": "2026-02-11T10:00:00Z",
    "created_at": "2026-02-11T09:00:00Z"
  }
}
```

#### 返回结构（data）

- `data`：`Post`

---

### 3.6 Banner 列表

**接口**：`GET /public/banners`

**认证**：否

#### Query 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| position | string | 否 | `home_hero` | Banner 位置 |
| limit | number | 否 | 10 | 最大 50 |

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 1,
      "name": "首页头图",
      "position": "home_hero",
      "title": { "zh-CN": "欢迎来到 D&N" },
      "subtitle": { "zh-CN": "稳定交付" },
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

#### 返回结构（data）

- `data`：`Banner[]`

---

### 3.7 分类列表

**接口**：`GET /public/categories`

**认证**：否

#### 请求参数

无

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": [
    {
      "id": 10,
      "slug": "memberships",
      "name": { "zh-CN": "会员服务" },
      "sort_order": 100,
      "created_at": "2026-02-10T10:00:00Z"
    }
  ]
}
```

#### 返回结构（data）

- `data`：`Category[]`

---

### 3.8 获取图片验证码挑战

**接口**：`GET /public/captcha/image`

**认证**：否

#### 请求参数

无

#### 成功响应示例

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

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| captcha_id | string | 本次验证码 ID |
| image_base64 | string | Base64 图片（data URL） |

---

## 4. 认证接口（无需登录）

### 4.1 发送邮箱验证码

**接口**：`POST /auth/send-verify-code`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 邮箱 |
| purpose | string | 是 | 验证码用途：`register` / `reset` |
| captcha_payload | object | 否 | 验证码参数（见通用结构） |

#### 请求示例

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

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| sent | boolean | 是否发送成功 |

---

### 4.2 用户注册

**接口**：`POST /auth/register`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| code | string | 是 | 邮箱验证码 |
| agreement_accepted | boolean | 是 | 是否同意协议，必须为 `true` |

#### 请求示例

```json
{
  "email": "user@example.com",
  "password": "StrongPass123",
  "code": "123456",
  "agreement_accepted": true
}
```

#### 成功响应示例

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

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user | object | 注册用户信息（`id/email/nickname/email_verified_at`） |
| token | string | 用户 JWT |
| expires_at | string | Token 过期时间（RFC3339） |

---

### 4.3 用户登录

**接口**：`POST /auth/login`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| remember_me | boolean | 否 | 是否延长登录态 |
| captcha_payload | object | 否 | 验证码参数（见通用结构） |

#### 请求示例

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

#### 成功响应示例

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

#### 返回结构（data）

与注册接口一致：`user + token + expires_at`

---

### 4.4 忘记密码

**接口**：`POST /auth/forgot-password`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 邮箱 |
| code | string | 是 | 邮箱验证码 |
| new_password | string | 是 | 新密码 |

#### 请求示例

```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "NewStrongPass123"
}
```

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "reset": true
  }
}
```

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| reset | boolean | 是否重置成功 |

---

## 5. 登录用户资料接口（需 Bearer Token）

### 5.1 获取当前用户

**接口**：`GET /me`

**认证**：是

#### 请求参数

无

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`UserProfile`

---

### 5.2 登录日志列表

**接口**：`GET /me/login-logs`

**认证**：是

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页条数 |

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`UserLoginLog[]`
- `pagination`：分页对象

---

### 5.3 更新用户资料

**接口**：`PUT /me/profile`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| nickname | string | 否 | 昵称 |
| locale | string | 否 | 语言，例如 `zh-CN` |

> `nickname` 与 `locale` 至少传一个。

#### 请求示例

```json
{
  "nickname": "新昵称",
  "locale": "zh-CN"
}
```

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "id": 101,
    "email": "user@example.com",
    "nickname": "新昵称",
    "email_verified_at": "2026-02-11T10:00:00Z",
    "locale": "zh-CN"
  }
}
```

#### 返回结构（data）

- `data`：`UserProfile`

---

### 5.4 发送更换邮箱验证码

**接口**：`POST /me/email/send-verify-code`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| kind | string | 是 | `old`（发到旧邮箱）/ `new`（发到新邮箱） |
| new_email | string | 条件必填 | 当 `kind=new` 时必填 |

#### 请求示例

```json
{
  "kind": "new",
  "new_email": "new@example.com"
}
```

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "sent": true
  }
}
```

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| sent | boolean | 是否发送成功 |

---

### 5.5 更换邮箱

**接口**：`POST /me/email/change`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| new_email | string | 是 | 新邮箱 |
| old_code | string | 是 | 旧邮箱验证码 |
| new_code | string | 是 | 新邮箱验证码 |

#### 请求示例

```json
{
  "new_email": "new@example.com",
  "old_code": "123456",
  "new_code": "654321"
}
```

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`UserProfile`

---

### 5.6 修改密码

**接口**：`PUT /me/password`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| old_password | string | 是 | 旧密码 |
| new_password | string | 是 | 新密码 |

#### 请求示例

```json
{
  "old_password": "OldPass123",
  "new_password": "NewPass123"
}
```

#### 成功响应示例

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {
    "updated": true
  }
}
```

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| updated | boolean | 是否更新成功 |

---

## 6. 登录用户订单与支付接口（需 Bearer Token）

### 6.1 订单金额预览

**接口**：`POST /orders/preview`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| items | OrderItemInput[] | 是 | 订单项 |
| coupon_code | string | 否 | 优惠码 |
| manual_form_data | object | 否 | 人工交付表单提交值（见通用结构） |

#### 请求示例

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
      "receiver_name": "张三",
      "phone": "13277745648",
      "address": "广东省深圳市南山区"
    }
  }
}
```

#### 成功响应示例

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
        "title": { "zh-CN": "奈飞会员" },
        "tags": ["热门"],
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

#### 返回结构（data）

- `data`：`OrderPreview`

---

### 6.2 创建订单

**接口**：`POST /orders`

**认证**：是

#### Body 参数

与 `POST /orders/preview` 相同。

#### 请求示例

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
      "receiver_name": "张三",
      "phone": "13277745648",
      "address": "广东省深圳市南山区"
    }
  }
}
```

#### 成功响应示例

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
        "title": { "zh-CN": "奈飞会员" },
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
          "receiver_name": "张三"
        }
      }
    ]
  }
}
```

#### 返回结构（data）

- `data`：`Order`

---

### 6.3 订单列表

**接口**：`GET /orders`

**认证**：是

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页条数 |
| status | string | 否 | 状态过滤（见 `Order.status` 枚举） |
| order_no | string | 否 | 订单号模糊查询 |

#### 成功响应示例

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
          "title": { "zh-CN": "奈飞会员" },
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

#### 返回结构（data）

- `data`：`Order[]`
- `pagination`：分页对象

---

### 6.4 订单详情（按 ID）

**接口**：`GET /orders/:id`

**认证**：是

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 订单 ID |

#### 成功响应示例

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
        "title": { "zh-CN": "奈飞会员" },
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

#### 返回结构（data）

- `data`：`Order`

---

### 6.5 订单详情（按订单号）

**接口**：`GET /orders/by-order-no/:order_no`

**认证**：是

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 订单号 |

#### 成功响应示例

与 `GET /orders/:id` 一致。

#### 返回结构（data）

- `data`：`Order`

---

### 6.6 取消订单

**接口**：`POST /orders/:id/cancel`

**认证**：是

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 订单 ID |

#### Body 参数

无

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`Order`

---

### 6.7 创建支付单

**接口**：`POST /payments`

**认证**：是

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_id | number | 是 | 订单 ID |
| channel_id | number | 是 | 支付渠道 ID |

#### 请求示例

```json
{
  "order_id": 501,
  "channel_id": 10
}
```

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`PaymentLaunch`（创建支付时通常不含 `order_id/channel_id` 字段）

---

### 6.8 捕获支付结果

**接口**：`POST /payments/:id/capture`

**认证**：是

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 支付记录 ID |

#### Body 参数

无

#### 成功响应示例

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

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| payment_id | number | 支付记录 ID |
| status | string | 支付状态：`initiated` / `pending` / `success` / `failed` / `expired` |

---

### 6.9 获取最新待支付记录

**接口**：`GET /payments/latest`

**认证**：是

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_id | number | 是 | 订单 ID |

#### 成功响应示例

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

#### 返回结构（data）

- `data`：`PaymentLaunch`

---

## 7. 游客订单与支付接口

> 游客订单访问凭证为：`email + order_password`。

### 7.1 游客订单预览

**接口**：`POST /guest/orders/preview`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |
| items | OrderItemInput[] | 是 | 订单项 |
| coupon_code | string | 否 | 优惠码 |
| manual_form_data | object | 否 | 人工交付表单提交值 |
| captcha_payload | object | 否 | 验证码参数（当前预览不会校验，可忽略） |

#### 请求示例

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
      "receiver_name": "张三",
      "phone": "13277745648",
      "address": "广东省深圳市南山区"
    }
  }
}
```

#### 成功响应示例

与 `POST /orders/preview` 一致。

#### 返回结构（data）

- `data`：`OrderPreview`

---

### 7.2 游客创建订单

**接口**：`POST /guest/orders`

**认证**：否

#### Body 参数

与 `POST /guest/orders/preview` 相同。

#### 请求示例

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
      "receiver_name": "张三",
      "phone": "13277745648",
      "address": "广东省深圳市南山区"
    }
  },
  "captcha_payload": {
    "captcha_id": "abc",
    "captcha_code": "x7g5",
    "turnstile_token": ""
  }
}
```

#### 成功响应示例

与 `POST /orders` 一致（游客单的 `user_id=0`，`guest_email` 有值）。

#### 返回结构（data）

- `data`：`Order`

---

### 7.3 游客订单列表

**接口**：`GET /guest/orders`

**认证**：否

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |
| order_no | string | 否 | 订单号，传入时按单号查询并返回 0/1 条 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页条数 |

#### 成功响应示例

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
          "title": { "zh-CN": "奈飞会员" },
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

#### 返回结构（data）

- `data`：`Order[]`
- `pagination`：分页对象

---

### 7.4 游客订单详情（按 ID）

**接口**：`GET /guest/orders/:id`

**认证**：否

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 订单 ID |

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |

#### 成功响应示例

与用户订单详情结构一致。

#### 返回结构（data）

- `data`：`Order`

---

### 7.5 游客订单详情（按订单号）

**接口**：`GET /guest/orders/by-order-no/:order_no`

**认证**：否

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 订单号 |

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |

#### 成功响应示例

与 `GET /guest/orders/:id` 一致。

#### 返回结构（data）

- `data`：`Order`

---

### 7.6 游客创建支付单

**接口**：`POST /guest/payments`

**认证**：否

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |
| order_id | number | 是 | 订单 ID |
| channel_id | number | 是 | 支付渠道 ID |

#### 请求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass",
  "order_id": 601,
  "channel_id": 10
}
```

#### 成功响应示例

与 `POST /payments` 返回结构一致。

#### 返回结构（data）

- `data`：`PaymentLaunch`

---

### 7.7 游客捕获支付结果

**接口**：`POST /guest/payments/:id/capture`

**认证**：否

#### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | number | 是 | 支付记录 ID |

#### Body 参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |

#### 请求示例

```json
{
  "email": "guest@example.com",
  "order_password": "guest-pass"
}
```

#### 成功响应示例

与 `POST /payments/:id/capture` 一致。

#### 返回结构（data）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| payment_id | number | 支付记录 ID |
| status | string | 支付状态 |

---

### 7.8 游客获取最新待支付记录

**接口**：`GET /guest/payments/latest`

**认证**：否

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 游客邮箱 |
| order_password | string | 是 | 查询密码 |
| order_id | number | 是 | 订单 ID |

#### 成功响应示例

与 `GET /payments/latest` 一致。

#### 返回结构（data）

- `data`：`PaymentLaunch`

---

## 8. 前台接入建议

### 8.1 订单详情优先使用 `order_no`

尽量使用：

- `GET /orders/by-order-no/:order_no`
- `GET /guest/orders/by-order-no/:order_no`

避免在前台长期依赖自增 `id`。

### 8.2 统一错误处理

前端必须同时判断：

- HTTP 状态（网络层）
- `status_code`（业务层）

当 `status_code != 0` 时，请读取 `msg` 提示并记录 `data.request_id` 便于排查。

### 8.3 支付成功页与轮询

建议支付流程组合使用：

1. 发起支付后跳转 `pay_url` 或展示 `qr_code`
2. 支付完成回跳后，调用 `capture`
3. 再调用 `latest` 兜底轮询确认

可显著降低“已支付但页面未及时更新”的感知问题。

---

## 9. 非前台主动调用接口（说明）

以下回调接口一般由支付平台服务器调用，前台模板无需主动请求：

- `POST /payments/callback`
- `GET /payments/callback`
- `POST /payments/webhook/paypal`
- `POST /payments/webhook/stripe`
