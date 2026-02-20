# 关于 Dujiao-Next

> 更新时间：2026-02-16  

## 1. 项目定位

Dujiao-Next 是一套面向「数字商品销售与交付」场景的开源系统，适用于：

- 数字卡密售卖
- 账号/密钥类商品销售
- 虚拟服务或人工交付型商品
- 需要前后台分离与二次开发的独立站业务

## 2. 核心能力

### 2.1 多端架构

- `api/`：后端服务（Go + Gin + GORM）
- `user/`：用户前台（Vue 3 + Vite + TypeScript）
- `admin/`：后台管理（Vue 3 + Vite + TypeScript）
- `Document/`：官方文档（VitePress）

### 2.2 支付能力

- 支持支付宝、微信支付、PayPal、Stripe 等官方支付接入
- 支持同步回跳 + 异步回调/webhook
- 统一支付渠道配置与状态流转

### 2.3 交付能力

- 自动交付（如卡密）
- 人工交付（可配置表单收集收货信息/业务信息）
- 订单内可追踪交付记录

### 2.4 权限与运营

- 管理员后台与角色权限（Casbin）
- 商品、订单、支付、用户、文章、Banner、活动等运营模块
- 可视化管理站点配置

## 3. 为什么选择 Dujiao-Next

- **开箱可用**：具备完整业务链路，不是只有 Demo 页面。
- **技术栈现代**：前后端技术都易于扩展维护。
- **二开友好**：前台 API 清晰，便于你独立开发新模板。
- **可持续演进**：支付、交付、权限、日志等模块已经具备工程化基础。

## 4. 适用团队

- 想快速上线数字商品业务的个人/小团队
- 希望保留系统自主可控能力的企业团队
- 需要在现有系统上做定制开发的技术团队


## 5. Demo 站点

- 前台：https://demo.dujiao-next.com
- 后台：https://demo-admin.dujiao-next.com
- 后台测试管理员账号：`test`
- 后台测试管理员密码：`Test123456`

## 6. 开源仓库与贡献

- API（主项目）：https://github.com/dujiao-next/dujiao-next
- User（用户前台）：https://github.com/dujiao-next/user
- Admin（后台）：https://github.com/dujiao-next/admin
- Document（文档）：https://github.com/dujiao-next/document
- Community Projects（社区共享项目）：https://github.com/dujiao-next/community-projects

如果你希望补充功能、修复问题或改进文档，欢迎直接提交 PR。
