# Deploy AtomSpot on Ubuntu EC2 (Self-Hosted)

End-to-end runbook from a freshly launched Ubuntu 22.04 / 24.04 LTS EC2
instance to a live HTTPS production deployment. The app runs under PM2 as a
Nitro Node server behind nginx — no Cloudflare Workers involved.

> **Why the project still works on Node**
> The project's default Nitro preset is `cloudflare-module` (used by the
> Lovable preview). `vite.config.ts` honours the `NITRO_PRESET` environment
> variable when set, so building with `NITRO_PRESET=node-server` emits a
> standard Node server at `.output/server/index.mjs`. Nothing about the
> application code changes between targets.

---

## 0. Provision the EC2 instance

- **AMI**: Ubuntu Server 22.04 LTS (or 24.04 LTS), x86_64 or arm64.
- **Size**: `t3.small` (2 vCPU / 2 GB RAM) minimum; `t3.medium` recommended.
- **Storage**: 20 GB gp3 minimum.
- **Security Group**: allow inbound `22` (SSH, your IP only), `80`, `443`.
- **Elastic IP**: attach one and point your DNS `A`/`AAAA` records at it.

SSH in:
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EIP>
```

---

## 1. Base system

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install build-essential curl git ufw unzip ca-certificates \
                    nginx postgresql-client
sudo timedatectl set-timezone UTC

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 2. Install Node 20 + Bun + PM2

```bash
# Node 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v && npm -v        # expect: v20.x and >= 10.x

# Bun (matches the project's bunfig.toml; npm also works)
curl -fsSL https://bun.sh/install | bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
bun -v

# PM2 (process manager + boot integration)
sudo npm install -g pm2
```

---

## 3. Create the deploy user & directories

```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /opt/atomspot /var/log/atomspot /var/backups/atomspot
sudo chown -R deploy:deploy /opt/atomspot /var/log/atomspot /var/backups/atomspot
sudo -iu deploy
```

(All commands below run as the `deploy` user unless prefixed with `sudo`.)

---

## 4. Clone & configure

```bash
cd /opt/atomspot
git clone <your-repo-url> .
cp .env.example .env
nano .env            # fill in real values (see §5)
chmod 600 .env
```

---

## 5. Environment variables

Fill `/opt/atomspot/.env` with the values from §3 of `DEPLOYMENT.md`. Required
in production:

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` | yes | Baked into the client bundle at build time |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | yes | Server runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Privileged admin client |
| `SUPABASE_DB_URL` | yes (for backups) | `postgres://…` connection string |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | yes | Payments + webhook signature |
| `LOVABLE_API_KEY` | optional | Only if AI features are wired up |
| `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3000` | yes | Runtime tuning |
| `NITRO_PRESET=node-server` | yes (build-time) | Switches Nitro from Cloudflare to Node |

---

## 6. Install, build, run

```bash
cd /opt/atomspot
bun install --frozen-lockfile           # or: npm ci
export NITRO_PRESET=node-server
bun run build                           # emits .output/server/index.mjs

# Smoke test (manual; Ctrl-C after one curl)
PORT=3000 HOST=127.0.0.1 node .output/server/index.mjs &
sleep 3
curl -fsS http://127.0.0.1:3000/api/public/health
kill %1
```

Expected health response:
```json
{"status":"ok","uptime":3.12,"timestamp":"2026-…"}
```

---

## 7. PM2 (auto-restart on reboot)

```bash
cd /opt/atomspot
pm2 start ecosystem.config.js --env production
pm2 save

# Generate the systemd unit so PM2 starts on boot.
# Copy the `sudo env …` line PM2 prints and run it AS ROOT once:
pm2 startup systemd -u deploy --hp /home/deploy
# → sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
pm2 save
```

Useful PM2 commands:
```bash
pm2 status
pm2 logs atomspot              # follow logs
pm2 logs atomspot --lines 200  # tail
pm2 reload atomspot            # zero-downtime reload after deploy
pm2 restart atomspot           # hard restart
pm2 stop atomspot
pm2 monit                      # live dashboard
```

---

## 8. nginx + HTTPS

```bash
sudo cp /opt/atomspot/nginx.conf /etc/nginx/sites-available/atomspot.conf
sudo sed -i 's/example.com/your-domain.com/g' /etc/nginx/sites-available/atomspot.conf

# WebSocket upgrade map (required by nginx.conf)
sudo tee /etc/nginx/conf.d/upgrade-map.conf >/dev/null <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

sudo ln -sf /etc/nginx/sites-available/atomspot.conf /etc/nginx/sites-enabled/atomspot.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# TLS via Let's Encrypt
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
             --redirect --agree-tos -m you@your-domain.com --no-eff-email
# Auto-renew is installed as a systemd timer; verify:
sudo systemctl list-timers | grep certbot
```

Browse to `https://your-domain.com` — the app should load with a valid cert.

---

## 9. Routine deployments

After the initial setup, day-2 deploys are one command:

```bash
cd /opt/atomspot
./deploy.sh             # git pull → install → build → pm2 reload → health check
```

`deploy.sh` exits non-zero (and tails PM2 logs) if `/api/public/health`
doesn't return `200` after reload.

---

## 10. Nightly backups

```bash
sudo crontab -e
```

Add:
```cron
0 2 * * *  ENV_FILE=/opt/atomspot/.env /opt/atomspot/backup.sh >> /var/log/atomspot/backup.log 2>&1
```

`backup.sh` dumps the entire Postgres database (gzip) into
`/var/backups/atomspot/` and prunes files older than 14 days. Uncomment the
`aws s3 cp` or `rclone copy` line at the bottom of the script to push
backups off-box (strongly recommended for production).

---

## 11. Docker alternative (optional)

If you prefer containerised deployment:

```bash
sudo apt -y install docker.io docker-compose-plugin
sudo usermod -aG docker deploy
# log out / back in for group change to apply

cd /opt/atomspot
docker compose build
docker compose up -d
docker compose logs -f
```

The container exposes `127.0.0.1:3000` — keep the same nginx config in front
of it. nginx terminates TLS and proxies to the container.

---

## 12. Logs

| Source | Location |
|---|---|
| App stdout/stderr | `/var/log/atomspot/out.log`, `/var/log/atomspot/error.log` |
| PM2 metadata | `~/.pm2/logs/` |
| nginx access | `/var/log/nginx/access.log` |
| nginx error | `/var/log/nginx/error.log` |
| Backups | `/var/log/atomspot/backup.log` |
| systemd / PM2 boot | `journalctl -u pm2-deploy.service` |

Rotate app logs with `pm2 install pm2-logrotate` (handles `out.log` /
`error.log` automatically).

---

## 13. Post-install production checklist

- [ ] DNS `A`/`AAAA` records point to the EC2 Elastic IP.
- [ ] `https://your-domain.com/api/public/health` returns `200 ok`.
- [ ] Security group only exposes `22` (your IP), `80`, `443`.
- [ ] `.env` is `chmod 600` and owned by `deploy`.
- [ ] PM2 saved (`pm2 save`) and systemd unit installed (`pm2 startup`); reboot the box once and confirm the app comes back up.
- [ ] Razorpay dashboard webhook points to `https://your-domain.com/api/public/razorpay-webhook` with `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Supabase Auth → URL Configuration includes `https://your-domain.com` as Site URL and Redirect URL.
- [ ] At least one user has the `admin` role in `user_roles`.
- [ ] Nightly backup cron enabled; off-box upload configured.
- [ ] Certbot auto-renewal timer active (`systemctl list-timers | grep certbot`).
- [ ] (Optional) CloudWatch / Uptime Robot probe on `/api/public/health`.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build emits `wrangler.json` and uses preset `cloudflare-module` | `NITRO_PRESET` not exported before `bun run build` | `export NITRO_PRESET=node-server` and rebuild |
| `node .output/server/index.mjs` exits immediately | Missing required env var (Supabase) | Check `.env`, then `node -r dotenv/config …` or use `pm2` which loads via `env_file` |
| `502 Bad Gateway` from nginx | Node process not listening on `127.0.0.1:3000` | `pm2 status`, `pm2 logs atomspot`; ensure `HOST=127.0.0.1 PORT=3000` |
| `403 Forbidden` on Supabase reads | Service role key mismatched or RLS denying anon | Verify `SUPABASE_SERVICE_ROLE_KEY` and policies |
| OAuth sign-in loops back to `/auth` | Site URL / Redirect URL not whitelisted in Supabase | Add the production domain in Supabase Auth → URL Configuration |
| Razorpay webhook returns 401 | Wrong `RAZORPAY_WEBHOOK_SECRET` | Re-sync the secret between EC2 `.env` and Razorpay dashboard |

---

*Built for AtomSpot — TanStack Start v1 + Nitro on Node 20, behind nginx, supervised by PM2.*
