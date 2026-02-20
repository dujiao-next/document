# 社群共享專案

> 更新時間：2026-02-17

本文檔用於說明社群共享專案的提交規範，並展示目前已收錄的社群專案集合。

## 倉庫地址

- 社群倉庫：https://github.com/dujiao-next/community-projects
- 提交 PR：https://github.com/dujiao-next/community-projects/pulls
- 提交 Issue：https://github.com/dujiao-next/community-projects/issues

## 1. 專案作用

`community-projects` 目錄用於收錄社群第三方貢獻內容，核心目標：

1. 降低二次開發門檻，沉澱可復用實踐
2. 讓模板、腳本、工具、教學形成可檢索的統一集合
3. 幫助新使用者快速找到可直接落地的社群方案

## 2. 分類與收錄範圍

| 分類 | 目錄 | 說明 |
| --- | --- | --- |
| 腳本類 | `community-projects/scripts/` | 部署腳本、自動化腳本、遷移腳本 |
| 模板類 | `community-projects/templates/` | 前臺模板、頁面模板、樣式方案 |
| 工具類 | `community-projects/tools/` | CLI、外掛、輔助工具、配套程式 |
| 教學類 | `community-projects/wikis/` | 教學文件、最佳實踐、排障說明 |

## 3. 提交規範（摘要）

每個社群專案至少需滿足以下要求：

1. 必須包含 `README.md`（專案簡介、安裝、設定、使用示例、FAQ）
2. 必須包含 `LICENSE`（建議 MIT / Apache-2.0 / GPL-3.0）
3. 必須說明適配的 Dujiao-Next 版本與執行依賴
4. 必須可在本地重現與驗證
5. 必須依 PR 模板完整填寫用途、依賴與自測結果

## 4. 提交流程

1. Fork 社群倉庫（`dujiao-next/community-projects`）並建立分支
2. 在目標分類目錄下新增專案目錄
3. 補齊 README、LICENSE 與必要檔案
4. 本地驗證通過後提交 PR
5. 等待維護者審核並依回饋調整

## 5. 社群專案集合

> 說明：以下列表用於展示已收錄專案。  
> 新專案合併後，請同步更新本節。

| 專案名 | 分類 | 簡介 | 維護者 | 狀態 |
| --- | --- | --- | --- | --- |
| （待收錄） | - | 目前暫無公開收錄專案，歡迎提交你的第一個社群專案。 | - | Pending |

## 6. 維護約定

1. 新專案合併後需同步更新本頁「社群專案集合」
2. 專案廢棄或停止維護時，需更新狀態並補充說明
3. 對侵權、不可公開散布或文件缺失專案，維護者可拒絕收錄或下架
