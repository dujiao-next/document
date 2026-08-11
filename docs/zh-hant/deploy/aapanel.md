# 使用 aaPanel 部署（基於 Releases 壓縮包）

> 更新時間：2026-07-26

若你尚未確定部署方式，建議先閱讀 [部署總覽與選型建議](/zh-hant/deploy/)。

本文檔適用於用官方編譯產物壓縮包在寶塔/aaPanel 面板上部署。

特點：

- 不需要在服務器 `git clone` 源碼
- 不需要在服務器執行 `go build` / `pnpm run build`
- 只做「下載 → 解壓 → 配置 → 啟動」
- 自 v1.4.0 起前端已內嵌進程式，**只需要下載一個壓縮包、建一個站點**

## 1. 面板與軟體準備

在 aaPanel 中安裝：

- Nginx
- PM2 管理器（或 Supervisor）
- 解壓工具（`tar`）
- Redis（按需）
- PostgreSQL（按需）

> 此部署方案不依賴 Git、Go、Node.js 編譯環境。

## 2. 準備目錄

```bash
mkdir -p /www/wwwroot/dujiao-next
cd /www/wwwroot/dujiao-next
```

## 3. 下載並解壓 Release 包

從 [Releases](https://github.com/dujiao-next/dujiao-next/releases) 下載對應架構的壓縮包。

命名遵循 GoReleaser 規則：`dujiao-next_<tag>_Linux_<arch>.tar.gz`，例如 `dujiao-next_v1.4.0_Linux_x86_64.tar.gz`（arm64 機器選 `_Linux_arm64.tar.gz`）。

```bash
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz
```

解壓後目錄中應包含：

- `dujiao-next`（內嵌前端的可執行檔案）
- `config.yml.example`
- `README.md`

::: tip v1.3.x 使用者注意
舊版需要分別下載 API、User、Admin 三個包並建兩個站點。
現在只有一個包，前端在程式內部，不再有 `user/dist`、`admin/dist` 目錄。
:::

## 4. 配置

```bash
cd /www/wwwroot/dujiao-next
cp config.yml.example config.yml
chmod +x ./dujiao-next
# 編輯 config.yml
```

> ⚠️ 重要安全提醒：上線前必須分別修改 `config.yml` 中的 `app.secret_key`、`jwt.secret` 與 `user_jwt.secret`。
>
> 請使用至少 32 位的高強度隨機字串並確保三者不同，嚴禁使用範本默認值；`app.secret_key` 還必須與資料庫一起備份。

同時務必修改後臺入口路徑（默認 `/admin` 是掃描器首要目標）：

```yaml
web:
  admin_path: "/dj-mgmt-7x9k2"   # 換成你自己的字串
```

## 5. 用 PM2 / Supervisor 啟動

在 aaPanel 的 PM2/Supervisor 中新增啟動命令：

```bash
/www/wwwroot/dujiao-next/dujiao-next
```

工作目錄設定為：

```text
/www/wwwroot/dujiao-next
```

> 建議同時為該行程設定環境變量（用於初始化默認管理員，避免使用默認弱口令）：
>
> - `DJ_DEFAULT_ADMIN_USERNAME=admin`
> - `DJ_DEFAULT_ADMIN_PASSWORD=<你的強密碼>`

啟動後查看日誌，出現下面這行表示前端已正確內嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 5.1 默認後臺管理員帳號（首次初始化）

當資料庫中 `admins` 表為空時，首次啟動會嘗試建立默認管理員：

- 默認帳號：`admin`
- 默認密碼：`admin123`

> 強烈建議：首次登入後臺後立即修改密碼。

如已在 PM2/Supervisor 設定 `DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`，則以你設定的值為準（優先級最高）。

若未設定上述環境變量，也可以在 `config.yml` 中配置：

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: <你的強密碼>
```

首次啟動時會讀取該配置完成管理員初始化。

## 6. 在 aaPanel 建立站點

**只需要一個站點**：

- 站點網域：`shop.example.com`
- 根目錄：隨便填（實際不會用到靜態檔案，所有請求都反向代理給程式）
- 為站點申請 SSL 憑證

## 7. 反向代理配置

在站點的「反向代理」中，把整站轉發到 `http://127.0.0.1:8080` 即可。

如果你手工編輯 Nginx 配置，對應內容是：

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

存取方式：

- 用戶前臺：`https://shop.example.com`
- 管理後臺：`https://shop.example.com/<web.admin_path>`

::: tip 相比舊版簡化了什麼
舊版需要兩個站點、兩個網域，並且要給 `/api/`、`/uploads/`、`/sitemap.xml`、`/robots.txt`
分別配置反向代理規則。現在這些全部由同一個程式處理，一條整站反向代理即可。
:::

## 8. 升級

1. 在 PM2/Supervisor 停止行程
2. 備份 `db/`、`uploads/`、`config.yml`
3. 下載新版壓縮包，覆蓋 `dujiao-next` 二進制
4. 重新啟動行程

前端隨二進制一起更新，不需要另外替換靜態檔案。

## 9. 安全建議

- `config.yml` 中密鑰不要使用默認值
- `web.admin_path` 不要保留默認的 `/admin`
- 僅開放必要埠（80/443）
- 程式埠（8080）不要直接暴露在公網，只讓本機 Nginx 存取
- 生產模式請設定 `server.mode: release`
