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
Restart=always
RestartSec=3
User=dujiao

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dujiao
sudo journalctl -u dujiao -f
```

::: warning 从 v1.3.1 及更早版本升级：先改 Restart=always
如果你的 unit 现在是 `Restart=on-failure`，**在使用后台一键升级之前**先改成 `Restart=always` 并执行 `systemctl daemon-reload`。

原因是一键升级的执行者是**当前正在运行的旧程序**：它替换掉磁盘上的二进制之后，仍由它自己处理「立即重启」。旧程序里没有新版本的退出码逻辑，它会正常退出（退出码 0），而 `Restart=on-failure` 对正常退出不做任何处理 —— 服务就此停在那里，需要你手动 `systemctl start dujiao` 才能起来。

`Restart=always` 对任何退出都会拉起，因此改完之后连这一次升级也是全自动的。改成 `always` 不影响 `systemctl stop`，显式停止仍然正常停服。

新版本跑起来之后，后续升级两种策略都能正常工作。
:::

::: tip Restart= 决定后台「一键重启」能否用
后台「系统更新」里的一键重启，是让当前进程退出、由 systemd 拉起新二进制。因此 unit 的 `Restart=` 策略必须允许自动拉起：

| `Restart=` | 一键重启 | 说明 |
| --- | --- | --- |
| `always` | ✅ 推荐 | 任何退出都拉起；`systemctl stop` 仍能正常停服 |
| `on-failure` | ✅ 可用 | 自更新重启以专用非零退出码退出，会被拉起 |
| `on-success` / `on-abnormal` / `on-abort` | ❌ | 只认干净退出或信号，不认退出码 |
| `no` | ❌ | 退出即停服（这也是 systemd 的默认值，不写 `Restart=` 就是它） |

另外，若你在 unit 里写了 `SuccessExitStatus=70` 或 `RestartPreventExitStatus=70`，一键重启同样会失效 —— 70 正是自更新使用的退出码。

程序启动时会读取本 unit 的这三项配置并据此决定是否放出重启按钮。**查不到配置时按「不能重启」处理**，后台会改为提示你手动执行 `systemctl restart dujiao`。
:::

## 9. 升级

1. `systemctl stop dujiao`
2. 备份：`cp -r db uploads config.yml /backup/`
3. 下载新版 tar.gz，替换 `dujiao-next` 二进制
4. `systemctl start dujiao`

数据库迁移自动完成。前端也随二进制一起更新，不需要另外替换静态文件。

::: tip 手工替换不会清理一键升级留下的备份
如果你之前用过后台一键升级，目录里会留着 `dujiao-next.backup` 和 `dujiao-next.backup.json`。手工替换二进制不会动它们，所以后台「系统更新」里显示的回滚目标仍然是**上一次一键升级前**的那一版，可能比你现在跑的版本旧好几个版本。不想保留就直接删掉这两个文件，回滚入口会随之消失。
:::

### 回滚

后台一键升级会把旧二进制留成 `dujiao-next.backup`。回滚有两条路径：

- **后台可以打开时**：进「系统更新」点回滚。
- **新版本起不来时**：后台本身也打不开，改在终端执行：

  ```bash
  cd /opt/dujiao
  ./dujiao-next rollback
  systemctl restart dujiao
  ```

  这条命令不读 `config.yml`、不连数据库，只做本地文件替换，所以配置写错或数据库连不上都不影响恢复。

::: warning 什么时候需要加 `--force`
数据库迁移一旦开始，旧程序就未必读得懂新的表结构，所以下面三种情况命令行都会**直接拒绝**回滚，后台则会先弹风险确认：

| 情况 | 为什么拒绝 |
| --- | --- |
| 新版本已经完整启动过 | 迁移肯定跑完了 |
| 新版本在迁移中途失败 | 迁移在第一条 SQL 之前就已记录，schema 可能改了一半 |
| 找不到升级记录，或记录损坏 | 无法证明迁移没跑过 |

**第三种最常见**：从 v1.3.1 及更早版本一键升级上来的**第一次**，执行替换的是没有这套记录逻辑的旧程序，目录里只会留下一个 `dujiao-next.backup`。也就是说，如果你是从 v1.3.1 升上来、新版本又起不来，上面那条 `./dujiao-next rollback` **一定**会打印「已拒绝回滚」，这是预期行为，不是命令坏了。

确认要承担风险时先备份数据库，再加 `--force`：

```bash
cp -r db /backup/          # SQLite；PostgreSQL 请用 pg_dump
./dujiao-next rollback --force
systemctl restart dujiao
```
:::

### 启动时提示「无法可靠记录升级状态」

服务起不来，日志里是这一句：

```
无法可靠记录升级状态，已在数据库迁移前中止启动: open update lock: ... permission denied
```

意思是安装目录里还留着一键升级的状态文件（`dujiao-next.backup`、`dujiao-next.backup.json`），但**服务账号对安装目录没有写权限**，程序没法把「数据库迁移已经开始」记下来。

这时候程序会**在动数据库之前主动停下**：如果放它继续跑，迁移改完 schema 却没有任何记录，之后一次普通回滚就会被错误放行，把旧程序配上新库。

常见于安装目录属主是 `root`、而 unit 里写了 `User=dujiao` 的部署。按提示二选一：

```bash
# 1) 让服务账号可写（推荐，保留回滚能力）
sudo chown -R dujiao /opt/dujiao

# 2) 确认不再需要这个回滚点，删掉状态文件
sudo rm -f /opt/dujiao/dujiao-next.backup /opt/dujiao/dujiao-next.backup.json
sudo systemctl restart dujiao
```

如果日志里是「另一个升级或回滚正在进行」，那只是两个进程同时起来抢锁，等几秒重启即可，不用改任何文件。

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
