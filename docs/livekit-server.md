# Self-Hosted LiveKit Server

This document covers the self-hosted LiveKit SFU server running on a Hetzner VPS. It includes the server details, configuration, and all commands needed for monitoring and maintenance.

## Server Details

| Property | Value |
|---|---|
| **Provider** | Hetzner Cloud |
| **Plan** | CPX22 (2 vCPU AMD, 4 GB RAM, 80 GB SSD, 20 TB bandwidth) |
| **OS** | Ubuntu 24.04 |
| **IP** | `195.201.43.65` |
| **Domain** | `livekit.keyforsuccesslocks.com` |
| **Location** | Nuremberg, Germany |

## Architecture

```
Browser (wss://livekit.keyforsuccesslocks.com)
    → Caddy (:443, automatic TLS via Let's Encrypt)
        → LiveKit Server (:7880)
```

- **Caddy** handles TLS termination and reverse proxies to LiveKit
- **LiveKit** runs as an SFU (Selective Forwarding Unit) on port 7880
- **Webhooks** are sent from LiveKit to `https://online-mafia-game.vercel.app/api/livekit/webhook`

## SSH Access

```bash
ssh root@195.201.43.65
```

## Config Files

| File | Purpose |
|---|---|
| `/etc/livekit.yaml` | LiveKit server configuration (API keys, ports, webhooks) |
| `/etc/caddy/Caddyfile` | Caddy reverse proxy and TLS configuration |
| `/etc/systemd/system/livekit.service` | Systemd service file for LiveKit |

### View config files

```bash
cat /etc/livekit.yaml
cat /etc/caddy/Caddyfile
cat /etc/systemd/system/livekit.service
```

### Edit config files

```bash
nano /etc/livekit.yaml
nano /etc/caddy/Caddyfile
```

After editing, always restart the relevant service (see below).

## Service Management

Both LiveKit and Caddy run as systemd services that start automatically on boot.

### LiveKit

```bash
# Check if LiveKit is running
systemctl status livekit

# Restart LiveKit (after config changes)
systemctl restart livekit

# Stop LiveKit
systemctl stop livekit

# Start LiveKit
systemctl start livekit

# View LiveKit logs (last 50 lines)
journalctl -u livekit --no-pager -n 50

# Follow LiveKit logs in real-time (Ctrl+C to stop)
journalctl -u livekit -f
```

### Caddy

```bash
# Check if Caddy is running
systemctl status caddy

# Restart Caddy (after Caddyfile changes)
systemctl restart caddy

# Stop Caddy
systemctl stop caddy

# Start Caddy
systemctl start caddy

# View Caddy logs (last 50 lines)
journalctl -u caddy --no-pager -n 50

# Follow Caddy logs in real-time
journalctl -u caddy -f
```

## Monitoring Commands

### Check if services are running

```bash
systemctl status livekit
systemctl status caddy
```

Look for **"active (running)"** in green. If you see "activating (auto-restart)" it means the service is crash-looping — check the logs.

### Check which ports are listening

```bash
ss -tlnp | grep -E '7880|443|80'
```

Expected output should show:
- Port **7880** — LiveKit
- Port **443** — Caddy (HTTPS)
- Port **80** — Caddy (HTTP, for TLS cert renewal)

### Check server resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Bandwidth used this month (if vnstat is installed)
vnstat -m
```

### Check firewall rules

```bash
ufw status
```

Expected open ports: 22/tcp, 80/tcp, 443/tcp, 7880/tcp, 7881/tcp, 443/udp, 50000:60000/udp.

## Troubleshooting

### LiveKit keeps restarting

```bash
journalctl -u livekit --no-pager -n 30
```

Common causes:
- **"TURN tls cert required"** — TURN is enabled but cert files are missing. Set `turn.enabled: false` in `/etc/livekit.yaml`
- **Port conflict** — Another process is using port 7880. Check with `ss -tlnp | grep 7880`

### 502 Bad Gateway in browser

This means Caddy is running but LiveKit is not responding. Check:

```bash
systemctl status livekit
ss -tlnp | grep 7880
```

If LiveKit isn't listening on 7880, restart it and check logs.

### TLS certificate not working

```bash
journalctl -u caddy --no-pager -n 30
```

Caddy auto-renews Let's Encrypt certificates. If renewal fails, it's usually a DNS issue. Verify DNS:

```bash
dig livekit.keyforsuccesslocks.com +short
```

Should return `195.201.43.65`.

### WebSocket connection fails (CORS errors)

Check that the Caddyfile includes the CORS headers. View with:

```bash
cat /etc/caddy/Caddyfile
```

### Can't SSH into the server

If locked out, use the Hetzner Cloud Console (web-based terminal) from the Hetzner dashboard. Go to your server → click the terminal icon `>_` in the top right.

## Updating LiveKit

To update LiveKit to the latest version:

```bash
# Download latest binary
curl -sSL https://github.com/livekit/livekit/releases/latest/download/livekit-server_linux_amd64.tar.gz | tar xz -C /usr/local/bin/

# Verify version
livekit-server --version

# Restart
systemctl restart livekit
```

## Updating the OS

```bash
apt update && apt upgrade -y
```

For automatic security updates:

```bash
apt install unattended-upgrades -y
```

## Regenerating API Keys

If API keys are compromised:

```bash
livekit-server generate-keys
```

Then update **both**:
1. `/etc/livekit.yaml` on the server (under `keys:` and `webhook.api_key`)
2. Vercel environment variables (`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`)

Restart LiveKit after changing the config and redeploy on Vercel.

## Environment Variables (Vercel)

These connect the Next.js app to the self-hosted LiveKit server:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://livekit.keyforsuccesslocks.com` |
| `LIVEKIT_API_KEY` | *(stored in Vercel, matches `/etc/livekit.yaml`)* |
| `LIVEKIT_API_SECRET` | *(stored in Vercel, matches `/etc/livekit.yaml`)* |

## Monitoring Dashboard (Prometheus + Grafana)

LiveKit exposes Prometheus metrics on port 6789. These are scraped by Prometheus and visualized in Grafana.

| Service | URL / Port |
|---|---|
| **Grafana** | `https://grafana.keyforsuccesslocks.com` |
| **Prometheus** | `http://localhost:9090` (internal only) |
| **LiveKit Metrics** | `http://localhost:6789/metrics` (internal only) |

### Config files

| File | Purpose |
|---|---|
| `/etc/livekit.yaml` | `prometheus_port: 6789` enables metrics |
| `/etc/prometheus/prometheus.yml` | Scrape config (targets LiveKit on :6789) |
| `/etc/caddy/Caddyfile` | Exposes Grafana via `grafana.keyforsuccesslocks.com` |

### Service management

```bash
# Prometheus
systemctl status prometheus
systemctl restart prometheus
journalctl -u prometheus --no-pager -n 30

# Grafana
systemctl status grafana-server
systemctl restart grafana-server
journalctl -u grafana-server --no-pager -n 30
```

### Verify metrics pipeline

```bash
# Check LiveKit is exposing metrics
curl -s http://localhost:6789/metrics | head -20

# Check Prometheus is scraping LiveKit
curl -s http://localhost:9090/api/v1/targets | grep livekit

# List all available LiveKit metric names
curl -s http://localhost:6789/metrics | grep "^livekit" | cut -d'{' -f1 | cut -d' ' -f1 | sort -u
```

### PromQL queries for Grafana panels

#### Room & Participant Stats

| Panel | Query | Visualization |
|---|---|---|
| Active Rooms | `livekit_room_total` | Stat |
| Active Participants | `livekit_participant_total` | Stat |
| Participant Joins/hour | `increase(livekit_participant_join_total[1h])` | Time series |
| Tracks Published | `livekit_track_published_total` | Stat |

#### Network & Quality

| Panel | Query | Visualization |
|---|---|---|
| Bandwidth In (bytes/sec) | `rate(livekit_packet_bytes{direction="incoming"}[1m])` | Time series |
| Bandwidth Out (bytes/sec) | `rate(livekit_packet_bytes{direction="outgoing"}[1m])` | Time series |
| Avg Packet Loss % | `rate(livekit_packet_loss_percent_sum[5m]) / rate(livekit_packet_loss_percent_count[5m])` | Gauge |
| Avg Quality Score | `rate(livekit_quality_score_sum[5m]) / rate(livekit_quality_score_count[5m])` | Gauge |
| Avg RTT (ms) | `rate(livekit_rtt_ms_sum[5m]) / rate(livekit_rtt_ms_count[5m])` | Time series |
| Forward Jitter | `livekit_forward_jitter` | Time series |

#### Operational

| Panel | Query | Visualization |
|---|---|---|
| Avg Room Duration (sec) | `rate(livekit_room_duration_seconds_sum[5m]) / rate(livekit_room_duration_seconds_count[5m])` | Stat |
| Webhooks Sent/5min | `increase(livekit_webhook_dispatch_total[5m])` | Time series |
| Packets/sec | `rate(livekit_packet_total[1m])` | Time series |
| Service Operations/min | `rate(livekit_node_service_operation[1m])` | Time series |

## Cost

| Item | Monthly Cost |
|---|---|
| Hetzner CPX22 + IPv4 | ~$7.59 |
| Domain | ~$1 (amortized) |
| **Total** | **~$8.59/mo** |

Replaces LiveKit Cloud at ~$101/mo.
