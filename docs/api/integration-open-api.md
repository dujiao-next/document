---
outline: deep
---

# 站点对接 Open API 文档

> 更新时间：2026-03-01

本文档用于对接开发，覆盖 Dujiao-Next 站点间串货接口：`/api/open/v1/*`。

## 1. 基础信息

### 1.1 Base URL

- 示例：`https://api.example.com/api/open/v1`

### 1.2 统一响应结构

成功示例：

```json
{
  "status_code": 0,
  "msg": "success",
  "data": {}
}
```

失败示例：

```json
{
  "status_code": 401,
  "msg": "unauthorized",
  "data": {
    "request_id": "01HR..."
  }
}
```

## 2. 鉴权与签名

### 2.1 必需请求头

| Header | 说明 |
| --- | --- |
| `X-DJ-Access-Key` | 访问密钥 |
| `X-DJ-Timestamp` | Unix 秒级时间戳 |
| `X-DJ-Nonce` | 随机串，每次请求必须唯一 |
| `X-DJ-Signature` | HMAC-SHA256 签名（hex 小写） |
| `X-DJ-Sign-Method` | 固定 `HMAC-SHA256` |
| `X-DJ-Idempotency-Key` | 写接口必填（POST/PUT/PATCH/DELETE） |

### 2.2 签名串规则

签名原文按以下顺序拼接（换行分隔）：

```text
UPPER_METHOD
PATH
CANONICAL_QUERY
SHA256_HEX(BODY_BYTES)
TIMESTAMP
NONCE
```

签名算法：

```text
signature = hex_lower(hmac_sha256(sign_string, secret))
```

签名校验规则：

- 时间戳允许偏差约 ±300 秒。
- Nonce 在有效期内不可重复。
- 写接口若重复使用同一个 `X-DJ-Idempotency-Key`，请求会被拒绝。

## 3. 接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/site/ping` | 连通性检查 |
| `GET` | `/products` | 拉取商品列表 |
| `GET` | `/products/:product_id` | 拉取商品详情 |
| `GET` | `/wallet/balance` | 查询对接钱包余额 |
| `POST` | `/orders` | 创建采购单 |
| `GET` | `/orders/:client_order_no` | 查询采购单 |
| `POST` | `/orders/:client_order_no/cancel` | 取消采购单 |
| `POST` | `/callbacks/order-status` | 回传订单状态 |
| `POST` | `/callbacks/delivery` | 回传交付内容 |
| `POST` | `/callbacks/refund` | 回传退款状态 |

## 4. 核心接口说明

### 4.1 GET `/site/ping`

响应 `data` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | boolean | 是否连通 |
| `connection_id` | number | 连接 ID |
| `protocol_type` | string | 协议类型 |
| `protocol_version` | string | 协议版本 |
| `server_time` | number | 服务端 Unix 时间戳 |

### 4.2 GET `/products`

请求参数：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | 1 | 页码 |
| `page_size` | number | 否 | 20 | 每页条数，最大 100 |
| `search` | string | 否 | - | 模糊搜索关键词 |

响应 `data` 字段：`items`、`page`、`page_size`、`total`、`has_more`。

`items[]` 关键字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `upstream_product_id` | string | 上游商品 ID |
| `upstream_sku_id` | string | 默认 SKU ID |
| `title` | string | 商品标题（已做多语言降级） |
| `price` | string | 价格字符串 |
| `currency` | string | 币种 |
| `stock_status` | string | `unlimited`/`in_stock`/`low_stock`/`out_of_stock` |
| `is_sold_out` | boolean | 是否售罄 |
| `skus` | array | SKU 列表 |

### 4.3 GET `/products/:product_id`

- 按上游商品 ID 查询详情。
- 返回结构与 `/products` 的单个 `items` 元素一致。

### 4.4 GET `/wallet/balance`

响应 `data` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `wallet_user_id` | number | 被扣款钱包所属用户 ID |
| `currency` | string | 币种 |
| `available_balance` | string | 可用余额 |

### 4.5 POST `/orders`

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `client_order_no` | string | 是 | 对接方订单号（建议全局唯一） |
| `upstream_product_id` | string | 是 | 上游商品 ID |
| `upstream_sku_id` | string | 否 | 上游 SKU ID（不传默认首个可用 SKU） |
| `quantity` | number | 是 | 购买数量，必须大于 0 |
| `buyer_context` | object | 否 | 透传上下文（可放本地订单信息） |

成功（受理）示例：

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

业务失败示例（仍为 HTTP 200，`status_code=0`）：

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

返回字段与 `POST /orders` 一致，用于轮询采购状态。

### 4.7 POST `/orders/:client_order_no/cancel`

响应字段：

- 包含订单状态字段（同 `POST /orders`）
- 额外包含 `canceled`（boolean）

若订单不可取消，可能返回：

- `error_code=UPSTREAM_ORDER_NOT_CANCELABLE`

## 5. 回调接口

### 5.1 POST `/callbacks/order-status`

用于回传采购状态变化。

### 5.2 POST `/callbacks/delivery`

用于回传交付结果（卡密、链接、文本等）。

### 5.3 POST `/callbacks/refund`

用于回传退款或失败结果。

建议回调体至少包含以下之一用于匹配订单：

- `upstream_order_no`
- `client_order_no`
- `buyer_context.local_order_id`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `event_id` | 事件唯一 ID（用于去重） |
| `status` | 状态值（如 `processing`、`delivered`、`failed`） |
| `error_code` / `error_message` | 失败原因 |
| `payload` | 交付内容或扩展字段 |

回调成功响应：

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

## 6. 状态与错误码

### 6.1 采购状态 `status`

- `pending`
- `accepted`
- `failed`
- `canceled`

### 6.2 标准错误码 `error_code`

- `UPSTREAM_INSUFFICIENT_BALANCE`：上游余额不足
- `UPSTREAM_PRODUCT_UNAVAILABLE`：商品或 SKU 不可用
- `UPSTREAM_STOCK_INSUFFICIENT`：库存不足
- `UPSTREAM_ORDER_NOT_CANCELABLE`：订单不可取消

## 7. 幂等与重试建议

- `client_order_no` 必须唯一，重复提交会返回已有订单结果。
- 写请求必须带新的 `X-DJ-Idempotency-Key`。
- 查询接口建议做轮询退避（如 1s/2s/4s）避免高频打点。

