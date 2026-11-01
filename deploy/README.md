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

| File                     | Purpose                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `caddy.snippet`          | Routing for `push.vhtm.eu` → `127.0.0.1:3001`. Imported by `/etc/caddy/Caddyfile` via `apps/*/deploy/caddy.snippet`. |
| `env.production.example` | Shape of `.env.production` (written by CI from secrets, not committed).                                              |
| `README.md`              | This file.                                                                                                           |

## One-time exe.dev / DNS setup

```bash
# Register the hostname with the exe.dev edge:
ssh exe.dev domain add vhtm-eu push.vhtm.eu

# DNS at Porkbun:
#   push.vhtm.eu  CNAME  vhtm-eu.exe.xyz
```

## GitHub Actions secrets

| Secret              | Source                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Password for the `push` role in the shared Postgres. Set once when the DB was created (see <https://github.com/Jason-vh/vhtm.eu/blob/main/infra/postgres/README.md>). |

## Calendar invites

Invites go out from `push@vhtm.eu`, an alias on Jason's Fastmail account, through Fastmail's JMAP API. The app calls `https://fastmail-send.int.exe.xyz` (`FASTMAIL_BASE_URL`, written by the deploy workflow), and exe.dev adds the token, so it never reaches the VM.

One-time setup:

1. Fastmail → Settings → Migration/Privacy & Security → **API tokens**: a new token with **Email** (read-write) and **Email submission** access. Nothing else.
2. Fastmail → Settings → **My email addresses**: an alias `push@vhtm.eu`, plus a sending identity for it named `Push Padel`. The app looks the identity up by address and refuses to send without it.
3. Add the token to exe.dev as a Fastmail integration named `fastmail-send`, attached to `vm:vhtm-eu`:
   <https://exe.dev/integrations/add?service=fastmail&attach=vm:vhtm-eu>
4. Fastmail → Settings → **Filters & rules**: file mail to `push@vhtm.eu` (the RSVP replies) into a folder of its own.
5. DNS at Porkbun: `_dmarc.vhtm.eu TXT "v=DMARC1; p=none"`, which helps Gmail trust the invites.

The token can send as any address on the account, and any process on `vhtm-eu` can use the integration; it can't read the token itself.

Check from the VM:

```bash
curl -s https://fastmail-send.int.exe.xyz/jmap/session | jq '.primaryAccounts'
docker compose logs app | grep -i 'calendar invite'
```

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
