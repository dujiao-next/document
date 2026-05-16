---
outline: deep
---

# 維運 CLI（admin 子指令）

> 更新時間：2026-05-16

`dujiao-api` 二進位內建 `admin` 子指令,用於伺服器端維運操作:列出管理員、重設 2FA、重設密碼。常見使用情境是**超級管理員忘記密碼或遺失 2FA 裝置時的緊急還原**。

> 這些指令直接讀寫資料庫,**需要伺服器 shell 權限**,繞過了後台 UI 授權。請妥善管控可執行該二進位的維運帳號。

---

## 1. 前置條件

- 當前工作目錄有可用的 `config.yml`(預設會從工作目錄載入)
- `config.yml` 中資料庫設定正確(SQLite 檔案路徑或 PostgreSQL 連線字串)
- 二進位版本 ≥ 當前 `admin` 子指令引入版本(2026-05 之後的發行版)

> 與 `dujiao-api`(server 啟動)共用同一份設定。不會啟動 HTTP / worker / 內嵌前端,不列印 banner,僅初始化資料庫後執行子指令並退出。

---

## 2. 指令一覽

```bash
dujiao-api admin list-admins                            # 列出所有管理員
dujiao-api admin reset-2fa --username <name>            # 重設指定管理員的 2FA
dujiao-api admin reset-password --username <name>       # 互動式重設密碼(兩次確認)
dujiao-api admin reset-password --username <name> --password <new>  # 一次性提供新密碼
```

退出碼:`0` 成功;`1` 任何失敗(參數錯誤 / 資料庫錯誤 / 校驗失敗),便於腳本判定。

---

## 3. list-admins

列出目前資料庫內所有管理員帳號的概覽,**不輸出密碼雜湊、TOTP secret、還原碼等敏感欄位**。

```bash
dujiao-api admin list-admins
```

輸出範例:

```
ID  USERNAME  IS_SUPER  2FA_ENABLED        LAST_LOGIN
1   admin     true      yes (2026-04-10)   2026-05-15 14:22:08
2   ops       false     no                 2026-05-14 09:10:33
```

適用情境:確認目標管理員的 username、檢查 2FA 啟用狀況、定位失聯的超級管理員帳號。

---

## 4. reset-2fa

清空指定管理員的所有 TOTP 欄位(`totp_secret`、`totp_enabled_at`、`recovery_codes`、`totp_pending_*`),同時:

- `token_version` 自增 1
- `token_invalid_before` 寫入當前時間

效果:**該管理員所有現有工作階段立即失效**,下次登入走密碼登入路徑,並會被提示重新繫結 2FA。

```bash
dujiao-api admin reset-2fa --username admin
```

適用情境:管理員遺失手機 / Authenticator App、裝置被盜、還原碼也遺失。

> 寫入稽核日誌(`admin_login_logs`)事件類型 `2fa_reset_by_admin`,Client IP 記為 `cli`、UA 記為 `admin-tool`。

---

## 5. reset-password

**超級管理員忘記密碼的兜底還原路徑**。一般管理員忘記密碼請由超級管理員在後台 UI 重設(走完整密碼策略與稽核)。

執行後:

- `password_hash` 被新密碼的 bcrypt 雜湊覆蓋
- `token_version` 自增 1
- `token_invalid_before` 寫入當前時間
- 該管理員所有現有工作階段強制登出
- 稽核日誌寫入事件類型 `password_reset_by_cli`

### 5.1 互動式(推薦)

不傳 `--password` 時,從終端機隱藏讀取兩次輸入並比對:

```bash
dujiao-api admin reset-password --username admin
新密碼:
再次輸入:
OK: password reset for admin id=1 username=admin at 2026-05-16T20:34:18+08:00
提示: 該管理員所有現有工作階段已強制登出,請用新密碼重新登入。
```

### 5.2 命令列直傳(謹慎使用)

```bash
dujiao-api admin reset-password --username admin --password 'StrongPwd!2026'
```

> ⚠️ **該寫法會把密碼留在 shell 歷史記錄(`~/.bash_history` / `~/.zsh_history`)、行程列表(`ps aux`)、稽核日誌等位置**。僅建議在一次性自動化腳本中使用,執行後立即從歷史記錄刪除並改用強密碼。

### 5.3 腳本化(管線)

非終端機環境(CI / 自動化)下,從 stdin 讀取一行明文:

```bash
echo 'StrongPwd!2026' | dujiao-api admin reset-password --username admin
```

### 5.4 密碼校驗

CLI 緊急還原情境**僅校驗長度 ≥ 8**,不強制大小寫 / 數字 / 符號策略。**強烈建議維運登入後立即在管理後台改成符合貴站策略的強密碼**。

---

## 6. 部署形態下的呼叫範例

### 6.1 單二進位部署

```bash
cd /opt/dujiao-api          # 與 server 同一工作目錄(可讀取 config.yml)
./dujiao-api admin list-admins
./dujiao-api admin reset-password --username admin
```

### 6.2 systemd 服務

```bash
# 假設 WorkingDirectory=/opt/dujiao-api,User=dujiao
sudo -u dujiao /opt/dujiao-api/dujiao-api admin reset-password --username admin
```

### 6.3 Docker / Docker Compose

```bash
# 進入容器執行(容器內 WORKDIR 已是 /app,config.yml 透過 volume 掛載)
docker compose exec api ./dujiao-api admin list-admins
docker compose exec api ./dujiao-api admin reset-password --username admin

# 或一次性容器
docker compose run --rm api ./dujiao-api admin reset-2fa --username admin
```

> Docker 環境下互動式密碼輸入需要帶 `-it`(`docker compose exec -it api ...`)。

### 6.4 aaPanel / 其他面板

進入 API 程式目錄,以執行 API 的同一使用者身分執行:

```bash
sudo -u www /www/wwwroot/dujiao-api/dujiao-api admin reset-password --username admin
```

---

## 7. 安全注意事項

- **shell 權限即超級管理員權限**:任何能執行 `dujiao-api admin ...` 的帳號都能改超級管理員密碼或清 2FA,務必限制伺服器 shell 存取。
- **避免命令列直傳密碼**:優先使用互動式或 stdin 管線,降低密碼洩漏到歷史記錄 / 日誌的風險。
- **執行後立即登入改強密碼**:CLI 設定的密碼僅做最低長度校驗,登入後請按貴站密碼策略改成強隨機密碼。
- **每次操作都有稽核日誌**:`admin_login_logs` 資料表會記錄 `password_reset_by_cli` / `2fa_reset_by_admin` 事件,事後可追溯。
- **不要在共享主機或終端機複製貼上密碼**:剪貼簿和遠端工作階段錄製可能保留明文。

---

## 8. 疑難排解

| 現象 | 排查方向 |
|------|---------|
| `init db: ...` | `config.yml` 不存在 / 資料庫檔案路徑錯誤 / PostgreSQL 連線失敗 |
| `no admin with username="xxx"` | 使用者名稱拼寫錯誤,先跑 `list-admins` 確認 |
| `密碼長度至少 8 個字元` | 提高密碼長度後重試 |
| `兩次輸入不一致` | 互動模式下兩次輸入需完全一致 |
| 指令卡住無反應 | 終端機模式等待密碼輸入;非終端機模式等待 stdin 一行明文 |

---

## 9. 相關頁面

- [安全最佳實踐](/zh-hant/guide/security)
- [升級與遷移](/zh-hant/deploy/upgrade)
- [備份與還原](/zh-hant/deploy/backup)
