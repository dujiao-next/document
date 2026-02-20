# 社区共享项目

> 更新日期：2026-02-17

本文档用于介绍社区共享项目的提交规范，并展示当前已收录的社区项目集合。

## 0. 仓库地址

- 社区仓库：https://github.com/dujiao-next/community-projects
- 提交 PR：https://github.com/dujiao-next/community-projects/pulls
- 提交 Issue：https://github.com/dujiao-next/community-projects/issues

## 1. 项目作用

`community-projects` 目录用于收录社区第三方贡献内容，核心目标：

1. 降低二次开发门槛，沉淀可复用实践
2. 让模板、脚本、工具、教程形成可检索的统一集合
3. 帮助新用户快速找到可直接落地的社区方案

## 2. 分类与收录范围

| 分类 | 目录 | 说明 |
| --- | --- | --- |
| 脚本类 | `community-projects/scripts/` | 部署脚本、自动化脚本、迁移脚本 |
| 模板类 | `community-projects/templates/` | 前台模板、页面模板、样式方案 |
| 工具类 | `community-projects/tools/` | CLI、插件、辅助工具、配套程序 |
| 教程类 | `community-projects/wikis/` | 教程文档、最佳实践、排障说明 |

## 3. 提交规范（摘要）

每个社区项目至少满足以下要求：

1. 必须包含 `README.md`（项目简介、安装、配置、使用示例、FAQ）
2. 必须包含 `LICENSE`（推荐 MIT / Apache-2.0 / GPL-3.0）
3. 必须说明适配的 Dujiao-Next 版本与运行依赖
4. 必须通过本地可复现验证
5. 必须按 PR 模板完整填写用途、依赖与自测结果

## 4. 提交流程

1. Fork 社区仓库（`dujiao-next/community-projects`）并创建分支
2. 在目标分类目录下新增项目目录
3. 补齐 README、LICENSE 与必要文件
4. 本地验证通过后提交 PR
5. 等待维护者审核并根据反馈调整

## 5. 社区项目集合

> 说明：以下列表用于展示已收录项目。  
> 新项目合并后，请同步更新本节。

| 项目名 | 分类 | 简介 | 维护者 | 状态 |
| --- | --- | --- | --- | --- |
| （待收录） | - | 当前暂无公开收录项目，欢迎提交你的第一个社区项目。 | - | Pending |

## 6. 维护约定

1. 新项目合并后需同步更新本页面“社区项目集合”
2. 项目废弃或停止维护时，需更新状态并补充说明
3. 对侵权、不可公开分发或文档缺失项目，维护者可拒绝收录或下架
