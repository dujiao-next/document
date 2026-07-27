# 使用 1Panel 部署

> 更新時間：2026-07-26

若你尚未確定部署方式，建議先閱讀 [部署總覽與選型建議](/zh-hant/deploy/)。

[1Panel](https://1panel.cn) 是飛致雲開源的現代化 Linux 伺服器維運面板，內建應用商店、容器編排、網站與憑證管理、計劃任務備份等能力。本文涵蓋在 1Panel 上部署 Dujiao-Next 的**兩條完整路徑**，從安裝面板一直講到 HTTPS、備份、升級與排錯。

::: tip 版本說明
本文以 **1Panel v2.x** 的選單結構編寫。不同小版本選單位置可能略有差異（例如「行程守護」在 v1.9 位於「主機」下、v1.10+ 移到「工具箱」下），按名稱尋找即可，功能是一致的。
:::

## 0. 先選路徑：容器編排 vs 二進制守護

Dujiao-Next 自 v1.4.0 起是**單行程、單連接埠、單網域**的程式（前端已內嵌進二進制），所以在 1Panel 上有兩種跑法：

| | 路徑 A：容器編排 | 路徑 B：二進制 + 行程守護 |
| --- | --- | --- |
| 執行形態 | Docker 容器（`dujiaonext/dujiao-next` 映像） | 主機行程（Release 壓縮包解出的二進制） |
| 1Panel 中的位置 | 容器 → 編排 | 工具箱 → 行程守護（Supervisor） |
| 環境依賴 | 只要 Docker（1Panel 自帶） | 需先安裝 Supervisor |
| 升級方式 | 拉新映像重建容器 | 後臺「一鍵升級」下載替換，或手動換二進制 |
| **後臺一鍵升級** | ❌ 不可用（程式會主動攔截） | ✅ 可下載替換，但**重啟需手動點一下** |
| 資料隔離 | 卷掛載，邊界清晰 | 直接落在主機目錄 |
| 推薦度 | ⭐ 推薦大多數人 | 想用後臺一鍵升級時選它 |

::: warning 為什麼容器裡不給一鍵升級
容器內替換 `/app/dujiao-next` 只對當前容器生命週期有效。一旦 `docker restart`、`compose up` 或主機重啟，行程又會回到映像層裡的舊二進制，表現為「升級成功後過幾天自己變回舊版」。所以程式偵測到容器環境時會直接攔截升級，後臺改為顯示手動升級命令。這是有意為之，不是缺陷。
:::

兩條路徑的**準備工作（第 1、2 節）與收尾工作（第 6～9 節）是共用的**，中間按需要看第 3 節或第 4 節。

## 1. 安裝 1Panel

### 1.1 系統要求

- 主流 Linux 發行版（Debian / RedHat 系，含國產系統）
- 架構：x86_64、aarch64 等
- 可用記憶體建議 1GB 以上（Dujiao-Next 本身 512MB 即可跑，但面板 + Redis + PostgreSQL 要留餘量）
- 伺服器能存取網際網路

### 1.2 一鍵安裝

```bash
bash -c "$(curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh)"
```

安裝過程會詢問連接埠、安全入口、使用者名稱密碼，並可選自動安裝 Docker（**請選擇安裝**，路徑 A 必需）。

安裝完成後終端會列印面板地址。如果忘了，隨時用：

```bash
1pctl user-info
```

存取格式為 `http://伺服器IP:面板連接埠/安全入口`。

### 1.3 放行連接埠

在雲伺服器安全組 / 主機防火牆中放行：

- 面板連接埠（安裝時設定的，預設 18080）
- `80`、`443`（網站存取）

**不要放行 8080**——Dujiao-Next 的連接埠全程只在內網/本機被存取，由 1Panel 的 OpenResty 反代出去。

1Panel 自帶防火牆管理，位置在「主機 → 防火牆」，可直接在面板裡開關連接埠。

## 2. 部署前準備（兩條路徑通用）

### 2.1 網域解析

把網域（例如 `shop.example.com`）A 記錄解析到伺服器公網 IP。**只需要一個網域**——使用者前臺與管理後臺都在這一個網域下。

### 2.2 產生金鑰

在「主機 → 終端」或 SSH 裡執行兩次，得到兩個不同的隨機字串備用：

```bash
openssl rand -hex 32
```

### 2.3 想好後臺入口路徑

預設的 `/admin` 是自動化掃描器的頭號目標，請提前想一個不易猜測的路徑，例如 `/dj-mgmt-7x9k2`。

---

## 3. 路徑 A：容器編排部署（推薦）

### 3.1 建立資料目錄

::: tip 為什麼不放在編排目錄裡
1Panel 刪除編排時會連同 `/opt/1panel/docker/compose/<名稱>/` 目錄一起刪掉。把 `config.yml` 與資料放在**獨立目錄** `/opt/dujiao-next`，誤刪編排也不會丟資料。
:::

在「主機 → 終端」執行：

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 關鍵：api 容器預設以非 root 使用者執行，權限不足會導致啟動失敗
chmod -R 0777 ./data/db ./data/uploads ./data/logs ./data/redis ./data/postgres
```

目錄說明：

| 目錄 | 用途 |
| --- | --- |
| `config/` | `config.yml` 設定檔 |
| `data/db` | SQLite 資料庫（僅 SQLite 方案） |
| `data/uploads` | 商品圖片等上傳檔案 |
| `data/logs` | 執行日誌 |
| `data/redis` | Redis 持久化資料 |
| `data/postgres` | PostgreSQL 資料（僅 PostgreSQL 方案） |

### 3.2 準備 config.yml

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example \
  -o /opt/dujiao-next/config/config.yml
```

然後在「主機 → 檔案」中找到 `/opt/dujiao-next/config/config.yml`，雙擊用面板自帶編輯器修改（也可以用 `vim`）。

**必改欄位：**

| 欄位 | 說明 | 填什麼 |
| --- | --- | --- |
| `app.secret_key` | 敏感資料 AES 加密金鑰 | 第 2.2 節產生的隨機字串 |
| `jwt.secret` | 後臺管理員 Token 金鑰 | 另一個隨機字串 |
| `user_jwt.secret` | 前臺使用者 Token 金鑰 | 再換一個隨機字串 |
| `web.admin_path` | 後臺入口路徑 | 例如 `/dj-mgmt-7x9k2` |
| `server.mode` | 執行模式 | 生產改成 `release` |
| `database.*` | 資料庫 | 見下方方案 A / B |
| `redis.*` / `queue.*` | Redis | `host` 填 `redis` |

::: danger 上線前必查
`jwt.secret`、`user_jwt.secret`、`app.secret_key` 三項**絕對不能保留範本預設值**。預設值意味著任何人都能偽造管理員 Token 直接登入你的後臺。
:::

#### 方案 A：SQLite + Redis（輕量，推薦起步）

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

#### 方案 B：PostgreSQL + Redis（生產推薦）

```yaml
database:
  driver: postgres
  dsn: host=postgres user=dujiao password=dujiao_pass dbname=dujiao_next port=5432 sslmode=disable TimeZone=Asia/Shanghai
```

`redis` / `queue` 兩段與方案 A 相同。

### 3.3 確認 1panel-network 存在

反向代理要能存取到容器，最乾淨的做法是讓容器與 1Panel 的 OpenResty 處在**同一個 Docker 網路**裡。1Panel 用的統一網路叫 `1panel-network`：

```bash
docker network ls | grep 1panel-network
```

沒有輸出就手動建立一次（安裝過任意應用商店應用後通常已自動存在）：

```bash
docker network create 1panel-network
```

### 3.4 建立編排

進入「容器 → 編排 → 建立編排」：

- **名稱**：`dujiao-next`
- **來源**：選預設的「編輯」（用 Web 編輯器直接寫 compose）

把下面對應方案的內容貼進去。

::: tip 編排檔案落在哪
1Panel 會把內容寫到 `/opt/1panel/docker/compose/dujiao-next/docker-compose.yml`（`/opt` 為 1Panel 安裝目錄）。之後既能在面板裡編輯，也能在「主機 → 檔案」裡直接改。
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

::: danger 注意這裡一個連接埠都沒映射
這是**刻意的**，也是 1Panel 場景下最安全的寫法：

- Docker 的連接埠映射直接寫 iptables 的 `DOCKER` 鏈，**會繞過 ufw / firewalld 與 1Panel 防火牆**。寫了 `ports: - "8080:8080"`，哪怕你面板裡只放行了 80/443，8080 照樣能被公網掃到。
- 不映射連接埠後，`dujiao-next` 只能透過 `1panel-network` 被 OpenResty 存取，Redis / PostgreSQL 則只在 `dujiao-net` 內可見，外網完全構不著。

需要臨時偵錯時，用「容器 → 容器 → 終端」進容器執行 `wget -qO- http://127.0.0.1:8080/health` 即可，不必開連接埠。
:::

::: tip 想用 .env 變數
1Panel 的編排編輯器只有一個 compose 內容框。如果你偏好 `${VAR}` 寫法，可以在「主機 → 檔案」裡於 `/opt/1panel/docker/compose/dujiao-next/` 下新建 `.env` 檔案，compose 在同目錄執行時會自動載入。
:::

點「確認」，1Panel 會自動拉映像並啟動。

### 3.5 檢查啟動結果

在「容器 → 編排 → dujiao-next」查看容器列表，三個（或兩個）容器都應是 `running` / `healthy`。

點 `dujiao-next` 的「日誌」，看到這一行說明前端已正確內嵌：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

如果容器反覆重啟，優先看日誌裡的資料庫/Redis 連線錯誤，對照第 9 節排查。

---

## 4. 路徑 B：二進制 + 行程守護部署

選這條路徑的主要理由：**想用後臺的「檢查更新 / 一鍵升級」按鈕**。

### 4.1 安裝 Supervisor

在「主機 → 終端」執行：

```bash
# Debian / Ubuntu
apt update && apt install -y supervisor

# RedHat / CentOS / Rocky
yum install -y epel-release && yum install -y supervisor
systemctl enable --now supervisord
```

然後進入「工具箱 → 行程守護」，按提示完成一次**初始化**（填寫 supervisor 的設定檔路徑與服務名，面板會自動偵測，一般直接確認即可）。

### 4.2 下載並解壓二進制

到 [GitHub Releases](https://github.com/dujiao-next/dujiao-next/releases) 找最新版本，按架構選擇壓縮包：

```bash
mkdir -p /opt/dujiao-next && cd /opt/dujiao-next

# x86_64
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/v1.4.0/dujiao-next_v1.4.0_Linux_x86_64.tar.gz
# arm64 機器改用 dujiao-next_v1.4.0_Linux_arm64.tar.gz

tar -xzf dujiao.tar.gz
chmod +x ./dujiao-next
```

解壓後應包含 `dujiao-next`（內嵌前端的可執行檔案）、`config.yml.example`、`README.md`。

### 4.3 準備 Redis

Dujiao-Next 需要 Redis。兩種拿法：

**方式一：用 1Panel 應用商店（推薦）**

「應用商店 → 搜尋 Redis → 安裝」，設定密碼與連接埠。安裝時**關閉「連接埠外部存取」**，然後在 `config.yml` 裡把 `redis.host` 填成主機 docker 閘道：

```yaml
redis:
  enabled: true
  host: 172.17.0.1     # docker0 閘道，主機行程存取容器化 Redis
  port: 6379
  password: 你在應用商店設定的密碼
```

::: tip 連接埠映射與存取地址
1Panel 應用商店安裝的 Redis 會把連接埠映射到主機。若「連接埠外部存取」關閉，映射只綁定本機，主機行程用 `127.0.0.1:6379` 也能連；`172.17.0.1` 則是更通用的寫法。用「容器 → 容器」查看實際容器名與連接埠映射確認。
:::

**方式二：自己起一個容器**

```bash
docker run -d --name dujiao-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 redis:7-alpine \
  redis-server --requirepass 'your-strong-redis-password'
```

設定裡 `redis.host` 填 `127.0.0.1`。

### 4.4 設定 config.yml

```bash
cd /opt/dujiao-next
cp config.yml.example config.yml
```

在「主機 → 檔案」裡編輯 `/opt/dujiao-next/config.yml`，必改欄位與第 3.2 節的表格完全一致，區別只在於：

```yaml
server:
  host: 0.0.0.0        # 必須保持 0.0.0.0，否則 OpenResty 容器存取不到（見 4.6）
  port: 8080
  mode: release

database:
  driver: sqlite
  dsn: ./db/dujiao.db  # 二進制部署用相對路徑即可
```

### 4.5 建立守護行程

進入「工具箱 → 行程守護 → 建立」，填寫：

| 欄位 | 填什麼 |
| --- | --- |
| 名稱 | `dujiao-next` |
| 執行使用者 | `root`（或你專門建的低權限使用者） |
| 執行目錄 | `/opt/dujiao-next` |
| 啟動命令 | `/opt/dujiao-next/dujiao-next` |
| 行程數量 | `1` |

::: danger 行程數量必須是 1
Dujiao-Next 是有狀態服務（監聽固定連接埠、跑後臺任務佇列）。設成多個會導致連接埠衝突與任務重複執行。
:::

::: tip 用專用使用者執行更安全
```bash
useradd -r -s /sbin/nologin -d /opt/dujiao-next dujiao
chown -R dujiao:dujiao /opt/dujiao-next
```
然後「執行使用者」填 `dujiao`。注意：該使用者必須對 `/opt/dujiao-next` 目錄有寫權限，否則後臺一鍵升級會因為無法寫入而被攔截（`block_reason: dir_not_writable`）。
:::

建立後在列表裡點「啟動」，再點「日誌」確認出現：

```
Embedded SPAs: admin (/dj-mgmt-7x9k2), user (/)
```

### 4.6 關於監聽地址（重要）

1Panel 的 OpenResty 跑在容器裡。如果你把 `server.host` 改成 `127.0.0.1`，那是主機的回環地址，**OpenResty 容器存取不到**，反代必然 502。

保持 `0.0.0.0` 即可，安全由防火牆保證：在「主機 → 防火牆」裡**不要放行 8080**，公網就存取不到，只有本機與 docker 網橋能存取。

---

## 5. 建立網站與反向代理（兩條路徑通用）

### 5.1 建立反向代理網站

進入「網站 → 網站 → 建立網站」：

- **類型**：選擇「反向代理」
- **主網域**：`shop.example.com`
- **代理地址**：按你的路徑填
  - 路徑 A（容器編排）：`http://dujiao-next:8080`
  - 路徑 B（二進制守護）：`http://172.17.0.1:8080`

::: danger 最常見的坑：代理地址千萬別填 127.0.0.1
1Panel 的 OpenResty 本身執行在容器中，`http://127.0.0.1:8080` 指的是 **OpenResty 容器自己**，不是主機，結果必然是 `502 Bad Gateway`。

正確寫法：

- 目標是容器 → 填**容器名**（前提是兩者同在 `1panel-network`）
- 目標是主機行程 → 填 **`172.17.0.1`**（docker0 閘道地址）

不確定閘道地址時用 `ip addr show docker0` 查看。
:::

建立完成後，Dujiao-Next 的所有路徑——使用者前臺 `/`、管理後臺 `/<admin_path>`、`/api`、`/uploads`、`/sitemap.xml`、`/robots.txt`——都由這一條反代規則覆蓋，**不需要**像舊版本那樣按路徑分別配置。

### 5.2 申請 SSL 憑證

進入「網站 → 憑證 → 申請憑證」：

- **帳戶**：首次使用需要先建立一個 Acme 帳戶（填郵箱即可）
- **驗證方式**：
  - HTTP 驗證：最簡單，要求網域已解析到本機且 80 連接埠可存取
  - DNS 驗證：支援泛網域，需要填 DNS 服務商 API 金鑰
- 1Panel 會自動處理續簽

### 5.3 開啟 HTTPS

回到「網站 → 你的站點 → 設定 → HTTPS」：

- 打開 HTTPS 開關
- **憑證**：選擇剛申請的憑證
- **HTTP 選項**：選「HTTP 自動跳轉 HTTPS」
- 建議同時開啟 **HSTS**

::: warning 支付回調必須是 HTTPS
大部分支付閘道要求回調地址為 HTTPS 且憑證有效。上線收款前務必先把憑證配好，再去後臺填寫回調地址。詳見 [支付配置與回調指南](/zh-hant/payment/guide)。
:::

### 5.4 調大上傳體積限制

商品圖片、卡密批次匯入檔案可能超過 OpenResty 預設的 1MB 限制，表現為上傳報 `413 Request Entity Too Large`。

在「網站 → 你的站點 → 設定 → 設定檔」裡，在 `server { }` 塊內加一行：

```nginx
client_max_body_size 50m;
```

儲存後面板會自動 reload。部分版本在「基本設定」裡直接提供了上傳限制輸入框，有的話直接改更方便。

### 5.5 真實 IP 透傳

後臺的登入日誌、風控、限流都依賴真實訪客 IP。1Panel 的反向代理預設已經帶上了 `X-Forwarded-For`，若發現後臺記錄的 IP 全是內網地址（如 `172.x.x.x`），到「網站 → 設定 → 真實 IP」裡開啟對應選項。

### 5.6 驗證部署

瀏覽器存取：

- 使用者前臺：`https://shop.example.com`
- 管理後臺：`https://shop.example.com/dj-mgmt-7x9k2`（換成你自己的 `admin_path`）
- 健康檢查：`https://shop.example.com/health`

首次登入用 `admin` / 你在環境變數或 `config.yml` 裡設定的密碼，**登入後立刻改密碼**。

## 6. 升級

### 6.1 路徑 A（容器編排）的升級

在「容器 → 編排 → dujiao-next」中編輯 compose，把映像 tag 改成目標版本：

```yaml
image: dujiaonext/dujiao-next:v1.4.0
```

儲存後點「重新部署」（或在終端執行）：

```bash
cd /opt/1panel/docker/compose/dujiao-next
docker compose pull && docker compose up -d
```

前端隨映像一起更新，不需要額外動作。回滾就是把 tag 改回舊版本再執行一次。

::: tip 後臺會告訴你怎麼做
在容器裡點後臺的「一鍵升級」時，程式會識別出容器環境並直接顯示上面這條命令（可一鍵複製），不會嘗試替換二進制。
:::

### 6.2 路徑 B（二進制守護）的升級

**方式一：後臺一鍵升級（推薦）**

後臺點擊「檢查更新 → 一鍵升級」，程式會：

1. 從 GitHub Release 下載當前平臺對應的歸檔
2. 校驗 sha256
3. 解壓出新二進制
4. 把舊二進制重新命名為 `dujiao-next.backup`，再把新二進制換上去（原子替換）

::: warning 替換完成後需要你手動重啟
程式只在被 **systemd** 託管時才敢自動重啟自己。Supervisor 守護的行程沒有 systemd 的環境標識，後臺會顯示 `can_restart: false` 並提示手動重啟。

到「工具箱 → 行程守護」找到 `dujiao-next`，點「重啟」即可。重啟後重新整理後臺，版本號就變了。
:::

**方式二：手動替換**

```bash
# 1. 在 1Panel「工具箱 → 行程守護」裡停止行程
# 2. 備份
cp -r /opt/dujiao-next/db /opt/dujiao-next/uploads /opt/dujiao-next/config.yml /root/backup/
# 3. 下載新版並覆蓋二進制
cd /opt/dujiao-next
wget -O dujiao.tar.gz https://github.com/dujiao-next/dujiao-next/releases/download/vX.Y.Z/dujiao-next_vX.Y.Z_Linux_x86_64.tar.gz
tar -xzf dujiao.tar.gz dujiao-next
chmod +x dujiao-next
# 4. 回面板啟動行程
```

資料庫遷移在啟動時自動完成。

### 6.3 升級失敗怎麼回滾

後臺提供「回滾」按鈕，會把 `dujiao-next.backup` 換回來。

但如果新版本**根本起不來**，後臺也就打不開了，此時用終端：

```bash
cd /opt/dujiao-next
mv dujiao-next.backup dujiao-next
# 回面板重啟行程守護
```

## 7. 備份

1Panel 的計劃任務是這套部署裡最省心的備份手段。

### 7.1 設定備份帳號

先在「面板設定 → 備份帳號」裡新增一個遠端儲存（本地磁碟、OSS、S3、又拍雲、WebDAV 等）。**強烈建議至少配一個異地儲存**——伺服器炸了本地備份也一起沒了。

### 7.2 建立備份任務

進入「計劃任務 → 建立任務」：

**任務一：備份資料目錄**

- 類型：`備份目錄`
- 目錄：`/opt/dujiao-next`（包含 `config.yml`、`db/`、`uploads/`）
- 週期：每天凌晨
- 保留份數：7

**任務二：備份資料庫（僅 PostgreSQL 方案）**

- 類型：`備份資料庫`
- 選擇 `dujiao_next`
- 週期：每天

**任務三（可選）：健康檢查**

- 類型：`存取 URL`
- URL：`https://shop.example.com/health`
- 週期：每 5 分鐘

::: danger SQLite 備份注意
SQLite 直接複製 `.db` 檔案在有寫入時可能拿到不一致的快照。重要場景建議在備份前先停一下行程，或改用 PostgreSQL 方案。完整策略見 [備份與還原](/zh-hant/deploy/backup)。
:::

## 8. 安全加固清單

部署完對著這張表逐條確認：

- [ ] `jwt.secret`、`user_jwt.secret`、`app.secret_key` 都換成了隨機字串，沒有一個是範本預設值
- [ ] `web.admin_path` 已改掉，不是 `/admin`
- [ ] `server.mode` 是 `release`
- [ ] 預設管理員密碼已在首次登入後修改
- [ ] 防火牆只放行了 80、443、面板連接埠、SSH，**沒有** 8080 / 6379 / 5432
- [ ] compose 裡 Redis / PostgreSQL 沒有寫 `ports`
- [ ] Redis 設定了強密碼
- [ ] HTTPS 已開啟且強制跳轉
- [ ] 1Panel 面板本身改了預設連接埠與安全入口，並開啟了面板的兩步驗證
- [ ] 已設定至少一個異地備份帳號並跑通了一次備份任務

更多細節見 [安全最佳實踐](/zh-hant/guide/security)。

## 9. 常見問題

### Q：存取網域報 502 Bad Gateway

按順序排查：

1. **代理地址是不是填了 `127.0.0.1`？** 這是最常見原因，見第 5.1 節的說明。
2. 容器/行程是不是真的在跑？「容器 → 容器」或「工具箱 → 行程守護」看狀態。
3. 路徑 A：`dujiao-next` 是否加入了 `1panel-network`？用 `docker network inspect 1panel-network` 確認裡面能看到這個容器。
4. 路徑 B：`server.host` 是不是被改成了 `127.0.0.1`？必須是 `0.0.0.0`。
5. 在終端直接測一下後端通不通：

```bash
# 路徑 A
docker exec dujiao-next wget -qO- http://127.0.0.1:8080/health
# 路徑 B
curl http://127.0.0.1:8080/health
```

### Q：後臺地址打開是 404

`config.yml` 的 `web.admin_path` 與你存取的路徑不一致。注意改完這個欄位**必須重啟**程式才生效——路徑是啟動時一次性寫進後臺頁面的。

### Q：啟動日誌裡沒有 `Embedded SPAs` 這一行

說明拿到的二進制不含前端。確認下載的是 Releases 裡的 `dujiao-next_*.tar.gz`，而不是自己 `go build`（不帶 `-tags fullstack`）編譯的產物。

### Q：上傳圖片報 413

OpenResty 的 `client_max_body_size` 太小，見第 5.4 節。

### Q：容器起不來，日誌裡是權限錯誤

`data/` 下的目錄屬主不對。api 容器以非 root 執行，執行：

```bash
chmod -R 0777 /opt/dujiao-next/data/{db,uploads,logs,redis}
```

### Q：Redis 連線失敗

- 路徑 A：`config.yml` 裡 `redis.host` 必須寫成容器名 `redis`，不是 `127.0.0.1`
- 路徑 B：主機行程存取容器化 Redis 要用 `172.17.0.1` 或 `127.0.0.1`（取決於連接埠映射方式），不能寫容器名
- 兩者都要確認密碼與 compose / 應用商店裡設定的一致

### Q：後臺「一鍵升級」按鈕是灰的 / 提示當前部署方式不支援

看後臺顯示的原因碼：

| 原因 | 含義 | 怎麼辦 |
| --- | --- | --- |
| `container` | 偵測到容器環境 | 正常現象，按第 6.1 節拉新映像 |
| `source_build` | 二進制不是官方發行版 | 從 Releases 下載官方壓縮包，不要用自己編譯的 |
| `dir_not_writable` | 程式對自身所在目錄沒有寫權限 | 給執行使用者加上 `/opt/dujiao-next` 的寫權限 |
| `unsupported_os` | 非 Linux / macOS | 手動升級 |

### Q：一鍵升級完成了，但版本號沒變

正常——二進制已經換了，但行程還是舊的。到「工具箱 → 行程守護」點「重啟」，見第 6.2 節。

### Q：面板裡刪除了編排，資料還在嗎

本文把資料放在 `/opt/dujiao-next`（編排目錄之外），所以刪編排不會丟資料，重新建立編排即可恢復。如果你把資料掛在了 `/opt/1panel/docker/compose/dujiao-next/` 下，那刪除編排會一併刪掉——這正是第 3.1 節要求獨立建目錄的原因。

## 10. 相關文檔

- [部署總覽與選型建議](/zh-hant/deploy/)
- [Docker Compose 部署](/zh-hant/deploy/docker-compose)（compose 參數的完整說明）
- [單二進制部署](/zh-hant/deploy/binary)（二進制方式的完整說明）
- [config.yml 詳細說明](/zh-hant/config/config-yml)
- [升級與遷移](/zh-hant/deploy/upgrade)
- [備份與還原](/zh-hant/deploy/backup)
- [安全最佳實踐](/zh-hant/guide/security)
