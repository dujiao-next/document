# 部署總覽與選型建議

> 更新時間：2026-07-26

如果你還沒決定使用哪種部署方式，先看這頁，再進入對應教程。

## 1. 從 v1.4.0 起：一個行程跑完整服務

自 v1.4.0 起，用戶前臺與管理後臺的前端已經透過 `go:embed` 打進後端二進制。這代表：

- **只需要部署一個程式**，不再分別部署 api / user / admin 三端
- **只需要一個埠**（默認 8080），用戶前臺在 `/`，管理後臺在 `web.admin_path`（默認 `/admin`）
- **只需要一個網域**，不再需要給前臺和後臺各準備一個網域
- 不再需要 nginx 託管前端靜態檔案，反向代理只需把整個網域轉發到這一個埠

如果你在使用 v1.3.x 及更早版本的三端分離部署，升級方式見 [升級與遷移](/zh-hant/deploy/upgrade)。

## 2. 推薦起步方式

- 完全新手 / 不想用 Docker：從 [單二進制部署](/zh-hant/deploy/binary) 開始（最簡單）。
- 希望標準化、可重複部署：從 [Docker Compose 部署](/zh-hant/deploy/docker-compose) 開始。
- 已在使用 aaPanel/寶塔面板：直接查看 [aaPanel 部署](/zh-hant/deploy/aapanel)。
- 需要原始碼級改造或本地建置：使用 [手動部署](/zh-hant/deploy/manual)。

## 3. 如何選擇部署方式

| 方式 | 上手難度 | 適合人群 | 核心特點 | 入口文件 |
| --- | --- | --- | --- | --- |
| 單二進制 | 低 | 完全新手 / 不想接觸 Docker | 下載解壓縮即跑，無需編譯 | [單二進制部署](/zh-hant/deploy/binary) |
| Docker Compose | 中 | 希望標準化、可重複部署的使用者 | 單映像檔 + Redis，升級回滾清晰 | [Docker Compose 部署](/zh-hant/deploy/docker-compose) |
| aaPanel 部署 | 低-中 | 已在使用寶塔面板的使用者 | 面板化操作，適合可視化運維 | [aaPanel 部署](/zh-hant/deploy/aapanel) |
| 手動部署（源碼構建） | 高 | 需要深度客製化、二次開發的使用者 | 控制粒度最高，適合進階運維/開發 | [手動部署](/zh-hant/deploy/manual) |

無論選哪種，最終執行的都是同一個內嵌前端的二進制，差別只在於「怎麼拿到它」和「由誰守護行程」。

## 4. 部署前準備清單

- 準備 Linux 伺服器與一個可解析到公網 IP 的網域（**一個就夠**）
- 規劃埠號（默認只需要 8080 一個）
- 在 `config.yml` 中設置強隨機密鑰：
  - `jwt.secret`
  - `user_jwt.secret`
- 修改後臺入口路徑 `web.admin_path`，不要沿用默認的 `/admin`
- 決定資料方案：
  - 輕量場景：SQLite + Redis
  - 生產建議：PostgreSQL + Redis
- 規劃默認管理員初始化方式（二選一）：
  - 環境變量：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`：`bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 5. 部署完成後建議

1. 先檢查服務狀態：
   - API 健康檢查：`/health`
   - 用戶前臺 `/` 與管理後臺 `/<web.admin_path>` 是否都能開啟
2. 首次登入後臺後立即修改管理員密碼。
3. 配置支付參數與回調地址（見 [支付配置與回調指南](/zh-hant/payment/guide)）。
4. 配置 HTTPS（依你的部署方式在反向代理、面板或容器入口層完成）。
