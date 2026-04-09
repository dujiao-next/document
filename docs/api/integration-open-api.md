---
outline: deep
---

# 站点对接 Open API 文档

> 更新时间：2026-04-01

本文档用于对接开发，覆盖 Dujiao-Next 站点间串货接口：`/api/v1/upstream/*`。

---

## 1. 基础信息

### 1.1 Base URL

```
https://<B站域名>/api/v1/upstream
```

示例：`https://api.example.com/api/v1/upstream`

### 1.2 统一响应结构

**成功响应：**

```json
{
  "ok": true,
  ...
}
```

**失败响应：**

```json
{
  "ok": false,
  "error_code": "error_code_here",
  "error_message": "human readable message"
}
```

### 1.3 当前实现约束（重要）

- 支付成功后的采购为异步执行，不阻断终端用户支付流程。
- 对接商品（存在启用上游映射）必须等待上游回调，不允许本地手工/自动交付。
- 本地取消前必须先执行上游取消；若上游返回不可取消，本地必须拒绝取消与退款。
- 上游采购失败时，调用方应将订单标记为异常待处理，不应自动做本地取消/退款关闭。

---

## 2. 鉴权与签名

### 2.1 必需请求头

| Header | 说明 |
| --- | --- |
| `Dujiao-Next-Api-Key` | API Key（由 B 站用户在前台"API 权限"中生成） |
| `Dujiao-Next-Timestamp` | Unix 秒级时间戳 |
| `Dujiao-Next-Signature` | HMAC-SHA256 签名（hex 小写） |

### 2.2 签名算法

**签名串（signString）按如下格式拼接：**

```
{METHOD}\n{PATH}\n{TIMESTAMP}\n{BODY_MD5}
```

各部分说明：

| 占位符 | 说明 |
| --- | --- |
| `{METHOD}` | HTTP 方法大写，如 `GET`、`POST` |
| `{PATH}` | 请求路径（不含域名和查询参数），如 `/api/v1/upstream/products` |
| `{TIMESTAMP}` | 与请求头 `Dujiao-Next-Timestamp` 一致 |
| `{BODY_MD5}` | 请求体的 MD5 哈希（hex 小写）。无 body 时为空字符串的 MD5：`d41d8cd98f00b204e9800998ecf8427e` |

**最终签名：**

```
signature = hex_lower(hmac_sha256(signString, api_secret))
```

### 2.3 签名伪代码示例

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

### 2.4 签名校验规则

- 时间戳允许偏差 **±60 秒**。
- API Key 必须处于"已批准且启用"状态。
- 所属用户账号必须处于正常状态。

---

## 3. 接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/ping` | 连通性检查 |
| `GET` | `/categories` | 拉取分类列表 |
| `GET` | `/products` | 拉取商品列表 |
| `GET` | `/products/:id` | 拉取商品详情 |
| `POST` | `/orders` | 创建采购单（钱包自动扣款） |
| `GET` | `/orders/:id` | 查询采购单 |
| `POST` | `/orders/:id/cancel` | 取消采购单 |

**回调接口（B 站 → A 站）：**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/upstream/callback` | B 站向 A 站推送订单状态变更与交付内容 |

---

## 4. 核心接口说明

### 4.1 POST `/ping`

连通性检查，同时返回对接账户的钱包余额、币种与会员等级。

**请求：** 无需请求体。

**响应字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否连通 |
| `site_name` | string | 站点名称 |
| `protocol_version` | string | 协议版本，当前为 `"1.0"` |
| `user_id` | number | 对接用户 ID |
| `balance` | string | 钱包可用余额 |
| `currency` | string | 站点币种（如 `CNY`、`USD`） |
| `member_level` | object\|null | 用户会员等级信息（无会员等级时为 `null`） |

**`member_level` 子对象：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 会员等级 ID |
| `name` | object | 多语言等级名称，如 `{"zh-CN":"黄金会员","en":"Gold"}` |
| `slug` | string | 等级标识 |
| `icon` | string | 等级图标 URL |

**响应示例：**

```json
{
  "ok": true,
  "site_name": "My Shop",
  "protocol_version": "1.0",
  "user_id": 42,
  "balance": "1000.00",
  "currency": "CNY",
  "member_level": {
    "id": 1,
    "name": { "zh-CN": "黄金会员", "en": "Gold" },
    "slug": "gold",
    "icon": "https://example.com/gold.png"
  }
}
```

---

### 4.2 GET `/categories`

拉取上游分类列表。

**请求：** 无需请求体和查询参数。

**响应字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `categories` | array | 分类数组（见下方 Category 结构） |

#### Category 结构

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 分类 ID |
| `parent_id` | number | 父分类 ID（0 表示一级分类） |
| `slug` | string | 分类唯一标识 |
| `name` | object | 多语言名称，如 `{"zh-CN":"游戏充值","en":"Game Top-up"}` |
| `icon` | string | 分类图标 URL |
| `sort_order` | number | 排序权重（降序） |

**响应示例：**

```json
{
  "ok": true,
  "categories": [
    {
      "id": 1,
      "parent_id": 0,
      "slug": "game-topup",
      "name": { "zh-CN": "游戏充值", "en": "Game Top-up" },
      "icon": "",
      "sort_order": 10
    },
    {
      "id": 2,
      "parent_id": 1,
      "slug": "steam",
      "name": { "zh-CN": "Steam", "en": "Steam" },
      "icon": "",
      "sort_order": 5
    }
  ]
}
```

::: tip 分类层级
分类最多支持两层：一级分类（`parent_id = 0`）和二级分类（`parent_id` 指向一级分类）。商品只能关联到末级分类。
:::

---

### 4.3 GET `/products`

拉取上游商品列表（仅返回已上架商品）。

**Query 参数：**

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 1 | 页码 |
| `page_size` | number | 否 | 20 | 每页条数（1～100） |

**响应字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `items` | array | 商品数组（见下方 Product 结构） |
| `total` | number | 总数 |
| `page` | number | 当前页码 |
| `page_size` | number | 每页条数 |

#### Product 结构

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 商品 ID（下单时通过 SKU ID 引用） |
| `slug` | string | URL Slug |
| `title` | object | 多语言标题，如 `{"zh-CN":"标题","en":"Title"}` |
| `description` | object | 多语言描述 |
| `content` | object | 多语言详情内容 |
| `seo_meta` | object | SEO 元信息 |
| `images` | string[] | 图片 URL 列表 |
| `tags` | string[] | 标签列表 |
| `price_amount` | string | 商品实际售价（若有会员价则为会员价） |
| `original_price` | string | 原价（仅当存在会员折扣时返回，`omitempty`） |
| `member_price` | string | 会员价（仅当存在会员折扣时返回，`omitempty`） |
| `fulfillment_type` | string | 交付类型：`auto`（自动发货）/ `manual`（人工交付） |
| `manual_form_schema` | object | 人工交付表单结构（`manual` 类型商品需要买家填写的表单） |
| `is_active` | boolean | 是否上架 |
| `category_id` | number | 分类 ID |
| `skus` | array | SKU 列表（见下方 SKU 结构） |
| `created_at` | string | 创建时间（ISO 8601） |
| `updated_at` | string | 更新时间（ISO 8601） |

#### SKU 结构

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | SKU ID（**下单时使用此 ID**） |
| `sku_code` | string | SKU 编码 |
| `spec_values` | object | 规格值，如 `{"颜色":"红色","容量":"128GB"}` |
| `price_amount` | string | SKU 实际售价（若有会员价则为会员价） |
| `original_price` | string | 原价（仅当存在会员折扣时返回，`omitempty`） |
| `member_price` | string | 会员价（仅当存在会员折扣时返回，`omitempty`） |
| `stock_status` | string | 库存状态：`unlimited` / `in_stock` / `low_stock` / `out_of_stock` |
| `stock_quantity` | number | 库存数量（-1 = 无限） |
| `is_active` | boolean | 是否启用 |

::: tip 库存状态说明
- `unlimited`：无限库存（`stock_quantity = -1`）
- `in_stock`：充足（`> 20`）
- `low_stock`：低库存（`1 ~ 20`）
- `out_of_stock`：售罄（`0`）
:::

**响应示例：**

```json
{
  "ok": true,
  "items": [
    {
      "id": 1,
      "slug": "example-product",
      "title": { "zh-CN": "示例商品", "en": "Example Product" },
      "description": { "zh-CN": "这是一个示例" },
      "content": {},
      "seo_meta": {},
      "images": ["https://example.com/img1.jpg"],
      "tags": ["hot"],
      "price_amount": "7.90",
      "original_price": "9.90",
      "member_price": "7.90",
      "fulfillment_type": "auto",
      "manual_form_schema": null,
      "is_active": true,
      "category_id": 1,
      "skus": [
        {
          "id": 1,
          "sku_code": "DEFAULT",
          "spec_values": {},
          "price_amount": "7.90",
          "original_price": "9.90",
          "member_price": "7.90",
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

### 4.4 GET `/products/:id`

按商品 ID 查询详情。

**路径参数：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 商品 ID |

**响应字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `product` | object | Product 结构（同 4.3 节） |

**错误码：**

| error_code | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `product_not_found` | 404 | 商品不存在 |
| `product_unavailable` | 404 | 商品已下架 |

---

### 4.5 POST `/orders`

创建采购单。系统会自动使用对接用户的钱包余额支付，无需额外支付流程。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sku_id` | number | 是 | SKU ID（来自商品列表中的 `skus[].id`） |
| `quantity` | number | 是 | 购买数量，必须 ≥ 1 |
| `manual_form_data` | object | 否 | 人工交付表单数据（当商品为 `manual` 类型时必填） |
| `downstream_order_no` | string | 否 | 下游订单号（建议全局唯一，用于幂等和回调匹配） |
| `trace_id` | string | 否 | 调用方追踪 ID |
| `callback_url` | string | 否 | 回调通知地址（必须为公网可访问的 HTTP/HTTPS 地址） |

::: warning 幂等性
同一个 API Key + 同一个 `downstream_order_no` 不允许重复创建，重复提交会返回已有订单的信息。
:::

**成功响应（`ok: true`）：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | `true` |
| `order_id` | number | 上游订单 ID |
| `order_no` | string | 上游订单号 |
| `status` | string | 订单状态（通常为 `paid`） |
| `amount` | string | 订单金额 |
| `currency` | string | 币种 |

**成功响应示例：**

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

**业务失败（HTTP 200，`ok: false`）：**

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

说明：当钱包余额不足或支付失败时，系统自动取消订单并返回 `ok: false`。

**错误码汇总：**

| error_code | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `bad_request` | 400 | 请求参数无效 |
| `invalid_callback_url` | 400 | 回调地址非法（内网/localhost 等） |
| `sku_unavailable` | 400 | SKU 不存在或已下架 |
| `product_unavailable` | 400 | 商品不可用 |
| `insufficient_balance` | 402 | 钱包余额不足 |
| `insufficient_stock` | 409 | 库存不足 |
| `payment_failed` | 200 | 钱包支付失败（`ok: false`） |

---

### 4.6 GET `/orders/:id`

查询采购单详情。

**路径参数：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 订单 ID（来自创建订单时返回的 `order_id`） |

**响应字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否成功 |
| `order_id` | number | 订单 ID |
| `order_no` | string | 订单号 |
| `status` | string | 订单状态 |
| `amount` | string | 订单金额 |
| `currency` | string | 币种 |
| `items` | array | 订单商品列表（见下表） |
| `fulfillment` | object | 交付信息（已交付时才有，见下表） |

**`items[]` 字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `product_id` | number | 商品 ID |
| `sku_id` | number | SKU ID |
| `title` | object | 多语言标题 |
| `quantity` | number | 数量 |
| `unit_price` | string | 单价 |
| `total_price` | string | 小计 |
| `fulfillment_type` | string | 交付类型 |

**`fulfillment` 字段（仅 status 为 `delivered` 时出现）：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | string | 交付类型（`auto` / `manual`） |
| `status` | string | 交付状态（`delivered`） |
| `payload` | string | 交付内容（卡密等纯文本） |
| `delivery_data` | object | 结构化交付数据 |
| `delivered_at` | string | 交付时间（ISO 8601） |

**响应示例：**

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

### 4.7 POST `/orders/:id/cancel`

取消采购单。

**路径参数：**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 订单 ID |

**请求：** 无需请求体。

**成功响应：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | `true` |
| `order_id` | number | 订单 ID |
| `order_no` | string | 订单号 |
| `status` | string | 取消后的状态（`canceled`） |

**错误码：**

| error_code | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `order_not_found` | 404 | 订单不存在 |
| `cancel_not_allowed` | 409 | 当前状态不可取消（已支付/已完成/已交付等） |

---

## 5. 回调接口

### 5.1 POST `/api/v1/upstream/callback`

B 站主动向 A 站推送订单状态变更与交付内容。

**回调触发时机：**

- 订单状态变更（已支付 → 已完成、已取消等）
- 交付内容生成（自动发卡、手动交付完成）

**回调鉴权方式：**

B 站使用 A 站的对接连接中配置的 `api_key` / `api_secret` 进行签名，A 站用同样的算法验证。

**请求头：**

| Header | 说明 |
| --- | --- |
| `Dujiao-Next-Api-Key` | A 站在"对接连接"中设置的 API Key |
| `Dujiao-Next-Timestamp` | Unix 秒级时间戳 |
| `Dujiao-Next-Signature` | HMAC-SHA256 签名 |

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `event` | string | 否 | 事件类型 |
| `order_id` | number | 是 | B 站订单 ID |
| `order_no` | string | 否 | B 站订单号 |
| `downstream_order_no` | string | 是 | A 站本地订单号（用于匹配采购单） |
| `status` | string | 是 | 订单状态 |
| `fulfillment` | object | 否 | 交付信息（见下表） |
| `timestamp` | number | 否 | 事件时间戳 |

**`fulfillment` 子对象：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | string | 交付类型（`auto` / `manual`） |
| `status` | string | 交付状态（`delivered`） |
| `payload` | string | 交付内容（卡密、文本等） |
| `delivery_data` | object | 结构化交付数据 |
| `delivered_at` | string | 交付时间（ISO 8601） |

**回调状态映射：**

| 上游 status | A 站处理为 |
| --- | --- |
| `delivered` / `completed` | `delivered`（触发本地交付） |
| `canceled` | `canceled`（触发本地取消） |
| 其他 | 透传原值 |

**回调成功响应：**

```json
{ "ok": true, "message": "received" }
```

**回调失败响应：**

```json
{ "ok": false, "message": "reason" }
```

---

## 6. 订单状态说明

| 状态 | 说明 |
| --- | --- |
| `pending_payment` | 待支付 |
| `paid` | 已支付（等待交付） |
| `fulfilling` | 履约中（正在处理交付） |
| `partially_delivered` | 部分交付 |
| `delivered` | 已交付 |
| `completed` | 已完成 |
| `canceled` | 已取消 |

---

## 7. 错误码汇总

### 7.1 鉴权错误（HTTP 401 / 403）

| error_code | 说明 |
| --- | --- |
| `missing_auth_headers` | 缺少签名请求头 |
| `invalid_timestamp` | 时间戳格式错误 |
| `timestamp_expired` | 时间戳过期（超过 ±60 秒） |
| `invalid_signature` | 签名验证失败 |
| `invalid_api_key` | API Key 无效或已禁用 |
| `user_disabled` | API Key 所属用户已被封禁 |

### 7.2 业务错误

| error_code | HTTP 状态码 | 说明 |
| --- | --- | --- |
| `bad_request` | 400 | 请求参数无效 |
| `invalid_callback_url` | 400 | 回调地址非法 |
| `sku_unavailable` | 400 | SKU 不存在或不可用 |
| `product_unavailable` | 400 | 商品不存在或不可用 |
| `product_not_found` | 404 | 商品不存在 |
| `order_not_found` | 404 | 订单不存在 |
| `insufficient_balance` | 402 | 钱包余额不足 |
| `insufficient_stock` | 409 | 库存不足 |
| `cancel_not_allowed` | 409 | 订单不可取消 |
| `payment_failed` | 200 | 钱包支付失败（`ok: false`） |
| `internal_error` | 500 | 服务端内部错误 |

---

## 8. 对接流程与最佳实践

### 8.1 标准对接流程

```
1. B 站用户开通 API 权限，生成 API Key / Secret
2. A 站管理员创建"对接连接"，填写 B 站地址与凭证
3. A 站调用 POST /ping 测试连通性
4. A 站调用 GET /products 拉取商品列表
5. A 站在管理后台建立商品映射（本地商品 → 上游商品/SKU）
6. 终端用户在 A 站下单支付 → A 站异步调用 POST /orders 向 B 站采购
7. B 站处理订单并交付 → 通过回调通知 A 站
8. A 站根据回调更新本地订单状态
```

### 8.2 幂等与重试

- `downstream_order_no` 作为幂等键：相同 API Key + 相同 `downstream_order_no` 只会创建一次订单。
- 建议对所有写操作实现指数退避重试（如 1s → 2s → 4s）。
- 查询接口可轮询但应控制频率。

### 8.3 回调可靠性

- B 站在创建订单时传入 `callback_url`，交付/状态变更时 B 站会主动推送。
- 建议 A 站同时实现轮询兜底：定期调用 `GET /orders/:id` 检查订单状态。
- 回调可能因网络问题失败，A 站应做好幂等处理。

### 8.4 安全要求

- `callback_url` 不允许指向内网地址（localhost、127.0.0.1、私有 IP 段等）。
- 签名使用 HMAC-SHA256，Secret 仅在创建时展示一次，请妥善保管。
- 建议所有通信使用 HTTPS。

---

## 9. 签名验证示例

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

# 测试连通
print(api_request("POST", "/api/v1/upstream/ping"))

# 拉取商品
print(api_request("GET", "/api/v1/upstream/products"))

# 创建订单
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
