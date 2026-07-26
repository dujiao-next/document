# 部署总览与选型建议

> 更新时间：2026-07-26

如果你还没决定用哪种部署方式，先看这页，再进入具体教程。

## 1. 从 v1.4.0 起：一个进程跑完整服务

自 v1.4.0 起，用户前台与管理后台的前端已经通过 `go:embed` 打进后端二进制。这意味着：

- **只需要部署一个程序**，不再分别部署 api / user / admin 三端
- **只需要一个端口**（默认 8080），用户前台在 `/`，管理后台在 `web.admin_path`（默认 `/admin`）
- **只需要一个域名**，不再需要给前台和后台各准备一个域名
- 不再需要 nginx 托管前端静态文件，反向代理只需把整个域名转发到这一个端口

如果你在用 v1.3.x 及更早版本的三端分离部署，升级方式见 [升级与迁移](/deploy/upgrade)。

## 2. 推荐起步方式

- 完全新手 / 不想接触 Docker：从 [单二进制部署](/deploy/binary) 开始（最简单）。
- 希望标准化、可重复部署：从 [Docker Compose 部署](/deploy/docker-compose) 开始。
- 已在使用 aaPanel/宝塔面板：直接查看 [aaPanel 部署](/deploy/aapanel)。
- 需要源码级改造或本地构建：使用 [手动部署](/deploy/manual)。

## 3. 部署方式怎么选

| 方式 | 上手难度 | 适合人群 | 核心特点 | 入口文档 | 视频教程 |
| --- | --- | --- | --- | --- | --- |
| 单二进制 | 低 | 完全新手 / 不想接触 Docker | 下载解压即跑，无需编译 | [单二进制部署](/deploy/binary) | 暂无 |
| Docker Compose | 中 | 希望标准化、可重复部署的用户 | 单镜像 + Redis，升级回滚清晰 | [Docker Compose 部署](/deploy/docker-compose) | 暂无 |
| aaPanel 部署 | 低-中 | 已在用宝塔面板的用户 | 面板化操作，适合可视化运维 | [aaPanel 部署](/deploy/aapanel) | [点我观看视频教程](https://telegram.me/dujiaoshuka/65) |
| 手动部署（源码构建） | 高 | 需要深度定制、二次开发的用户 | 控制粒度最高，适合高级运维/开发 | [手动部署](/deploy/manual) | 暂无 |

无论选哪种，最终运行的都是同一个内嵌前端的二进制，区别只在于「怎么拿到它」和「谁来守护进程」。

## 4. 部署前准备清单

- 准备 Linux 服务器与一个可解析到公网 IP 的域名（**一个就够**）
- 规划端口（默认只需要 8080 一个）
- 在 `config.yml` 中设置强随机密钥：
  - `jwt.secret`
  - `user_jwt.secret`
- 修改后台入口路径 `web.admin_path`，不要沿用默认的 `/admin`
- 决定数据方案：
  - 轻量场景：SQLite + Redis
  - 生产建议：PostgreSQL + Redis
- 规划默认管理员初始化方式（二选一）：
  - 环境变量：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`：`bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 5. 部署完成后建议

1. 先检查服务状态：
   - API 健康检查：`/health`
   - 用户前台 `/` 与管理后台 `/<web.admin_path>` 是否都能打开
2. 首次登录后台后立即修改管理员密码。
3. 配置支付参数与回调地址（见 [支付配置与回调指南](/payment/guide)）。
4. 配置 HTTPS（按你的部署方式在反向代理、面板或容器入口层完成）。
