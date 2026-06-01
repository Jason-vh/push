# exe.dev deployment — push

Production is live at:

```text
https://push.vhtm.eu
```

Hosted on the shared `vhtm-eu` VM. The arch + conventions live in
<https://github.com/Jason-vh/vhtm.eu>. This file is just the per-app
runbook.

## Architecture

```text
client
  -> https://push.vhtm.eu
  -> exe.dev edge (TLS termination)
  -> vhtm-eu VM :8080
  -> Caddy (host-matched via apps/push/deploy/caddy.snippet)
  -> 127.0.0.1:3001
  -> push app container (Next.js)
  -> shared Postgres on the apps-net Docker network (DB: push_padel)
```

## Files in this directory

| File | Purpose |
|---|---|
| `caddy.snippet` | Routing for `push.vhtm.eu` → `127.0.0.1:3001`. Imported by `/etc/caddy/Caddyfile` via `apps/*/deploy/caddy.snippet`. |
| `env.production.example` | Shape of `.env.production` (written by CI from secrets, not committed). |
| `README.md` | This file. |

## One-time exe.dev / DNS setup

```bash
# Register the hostname with the exe.dev edge:
ssh exe.dev domain add vhtm-eu push.vhtm.eu

# DNS at Porkbun:
#   push.vhtm.eu  CNAME  vhtm-eu.exe.xyz
```

## GitHub Actions secrets

| Secret | Source |
|---|---|
| `POSTGRES_PASSWORD` | Password for the `push` role in the shared Postgres. Set once when the DB was created (see <https://github.com/Jason-vh/vhtm.eu/blob/main/infra/postgres/README.md>). |

## Deploy

Every push to `main`:

1. Runs on the self-hosted runner labeled `push-prod`.
2. Writes `.env.production` from GitHub Actions secrets.
3. Copies the checkout into `/home/exedev/apps/push`.
4. `docker compose up -d --build` from that stable directory.
5. `caddy validate` + `systemctl reload caddy` so any change to
   `deploy/caddy.snippet` takes effect.
6. Prisma migrations apply at app startup via `npm start`.

`APP_URL` matters for passkeys. Passkeys are origin-bound, so production
sign-in/sign-up must happen on `https://push.vhtm.eu`.

## Operations

```bash
ssh vhtm-eu.exe.xyz
cd /home/exedev/apps/push

# Container status:
docker compose ps

# App logs:
docker compose logs -f app

# Restart app:
docker compose restart app

# Open a DB shell as the push role:
docker compose -f /home/exedev/infra/postgres/docker-compose.yml exec postgres \
  psql -U push -d push_padel

# Run Prisma migrations manually if needed:
docker compose exec app npx prisma migrate deploy
```

## Database

This app has one database in the shared Postgres instance, owned by the
`push` role:

```text
host: postgres (over the apps-net Docker network)
db:   push_padel
user: push
```

DB administration runbooks (create, dump, restore) live with the shared
instance: <https://github.com/Jason-vh/vhtm.eu/blob/main/infra/postgres/README.md>.

## Public site check

```bash
curl -I https://push.vhtm.eu
```
