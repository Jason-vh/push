# exe.dev deployment

This app is intended to run on the existing `vhtm-eu` exe.dev VM behind a shared reverse proxy.

## Recommended VM layout

- exe.dev public HTTPS proxy -> VM port `8080`
- Caddy on the VM listens on `:8080` and routes by hostname
- Push Padel app listens on `127.0.0.1:3001`
- Push Padel Postgres runs in the app's Docker Compose project with a named volume

This keeps one VM usable for multiple apps while isolating each app's containers and database volume.

## One-time VM setup

SSH into the VM:

```bash
ssh vhtm-eu.exe.xyz
```

Install Docker/Caddy if needed. On Ubuntu-like images:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin caddy
sudo usermod -aG docker exedev
```

Log out and back in so group membership applies.

If the repo is not already on the VM:

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/Jason-vh/push.git
cd push
```

Configure the shared Caddy proxy:

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

Create the production env file for a manual deploy:

```bash
cp deploy/env.production.example .env.production
nano .env.production
```

Start the app manually once:

```bash
docker compose up -d --build
```

## exe.dev proxy and custom domain

On your local machine, set DNS:

```text
push.vhtm.eu CNAME vhtm-eu.exe.xyz
```

Then register the domain and expose the Caddy port through exe.dev:

```bash
ssh exe.dev domain add vhtm-eu push.vhtm.eu
ssh exe.dev share port vhtm-eu 8080
ssh exe.dev share set-public vhtm-eu
```

exe.dev terminates TLS and forwards HTTP to the VM, so Caddy should not try to manage certificates here.

## Deploy on push

Use a GitHub self-hosted runner on the VM. In GitHub, go to:

```text
https://github.com/Jason-vh/push/settings/actions/runners/new?arch=x64&os=linux
```

Install the runner on `vhtm-eu`. Add the label:

```text
push-prod
```

Then configure it as a systemd service so it survives reboots. exe.dev's docs show the recommended service unit:

```text
https://exe.dev/docs/use-case-gh-action-runner.md
```

Add this GitHub Actions repository secret:

```text
POSTGRES_PASSWORD=<same long password used for production>
```

After that, every push to `main` runs `.github/workflows/deploy.yml`, writes `.env.production`, then builds and restarts the Docker Compose app on the VM.

## Useful commands

```bash
# logs
docker compose logs -f app

# database logs
docker compose logs -f db

# restart
docker compose restart app

# run migrations manually if needed
docker compose exec app npx prisma migrate deploy
```
