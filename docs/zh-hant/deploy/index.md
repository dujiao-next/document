# 部署總覽與選型建議

> 更新時間：2026-03-13

如果你還沒決定使用哪種部署方式，先看這頁，再進入對應教程。

## 1. 推薦起步方式

目前官方文件僅保留可直接核驗的正式部署方案，建議依照你的環境直接進入對應教程：

- 第一次部署，且希望長期穩定維護：從 [Docker Compose 部署](/zh-hant/deploy/docker-compose) 開始。
- 已在使用 aaPanel/寶塔面板：直接查看 [aaPanel 手動部署](/zh-hant/deploy/aapanel)。
- 需要原始碼級改造或本地建置：使用 [手動部署](/zh-hant/deploy/manual)。

## 2. 如何選擇部署方式

| 方式 | 上手難度 | 適合人群 | 核心特點 | 入口文件 |
| --- | --- | --- | --- | --- |
| Docker Compose | 中 | 希望標準化、可重複部署的使用者 | 容器隔離、升級回滾清晰、便於自動化 | [Docker Compose 部署](/zh-hant/deploy/docker-compose) |
| aaPanel 手動部署 | 低-中 | 已在使用寶塔面板的使用者 | 面板化操作，適合可視化運維 | [aaPanel 手動部署](/zh-hant/deploy/aapanel) |
| 手動部署（源碼構建） | 高 | 需要深度客製化、二次開發的使用者 | 控制粒度最高，適合進階運維/開發 | [手動部署](/zh-hant/deploy/manual) |

## 3. 部署前準備清單

- 準備 Linux 伺服器與可解析到公網 IP 的網域（同源或分網域皆可）
- 規劃埠號（至少 API 埠 + Web 埠）
- 在 `config.yml` 中設置強隨機密鑰：
  - `jwt.secret`
  - `user_jwt.secret`
- 決定資料方案：
  - 輕量場景：SQLite + Redis
  - 生產建議：PostgreSQL + Redis
- 規劃默認管理員初始化方式（二選一）：
  - 環境變量：`DJ_DEFAULT_ADMIN_USERNAME` / `DJ_DEFAULT_ADMIN_PASSWORD`
  - `config.yml`：`bootstrap.default_admin_username` / `bootstrap.default_admin_password`

## 4. 推薦路徑

- 你是新手：優先 Docker Compose；若已在寶塔環境可直接看 aaPanel 文檔。
- 你要長期穩定運維：優先 Docker Compose。
- 你要深度改造或本地構建：使用手動部署。

## 5. 部署完成後建議

1. 先檢查服務狀態：
   - API 健康檢查：`/health`
   - User / Admin 頁面是否可訪問
2. 首次登入後臺後立即修改管理員密碼。
3. 配置支付參數與回調地址（見 [支付配置與回調指南](/zh-hant/payment/guide)）。
4. 配置 HTTPS（依你的部署方式在反向代理、面板或容器入口層完成）。
