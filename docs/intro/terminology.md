# 术语统一表

> 更新时间：2026-02-12

本页用于统一 Dujiao-Next 文档中的中英文术语，降低沟通与协作成本。

## 1. 核心术语对照

| 中文术语 | 英文术语 | 繁體術語 | 使用说明 |
| --- | --- | --- | --- |
| 前台 | User Frontend | 前台 | 面向终端用户的站点（原 `web`，现统一为 `user`） |
| 后台 | Admin Panel | 後台 | 管理员使用的管理系统（原 `admin-web`，现统一为 `admin`） |
| 后端 / API | API Service | 後端 / API | 业务接口服务（仓库：`dujiao-next`） |
| 文档站 | Documentation | 文件站 | 官方文档站点（仓库：`document`） |
| 商品 | Product | 商品 | 可售卖实体（数字或人工交付） |
| 订单 | Order | 訂單 | 用户购买后生成的交易记录 |
| 人工交付 | Manual Fulfillment | 人工交付 | 由管理员人工处理交付（如发货、线下处理） |
| 自动交付 | Automatic Fulfillment | 自動交付 | 系统在支付成功后自动下发内容 |
| 支付渠道 | Payment Channel | 支付渠道 | 后台配置的支付方式（支付宝/微信/PayPal/Stripe 等） |
| 同步回跳 | Sync Return URL | 同步回跳 | 用户支付完成后浏览器跳转地址 |
| 异步回调 | Async Notify/Webhook | 異步回調 | 支付平台服务端通知地址（用于最终状态确认） |
| 权限策略 | Authorization Policy | 權限策略 | 角色访问 API/菜单的授权规则 |
| 角色继承 | Role Inheritance | 角色繼承 | 角色之间的权限继承关系 |
| 赞助商 | Sponsor | 贊助商 | 在文档中展示品牌信息的合作方 |

## 2. 项目命名约定

- 项目总称统一为：`Dujiao-Next`
- 项目简称统一为：`D&N`
- 用户端命名统一为：`User`（不再使用 `Web`）
- 管理端命名统一为：`Admin`
- 后端服务命名统一为：`API`

## 3. 链接与仓库命名

- API：<https://github.com/dujiao-next/dujiao-next>
- User：<https://github.com/dujiao-next/user>
- Admin：<https://github.com/dujiao-next/admin>
- Document：<https://github.com/dujiao-next/document>

## 4. 文档编写建议

- 新增文档时，优先复用本页术语，避免同义词混用。
- 涉及接口能力时，优先使用“同步回跳 / 异步回调（Webhook）”标准表达。
- 涉及产品端区分时，统一使用 `User` 与 `Admin`。
