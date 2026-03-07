# 從舊版遷移資料

如果你之前使用的是舊版獨角數卡 (dujiaoka)，可以使用社區提供的遷移工具將資料遷移到 Dujiao-Next。

## 遷移工具

- **倉庫**: [dujiao-migrate](https://github.com/luoyanglang/dujiao-migrate)
- **語言**: Go
- **協議**: GPL-3.0

## 支援遷移的資料

| 資料類型 | 說明 |
|---------|------|
| 分類 | 商品分類，自動生成拼音 slug |
| 商品 | 標題、描述、價格、標籤、圖片、表單配置 |
| 卡密 | 未使用的卡密，批量匯入 |

## 功能特性

- 中文名稱自動轉拼音生成 slug
- UTF-8 編碼正確處理，中文零亂碼
- 支援本地圖片自動上傳
- 增量遷移，可重複執行
- slug 衝突自動加後綴重試
- 卡密批量匯入（預設 500 條/批）
- 支援命令列參數和 YAML 配置檔

## 快速開始

### 下載

從 [Releases](https://github.com/luoyanglang/dujiao-migrate/releases) 頁面下載對應平台的二進位檔案。

支援平台：Linux (amd64/arm64)、macOS (amd64/arm64)、Windows (amd64)

### 使用

```bash
./dujiao-migrate \
  --old-host 127.0.0.1 \
  --old-port 3306 \
  --old-user root \
  --old-password your_password \
  --old-database dujiaoka \
  --new-api http://127.0.0.1:8080/api/v1/admin \
  --new-user admin \
  --new-password admin123
```

### 圖片遷移

如果舊版站點在同一台伺服器上，指定站點路徑即可自動上傳圖片：

```bash
./dujiao-migrate \
  --old-host 127.0.0.1 \
  --old-user root \
  --old-password your_password \
  --old-database dujiaoka \
  --new-api http://127.0.0.1:8080/api/v1/admin \
  --new-user admin \
  --new-password admin123 \
  --old-site-path /www/wwwroot/dujiaoka
```

## 注意事項

- 遷移前請備份新版資料庫
- 建議先在測試環境驗證
- 支援多次執行，自動跳過已存在資料

更多詳情請參考 [dujiao-migrate README](https://github.com/luoyanglang/dujiao-migrate#readme)。
