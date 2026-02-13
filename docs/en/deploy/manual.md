# Manual Deployment (API / User / Admin)

> Last updated: 2026-02-11

This document is intended for developers who want full control over the deployment process and is divided into two parts: "Build" and "Run".

## 1. Obtaining the Source Code

```bash
mkdir dujiao-next && cd dujiao-next

# API (main repository)
git clone https://github.com/dujiao-next/dujiao-next.git api

# User (frontend)
git clone https://github.com/dujiao-next/user.git user

# Admin (admin panel)
git clone https://github.com/dujiao-next/admin.git admin
```
> If you are currently using the legacy single-repository directory (`web/`), please replace `user/` below with `web/`.

## 2. Backend API Deployment

### 2.1 Install Dependencies and Build

```bash
cd api
go mod tidy
go build -o dujiao-api ./cmd/server
```
### 2.2 Configuration File

```bash
cp config.yml.example config.yml
# Update config.yml for your environment
```
At a minimum, the key items must be confirmed:

- `server.mode` (debug/release)
- `database.driver` / `database.dsn`
- `jwt.secret` / `user_jwt.secret`
- `redis`, `queue`, `email` (enable as needed)

> ⚠️ Important security reminder: Before going live, you must change `jwt.secret` and `user_jwt.secret`, and use a high-strength random string of at least 32 characters.
>
> Never use the template defaults, as it may lead to token forgery and pose serious security risks.

### 2.3 Initialize Data (Optional)

```bash
go run ./cmd/seed
```
### 2.4 Running the API

```bash
./dujiao-api
```
Default listening: `http://0.0.0.0:8080`

### 2.5 Default Admin Account (Initial Setup)

When the `admins` table in the database is empty, the system will attempt to create a default admin the first time the API starts:

- Default username: `admin`
- Default password: `admin123`

> Strongly recommended: After logging into the admin panel for the first time, immediately change to a strong password under "Admin -> Change Password".

Notes:

- You can override the default values by setting environment variables before starting the API:
  - `DJ_DEFAULT_ADMIN_USERNAME`
  - `DJ_DEFAULT_ADMIN_PASSWORD`
- If `server.mode=release` and `DJ_DEFAULT_ADMIN_PASSWORD` is not set, the system will skip default admin initialization (it will not automatically create `admin/admin123`).

## 3. User Frontend Deployment

### 3.1 Install Dependencies and Build

```bash
cd ../user
npm install
npm run build
```
Build output directory: `user/dist`

### 3.2 Running Method

You can choose to:

- Serve `user/dist` with Nginx
- Or temporarily use `npm run preview` for verification

## 4. Admin Backend Deployment

### 4.1 Install Dependencies and Build

```bash
cd ../admin
npm install
npm run build
```
Build output directory: `admin/dist`

### 4.2 Running Methods

You can choose to:

- Host `admin/dist` with Nginx (recommended to bind to the `/admin` path)
- Or temporarily use `npm run preview` for verification

## 5. Nginx Reverse Proxy Recommendations (Same-Origin Mode)

It is recommended to use a same-origin proxy mode: both User and Admin frontends send requests to `/api` and `/uploads`, which are forwarded by the outer Nginx to the API service (`127.0.0.1:8080`).

### 5.1 Example of Subdomain Deployment (Recommended)

- Frontend: `user.example.com` → `user/dist`
- Admin: `admin.example.com` → `admin/dist`

```nginx
# User frontend
server {
    listen 80;
    server_name user.example.com;

    root /var/www/dujiao-next/user/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin frontend
server {
    listen 80;
    server_name admin.example.com;

    root /var/www/dujiao-next/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
### 5.2 Single Domain `/admin` Subpath Example (Optional)

```nginx
server {
    listen 80;
    server_name shop.example.com;

    root /var/www/dujiao-next/user/dist;
    index index.html;

    # User frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Admin frontend
    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        alias /var/www/dujiao-next/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Also recommended:

- Bind separate domains for the frontend and backend (for clarity)
- Enable HTTPS and enforce redirect to 443
- Frontend SPA routing must retain `try_files ... /index.html`

## 6. Suggestions for Start, Stop, and Upgrade

- It is recommended to manage the API with `systemd` / `supervisor`
- When releasing, execute in order:
  1. Stop the API
  2. Update the code and rebuild
  3. Replace `user/dist` and `admin/dist`
  4. Start the API
  5. Check the health endpoint: `GET /health`