# Dujiao-Next Documentation

This repository contains the official documentation site for **Dujiao-Next**, built with **VitePress**.

## Website

- Production docs: https://dujiao-next.com
- GitHub (docs): https://github.com/dujiao-next/document
- GitHub (main API project): https://github.com/dujiao-next/dujiao-next
- GitHub (user frontend): https://github.com/dujiao-next/user
- GitHub (admin frontend): https://github.com/dujiao-next/admin

## Tech Stack

- Node.js
- VitePress

## Local Development

```bash
npm install
npm run docs:dev
```

Default local URL: `http://localhost:5173`

## Build

```bash
npm run docs:build
```

The static files will be generated in `docs/.vitepress/dist`.

## Docker

Build image:

```bash
docker build -t dujiaonext/docs:latest .
```

Run container:

```bash
docker run --rm -p 8082:80 dujiaonext/docs:latest
```

Then open `http://localhost:8082`.
