# 🚀 Deploying & Running Cryptic Sync Messenger

This full-stack messenger acts as a high-fidelity client-server application. It includes **End-to-End Encryption (E2EE)** running in the client browser, file streaming uploads, collaborative notes, self-destruct timers, and a real-time **Server-Sent Events (SSE)** broadcast sync engine.

---

## 💻 1. Local Development (Your PC/Mac)

Getting the messenger active locally is extremely simple and requires no external databases.

### Prerequisites:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### Steps:
1. **Extract/Clone Folder:** Open your project directory in your terminal.
2. **Install Sandbox Dependencies:**
   ```bash
   npm install
   ```
3. **Boot Application:**
   ```bash
   npm run dev
   ```
4. **Access UI:** Open [http://localhost:3000](http://localhost:3000) in your web browser.
5. **Simulate Multi-User Chat:** 
   To test real-time chat sync, reactions, notebooks, and voice/video phone calls:
   - Click **Open Multi-Session** in the right drawer/settings panel.
   - This opens a second browser tab with your unique session configuration, enabling instant interaction.

---

## 🌐 2. Virtual Private Server (VPS) Deployment (Ubuntu / Debian / CentOS)

For public access across different networks, host the application on a VPS (e.g. AWS, DigitalOcean, Hetzner, Linode).

### Sub-step A: Install Node.js
```bash
# On Debian/Ubuntu Systems
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Sub-step B: Build compiled bundle
Since JS/TS modules behave differently under server compilation, compile the source using our customized production builder inside the project directory:
```bash
npm run build
```
This builds standard client assets inside `./dist` and bundles the entire backend into a single, high-speed file: `dist/server.cjs`.

### Sub-step C: Keep Process Active via PM2
Use **PM2** to run the app persistently in the background. If the VPS reboots, PM2 automatically recovers it.
```bash
# Install PM2 globally
sudo npm install -g pm2

# Run the compiled production server
pm2 start dist/server.cjs --name "cryptic-telegram"

# Autostart PM2 on boot
pm2 startup
pm2 save
```

### Sub-step D: Nginx Reverse Proxy Setup (Port 80/443 to 3000)
To serve the app on standard port 80/443 with SSL protection, use Nginx:
```bash
sudo apt install nginx -y
```

Edit your Nginx server block (`/etc/nginx/sites-available/default`) to forward traffic cleanly:
```nginx
server {
    listen 80;
    server_name your_domain.com; # Change to your domain or VPS IP

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Necessary for SSE real-time streaming buffers
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        read_timeout 600s;
    }
}
```
Reload Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🐳 3. Cloud Container & Docker Deployments

For high-scalability container workloads (like Google Cloud Run, AWS ECS, or Kubernetes):

### Dockerfile
Create a standard `Dockerfile` in the root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
```

### Run Docker locally or on cloud:
```bash
docker build -t cryptic-telegram .
docker run -p 3000:3000 -v $(pwd)/database.json:/app/database.json cryptic-telegram
```

---

## 🏠 4. Persistent Database Notes

The application uses a lightweight **JSON file database** (`database.json`) stored on the server to keep user registry, thread configuration, and encrypted message queues intact.
- When running active containers or VPS deployments, ensure that `database.json` and the `/uploads` folder are bound as persistent **Volumes** or write-accessible directory pathways so you do not lose data on container redeployments!
- Encryption keys (private and public) are stored locally in the participant browser's **LocalStorage** (`secure_telegram_private_key:username`) for total security (E2EE), and your private key can be retrieved on newly synced browser sheets by typing your master backup recovery password!
