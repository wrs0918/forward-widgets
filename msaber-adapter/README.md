# Forward MSaber Adapter

This service lets Forward's MoviePilot-style server subscription feature talk to MSaber through a small adapter.

The adapter has two jobs:

1. Accept MoviePilot-like requests from Forward and normalize the media payload.
2. Forward the normalized payload to MSaber, or run in dry-run mode and log requests while you confirm the real MSaber subscription endpoint.

## Why An Adapter

Forward currently documents server subscription integration for MoviePilot. MSaber has API key based access, but the public docs do not clearly document a stable "create subscription" endpoint. This adapter bridges that gap and logs the exact requests Forward sends.

## Quick Start On NAS

```bash
cd msaber-adapter
docker compose up -d --build
```

Default URL:

```text
http://NAS_IP:8088
```

Health check:

```bash
curl http://NAS_IP:8088/health
```

## First Run: Dry Run Mode

Keep this in `docker-compose.yml`:

```yaml
DRY_RUN: "true"
```

Then put the adapter URL into Forward's server subscription settings, using the adapter as the MoviePilot server URL.

After testing add/cancel subscription in Forward, inspect:

```text
msaber-adapter/data/requests.jsonl
msaber-adapter/data/mappings.json
```

These files show which endpoints Forward called and which payload fields it sent.

## Connect To MSaber

After you confirm MSaber's real subscription endpoint from browser DevTools, set:

```yaml
DRY_RUN: "false"
MSABER_BASE_URL: "http://YOUR_MSABER_HOST:PORT"
MSABER_API_KEY: "your-api-key"
MSABER_API_KEY_HEADER: "apiKey"
MSABER_SUBSCRIBE_PATH: "/api/..."
MSABER_DELETE_PATH: "/api/..."
```

Then restart:

```bash
docker compose up -d --build
```

## Optional Security

If this adapter is exposed outside your LAN, set:

```yaml
ADAPTER_TOKEN: "a-long-random-token"
```

Forward must then send one of these headers:

```text
Authorization: Bearer a-long-random-token
x-adapter-token: a-long-random-token
```

If Forward cannot set custom headers, keep the adapter inside your LAN or behind a reverse proxy that adds the token.

## Supported Payload Fields

The adapter tries to normalize common MoviePilot/Forward fields:

```text
title, name, year, type, media_type, tmdbid, tmdb_id, imdbid, imdb_id,
season, season_number, episode, episode_number, poster, cover
```

Unknown requests are still logged and return a success JSON response so you can inspect and add compatibility without breaking Forward immediately.
