---
outline: deep
---

# FAQ

> Updated: 2026-03-28

---

## 1. Deployment & Startup

### Q: Port already in use on startup

Check whether the port configured in `config.yml` under `server.port` (default 8080) is occupied by another process:

```bash
lsof -i :8080
```

Change the port or stop the conflicting process, then restart.

### Q: Cannot access the app after Docker container starts

1. Verify the container is running: `docker compose ps`
2. Check that port mappings are correct
3. View container logs: `docker compose logs -f dujiao-next`
4. Confirm your firewall allows traffic on the mapped port

### Q: What is the admin account after first startup?

Configure the initial admin account in the `bootstrap` section of `config.yml`:

```yaml
bootstrap:
  default_admin_username: admin
  default_admin_password: your-password
```

The account is created automatically on first startup. If the service has already been started, changing this configuration will have no effect -- you will need to update the credentials directly in the database.

---

## 2. Database

### Q: SQLite concurrent write error "database is locked"

SQLite does not support concurrent writes. Solutions:

1. **Set connection pool to 1** (recommended):
   ```yaml
   database:
     driver: sqlite
     pool:
       max_open_conns: 1
       max_idle_conns: 1
   ```
2. If you expect higher concurrency, switch to PostgreSQL

### Q: How to migrate from SQLite to PostgreSQL

1. Export your SQLite data
2. Update the database configuration in `config.yml`:
   ```yaml
   database:
     driver: postgres
     dsn: "host=127.0.0.1 user=dujiao password=xxx dbname=dujiao port=5432 sslmode=disable"
   ```
3. Restart the service -- tables will be created automatically
4. Import the data into PostgreSQL

> It is recommended to migrate to PostgreSQL early if your site handles significant traffic.

### Q: What are the recommended PostgreSQL connection pool settings?

Recommended configuration:

```yaml
database:
  driver: postgres
  pool:
    max_open_conns: 25
    max_idle_conns: 10
    conn_max_lifetime_seconds: 3600
    conn_max_idle_time_seconds: 600
```

Adjust `max_open_conns` based on your actual concurrency level.

---

## 3. Redis

### Q: Redis connection failure

1. Verify Redis is running: `redis-cli ping`
2. Check the Redis address, port, and password in `config.yml`
3. If using Docker, confirm network connectivity between containers
4. Check whether Redis has `requirepass` set and that the password matches

### Q: Can I run without Redis?

Redis is used for caching and the async task queue. You can disable it in `config.yml`:

```yaml
redis:
  enabled: false
queue:
  enabled: false
```

> Disabling Redis will make the following features unavailable: login rate limiting, automatic card key delivery (async), order timeout cancellation (async), notification push (async), affiliate commission confirmation (scheduled), and upstream inventory sync (scheduled). It is recommended to keep Redis enabled in production.

---

## 4. Payments

### Q: Customer paid successfully but the order status did not update

Troubleshoot in the following order:

1. **Callback URL**: Verify that the `notify_url` / `callback_url` configured for the payment channel is correct
2. **Public accessibility**: Ensure the callback URL is reachable by the payment platform (it cannot be localhost)
3. **HTTPS**: Some payment platforms require HTTPS for callback URLs
4. **Payment platform logs**: Check the callback delivery records and response status in the payment platform dashboard
5. **Application logs**: Review the backend logs for incoming callback requests and any processing errors

### Q: Payment page or QR code fails to load

1. Verify the merchant parameters for the payment channel are correct
2. Check that the gateway URL (`gateway_url`) is correct
3. Confirm the payment channel is enabled
4. Check the backend logs for specific error messages

### Q: PayPal / Stripe Webhook not working

1. Ensure the Webhook URL includes the `channel_id` parameter:
   - PayPal: `/api/v1/payments/webhook/paypal?channel_id=YOUR_CHANNEL_ID`
   - Stripe: `/api/v1/payments/webhook/stripe?channel_id=YOUR_CHANNEL_ID`
2. Verify the Webhook URL is correctly configured in the payment platform dashboard
3. Confirm that `webhook_id` (PayPal) or `webhook_secret` (Stripe) has been filled in

---

## 5. Email

### Q: Email sending fails

1. Check that email is enabled in admin settings first. Persisted admin settings override `config.yml`; `email.enabled` is only the fallback when no admin value has been saved
2. Check that the SMTP settings are correct (host, port, username, password)
3. Ensure SSL/TLS settings match your email provider's requirements:
   - Port 465 typically uses `use_ssl: true`
   - Port 587 typically uses `use_tls: true`
4. Use the "Send Test Email" button in Admin Panel > Settings > SMTP Email to verify
5. Check that the sender address (from) matches the email account

### Q: Verification code emails are not received

1. Check whether the email ended up in the spam folder
2. Confirm the send interval (`send_interval_seconds`, default 60 seconds) has elapsed
3. Confirm the send count has not exceeded the limit (`max_attempts`, default 5)
4. Check the backend logs to verify whether the email was sent successfully

---

## 6. Card Keys & Delivery

### Q: Automatic delivery failed with "out of stock"

1. Check the available card key count for the product/SKU in the admin panel
2. If stock is insufficient, import more card keys and then manually trigger delivery from the order
3. Enable low-stock alert notifications to replenish card keys proactively

### Q: CSV card key import fails

1. Confirm the CSV file contains a `secret` column header (case-insensitive)
2. Confirm the file encoding is UTF-8
3. Confirm each row contains only one card key entry
4. Check for empty rows or formatting errors

---

## 7. Frontend

### Q: Storefront shows API errors

1. In development, confirm the backend service is running (default localhost:8080)
2. Verify the Vite dev server proxy is configured correctly (`/api` proxied to the backend)
3. In production, confirm the Nginx reverse proxy configuration is correct

### Q: Blank page after production build

1. Confirm the build command completed successfully (`npm run build`)
2. Confirm the Nginx `root` directive points to the correct build output directory
3. Confirm `try_files` is configured correctly (SPAs need all routes to fall back to `index.html`)
