---
outline: deep
---

# Operations CLI (admin subcommand)

> Updated: 2026-05-16

The `dujiao-api` binary ships with a built-in `admin` subcommand for server-side operations: list administrators, reset 2FA, reset passwords. The most common use case is **emergency recovery when a super admin forgets their password or loses their 2FA device**.

> These commands read and write the database directly and **require server shell access**, bypassing the admin UI authorization. Make sure to tightly control which operator accounts can execute this binary.

---

## 1. Prerequisites

- A valid `config.yml` is available in the current working directory (loaded by default)
- The database configuration in `config.yml` is correct (SQLite file path or PostgreSQL connection string)
- Binary version ≥ the release that introduced the `admin` subcommand (releases after 2026-05)

> The subcommand shares the same configuration as `dujiao-api` (server startup). It does not start HTTP / worker / embedded frontend, does not print the banner, and exits immediately after the subcommand finishes. Only the database is initialized.

---

## 2. Command overview

```bash
dujiao-api admin list-admins                            # List all admins
dujiao-api admin reset-2fa --username <name>            # Reset 2FA for a specific admin
dujiao-api admin reset-password --username <name>       # Interactive password reset (two-time confirmation)
dujiao-api admin reset-password --username <name> --password <new>  # Provide new password inline
```

Exit codes: `0` on success; `1` on any failure (argument error / DB error / validation failure), so scripts can branch on it.

---

## 3. list-admins

Lists a summary of all admin accounts currently in the database. **Sensitive fields such as password hash, TOTP secret, and recovery codes are never printed.**

```bash
dujiao-api admin list-admins
```

Sample output:

```
ID  USERNAME  IS_SUPER  2FA_ENABLED        LAST_LOGIN
1   admin     true      yes (2026-04-10)   2026-05-15 14:22:08
2   ops       false     no                 2026-05-14 09:10:33
```

Use case: confirm a target admin's username, check 2FA enrollment, or locate a lost super admin account.

---

## 4. reset-2fa

Clears all TOTP fields for the specified admin (`totp_secret`, `totp_enabled_at`, `recovery_codes`, `totp_pending_*`), and in addition:

- Increments `token_version` by 1
- Sets `token_invalid_before` to the current time

Effect: **all of that admin's existing sessions are invalidated immediately**. On next login they go through the password-only flow and are prompted to re-enroll 2FA.

```bash
dujiao-api admin reset-2fa --username admin
```

Use case: the admin lost their phone / Authenticator app, the device was stolen, or recovery codes were also lost.

> An audit log entry (`admin_login_logs`) is written with event type `2fa_reset_by_admin`, Client IP recorded as `cli`, UA as `admin-tool`.

---

## 5. reset-password

**Last-resort recovery path for a super admin who forgot their password.** For regular admins who forgot their password, ask the super admin to reset it through the admin UI instead (which goes through the full password policy and audit trail).

After execution:

- `password_hash` is overwritten with a bcrypt hash of the new password
- `token_version` is incremented by 1
- `token_invalid_before` is set to the current time
- All of that admin's existing sessions are force-signed-out
- An audit log entry with event type `password_reset_by_cli` is written

### 5.1 Interactive (recommended)

When `--password` is omitted, the tool reads two hidden inputs from the terminal and compares them:

```bash
dujiao-api admin reset-password --username admin
新密码:
再次输入:
OK: password reset for admin id=1 username=admin at 2026-05-16T20:34:18+08:00
提示: 该管理员所有现有会话已强制下线,请用新密码重新登录。
```

### 5.2 Inline on command line (use with caution)

```bash
dujiao-api admin reset-password --username admin --password 'StrongPwd!2026'
```

> ⚠️ **This form leaks the password to shell history (`~/.bash_history` / `~/.zsh_history`), the process list (`ps aux`), and audit logs.** Only use it in one-shot automation scripts, then scrub the history immediately and rotate to a stronger password.

### 5.3 Scripted (pipe)

In non-terminal contexts (CI / automation), the tool reads a single plain-text line from stdin:

```bash
echo 'StrongPwd!2026' | dujiao-api admin reset-password --username admin
```

### 5.4 Password validation

The CLI emergency recovery path **only validates length ≥ 8** — it does not enforce upper/lowercase / digit / symbol policies. **Strongly recommended: after recovery login, immediately change the password in the admin UI to one that complies with your site's policy.**

---

## 6. Invocation by deployment topology

### 6.1 Single-binary deployment

```bash
cd /opt/dujiao-api          # Same working directory as the server (so config.yml is readable)
./dujiao-api admin list-admins
./dujiao-api admin reset-password --username admin
```

### 6.2 systemd service

```bash
# Assuming WorkingDirectory=/opt/dujiao-api, User=dujiao
sudo -u dujiao /opt/dujiao-api/dujiao-api admin reset-password --username admin
```

### 6.3 Docker / Docker Compose

```bash
# Exec into the container (WORKDIR is already /app, config.yml is volume-mounted)
docker compose exec api ./dujiao-api admin list-admins
docker compose exec api ./dujiao-api admin reset-password --username admin

# Or a one-shot container
docker compose run --rm api ./dujiao-api admin reset-2fa --username admin
```

> Interactive password input under Docker requires the `-it` flag (`docker compose exec -it api ...`).

### 6.4 aaPanel / other panels

Enter the API program directory and run as the same user that runs the API:

```bash
sudo -u www /www/wwwroot/dujiao-api/dujiao-api admin reset-password --username admin
```

---

## 7. Security notes

- **Shell access ≈ super admin access**: anyone who can run `dujiao-api admin ...` can change the super admin password or clear 2FA. Tightly control server shell access.
- **Avoid passing passwords on the command line**: prefer interactive mode or the stdin pipe to reduce the risk of leaking the password to history / logs.
- **Change to a strong password immediately after recovery**: the CLI only enforces a minimum length. After recovery login, switch to a strong random password that complies with your site's policy.
- **Every operation is audit-logged**: the `admin_login_logs` table records `password_reset_by_cli` / `2fa_reset_by_admin` events for after-the-fact investigation.
- **Do not copy-paste passwords on shared hosts or terminals**: clipboards and remote session recordings may retain plaintext.

---

## 8. Troubleshooting

| Symptom | What to check |
|---------|---------------|
| `init db: ...` | `config.yml` missing / wrong DB file path / PostgreSQL connection failed |
| `no admin with username="xxx"` | Username typo — run `list-admins` first to confirm |
| `密码长度至少 8 个字符` | Use a longer password and retry |
| `两次输入不一致` | In interactive mode, the two entries must match exactly |
| Command hangs | Terminal mode is waiting for password input; non-terminal mode is waiting for a plain-text line on stdin |

---

## 9. Related pages

- [Security Best Practices](/en/guide/security)
- [Upgrade & Migration](/en/deploy/upgrade)
- [Backup & Recovery](/en/deploy/backup)
