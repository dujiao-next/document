---
outline: deep
---

# 运维 CLI（admin 子命令）

> 更新时间：2026-05-16

`dujiao-api` 二进制内置 `admin` 子命令，用于服务器侧运维操作：列出管理员、重置 2FA、重置密码。常见使用场景是**超管忘记密码或丢失 2FA 设备时的紧急恢复**。

> 这些命令直接读写数据库,**需要服务器 shell 权限**,绕过了后台 UI 鉴权。请妥善管控可执行该二进制的运维账号。

---

## 1. 前置条件

- 当前工作目录有可用的 `config.yml`(默认会从工作目录加载)
- `config.yml` 中数据库配置正确(SQLite 文件路径或 PostgreSQL 连接串)
- 二进制版本 ≥ 当前 `admin` 子命令引入版本(2026-05 之后的发行版)

> 与 `dujiao-api`(server 启动)共用同一份配置。不会启动 HTTP / worker / 嵌入前端,不打印 banner,仅初始化数据库后执行子命令并退出。

---

## 2. 命令一览

```bash
dujiao-api admin list-admins                            # 列出所有管理员
dujiao-api admin reset-2fa --username <name>            # 重置指定管理员的 2FA
dujiao-api admin reset-password --username <name>       # 交互式重置密码(两次确认)
dujiao-api admin reset-password --username <name> --password <new>  # 一次性提供新密码
```

退出码:`0` 成功;`1` 任何失败(参数错误 / DB 错误 / 校验失败),便于脚本判定。

---

## 3. list-admins

列出当前数据库内所有管理员账号的概览,**不输出密码哈希、TOTP secret、恢复码等敏感字段**。

```bash
dujiao-api admin list-admins
```

输出示例:

```
ID  USERNAME  IS_SUPER  2FA_ENABLED        LAST_LOGIN
1   admin     true      yes (2026-04-10)   2026-05-15 14:22:08
2   ops       false     no                 2026-05-14 09:10:33
```

适用场景:确认目标管理员的 username、检查 2FA 启用情况、定位失联的超管账号。

---

## 4. reset-2fa

清空指定管理员的所有 TOTP 字段(`totp_secret`、`totp_enabled_at`、`recovery_codes`、`totp_pending_*`),同时:

- `token_version` 自增 1
- `token_invalid_before` 写入当前时间

效果:**该管理员所有现有会话立即失效**,下次登录走密码登录路径,并会被提示重新绑定 2FA。

```bash
dujiao-api admin reset-2fa --username admin
```

适用场景:管理员丢失手机 / Authenticator App、设备被盗、恢复码也丢失。

> 写入审计日志(`admin_login_logs`)事件类型 `2fa_reset_by_admin`,Client IP 记为 `cli`、UA 记为 `admin-tool`。

---

## 5. reset-password

**超管忘记密码的兜底恢复路径**。普通管理员忘记密码请由超管在后台 UI 重置(走完整密码策略与审计)。

执行后:

- `password_hash` 被新密码的 bcrypt 哈希覆盖
- `token_version` 自增 1
- `token_invalid_before` 写入当前时间
- 该管理员所有现有会话强制下线
- 审计日志写入事件类型 `password_reset_by_cli`

### 5.1 交互式(推荐)

不传 `--password` 时,从终端隐藏读取两次输入并比对:

```bash
dujiao-api admin reset-password --username admin
新密码:
再次输入:
OK: password reset for admin id=1 username=admin at 2026-05-16T20:34:18+08:00
提示: 该管理员所有现有会话已强制下线,请用新密码重新登录。
```

### 5.2 命令行直传(谨慎使用)

```bash
dujiao-api admin reset-password --username admin --password 'StrongPwd!2026'
```

> ⚠️ **该写法会把密码留在 shell history(`~/.bash_history` / `~/.zsh_history`)、进程列表(`ps aux`)、审计日志等位置**。仅建议在一次性自动化脚本中使用,执行后立即从 history 删除并改用强密码。

### 5.3 脚本化(管道)

非终端环境(CI / 自动化)下,从 stdin 读取一行明文:

```bash
echo 'StrongPwd!2026' | dujiao-api admin reset-password --username admin
```

### 5.4 密码校验

CLI 紧急恢复场景**仅校验长度 ≥ 8**,不强制大小写 / 数字 / 符号策略。**强烈建议运维登录后立即在管理后台改成符合贵站策略的强密码**。

---

## 6. 部署形态下的调用示例

### 6.1 单二进制部署

```bash
cd /opt/dujiao-api          # 与 server 同一工作目录(可读取 config.yml)
./dujiao-api admin list-admins
./dujiao-api admin reset-password --username admin
```

### 6.2 systemd 服务

```bash
# 假设 WorkingDirectory=/opt/dujiao-api,User=dujiao
sudo -u dujiao /opt/dujiao-api/dujiao-api admin reset-password --username admin
```

### 6.3 Docker / Docker Compose

```bash
# 进入容器执行(容器内 WORKDIR 已是 /app,config.yml 通过 volume 挂载)
docker compose exec api ./dujiao-api admin list-admins
docker compose exec api ./dujiao-api admin reset-password --username admin

# 或一次性容器
docker compose run --rm api ./dujiao-api admin reset-2fa --username admin
```

> Docker 环境下交互式密码输入需要带 `-it`(`docker compose exec -it api ...`)。

### 6.4 aaPanel / 其他面板

进入 API 程序目录,以运行 API 的同一用户身份执行:

```bash
sudo -u www /www/wwwroot/dujiao-api/dujiao-api admin reset-password --username admin
```

---

## 7. 安全注意事项

- **shell 权限即超管权限**:任何能执行 `dujiao-api admin ...` 的账号都能改超管密码或清 2FA,务必限制服务器 shell 访问。
- **避免命令行直传密码**:优先使用交互式或 stdin 管道,减少密码泄漏到 history / 日志的风险。
- **执行后立即登录改强密码**:CLI 设置的密码仅做最低长度校验,登录后请按贵站密码策略改成强随机密码。
- **每次操作都有审计日志**:`admin_login_logs` 表会记录 `password_reset_by_cli` / `2fa_reset_by_admin` 事件,事后可追溯。
- **不要在共享主机或终端复制粘贴密码**:粘贴板和远程会话录制可能保留明文。

---

## 8. 故障排查

| 现象 | 排查方向 |
|------|---------|
| `init db: ...` | `config.yml` 不存在 / DB 文件路径错误 / PostgreSQL 连接失败 |
| `no admin with username="xxx"` | 用户名拼写错误,先跑 `list-admins` 确认 |
| `密码长度至少 8 个字符` | 提高密码长度后重试 |
| `两次输入不一致` | 交互模式下两次输入需完全一致 |
| 命令卡住无响应 | 终端模式等待密码输入;非终端模式等待 stdin 一行明文 |

---

## 9. 相关页面

- [安全最佳实践](/guide/security)
- [升级与迁移](/deploy/upgrade)
- [备份与恢复](/deploy/backup)
