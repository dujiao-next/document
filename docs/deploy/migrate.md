# 从老版迁移数据

如果你之前使用的是老版独角数卡 (dujiaoka)，可以使用社区提供的迁移工具将数据迁移到 Dujiao-Next。

## 迁移工具

- **仓库**: [dujiao-migrate](https://github.com/luoyanglang/dujiao-migrate)
- **语言**: Go
- **协议**: GPL-3.0

## 支持迁移的数据

| 数据类型 | 说明 |
|---------|------|
| 分类 | 商品分类，自动生成拼音 slug |
| 商品 | 标题、描述、价格、标签、图片、表单配置 |
| 卡密 | 未使用的卡密，批量导入 |

## 功能特性

- 中文名称自动转拼音生成 slug
- UTF-8 编码正确处理，中文零乱码
- 支持本地图片自动上传
- 增量迁移，可重复运行
- slug 冲突自动加后缀重试
- 卡密批量导入（默认 500 条/批）
- 支持命令行参数和 YAML 配置文件

## 快速开始

### 下载

从 [Releases](https://github.com/luoyanglang/dujiao-migrate/releases) 页面下载对应平台的二进制文件。

支持平台：Linux (amd64/arm64)、macOS (amd64/arm64)、Windows (amd64)

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

### 图片迁移

如果老版站点在同一台服务器上，指定站点路径即可自动上传图片：

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

## 注意事项

- 迁移前请备份新版数据库
- 建议先在测试环境验证
- 支持多次运行，自动跳过已存在数据

更多详情请参考 [dujiao-migrate README](https://github.com/luoyanglang/dujiao-migrate#readme)。
