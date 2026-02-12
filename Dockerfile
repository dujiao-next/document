# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run docs:build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/docs/.vitepress/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
