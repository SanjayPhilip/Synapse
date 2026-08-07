# Synapse Deploy Runbook

> Production deployment guide for Synapse (frontend + backend + workers)

---

## Prerequisites

- Docker 24+ / Docker Compose v2
- Domain with TLS (Let's Encrypt / Cloudflare)
- SMTP credentials for email
- (Optional) S3-compatible storage for avatars/files

---

## 1. Server Setup

```bash
# Ubuntu/Debian
apt-get update && apt-get install -y docker.io docker-compose-plugin git
systemctl enable --now docker

# Clone
git clone <repo-url> /opt/synapse
cd /opt/synapse
```

---

## 2. Environment Configuration

```bash
# Copy example and edit
cp backend/.env.example backend/.env
nano backend/.env
```

**Required for production:**
```env
# Database (PostgreSQL in docker-compose)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/synapse
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@db:5432/synapse

# Auth - GENERATE A REAL SECRET
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AI
GEMINI_API_KEY=<your-gemini-key>

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Synapse <noreply@yourdomain.com>"
APP_BASE_URL=https://yourdomain.com

# CORS - set to your frontend domain
CORS_ORIGINS=["https://yourdomain.com"]

# Storage (local or S3)
STORAGE_BACKEND=local
# STORAGE_BACKEND=s3
# S3_ENDPOINT_URL=https://s3.amazonaws.com
# S3_ACCESS_KEY=...
# S3_SECRET_KEY=...
# S3_BUCKET=synapse
# S3_REGION=us-east-1
# S3_PUBLIC_URL=https://yourdomain.com/files
```

---

## 3. Docker Compose Production Override

Create `docker-compose.prod.yml`:

```yaml
services:
  backend:
    restart: unless-stopped
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
      - APP_BASE_URL=${APP_BASE_URL}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - STORAGE_BACKEND=${STORAGE_BACKEND}
      - S3_ENDPOINT_URL=${S3_ENDPOINT_URL}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_PUBLIC_URL=${S3_PUBLIC_URL}

  worker:
    restart: unless-stopped
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - STORAGE_BACKEND=${STORAGE_BACKEND}
      - S3_ENDPOINT_URL=${S3_ENDPOINT_URL}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - S3_REGION=${S3_REGION}
      - S3_PUBLIC_URL=${S3_PUBLIC_URL}

  backup:
    restart: unless-stopped
```

---

## 4. Deploy

```bash
# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verify
docker compose logs -f backend
docker compose logs -f worker
```

**First run:** The backend container runs `app.init_db` (Alembic migrations) + `app.seed` (demo accounts) automatically.

---

## 5. Reverse Proxy (Nginx + Let's Encrypt)

```nginx
# /etc/nginx/sites-available/synapse
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (served by backend static files)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for notifications
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Large file uploads (resumes)
    client_max_body_size 10M;
}
```

```bash
ln -s /etc/nginx/sites-available/synapse /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get cert
certbot --nginx -d yourdomain.com
```

---

## 6. Health Checks

```bash
# API health
curl https://yourdomain.com/health

# Database connectivity
docker compose exec backend python -c "from app.db import engine; print(engine.pool.status())"

# Worker status
docker compose logs worker | tail -20
```

---

## 7. Common Operations

### Run Migrations
```bash
docker compose exec backend python -m app.migrate
```

### Create Admin User
```bash
docker compose exec backend python -c "
from app.db import SessionLocal
from app.models import User, Profile
from app.core.security import get_password_hash
db = SessionLocal()
u = User(email='admin@yourdomain.com', hashed_password=get_password_hash('StrongPass123!'), is_active=True)
db.add(u); db.flush()
p = Profile(user_id=u.id, role='admin', is_verified=True)
db.add(p); db.commit()
print('Admin created')
"
```

### Manual Backup
```bash
docker compose exec backup python -m app.scripts.backup backup
# Output: /app/backups/synapse_YYYYMMDD_HHMMSS.sql
```

### Restore Backup
```bash
# Stop backend/worker
docker compose stop backend worker

# Restore
docker compose exec -T db pg_restore -U postgres -d synapse < backup_file.sql

# Or for SQL dump:
docker compose exec -T db psql -U postgres synapse < backup_file.sql

# Restart
docker compose start backend worker
```

### View Logs
```bash
docker compose logs -f backend --tail=100
docker compose logs -f worker --tail=100
```

### Update Deployment
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 8. Monitoring

- **Health endpoint:** `GET /health` (returns 200 if DB reachable)
- **Admin health:** `GET /api/v1/admin/health` (checks API keys, storage, DB)
- **Logs:** `docker compose logs` or forward to Loki/ELK
- **Backups:** Check `/app/backups` volume daily

---

## 9. Rollback

```bash
# If migration fails
docker compose exec backend python -m alembic downgrade -1

# If deploy broken
git checkout <previous-tag>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 10. Security Checklist

- [ ] `SECRET_KEY` is 48+ char random string
- [ ] `DEBUG=false` (not in code but implied by env)
- [ ] TLS terminated at nginx (not app)
- [ ] `CORS_ORIGINS` restricted to your domain only
- [ ] SMTP credentials use app-specific password
- [ ] Database not exposed publicly (internal docker network only)
- [ ] Redis not exposed publicly
- [ ] Backup volume encrypted at rest (host level)
- [ ] Rotate `SECRET_KEY` annually (invalidates all sessions)

---

## Demo Accounts (Development Only)

| Role | Email | Password |
|------|-------|----------|
| Seeker | seeker@synapse.demo | Demo1234! |
| Employer | employer@synapse.demo | Demo1234! |
| Admin | admin@synapse.demo | Demo1234! |

**Delete or change passwords in production.**

---

## File Structure (Production)

```
/opt/synapse/
├── backend/
│   ├── .env                 # Secrets (gitignored)
│   ├── Dockerfile
│   ├── app/
│   ├── storage/             # Local file storage (if STORAGE_BACKEND=local)
│   └── synapse.db           # SQLite (dev only)
├── docker-compose.yml
├── docker-compose.prod.yml
└── nginx/
    └── synapse.conf
```

---

## Support

- API Reference: `API_REFERENCE.md` (auto-generated)
- Implementation docs: `Synapse_Implementation_Documentation.docx`
- Report: `Synapse_Report.docx`