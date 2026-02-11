# Docker Compose 部署（Docker Hub 镜像）

> 更新时间：2026-02-11

## 1. 镜像对应关系

- API：`dujiaonext/api:tagname`
- User（用户前台）：`dujiaonext/user:tagname`
- Admin（后台）：`dujiaonext/admin:tagname`

## 2. 准备部署目录

```bash
mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs}
cd /opt/dujiao-next
```

目录说明：

- `config/`：API 配置文件（`config.yml`）
- `data/db`：数据库目录
- `data/uploads`：上传文件目录
- `data/logs`：API 日志目录

## 3. 准备 API 配置文件

API 容器默认会读取 `/app/config.yml`，请先准备配置文件：

```bash
curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

然后按你的实际环境修改 `./config/config.yml`（至少检查数据库、JWT、邮件、支付回调地址等配置）。

## 4. 编写 `.env`

在 `/opt/dujiao-next/.env` 新建环境变量文件：

```env
TAG=latest
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082

# 首次初始化管理员（可按需修改）
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123
```

## 5. 编写 `docker-compose.yml`

在 `/opt/dujiao-next/docker-compose.yml` 写入：

```yaml
services:
  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "${API_PORT}:8080"
    volumes:
      - ./config/config.yml:/app/config.yml:ro
      - ./data/db:/app/db
      - ./data/uploads:/app/uploads
      - ./data/logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  user:
    image: dujiaonext/user:${TAG}
    container_name: dujiaonext-user
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${USER_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

  admin:
    image: dujiaonext/admin:${TAG}
    container_name: dujiaonext-admin
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${ADMIN_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

networks:
  dujiao-net:
    driver: bridge
```

## 6. 外层 Nginx 反向代理（必需）

`user` 与 `admin` 采用同源 `/api`、`/uploads` 访问后端，因此你需要在最外层网关（Nginx/Ingress）配置反向代理。

示例：

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:${API_PORT}/api/;
}

location /uploads/ {
  proxy_pass http://127.0.0.1:${API_PORT}/uploads/;
}
```

如果没有这两条代理，User/Admin 页面虽然能打开，但接口与上传文件会访问失败。

## 7. 启动与运维命令

启动：

```bash
docker compose up -d
```

查看状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f api
docker compose logs -f user
docker compose logs -f admin
```

停止与删除容器：

```bash
docker compose down
```

### 7.1 默认后台管理员账号（首次初始化）

当数据库中 `admins` 表为空，且 API 首次启动时，会使用以下默认管理员：

- 默认账号：`admin`
- 默认密码：`admin123`

> 强烈建议：首次登录后台后立即修改密码。

若你希望部署时就使用自定义管理员，请在 `.env` 中改写：

- `DJ_DEFAULT_ADMIN_USERNAME`
- `DJ_DEFAULT_ADMIN_PASSWORD`

并保持 `docker-compose.yml` 中 `api` 服务已注入上述环境变量。

## 8. 升级与回滚

升级：

1. 修改 `.env` 中 `TAG` 为目标版本（例如 `v1.0.3`）
2. 执行 `docker compose pull`
3. 执行 `docker compose up -d`

回滚：

1. 将 `TAG` 改回历史版本
2. 执行 `docker compose up -d`

## 9. 访问与联通性检查

- API：`http://服务器IP:${API_PORT}/health`
- User：`http://服务器IP:${USER_PORT}`
- Admin：`http://服务器IP:${ADMIN_PORT}`

如果 User/Admin 能打开但接口报错，优先检查：

1. 外层网关是否已配置 `/api`、`/uploads` 反向代理
2. API 容器是否健康（`docker compose ps`）
