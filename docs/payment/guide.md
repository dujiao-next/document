# 支付配置与回调指南

> 更新时间：2026-04-04

目标只有两个：

1. 用户能顺利发起支付
2. 支付完成后，订单能自动变成“已支付”

## 1. 开始前先准备

先确认你的支付回调入口可以被公网访问。

系统需要至少两个域名：

- 前台商城：`user.example.com`（或 `shop.example.com`）
- 管理后台：`admin.example.com`

API 通过各站点的反向代理访问（如 `user.example.com/api` 和 `admin.example.com/api` 均代理到后端），无需额外域名。

常用地址示例：

- 支付结果通知地址（回调）：`https://user.example.com/api/v1/payments/callback`
- 用户支付完成返回页（回跳）：`https://user.example.com/pay`

## 2. 后台操作路径

进入：

- `后台 → 支付管理 → 支付渠道 → 新建渠道`

每加一个渠道，记得做三件事：

1. 填商户参数（各支付平台给你的密钥/ID）
2. 填回调地址（让平台把支付结果通知给你）
3. 启用渠道并设置排序

## 3. 各支付渠道怎么填

### 3.1 易支付

常用必填：

- 网关地址（gateway_url）
- 商户ID（merchant_id）
- 商户密钥（v1）或私钥/平台公钥（v2）
- 支付结果通知地址（notify_url）
- 用户返回地址（return_url）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`

### 3.2 PayPal

常用必填：

- `client_id`
- `client_secret`
- `base_url`（沙箱或正式环境）
- `return_url`
- `cancel_url`

建议：

- `return_url` 和 `cancel_url` 都填：`https://shop.example.com/pay`
- `webhook_id` 建议填写（用于校验）

### 3.3 Stripe

常用必填：

- `secret_key`
- `webhook_secret`
- `success_url`
- `cancel_url`
- `api_base_url`

建议：

- `success_url` 与 `cancel_url` 都填：`https://shop.example.com/pay`

### 3.4 支付宝

常用必填：

- `app_id`
- 应用私钥（private_key）
- 支付宝公钥（alipay_public_key）
- 网关地址（gateway_url）
- 支付结果通知地址（notify_url）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- 若你使用手机网站/电脑网站支付，也要填写 `return_url`：`https://shop.example.com/pay`

### 3.5 微信支付

常用必填：

- `appid`
- `mchid`
- 商户证书序列号（merchant_serial_no）
- 商户私钥（merchant_private_key）
- `api_v3_key`
- 支付结果通知地址（notify_url）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback?channel_id=你的渠道ID`
- 如果是 H5 支付，请再填 `h5_redirect_url`：`https://shop.example.com/pay`

### 3.6 TokenPay

常用必填：

- 网关地址（gateway_url）
- 回调签名密钥（notify_secret）
- 支付结果通知地址（notify_url）

常用选填：

- 支付币种（currency，默认 USDT）
- 支付完成回跳地址（redirect_url）
- 法币展示币种（base_currency，默认 CNY）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `redirect_url` 填：`https://shop.example.com/pay`
- 支持币种请参考官方文档：<https://github.com/LightCountry/TokenPay/blob/master/Wiki/docs.md>

### 3.7 BEpusdt

常用必填：

- 网关地址（gateway_url）
- API Token（auth_token）
- 支付结果通知地址（notify_url）
- 支付成功回跳地址（return_url）

常用选填：

- 交易类型（trade_type）
- 法币类型（fiat，常用 CNY / USD）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`
- 支持币种与交易类型请参考官方文档：<https://github.com/v03413/BEpusdt/blob/main/docs/api/api.md>

### 3.8 epusdt

> 注意：epusdt 与 BEpusdt 是两个独立项目，配置字段与签名密钥互不通用，请勿混用。

常用必填：

- 网关地址（gateway_url，例 `https://epusdt.example.com`）
- 商户 PID（pid）
- 签名密钥（secret_key）
- 代币（token，例 `usdt`）
- 网络（network，例 `tron`）
- 支付结果通知地址（notify_url）
- 支付完成回跳地址（return_url）

常用选填：

- 法币（currency，默认 `cny`）

建议：

- `notify_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`
- 仅支持跳转模式（redirect）。下单后会跳转到 epusdt 自带的托管收银台完成付款，不需要后台再渲染二维码
- token / network 的可用组合请实时向网关查询：`GET <gateway_url>/payments/gmpay/v1/supported-assets`
- 接口规范请参考官方文档：<https://epusdt.com/api/payment.html>

### 3.9 OKPay

常用必填：

- 网关地址（gateway_url，默认 `https://api.okaypay.me/shop`）
- 商户 ID（merchant_id）
- 商户密钥（merchant_token）
- 支付结果通知地址（callback_url）
- 支付完成回跳地址（return_url）

常用选填：

- 支付币种（coin，支持 `USDT` 或 `TRX`，默认 USDT）
- 汇率（exchange_rate，默认 `1`）
- 商户展示名称（display_name）

建议：

- `callback_url` 填：`https://user.example.com/api/v1/payments/callback`
- `return_url` 填：`https://shop.example.com/pay`

---

## 3.10 手续费配置

每个支付渠道可独立配置手续费，用于核算实际到账金额：

| 字段 | 说明 |
|------|------|
| 手续费率（fee_rate） | 百分比手续费，如填 `2.00` 表示 2% |
| 固定手续费（fixed_fee） | 每笔固定扣除的金额 |

手续费仅用于后台统计和利润计算，**不会**增加用户的支付金额。

---

## 3.11 交互模式

创建支付渠道时需选择交互模式，不同模式决定用户的支付体验：

| 模式 | 标识 | 说明 |
|------|------|------|
| 二维码 | `qr` | 生成支付二维码，用户扫码支付（适合微信/支付宝等） |
| 跳转 | `redirect` | 跳转到支付平台页面完成支付（适合 PayPal/Stripe 等） |

> 同一支付类型可创建多个渠道使用不同交互模式。例如支付宝可同时配置二维码和跳转模式。

## 4. 回调与 Webhook 一张表看懂

### 4.1 通用回调（这几个都填同一个地址）

适用：

- 支付宝
- 微信支付
- 易支付
- TokenPay
- BEpusdt
- epusdt
- OKPay

填写地址：

- `POST https://user.example.com/api/v1/payments/callback`

### 4.2 PayPal（单独 Webhook 地址）

填写地址：

- `POST https://user.example.com/api/v1/payments/webhook/paypal?channel_id=你的渠道ID`

说明：

- `channel_id` 在当前实现中必须带上。

### 4.3 Stripe（单独 Webhook 地址）

填写地址：

- `POST https://user.example.com/api/v1/payments/webhook/stripe?channel_id=你的渠道ID`

说明：

- `channel_id` 建议带上，多个 Stripe 渠道时更稳妥。

## 5. 自定义回调路由（可选）

由于本项目是开源的，默认的回调路径（如 `/api/v1/payments/callback`）是公开可知的，存在被恶意撞库或模拟回调的风险。你可以在后台自定义回调路由路径，隐藏默认路径来增强安全性。

### 5.1 如何配置

进入：

- `后台 → 系统设置 → 回调路由`

可自定义以下 4 条回调路径：

| 回调类型 | 默认路径 | 说明 |
|---------|---------|------|
| 支付回调 | `/api/v1/payments/callback` | 支付宝/微信/易支付/TokenPay/BEpusdt/epusdt/OKPay 通用 |
| PayPal Webhook | `/api/v1/payments/webhook/paypal` | PayPal 专用 |
| Stripe Webhook | `/api/v1/payments/webhook/stripe` | Stripe 专用 |
| 上游回调 | `/api/v1/upstream/callback` | 上游供货商回调 |

留空表示继续使用默认路径。

### 5.2 配置规则

- 自定义路径必须以 `/api/` 开头，例如：`/api/my-secret-path/pay-notify`
- 4 条路径不能重复
- 不能与系统已有路由冲突（如 `/api/v1/admin/...`、`/api/v1/public/...`）

### 5.3 配置后注意事项

::: warning 重要
自定义回调路由后，你必须同步更新各支付渠道配置中的异步通知地址（`notify_url` / `callback_url`），将其中的路径部分替换为你设置的自定义路径。

例如，你将支付回调路由改为 `/api/my-secret/pay-notify`，则：

- 原来填：`https://user.example.com/api/v1/payments/callback`
- 现在填：`https://user.example.com/api/my-secret/pay-notify`

否则支付平台的回调通知将无法到达你的服务器。
:::

### 5.4 工作原理

- 配置自定义路由后，对应的默认路径会自动返回 404，外部无法探测到
- 未配置的回调类型仍使用默认路径，互不影响
- 设置保存后约 5 分钟内全局生效（或立即生效于当前实例）

## 6. 上线前 5 分钟自检

按这个顺序测一次：

1. 前台下单，确认能拉起支付页面/二维码
2. 完成支付，确认订单状态自动更新为“已支付”
3. 支付完成后，确认能回到 `https://shop.example.com/pay`
4. 后台支付记录里，确认该笔订单有对应支付流水

## 7. 常见问题

### Q1：用户显示支付成功，但后台订单没变

优先检查：

- 回调地址是否填错域名/路径（如果配置了自定义回调路由，请确认各渠道的 `notify_url` 已同步更新）
- API 域名是否可以被公网访问
- 支付平台后台是否有回调失败记录

### Q2：支付完成后没有回到前台支付页

优先检查：

- `return_url` / `success_url` / `cancel_url` / `redirect_url` 是否统一填成 `/pay`

### Q3：同一个支付方式配了多个渠道，结果串单

优先处理：

- PayPal、Stripe 的 Webhook 地址都带上 `channel_id`
- 后台只保留你正在使用的渠道，避免重复启用
