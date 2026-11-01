# Push Padel

Private padel tracker for a friend group: passkey signup, post-session match logging, rotating doubles teams, and sequential lifetime ELO.

## Stack

- Next.js + TypeScript
- Prisma + Postgres
- Passkey auth via WebAuthn (`@simplewebauthn/*`)
- Docker Compose in production
- exe.dev VM deployment with Caddy reverse proxy
- Start script: `prisma migrate deploy && next start`

## Local setup

```bash
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run dev
```

Passkeys work on `localhost` locally. In production they require HTTPS.

## Code quality

```bash
npm run lint
npm run format:check
npm run format
```

Install the Git hook once per clone:

```bash
npm run hooks:install
```

Lefthook then runs `oxlint` and `oxfmt --check` on `pre-push`.

## Deployment

Production is live at:

```text
https://push.vhtm.eu
```

Production deployment is configured for the existing exe.dev VM `vhtm-eu`. Pushes to `main` deploy automatically through the self-hosted GitHub Actions runner on that VM.

See [`deploy/README.md`](deploy/README.md) for architecture, VM paths, Caddy config, secrets, deploy flow, and ops commands.

## Current MVP scope

- Users sign up/sign in with passkeys, under a name.
- Sessions are logged after they happen.
- Each session can have multiple ordered matches.
- Ratings update sequentially after every match using doubles ELO.

## Calendar invites

Players can add an email on their own profile. Everyone with one gets a calendar invite for each upcoming session they're in, an update when its date, time, length, venue or court changes, and a cancellation when they're taken off it or it's deleted.

- Booking, editing, deleting or changing the players of a session, and changing your email, schedule `src/lib/invites/sync.ts` for that session. It compares the session with what each address last received (`SessionInvite`) and sends the difference. It waits until the session has been left alone for two minutes, because the edit sheet saves every field as it changes. On startup it catches up on every session, in case a restart interrupted a wait.
- Invites are built with `ical-generator` and `nodemailer` (compose only), and sent from `push@vhtm.eu` through Fastmail's JMAP API, via the `fastmail-send` exe.dev integration. See [`deploy/README.md`](deploy/README.md#calendar-invites).
- A failed send is retried five minutes later, unless Fastmail may have sent it (no clear answer), so nobody gets the same email twice. At most 100 emails go out per day.
- Sessions from the past week only get updates and cancellations for invites already out, e.g. when a date is corrected after the game.
- Without `FASTMAIL_BASE_URL`, invites are logged instead of sent locally, and off in production.

Future idea: a personal `webcal://` feed per player, for anyone who'd rather not give an email.
