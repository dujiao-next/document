# Migrate from Legacy Version

If you were previously using the legacy dujiaoka, you can use the community migration tool to migrate your data to Dujiao-Next.

## Migration Tool

- **Repository**: [dujiao-migrate](https://github.com/luoyanglang/dujiao-migrate)
- **Language**: Go
- **License**: GPL-3.0

## Supported Data

| Data Type | Description |
|-----------|-------------|
| Categories | Product categories, auto-generates pinyin slugs |
| Products | Title, description, price, tags, images, form config |
| Card Secrets | Unused card secrets, batch import |

## Features

- Chinese names auto-converted to pinyin slugs
- Proper UTF-8 encoding, no garbled text
- Local image auto-upload support
- Incremental migration, safe to run multiple times
- Auto slug conflict resolution with suffix retry
- Batch card secret import (default 500 per batch)
- CLI arguments and YAML config file support

## Quick Start

### Download

Download the binary for your platform from the [Releases](https://github.com/luoyanglang/dujiao-migrate/releases) page.

Supported platforms: Linux (amd64/arm64), macOS (amd64/arm64), Windows (amd64)

### Usage

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

### Image Migration

If the legacy site is on the same server, specify the site path to auto-upload images:

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

## Notes

- Back up your new database before migration
- Test in a staging environment first
- Safe to run multiple times, existing data is automatically skipped

For more details, see the [dujiao-migrate README](https://github.com/luoyanglang/dujiao-migrate#readme).
