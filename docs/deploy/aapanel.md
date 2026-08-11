# 使用 aaPanel 部署（基于 Releases 压缩包）

> 更新时间：2026-07-26

若你尚未确定部署方式，建议先阅读 [部署总览与选型建议](/deploy/)。

本文档适用于用官方编译产物压缩包在宝塔/aaPanel 面板上部署。

特点：

- 不需要在服务器 `git clone` 源码
- 不需要在服务器执行 `go build` / `pnpm run build`
- 只做「下载 → 解压 → 配置 → 启动」
- 自 v1.4.0 起前端已内嵌进程序，**只需要下载一个压缩包、建一个站点**

## 1. 面板与软件准备

在 aaPanel 中安装：

- Nginx
- PM2 管理器（或 Supervisor）
- 解压工具（`tar`）
- Redis（按需）
- PostgreSQL（按需）

> 此部署方案不依赖 Git、Go、Node.js 编译环境。

## 2. 准备目录

```bash
mkdir -p /www/wwwroot/dujiao-next
cd /www/wwwroot/dujiao-next
```

## 3. 下载并解压 Release 包

从 [Releases](https://github.com/dujiao-next/dujiao-next/releases) 下载对应架构的压缩包。

命名遵循 GoReleaser 规则：`dujiao-next_<tag>_Linux_<arch>.tar.gz`，例如 `dujiao-next_v1.4.0_Linux_x86_64.tar.gz`（arm64 机器选 `_Linux_arm64.tar.gz`）。

```bash
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz
```

解压后目录中应包含：

- `dujiao-next`（内嵌前端的可执行文件）
- `config.yml.example`
- `README.md`

::: tip v1.3.x 用户注意
旧版需要分别下载 API、User、Admin 三个包并建两个站点。
现在只有一个包，前端在程序内部，不再有 `user/dist`、`admin/dist` 目录。
:::

## 4. 配置

```bash
cd /www/wwwroot/dujiao-next
cp config.yml.example config.yml
chmod +x ./dujiao-next
# 编辑 config.yml
```

> ⚠️ 重要安全提醒：上线前必须分别修改 `config.yml` 中的 `app.secret_key`、`jwt.secret` 与 `user_jwt.secret`。
>
> 请使用至少 32 位的高强度随机字符串并确保三者不同，严禁使用模板默认值；`app.secret_key` 还必须与数据库一起备份。

同时务必修改后台入口路径（默认 `/admin` 是扫描器首要目标）：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 换成你自己的字符串
```

## 5. 用 PM2 / Supervisor 启动

在 aaPanel 的 PM2/Supervisor 中添加启动命令：

```bash
/www/wwwroot/dujiao-next/dujiao-next
```

工作目录设置为：

```text
/www/wwwroot/dujiao-next
```

> 建议同时为该进程设置环境变量（用于初始化默认管理员，避免使用默认弱口令）：
>
> - `DJ_DEFAULT_ADMIN_USERNAME=admin`
> - `DJ_DEFAULT_ADMIN_PASSWORD=<你的强密码>`

启动后查看日志，出现下面这行说明前端已正确内嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 5.1 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空时，首次启动会尝试创建默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后立即修改密码。

如已在 PM2/Supervisor 设置 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`，则以你设置的值为准（优先级最高）。

若未设置上述环境变量，也可以在 `config.yml` 中配置：

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: <你的强密码>
```

首次启动时会读取该配置完成管理员初始化。

## 6. 在 aaPanel 创建站点

**只需要一个站点**：

- 站点域名：`shop.example.com`
- 根目录：随便填（实际不会用到静态文件，所有请求都反代给程序）
- 为站点申请 SSL 证书

## 7. 反向代理配置

在站点的「反向代理」中，把整站转发到 `http://127.0.0.1:8080` 即可。

如果你手工编辑 Nginx 配置，对应内容是：

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

访问方式：

- 用户前台：`https://shop.example.com`
- 管理后台：`https://shop.example.com/<web.admin_path>`

::: tip 相比旧版简化了什么
旧版需要两个站点、两个域名，并且要给 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt`
分别配置反代规则。现在这些全部由同一个程序处理，一条整站反代即可。
:::

## 8. 升级

1. 在 PM2/Supervisor 停止进程
2. 备份 `db/`、`uploads/`、`config.yml`
3. 下载新版压缩包，覆盖 `dujiao-next` 二进制
4. 重新启动进程

前端随二进制一起更新，不需要另外替换静态文件。

## 9. 安全建议

- `config.yml` 中密钥不要使用默认值
- `web.admin_path` 不要保留默认的 `/admin`
- 仅开放必要端口（80/443）
- 程序端口（8080）不要直接暴露在公网，只让本机 Nginx 访问
- 生产模式请设置 `server.mode: release`
