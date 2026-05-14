# Push Padel

Private padel tracker for a friend group: passkey signup, post-session match logging, rotating doubles teams, and sequential lifetime ELO.

## Stack

- Next.js + TypeScript
- Prisma + Postgres
- Passkey auth via WebAuthn (`@simplewebauthn/*`)
- Railway-ready start script: `prisma migrate deploy && next start`

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

Production deployment is configured for the existing exe.dev VM `vhtm-eu`.

See [`deploy/README.md`](deploy/README.md).

## Current MVP scope

- Users sign up/sign in with passkeys.
- Players are identified by email.
- A player can exist before signup; registering with the same email links the account.
- Sessions are logged after they happen.
- Each session can have multiple ordered matches.
- Ratings update sequentially after every match using doubles ELO.

## Deferred: email and calendar invites

Because games are organized outside the app, outbound email/calendar is intentionally not in the MVP.

Good later options:

- **Calendar**: generate downloadable `.ics` files first; full invite sending later.
- **Email**: use Resend/Postmark for transactional email if we add notifications or invitations.
