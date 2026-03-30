# 部署总览与选型建议

> 更新时间：2026-03-14

如果你还没决定用哪种部署方式，先看这页，再进入具体教程。

## 1. 推荐起步方式

当前官方文档优先保留可直接核验的正式部署方案；如果你希望使用社区维护的一键菜单脚本，也可以参考对应项目说明。

> 提示：部署模块中收录的社区脚本属于第三方社区贡献项目，并非官方出品。官方仅对公开项目做基础安全审计与入口收录，不对第三方作品的功能设计、稳定性、兼容性或后续维护做背书。

- 第一次部署，且希望长期稳定维护：从 [Docker Compose 部署](/deploy/docker-compose) 开始。
- 希望使用统一菜单完成部署、更新、HTTPS 与日常运维：参考社区脚本 [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install)。
- 已在使用 aaPanel/宝塔面板：直接查看 [aaPanel 手动部署](/deploy/aapanel)。
- 需要源码级改造或本地构建：使用 [手动部署](/deploy/manual)。

## 2. 部署方式怎么选

| 方式 | 上手难度 | 适合人群 | 核心特点 | 入口文档 | 视频教程                                    |   
| --- | --- | --- | --- | --- |-----------------------------------------|
| 社区一键部署脚本（LangGe） | 低-中 | 需要统一菜单完成部署、更新、HTTPS 与基础运维的用户 | 社区维护，支持 Docker / 二进制 / 外部环境、HTTPS、版本检查与运维菜单 | [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install) | 暂无                                      | 
| Docker Compose | 中 | 希望标准化、可重复部署的用户 | 容器隔离、升级回滚清晰、便于自动化 | [Docker Compose 部署](/deploy/docker-compose) | 暂无                                      |  
| aaPanel 手动部署 | 低-中 | 已在用宝塔面板的用户 | 面板化操作，适合可视化运维 | [aaPanel 手动部署](/deploy/aapanel) | [点我观看视频教程](https://t.me/dujiaoshuka/65) |  
| 手动部署（源码构建） | 高 | 需要深度定制、二次开发的用户 | 控制粒度最高，适合高级运维/开发 | [手动部署](/deploy/manual) | 暂无                                      |    

## 3. 部署前准备清单

- 准备 Linux 服务器与可解析到公网 IP 的域名（同源或分域名均可）
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

- 你希望用一份社区脚本统一处理部署、更新和 HTTPS：可先阅读 [langge-dujiao-next-install](https://github.com/dujiao-next/community-projects/tree/main/scripts/langge-dujiao-next-install) 的 README，再决定是否采用。
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
