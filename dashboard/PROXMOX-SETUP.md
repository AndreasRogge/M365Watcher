# M365Watcher Dashboard — Proxmox Deployment Guide

Deploy the dashboard as a Docker container inside a Proxmox LXC container.
Total resource usage: ~256MB RAM, ~2GB disk.

---

## Step 1: Create an LXC Container on Proxmox

In the Proxmox Web UI (`https://your-proxmox-ip:8006`):

1. Click **Create CT** (top right)
2. Configure:
   - **Hostname:** `m365watcher`
   - **Template:** `debian-12-standard` (or Ubuntu 24.04)
   - **Disk:** 8 GB is plenty
   - **CPU:** 1 core
   - **Memory:** 512 MB (256 MB minimum)
   - **Network:** DHCP or static IP on your LAN
   - **DNS:** Use host settings
3. Under **Options** tab after creation:
   - Check **Nesting** (required for Docker)
   - Check **keyctl** (required for Docker)

> **Or via CLI on the Proxmox host:**
> ```bash
> # Download template if you don't have it
> pveam update
> pveam download local debian-12-standard_12.7-1_amd64.tar.zst
>
> # Create container (adjust ID, storage, bridge as needed)
> pct create 200 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
>   --hostname m365watcher \
>   --memory 512 \
>   --cores 1 \
>   --rootfs local-lvm:8 \
>   --net0 name=eth0,bridge=vmbr0,ip=dhcp \
>   --features nesting=1,keyctl=1 \
>   --unprivileged 1 \
>   --start 1
> ```

4. Start the container and open the console (or SSH in).

---

## Step 2: Install Docker inside the LXC

SSH into the LXC container or use the Proxmox console:

```bash
# Update system
apt update && apt upgrade -y

# Install prerequisites
apt install -y ca-certificates curl gnupg git

# Add Docker's GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify
docker run hello-world
```

---

## Step 3: Deploy the Dashboard

### Option A: Clone from Git (recommended)

```bash
# Clone your repo
cd /opt
git clone https://github.com/YOUR_USERNAME/M365Watcher.git
cd M365Watcher/dashboard

# Create the .env file
cp .env.example .env
nano .env
```

### Option B: Copy from your Windows machine

```bash
# From your Windows machine (PowerShell):
scp -r "C:\Users\andre\OneDrive\GitRepo\M365Watcher\.claude\worktrees\kind-bartik\dashboard" root@YOUR_LXC_IP:/opt/m365watcher-dashboard

# Then SSH into the LXC:
cd /opt/m365watcher-dashboard
cp .env.example .env
nano .env
```

### Fill in the .env file

```env
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your~secret~value~here
PORT=3001
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

### Build and start

```bash
# Build and start the container
docker compose up -d --build

# Check it's running
docker compose ps
docker compose logs -f
```

The dashboard is now running at `http://YOUR_LXC_IP:3001`

---

## Step 4: Access from your network

Open a browser and go to:
```
http://YOUR_LXC_IP:3001
```

Replace `YOUR_LXC_IP` with the actual IP of the LXC container. You can find it with:
```bash
# Inside the LXC:
ip addr show eth0
```

---

## Step 5: Auto-start and updates

### Auto-start (already handled)

The `docker-compose.yml` has `restart: unless-stopped`, so the dashboard
will automatically restart after LXC reboots.

Make sure the LXC itself starts on boot in Proxmox:
- Select the LXC → **Options** → **Start at boot** → **Yes**

### Updating the dashboard

```bash
cd /opt/M365Watcher/dashboard   # or wherever you cloned it

# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

---

## Optional: Reverse Proxy with HTTPS

If you want HTTPS and a nice domain name, add a reverse proxy.
If you already have Nginx Proxy Manager, Traefik, or Caddy on your Proxmox:

### Caddy (simplest)

```bash
apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```
m365watcher.yourdomain.local {
    reverse_proxy localhost:3001
}
```

```bash
systemctl restart caddy
```

### Nginx Proxy Manager

If you have NPM running on Proxmox, add a proxy host:
- **Domain:** `m365watcher.yourdomain.local`
- **Forward Hostname/IP:** `YOUR_LXC_IP`
- **Forward Port:** `3001`
- Enable SSL with Let's Encrypt if you have a public domain

---

## Troubleshooting

### Docker won't start in LXC
Make sure **nesting** and **keyctl** features are enabled:
```bash
# On the Proxmox HOST (not inside LXC):
pct set 200 --features nesting=1,keyctl=1
pct restart 200
```

### "Permission denied" errors
If using an unprivileged container and Docker has issues:
```bash
# On Proxmox HOST, add to /etc/pve/lxc/200.conf:
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: proc:rw sys:rw
```
Then restart the LXC.

### Dashboard shows API errors
Check the container logs:
```bash
docker compose logs -f
```

Common issues:
- **401 AuthenticationFailed**: Wrong AZURE_CLIENT_SECRET or it expired
- **403 Forbidden**: Missing `ConfigurationMonitoring.ReadWrite.All` permission or admin consent not granted
- **Connection refused**: Check the .env values are correct

### Check container health
```bash
docker compose ps          # Should show "healthy"
curl http://localhost:3001/api/health   # Should return {"status":"ok",...}
```

---

## Resource Usage

| Component | RAM | CPU | Disk |
|-----------|-----|-----|------|
| LXC Container | ~80 MB base | idle | 2 GB |
| Docker Engine | ~50 MB | idle | 500 MB |
| M365Watcher Dashboard | ~80 MB | minimal | 200 MB |
| **Total** | **~210 MB** | **< 1 core** | **~3 GB** |

The dashboard is very lightweight — it only makes API calls to Microsoft Graph when you interact with it.
