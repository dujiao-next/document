# 单二进制部署（推荐小白）

> 适用人群：完全新手，希望「一个二进制 + 一个 Redis + 一个域名」就能跑起来。

自 v1.4.0 起，用户前台与管理后台已内嵌进后端二进制，下载解压即可运行完整服务，不需要再单独部署前端。

## 系统要求

- Linux x86_64 或 arm64
- Redis（可以是系统服务、已有实例，或用 Docker 起一个）
- 一个域名 + SSL 证书（生产部署）
- 至少 512MB 内存

## 1. 下载

到 [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases) 找最新的 `dujiao-next_*.tar.gz`，按系统架构选：

```bash
# 例：Linux x86_64
wget https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
mkdir -p /opt/dujiao && tar -xzf dujiao-next_*.tar.gz -C /opt/dujiao
cd /opt/dujiao
```

arm64 机器请下载 `dujiao-next_vX.Y.Z_Linux_arm64.tar.gz`。

::: tip v1.3.x 用户注意
旧版发布过 `dujiao-next_*`（纯 API）与 `dujiao-all_*`（含前端）两个包，二进制分别叫 `dujiao-api` 与 `dujiao-server`。
自 v1.4.0 起两者合并为唯一产物 `dujiao-next_*.tar.gz`，二进制统一叫 `dujiao-next`。
:::

## 2. 复制配置

```bash
cp config.yml.example config.yml
```

## 3. 必改字段

打开 `config.yml`，按下表修改：

| 字段 | 说明 | 示例值 |
|---|---|---|
| `jwt.secret` | 后台管理员 JWT 密钥，**必改** | `openssl rand -hex 32` 输出 |
| `user_jwt.secret` | 用户 JWT 密钥，**必改** | 同上，不同值 |
| `web.admin_path` | 后台访问路径前缀，**强烈建议改** | `/dj-mgmt-7x9k2` |
| `redis.host` / `redis.port` | Redis 地址（默认 `127.0.0.1` + `6379`） | `127.0.0.1` + `6379` |
| `database.driver` / `database.dsn` | 数据库（默认 SQLite 起步） | 见下方 |

### 关于 `web.admin_path`（重要）

默认值 `/admin` 是自动化扫描器的头号目标。**强烈建议改成不易猜测的字符串**：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 换成你自己的字符串
```

这个路径只是后台 SPA 入口的「门牌」，改了它不影响 admin API 接口；API 鉴权由 JWT + 限流保护。改路径主要是过滤掉自动化扫描的噪音。

改完必须重启进程才会生效——路径是在启动时一次性写进后台页面的。

### 关于数据库

- **SQLite（默认）**：零配置，数据存在 `./db/dujiao.db`，单机够用。
- **PostgreSQL（生产推荐）**：把 `database.driver` 改为 `postgres`，`database.dsn` 写连接串。

## 4. 准备 Redis

如果你已有 Redis（系统服务或其他容器），改 `config.yml` 的 `redis.host` 和 `redis.port` 指过去即可。

没有的话，用 Docker 起一个最简单：

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine
```

## 5. 启动

```bash
./dujiao-next
```

启动日志会显示：

```
🚀 Dujiao-Next 启动中
...
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

看到 `Embedded SPAs` 这行就说明前端已经正确内嵌并挂载。

程序运行时会自动创建：
- `./db/`：SQLite 数据库
- `./uploads/`：用户上传文件
- `./logs/`：运行日志

## 6. 访问

- **用户端**：`http://<your-ip>:8080`
- **管理端**：`http://<your-ip>:8080/<web.admin_path>`（你刚才改的路径）

首次登录用默认管理员账号（在 `config.yml` 的 `bootstrap` 段配置）。**登录后立即修改密码**。

## 7. 反代与 HTTPS（生产部署）

只需要一个域名，整站转发到 8080 即可——前台、后台、API、上传文件、`sitemap.xml`、`robots.txt` 全都由这一个端口提供：

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.com;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

::: tip 不再需要按路径分流
v1.3.x 时代需要给 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt` 单独写 `location` 转发到后端，
现在整个域名都指向同一个进程，一条 `location /` 就够了。
:::

## 8. 系统服务（systemd）

先创建运行用户（如果你打算用专用用户跑服务）：

```bash
sudo useradd -r -s /sbin/nologin -d /opt/dujiao dujiao
sudo chown -R dujiao:dujiao /opt/dujiao
```

`/etc/systemd/system/dujiao.service`：

```ini
[Unit]
Description=Dujiao-Next
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/dujiao
ExecStart=/opt/dujiao/dujiao-next
Restart=on-failure
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

## 9. 升级

1. `systemctl stop dujiao`
2. 备份：`cp -r db uploads config.yml /backup/`
3. 下载新版 tar.gz，替换 `dujiao-next` 二进制
4. `systemctl start dujiao`

数据库迁移自动完成。前端也随二进制一起更新，不需要另外替换静态文件。

## 10. 从其他部署方式迁移

### 从 v1.3.x 三端分离部署迁移

1. 停掉旧的 api / user / admin 三个服务（或容器）
2. 把原来的 `db/`、`uploads/`、`config.yml` 拷到新的运行目录
3. 在 `config.yml` 补上 `web` 段并设置 `admin_path`
4. 启动新二进制，把域名反代改成整站指向 8080
5. 原来给后台单独准备的域名可以停用（也可以继续解析到同一个服务）

详细步骤见 [升级与迁移](/deploy/upgrade)。

### 从 Docker 部署迁移

同上，把挂载出来的 `db/`、`uploads/`、`config.yml` 直接复用即可。

## 常见问题

### Q：后台页面加载报 404

确认 `config.yml` 的 `web.admin_path` 与浏览器访问路径一致；改了 `web.admin_path` 必须重启进程才生效。

### Q：启动日志没有出现 `Embedded SPAs`

说明你拿到的二进制不含前端。请确认下载的是 GitHub Releases 里的 `dujiao-next_*.tar.gz`，
而不是自行用 `go build`（不带 `-tags fullstack`）编译出来的产物。

### Q：日志出现 "web.admin_path 仍为默认 /admin" 警告

按 §3 的建议修改 `web.admin_path`，警告会消失。

### Q：可以只跑 API、不要内嵌前端吗？

可以，从源码用 `go build ./cmd/server`（不加 `-tags fullstack`）编译即可，此时 `/` 与后台路径都不会被挂载。
这属于二次开发场景，见 [手动部署](/deploy/manual)。
