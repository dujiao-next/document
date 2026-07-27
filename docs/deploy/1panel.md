# 使用 1Panel 部署

> 更新时间：2026-07-26

若你尚未确定部署方式，建议先阅读 [部署总览与选型建议](/deploy/)。

[1Panel](https://1panel.cn) 是飞致云开源的现代化 Linux 服务器运维面板，内置应用商店、容器编排、网站与证书管理、计划任务备份等能力。本文覆盖在 1Panel 上部署 Dujiao-Next 的**两条完整路径**，从装面板一直讲到 HTTPS、备份、升级和排错。

::: tip 版本说明
本文以 **1Panel v2.x** 的菜单结构编写。不同小版本菜单位置可能略有差异（例如「进程守护」在 v1.9 位于「主机」下、v1.10+ 移到「工具箱」下），按名称找即可，功能是一致的。
:::

## 0. 先选路径：容器编排 vs 二进制守护

Dujiao-Next 自 v1.4.0 起是**单进程、单端口、单域名**的程序（前端已内嵌进二进制），所以在 1Panel 上有两种跑法：

| | 路径 A：容器编排 | 路径 B：二进制 + 进程守护 |
| --- | --- | --- |
| 运行形态 | Docker 容器（`dujiaonext/dujiao-next` 镜像） | 宿主机进程（Release 压缩包解出的二进制） |
| 1Panel 中的位置 | 容器 → 编排 | 工具箱 → 进程守护（Supervisor） |
| 环境依赖 | 只要 Docker（1Panel 自带） | 需先装 Supervisor |
| 升级方式 | 拉新镜像重建容器 | 后台「一键升级」下载替换，或手动换二进制 |
| **后台一键升级** | ❌ 不可用（程序会主动拦截） | ✅ 可下载替换，但**重启需手动点一下** |
| 数据隔离 | 卷挂载，边界清晰 | 直接落在宿主机目录 |
| 推荐度 | ⭐ 推荐大多数人 | 想用后台一键升级时选它 |

::: warning 为什么容器里不给一键升级
容器内替换 `/app/dujiao-next` 只对当前容器生命周期有效。一旦 `docker restart`、`compose up` 或宿主机重启，进程又会回到镜像层里的旧二进制，表现为「升级成功后过几天自己变回旧版」。所以程序探测到容器环境时会直接阻断升级，后台改为展示手动升级命令。这是有意为之，不是缺陷。
:::

两条路径的**准备工作（第 1、2 节）和收尾工作（第 6～9 节）是共用的**，中间按需要看第 3 节或第 4 节。

## 1. 安装 1Panel

### 1.1 系统要求

- 主流 Linux 发行版（Debian / RedHat 系，含国产系统）
- 架构：x86_64、aarch64 等
- 可用内存建议 1GB 以上（Dujiao-Next 本身 512MB 即可跑，但面板 + Redis + PostgreSQL 要留余量）
- 服务器能访问互联网

### 1.2 一键安装

```bash
bash -c "$(curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh)"
```

安装过程会询问端口、安全入口、用户名密码，并可选自动安装 Docker（**请选择安装**，路径 A 必需）。

安装完成后终端会打印面板地址。如果忘了，随时用：

```bash
1pctl user-info
```

访问格式为 `http://服务器IP:面板端口/安全入口`。

### 1.3 放行端口

在云服务器安全组 / 主机防火墙中放行：

- 面板端口（安装时设置的，默认 18080）
- `80`、`443`（网站访问）

**不要放行 8080**——Dujiao-Next 的端口全程只在内网/本机被访问，由 1Panel 的 OpenResty 反代出去。

1Panel 自带防火墙管理，位置在「主机 → 防火墙」，可直接在面板里开关端口。

## 2. 部署前准备（两条路径通用）

### 2.1 域名解析

把域名（例如 `shop.example.com`）A 记录解析到服务器公网 IP。**只需要一个域名**——用户前台和管理后台都在这一个域名下。

### 2.2 生成密钥

在「主机 → 终端」或 SSH 里执行两次，得到两个不同的随机串备用：

```bash
openssl rand -hex 32
```

### 2.3 想好后台入口路径

默认的 `/admin` 是自动化扫描器的头号目标，请提前想一个不易猜测的路径，例如 `/dj-mgmt-7x9k2`。

---

## 3. 路径 A：容器编排部署（推荐）

### 3.1 创建数据目录

::: tip 为什么不放在编排目录里
1Panel 删除编排时会连同 `/opt/1panel/docker/compose/<名称>/` 目录一起删掉。把 `config.yml` 和数据放在**独立目录** `/opt/dujiao-next`，误删编排也不会丢数据。
:::

在「主机 → 终端」执行：

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 关键：api 容器默认以非 root 用户运行，权限不足会导致启动失败
chmod -R 0777 ./data/db ./data/uploads ./data/logs ./data/redis ./data/postgres
```

目录说明：

| 目录 | 用途 |
| --- | --- |
| `config/` | `config.yml` 配置文件 |
| `data/db` | SQLite 数据库（仅 SQLite 方案） |
| `data/uploads` | 商品图片等上传文件 |
| `data/logs` | 运行日志 |
| `data/redis` | Redis 持久化数据 |
| `data/postgres` | PostgreSQL 数据（仅 PostgreSQL 方案） |

### 3.2 准备 config.yml

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example \
  -o /opt/dujiao-next/config/config.yml
```

然后在「主机 → 文件」中找到 `/opt/dujiao-next/config/config.yml`，双击用面板自带编辑器修改（也可以用 `vim`）。

**必改字段：**

| 字段 | 说明 | 填什么 |
| --- | --- | --- |
| `app.secret_key` | 敏感数据 AES 加密密钥 | 第 2.2 节生成的随机串 |
| `jwt.secret` | 后台管理员 Token 密钥 | 另一个随机串 |
| `user_jwt.secret` | 前台用户 Token 密钥 | 再换一个随机串 |
| `web.admin_path` | 后台入口路径 | 例如 `/dj-mgmt-7x9k2` |
| `server.mode` | 运行模式 | 生产改成 `release` |
| `database.*` | 数据库 | 见下方方案 A / B |
| `redis.*` / `queue.*` | Redis | `host` 填 `redis` |

::: danger 上线前必查
`jwt.secret`、`user_jwt.secret`、`app.secret_key` 三项**绝对不能保留模板默认值**。默认值意味着任何人都能伪造管理员 Token 直接登录你的后台。
:::

#### 方案 A：SQLite + Redis（轻量，推荐起步）

```yaml
server:
  host: 0.0.0.0
  port: 8080
  mode: release

web:
  admin_path: "/dj-mgmt-7x9k2"

database:
  driver: sqlite
  dsn: /app/db/dujiao.db

redis:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 0
  prefix: "dj"

queue:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 1
  concurrency: 10
  queues:
    default: 10
    critical: 5
```

#### 方案 B：PostgreSQL + Redis（生产推荐）

```yaml
database:
  driver: postgres
  dsn: host=postgres user=dujiao password=dujiao_pass dbname=dujiao_next port=5432 sslmode=disable TimeZone=Asia/Shanghai
```

`redis` / `queue` 两段与方案 A 相同。

### 3.3 确认 1panel-network 存在

反向代理要能访问到容器，最干净的做法是让容器和 1Panel 的 OpenResty 处在**同一个 Docker 网络**里。1Panel 用的统一网络叫 `1panel-network`：

```bash
docker network ls | grep 1panel-network
```

没有输出就手动创建一次（装过任意应用商店应用后通常已自动存在）：

```bash
docker network create 1panel-network
```

### 3.4 创建编排

进入「容器 → 编排 → 创建编排」：

- **名称**：`dujiao-next`
- **来源**：选默认的「编辑」（用 Web 编辑器直接写 compose）

把下面对应方案的内容粘贴进去。

::: tip 编排文件落在哪
1Panel 会把内容写到 `/opt/1panel/docker/compose/dujiao-next/docker-compose.yml`（`/opt` 为 1Panel 安装目录）。之后既能在面板里编辑，也能在「主机 → 文件」里直接改。
:::

#### 方案 A：SQLite + Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "your-strong-redis-password"]
    volumes:
      - /opt/dujiao-next/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your-strong-redis-password", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:latest
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      DJ_DEFAULT_ADMIN_USERNAME: admin
      DJ_DEFAULT_ADMIN_PASSWORD: change-me-please
    volumes:
      - /opt/dujiao-next/config/config.yml:/app/config.yml:ro
      - /opt/dujiao-next/data/db:/app/db
      - /opt/dujiao-next/data/uploads:/app/uploads
      - /opt/dujiao-next/data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net
      - 1panel-network

networks:
  dujiao-net:
    driver: bridge
  1panel-network:
    external: true
```

#### 方案 B：PostgreSQL + Redis

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    command: ["redis-server", "--dir", "/data", "--appendonly", "yes", "--requirepass", "your-strong-redis-password"]
    volumes:
      - /opt/dujiao-next/data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "your-strong-redis-password", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  postgres:
    image: postgres:16-alpine
    container_name: dujiaonext-postgres
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      POSTGRES_DB: dujiao_next
      POSTGRES_USER: dujiao
      POSTGRES_PASSWORD: dujiao_pass
    volumes:
      - /opt/dujiao-next/data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dujiao -d dujiao_next"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - dujiao-net

  dujiao-next:
    image: dujiaonext/dujiao-next:latest
    container_name: dujiao-next
    restart: unless-stopped
    environment:
      TZ: Asia/Shanghai
      DJ_DEFAULT_ADMIN_USERNAME: admin
      DJ_DEFAULT_ADMIN_PASSWORD: change-me-please
    volumes:
      - /opt/dujiao-next/config/config.yml:/app/config.yml:ro
      - /opt/dujiao-next/data/uploads:/app/uploads
      - /opt/dujiao-next/data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net
      - 1panel-network

networks:
  dujiao-net:
    driver: bridge
  1panel-network:
    external: true
```

::: danger 注意这里一个端口都没映射
这是**刻意的**，也是 1Panel 场景下最安全的写法：

- Docker 的端口映射直接写 iptables 的 `DOCKER` 链，**会绕过 ufw / firewalld 和 1Panel 防火墙**。写了 `ports: - "8080:8080"`，哪怕你面板里只放行了 80/443，8080 照样能被公网扫到。
- 不映射端口后，`dujiao-next` 只能通过 `1panel-network` 被 OpenResty 访问，Redis / PostgreSQL 则只在 `dujiao-net` 内可见，外网完全够不着。

需要临时调试时，用「容器 → 容器 → 终端」进容器执行 `wget -qO- http://127.0.0.1:8080/health` 即可，不必开端口。
:::

::: tip 想用 .env 变量
1Panel 的编排编辑器只有一个 compose 内容框。如果你偏好 `${VAR}` 写法，可以在「主机 → 文件」里于 `/opt/1panel/docker/compose/dujiao-next/` 下新建 `.env` 文件，compose 在同目录执行时会自动加载。
:::

点「确认」，1Panel 会自动拉镜像并启动。

### 3.5 检查启动结果

在「容器 → 编排 → dujiao-next」查看容器列表，三个（或两个）容器都应是 `running` / `healthy`。

点 `dujiao-next` 的「日志」，看到这一行说明前端已正确内嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

如果容器反复重启，优先看日志里的数据库/Redis 连接错误，对照第 9 节排查。

---

## 4. 路径 B：二进制 + 进程守护部署

选这条路径的主要理由：**想用后台的「检查更新 / 一键升级」按钮**。

### 4.1 安装 Supervisor

在「主机 → 终端」执行：

```bash
# Debian / Ubuntu
apt update && apt install -y supervisor

# RedHat / CentOS / Rocky
yum install -y epel-release && yum install -y supervisor
systemctl enable --now supervisord
```

然后进入「工具箱 → 进程守护」，按提示完成一次**初始化**（填写 supervisor 的配置文件路径与服务名，面板会自动探测，一般直接确认即可）。

### 4.2 下载并解压二进制

到 [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases) 找最新版本，按架构选择压缩包：

```bash
mkdir -p /opt/dujiao-next && cd /opt/dujiao-next

# x86_64
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
# arm64 机器改用 dujiao-next_v1.4.0_Linux_arm64.tar.gz

tar -xzf dujiao.tar.gz
chmod +x ./dujiao-next
```

解压后应包含 `dujiao-next`（内嵌前端的可执行文件）、`config.yml.example`、`README.md`。

### 4.3 准备 Redis

Dujiao-Next 需要 Redis。两种拿法：

**方式一：用 1Panel 应用商店（推荐）**

「应用商店 → 搜索 Redis → 安装」，设置密码与端口。安装时**关闭「端口外部访问」**，然后在 `config.yml` 里把 `redis.host` 填成宿主机 docker 网关：

```yaml
redis:
  enabled: true
  host: 172.17.0.1     # docker0 网关，宿主机进程访问容器化 Redis
  port: 6379
  password: 你在应用商店设置的密码
```

::: tip 端口映射与访问地址
1Panel 应用商店安装的 Redis 会把端口映射到宿主机。若「端口外部访问」关闭，映射只绑定本机，宿主机进程用 `127.0.0.1:6379` 也能连；`172.17.0.1` 则是更通用的写法。用「容器 → 容器」查看实际容器名与端口映射确认。
:::

**方式二：自己起一个容器**

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine \
  redis-server --requirepass 'your-strong-redis-password'
```

配置里 `redis.host` 填 `127.0.0.1`。

### 4.4 配置 config.yml

```bash
cd /opt/dujiao-next
cp config.yml.example config.yml
```

在「主机 → 文件」里编辑 `/opt/dujiao-next/config.yml`，必改字段与第 3.2 节的表格完全一致，区别只在于：

```yaml
server:
  host: 0.0.0.0        # 必须保持 0.0.0.0，否则 OpenResty 容器访问不到（见 4.6）
  port: 8080
  mode: release

database:
  driver: sqlite
  dsn: ./db/dujiao.db  # 二进制部署用相对路径即可
```

### 4.5 创建守护进程

进入「工具箱 → 进程守护 → 创建」，填写：

| 字段 | 填什么 |
| --- | --- |
| 名称 | `dujiao-next` |
| 运行用户 | `root`（或你专门建的低权限用户） |
| 运行目录 | `/opt/dujiao-next` |
| 启动命令 | `/opt/dujiao-next/dujiao-next` |
| 进程数量 | `1` |

::: danger 进程数量必须是 1
Dujiao-Next 是有状态服务（监听固定端口、跑后台任务队列）。设成多个会导致端口冲突和任务重复执行。
:::

::: tip 用专用用户运行更安全
```bash
useradd -r -s /sbin/nologin -d /opt/dujiao-next dujiao
chown -R dujiao:dujiao /opt/dujiao-next
```
然后「运行用户」填 `dujiao`。注意：该用户必须对 `/opt/dujiao-next` 目录有写权限，否则后台一键升级会因为无法写入而被拦截（`block_reason: dir_not_writable`）。
:::

创建后在列表里点「启动」，再点「日志」确认出现：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 4.6 关于监听地址（重要）

1Panel 的 OpenResty 跑在容器里。如果你把 `server.host` 改成 `127.0.0.1`，那是宿主机的回环地址，**OpenResty 容器访问不到**，反代必然 502。

保持 `0.0.0.0` 即可，安全由防火墙保证：在「主机 → 防火墙」里**不要放行 8080**，公网就访问不到，只有本机和 docker 网桥能访问。

---

## 5. 创建网站与反向代理（两条路径通用）

### 5.1 创建反向代理网站

进入「网站 → 网站 → 创建网站」：

- **类型**：选择「反向代理」
- **主域名**：`shop.example.com`
- **代理地址**：按你的路径填
  - 路径 A（容器编排）：`http://dujiao-next:8080`
  - 路径 B（二进制守护）：`http://172.17.0.1:8080`

::: danger 最常见的坑：代理地址千万别填 127.0.0.1
1Panel 的 OpenResty 本身运行在容器中，`http://127.0.0.1:8080` 指的是 **OpenResty 容器自己**，不是宿主机，结果必然是 `502 Bad Gateway`。

正确写法：

- 目标是容器 → 填**容器名**（前提是两者同在 `1panel-network`）
- 目标是宿主机进程 → 填 **`172.17.0.1`**（docker0 网关地址）

不确定网关地址时用 `ip addr show docker0` 查看。
:::

创建完成后，Dujiao-Next 的所有路径——用户前台 `/`、管理后台 `/<admin_path>`、`/api`、`/uploads`、`/sitemap.xml`、`/robots.txt`——都由这一条反代规则覆盖，**不需要**像老版本那样按路径分别配置。

### 5.2 申请 SSL 证书

进入「网站 → 证书 → 申请证书」：

- **账户**：首次使用需要先创建一个 Acme 账户（填邮箱即可）
- **验证方式**：
  - HTTP 验证：最简单，要求域名已解析到本机且 80 端口可访问
  - DNS 验证：支持泛域名，需要填 DNS 服务商 API 密钥
- 1Panel 会自动处理续签

### 5.3 开启 HTTPS

回到「网站 → 你的站点 → 设置 → HTTPS」：

- 打开 HTTPS 开关
- **证书**：选择刚申请的证书
- **HTTP 选项**：选「HTTP 自动跳转 HTTPS」
- 建议同时开启 **HSTS**

::: warning 支付回调必须是 HTTPS
大部分支付网关要求回调地址为 HTTPS 且证书有效。上线收款前务必先把证书配好，再去后台填写回调地址。详见 [支付配置与回调指南](/payment/guide)。
:::

### 5.4 调大上传体积限制

商品图片、卡密批量导入文件可能超过 OpenResty 默认的 1MB 限制，表现为上传报 `413 Request Entity Too Large`。

在「网站 → 你的站点 → 设置 → 配置文件」里，在 `server { }` 块内加一行：

```nginx
client_max_body_size 50m;
```

保存后面板会自动 reload。部分版本在「基本设置」里直接提供了上传限制输入框，有的话直接改更方便。

### 5.5 真实 IP 透传

后台的登录日志、风控、限流都依赖真实访客 IP。1Panel 的反向代理默认已经带上了 `X-Forwarded-For`，若发现后台记录的 IP 全是内网地址（如 `172.x.x.x`），到「网站 → 设置 → 真实 IP」里开启对应选项。

### 5.6 验证部署

浏览器访问：

- 用户前台：`https://shop.example.com`
- 管理后台：`https://shop.example.com/dj-mgmt-7x9k2`（换成你自己的 `admin_path`）
- 健康检查：`https://shop.example.com/health`

首次登录用 `admin` / 你在环境变量或 `config.yml` 里设置的密码，**登录后立刻改密码**。

## 6. 升级

### 6.1 路径 A（容器编排）的升级

在「容器 → 编排 → dujiao-next」中编辑 compose，把镜像 tag 改成目标版本：

```yaml
image: dujiaonext/dujiao-next:v1.4.0
```

保存后点「重新部署」（或在终端执行）：

```bash
cd /opt/1panel/docker/compose/dujiao-next
docker compose pull && docker compose up -d
```

前端随镜像一起更新，不需要额外动作。回滚就是把 tag 改回旧版本再执行一次。

::: tip 后台会告诉你怎么做
在容器里点后台的「一键升级」时，程序会识别出容器环境并直接展示上面这条命令（可一键复制），不会尝试替换二进制。
:::

### 6.2 路径 B（二进制守护）的升级

**方式一：后台一键升级（推荐）**

后台点击「检查更新 → 一键升级」，程序会：

1. 从 GitHub Release 下载当前平台对应的归档
2. 校验 sha256
3. 解压出新二进制
4. 把旧二进制重命名为 `dujiao-next.backup`，再把新二进制换上去（原子替换）

::: warning 替换完成后需要你手动重启
程序只在被 **systemd** 托管时才敢自动重启自己。Supervisor 守护的进程没有 systemd 的环境标识，后台会显示 `can_restart: false` 并提示手动重启。

到「工具箱 → 进程守护」找到 `dujiao-next`，点「重启」即可。重启后刷新后台，版本号就变了。
:::

**方式二：手动替换**

```bash
# 1. 在 1Panel「工具箱 → 进程守护」里停止进程
# 2. 备份
cp -r /opt/dujiao-next/db /opt/dujiao-next/uploads /opt/dujiao-next/config.yml /root/backup/
# 3. 下载新版并覆盖二进制
cd /opt/dujiao-next
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz dujiao-next
chmod +x dujiao-next
# 4. 回面板启动进程
```

数据库迁移在启动时自动完成。

### 6.3 升级失败怎么回滚

后台提供「回滚」按钮，会把 `dujiao-next.backup` 换回来。

但如果新版本**根本起不来**，后台也就打不开了，此时用终端：

```bash
cd /opt/dujiao-next
mv dujiao-next.backup dujiao-next
# 回面板重启进程守护
```

## 7. 备份

1Panel 的计划任务是这套部署里最省心的备份手段。

### 7.1 配置备份账号

先在「面板设置 → 备份账号」里添加一个远端存储（本地磁盘、OSS、S3、又拍云、WebDAV 等）。**强烈建议至少配一个异地存储**——服务器炸了本地备份也一起没了。

### 7.2 创建备份任务

进入「计划任务 → 创建任务」：

**任务一：备份数据目录**

- 类型：`备份目录`
- 目录：`/opt/dujiao-next`（包含 `config.yml`、`db/`、`uploads/`）
- 周期：每天凌晨
- 保留份数：7

**任务二：备份数据库（仅 PostgreSQL 方案）**

- 类型：`备份数据库`
- 选择 `dujiao_next`
- 周期：每天

**任务三（可选）：健康检查**

- 类型：`访问 URL`
- URL：`https://shop.example.com/health`
- 周期：每 5 分钟

::: danger SQLite 备份注意
SQLite 直接复制 `.db` 文件在有写入时可能拿到不一致的快照。重要场景建议在备份前先停一下进程，或改用 PostgreSQL 方案。完整策略见 [备份与恢复](/deploy/backup)。
:::

## 8. 安全加固清单

部署完对着这张表逐条确认：

- [ ] `jwt.secret`、`user_jwt.secret`、`app.secret_key` 都换成了随机串，没有一个是模板默认值
- [ ] `web.admin_path` 已改掉，不是 `/admin`
- [ ] `server.mode` 是 `release`
- [ ] 默认管理员密码已在首次登录后修改
- [ ] 防火墙只放行了 80、443、面板端口、SSH，**没有** 8080 / 6379 / 5432
- [ ] compose 里 Redis / PostgreSQL 没有写 `ports`
- [ ] Redis 设置了强密码
- [ ] HTTPS 已开启且强制跳转
- [ ] 1Panel 面板本身改了默认端口与安全入口，并开启了面板的两步验证
- [ ] 已配置至少一个异地备份账号并跑通了一次备份任务

更多细节见 [安全最佳实践](/guide/security)。

## 9. 常见问题

### Q：访问域名报 502 Bad Gateway

按顺序排查：

1. **代理地址是不是填了 `127.0.0.1`？** 这是最常见原因，见第 5.1 节的说明。
2. 容器/进程是不是真的在跑？「容器 → 容器」或「工具箱 → 进程守护」看状态。
3. 路径 A：`dujiao-next` 是否加入了 `1panel-network`？用 `docker network inspect 1panel-network` 确认里面能看到这个容器。
4. 路径 B：`server.host` 是不是被改成了 `127.0.0.1`？必须是 `0.0.0.0`。
5. 在终端直接测一下后端通不通：

```bash
# 路径 A
docker exec dujiao-next wget -qO- http://127.0.0.1:8080/health
# 路径 B
curl http://127.0.0.1:8080/health
```

### Q：后台地址打开是 404

`config.yml` 的 `web.admin_path` 与你访问的路径不一致。注意改完这个字段**必须重启**程序才生效——路径是启动时一次性写进后台页面的。

### Q：启动日志里没有 `Embedded SPAs` 这一行

说明拿到的二进制不含前端。确认下载的是 Releases 里的 `dujiao-next_*.tar.gz`，而不是自己 `go build`（不带 `-tags fullstack`）编译的产物。

### Q：上传图片报 413

OpenResty 的 `client_max_body_size` 太小，见第 5.4 节。

### Q：容器起不来，日志里是权限错误

`data/` 下的目录属主不对。api 容器以非 root 运行，执行：

```bash
chmod -R 0777 /opt/dujiao-next/data/{db,uploads,logs,redis}
```

### Q：Redis 连接失败

- 路径 A：`config.yml` 里 `redis.host` 必须写成容器名 `redis`，不是 `127.0.0.1`
- 路径 B：宿主机进程访问容器化 Redis 要用 `172.17.0.1` 或 `127.0.0.1`（取决于端口映射方式），不能写容器名
- 两者都要确认密码与 compose / 应用商店里设置的一致

### Q：后台「一键升级」按钮是灰的 / 提示当前部署方式不支持

看后台展示的原因码：

| 原因 | 含义 | 怎么办 |
| --- | --- | --- |
| `container` | 检测到容器环境 | 正常现象，按第 6.1 节拉新镜像 |
| `source_build` | 二进制不是官方发行版 | 从 Releases 下载官方压缩包，不要用自己编译的 |
| `dir_not_writable` | 程序对自身所在目录没有写权限 | 给运行用户加上 `/opt/dujiao-next` 的写权限 |
| `unsupported_os` | 非 Linux / macOS | 手动升级 |

### Q：一键升级完成了，但版本号没变

正常——二进制已经换了，但进程还是旧的。到「工具箱 → 进程守护」点「重启」，见第 6.2 节。

### Q：面板里删除了编排，数据还在吗

本文把数据放在 `/opt/dujiao-next`（编排目录之外），所以删编排不会丢数据，重新创建编排即可恢复。如果你把数据挂在了 `/opt/1panel/docker/compose/dujiao-next/` 下，那删除编排会一并删掉——这正是第 3.1 节要求独立建目录的原因。

## 10. 相关文档

- [部署总览与选型建议](/deploy/)
- [Docker Compose 部署](/deploy/docker-compose)（compose 参数的完整说明）
- [单二进制部署](/deploy/binary)（二进制方式的完整说明）
- [config.yml 详细说明](/config/config-yml)
- [升级与迁移](/deploy/upgrade)
- [备份与恢复](/deploy/backup)
- [安全最佳实践](/guide/security)
