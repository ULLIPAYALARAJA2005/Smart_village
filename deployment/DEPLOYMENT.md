# Production Deployment Guide: Fix My Village 🚀

This document outlines the standard production deployment process on Ubuntu/Debian Linux using **Nginx**, **Gunicorn**, and **Systemd**.

---

## 1. System Packages & Requirements

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx mysql-server
```

---

## 2. Django Backend Setup

### Static & Media Files
Collect static files using WhiteNoise:
```bash
cd /var/www/fixmyvillage/server
source env/bin/activate
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

### Systemd Service for Gunicorn
Create `/etc/systemd/system/fixmyvillage.service`:
```ini
[Unit]
Description=Gunicorn daemon for Fix My Village Django Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/fixmyvillage/server
ExecStart=/var/www/fixmyvillage/server/env/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/run/fixmyvillage.sock \
          main_app.wsgi:application

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl start fixmyvillage
sudo systemctl enable fixmyvillage
```

---

## 3. Frontend Build

Build the static React SPA:
```bash
cd /var/www/fixmyvillage/client
npm install
npm run build
```
The output files will be in `/var/www/fixmyvillage/client/dist`.

---

## 4. Nginx Configuration

Create `/etc/nginx/sites-available/fixmyvillage`:
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    # Frontend Static SPA
    root /var/www/fixmyvillage/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Django Static Files
    location /static/ {
        alias /var/www/fixmyvillage/server/staticfiles/;
    }

    # User Media Uploads
    location /media/ {
        alias /var/www/fixmyvillage/server/media/;
    }

    # Django API & Admin
    location ~ ^/(api|admin)/ {
        include proxy_params;
        proxy_pass http://unix:/run/fixmyvillage.sock;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/fixmyvillage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot will configure SSL renewal and HTTPS redirection automatically.

