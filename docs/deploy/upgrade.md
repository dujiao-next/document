---
outline: deep
---

# 升级与迁移

> 更新时间：2026-07-26

本指南介绍如何将 Dujiao-Next 从旧版本升级到新版本。

---

## 0. 从 v1.3.x 升级到 v1.4.0（重要，架构变更）

v1.4.0 把用户前台与管理后台的前端**内嵌进了后端二进制**，部署形态从「三端分离」变成「单进程」。这是一次一次性的部署结构调整，数据完全兼容，但部署方式需要调整。

### 0.1 变了什么

| | v1.3.x 及更早 | v1.4.0 起 |
|---|---|---|
| 部署单元 | api + user + admin 三个服务 | 一个进程 |
| Docker 镜像 | `dujiaonext/api`、`dujiaonext/user`、`dujiaonext/admin` | 只有 `dujiaonext/dujiao-next`（旧名 `dujiaonext/api` 仍作为过渡别名同步推送） |
| 容器数量 | 4-5 个 | 2-3 个 |
| 发布产物 | `dujiao-next_*.tar.gz`（纯 API）+ `dujiao-all_*.tar.gz`（含前端） | 只有 `dujiao-next_*.tar.gz` |
| 二进制名 | `dujiao-api` / `dujiao-server` | `dujiao-next` |
| 域名 | 前台、后台各一个 | 一个 |
| 后台入口 | 独立域名的 `/` | 同一站点的 `web.admin_path` |
| Nginx | 需为 `/api`、`/uploads`、`/sitemap.xml`、`/robots.txt` 分别配置反代 | 整站一条 `location /` |
| 源码仓库 | `dujiao-next`、`user`、`admin` 三个 | 前端并入 `dujiao-next` 的 `frontend/` |

**数据层没有任何破坏性变更**：数据库、`uploads/`、`config.yml` 全部可以直接复用。

### 0.2 升级步骤（Docker Compose）

1. 备份（见下方第 1 节）。

2. 停止旧服务：

   ```bash
   docker compose -f <你的 compose 文件> down
   ```

3. 修改 compose 文件：**删除 `user` 与 `admin` 两个 service**，只保留 `redis`（+ `postgres`）与 `dujiao-next`。
   完整示例见 [Docker Compose 部署](/deploy/docker-compose#_5-编写-compose-文件)。

4. 在 `config.yml` 补上 `web` 段，设置一个不易猜测的后台路径：

   ```yaml
   web:
     admin_path: "/dj-mgmt-7x9k2"
   ```

5. 把 `.env` 里的 `TAG` 改成 `v1.4.0`，删掉不再使用的 `USER_PORT` / `ADMIN_PORT`。

6. 启动并检查：

   ```bash
   docker compose --env-file .env -f <你的 compose 文件> pull
   docker compose --env-file .env -f <你的 compose 文件> up -d
   docker compose logs -f dujiao-next
   ```

   日志出现 `Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)` 即为成功。

7. 调整 Nginx：把原来的两个 `server` 块合并为一个，整站转发到应用端口。
   后台域名可以停用，也可以继续解析到同一个服务。

### 0.3 升级步骤（二进制 / 手动部署）

1. 备份（见下方第 1 节）。
2. 停止旧的 api / user / admin 服务。
3. 下载 v1.4.0 的 `dujiao-next_*.tar.gz` 并解压。
4. 把原有的 `db/`、`uploads/`、`config.yml` 放进新的运行目录。
5. 在 `config.yml` 补上 `web.admin_path`。
6. 更新 systemd unit 里的 `ExecStart`（二进制名从 `dujiao-api` / `dujiao-server` 改为 `dujiao-next`），
   然后 `systemctl daemon-reload`。
7. 启动服务，确认日志出现 `Embedded SPAs`。
8. 调整 Nginx 为整站转发；原来托管 `user/dist`、`admin/dist` 的 `root` 配置可以删除。

### 0.4 注意事项

- 后台地址变了：从 `https://admin.example.com/` 变成 `https://shop.example.com/<web.admin_path>`，
  记得通知所有管理员并更新收藏夹。
- 支付回调地址如果之前填的是后台域名，请检查是否仍可达；建议统一改用前台域名。
- 改动 `web.admin_path` 后必须重启进程才会生效。
- 旧的 `dujiaonext/user`、`dujiaonext/admin` 镜像不再更新，可以从服务器上清理掉。

---

## 1. 升级前准备

### 1.1 备份数据

**必须在升级前备份以下内容：**

- 数据库（SQLite 文件或 PostgreSQL 数据）
- 配置文件（`config.yml`）
- 上传文件目录（`uploads/`）

参考 [备份与恢复](/deploy/backup) 指南。

### 1.2 查看 Release 说明

升级前务必阅读目标版本的 [GitHub Release 说明](https://github.com/dujiao-next/dujiao-next/releases)，了解：

- 新增功能和配置项
- 破坏性变更（Breaking Changes）
- 数据库结构变更
- 配置文件新增字段

### 1.3 检查在途支付与权限基线

升级包含支付回调金额/币种严格校验或 DujiaoPay 配置变更时：

- 在后台筛选 `provider_type=dujiaopay` 且状态为“待支付”的记录，优先等待其支付完成或过期后再升级。
- 如果必须带着在途订单升级，确认对应渠道的 `fiat_currency` 与这些支付记录的币种一致；在途订单清空前不要修改该渠道的法币配置。
- 记录当前六个预置角色（`readonly_auditor`、`operations`、`support`、`integration`、`finance`、`system_admin`）的测试管理员，供升级后做权限冒烟。

新版会在签名、渠道、第三方订单号、商户订单号和金额全部匹配，且旧支付记录没有新版法币快照时，受限采纳 Webhook 中的签名币种；这项升级前检查仍可避免依赖兼容分支。已有新版快照的支付若发生币种不一致，成功回调仍会被安全校验拒绝。若已经发生，应保留原始回调与支付记录并进行人工对账，不要手工绕过金额或币种校验。

---

## 2. 二进制部署升级

### 2.1 停止服务

```bash
systemctl stop dujiao
```

### 2.2 备份

```bash
cp db/dujiao.db db/dujiao.db.bak.$(date +%Y%m%d)
cp config.yml config.yml.bak
cp -r uploads uploads.bak
```

### 2.3 替换二进制

```bash
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao-next_*.tar.gz dujiao-next
```

前端随二进制一起更新，不需要另外替换静态文件。

### 2.4 更新配置

对比 `config.yml.example` 检查是否有新增配置项，按需添加到 `config.yml`。

### 2.5 启动服务

```bash
systemctl start dujiao
```

> 数据库结构变更会在启动时由 GORM 自动迁移完成，无需手动执行 SQL。

---

## 3. 源码构建升级

```bash
git pull origin main

# 一键构建（含前端）
goreleaser build --snapshot --single-target --clean
```

或手工构建，步骤见 [手动部署](/deploy/manual#_4-手工构建)。

---

## 4. Docker Compose 升级

### 4.1 备份

```bash
docker compose exec dujiao-next cp /app/db/dujiao.db /app/db/dujiao.db.bak
docker compose cp dujiao-next:/app/config.yml ./config.yml.bak
```

### 4.2 更新镜像

```bash
# 修改 .env 中的 TAG 为目标版本
docker compose --env-file .env -f <你的方案文件> pull
```

### 4.3 重启服务

```bash
docker compose --env-file .env -f <你的方案文件> up -d
```

### 4.4 检查日志

```bash
docker compose logs -f dujiao-next
```

---

## 5. 升级后验证

升级完成后按以下步骤验证：

1. **前台可访问**：打开站点根路径，确认商品列表正常
2. **后台登录**：访问 `/<web.admin_path>`，确认管理员可正常登录
3. **仪表盘**：检查数据是否正常显示
4. **商品列表**：确认商品和库存数据正确
5. **创建测试订单**：前台下单并完成支付测试
6. **支付回调**：确认支付回调正常工作
7. **邮件通知**：确认邮件发送功能正常
8. **预置角色权限**：分别使用六个预置角色的测试管理员登录，确认菜单可见性、只读/写入权限及 403 边界符合预期

---

## 6. 回滚

如果升级后出现问题：

### 6.1 二进制部署回滚

```bash
systemctl stop dujiao

# 恢复数据库与配置
cp db/dujiao.db.bak.YYYYMMDD db/dujiao.db
cp config.yml.bak config.yml

# 换回旧版二进制
systemctl start dujiao
```

> 从 v1.4.0 回滚到 v1.3.x 时，还需要把 user / admin 前端重新部署起来，并还原 Nginx 配置。

### 6.2 Docker 回滚

```bash
docker compose down

# 把 .env 的 TAG 改回旧版本，恢复数据库备份
docker compose --env-file .env -f <你的方案文件> up -d
```

---

## 7. 注意事项

- 跨多个版本升级时，建议逐版本升级或仔细阅读每个版本的更新日志
- 数据库自动迁移只增加字段/表，不会删除已有字段
- 升级后首次启动可能稍慢（执行数据库迁移）
- 配置文件新增字段通常有默认值，不加也不影响启动，但建议补全
