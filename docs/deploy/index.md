# 部署总览与选型建议

> 更新时间：2026-03-14

如果你还没决定用哪种部署方式，先看这页，再进入具体教程。

## 1. 推荐起步方式

- 完全新手 / 不想用 Docker 多容器：从 [单二进制部署](/deploy/binary) 开始（最简单）。
- 第一次部署，且希望长期稳定维护：从 [Docker Compose 部署](/deploy/docker-compose) 开始。
- 已在使用 aaPanel/宝塔面板：直接查看 [aaPanel 手动部署](/deploy/aapanel)。
- 需要源码级改造或本地构建：使用 [手动部署](/deploy/manual)。

## 2. 部署方式怎么选

| 方式 | 上手难度 | 适合人群 | 核心特点 | 入口文档 | 视频教程                                    |   
| --- | --- | --- | --- | --- |-----------------------------------------|
| 单二进制（fullstack） | 低 | 完全新手 / 不想接触 Docker 多容器 | 一个二进制 + 一个 Redis 容器，零编排 | [单二进制部署](/deploy/binary) | 暂无 |
| Docker Compose | 中 | 希望标准化、可重复部署的用户 | 容器隔离、升级回滚清晰、便于自动化 | [Docker Compose 部署](/deploy/docker-compose) | 暂无                                      |  
| aaPanel 手动部署 | 低-中 | 已在用宝塔面板的用户 | 面板化操作，适合可视化运维 | [aaPanel 手动部署](/deploy/aapanel) | [点我观看视频教程](https://telegram.me/dujiaoshuka/65) |  
| 手动部署（源码构建） | 高 | 需要深度定制、二次开发的用户 | 控制粒度最高，适合高级运维/开发 | [手动部署](/deploy/manual) | 暂无                                      |    

## 3. 部署前准备清单

- 准备 Linux 服务器与可解析到公网 IP 的域名（前台与后台各需一个域名）
- 规划端口（至少 API 端口 + Web 端口）
- 在 `config.yml` 中设置强随机密钥：
  - `jwt.secret`
  - `user_jwt.secret`
- 决定数据方案：
  - 轻量场景：SQLite + Redis
  - 生产建议：PostgreSQL + Redis
- 规划默认管理员初始化方式（二选一）：
  - 环境变量：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`：`bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 4. 推荐路径

- 你是完全新手，只想最快跑起来：使用 [单二进制部署](/deploy/binary)。
- 你是新手：优先 Docker Compose；已在宝塔环境可直接看 aaPanel 文档。
- 你要长期稳定运维：优先 Docker Compose。
- 你要深度改造或本地构建：使用手动部署。

## 5. 部署完成后建议

1. 先检查服务状态：
   - API 健康检查：`/health`
   - User / Admin 页面是否可访问
2. 首次登录后台后立即修改管理员密码。
3. 配置支付参数与回调地址（见 [支付配置与回调指南](/payment/guide)）。
4. 配置 HTTPS（按你的部署方式在反向代理、面板或容器入口层完成）。
