# Deployment Options for Global Access

This document outlines deployment options for making your Mitas IPMP application accessible to colleagues across different provinces, countries, and continents.

## Recommended Deployment Platforms

### 1. **Cloud Platforms (Recommended)**

#### **A. AWS (Amazon Web Services)**
**Best for:** Enterprise-grade reliability, global infrastructure

**Setup:**
- **EC2 Instance**: Deploy your Node.js app on an EC2 instance
- **RDS (PostgreSQL/MySQL)**: Replace SQLite with managed database
- **S3**: Store file uploads and static assets
- **CloudFront**: CDN for global content delivery
- **Route 53**: DNS management
- **Elastic Beanstalk**: Simplified deployment (optional)

**Pros:**
- Global infrastructure (multiple regions)
- High availability and scalability
- Enterprise-grade security
- Pay-as-you-go pricing

**Cons:**
- Can be complex to set up initially
- Costs can add up with high traffic

**Estimated Cost:** $50-200/month (depending on usage)

---

#### **B. Microsoft Azure**
**Best for:** Windows-friendly, enterprise integration

**Setup:**
- **App Service**: Deploy Node.js web app
- **Azure SQL Database**: Managed database
- **Blob Storage**: File storage
- **Azure CDN**: Global content delivery
- **Azure Active Directory**: SSO integration (optional)

**Pros:**
- Excellent Windows integration
- Global data centers
- Good enterprise features
- Free tier available

**Cons:**
- Can be expensive at scale
- Learning curve for Azure services

**Estimated Cost:** $50-200/month

---

#### **C. Google Cloud Platform (GCP)**
**Best for:** Modern applications, good pricing

**Setup:**
- **Cloud Run**: Serverless container deployment
- **Cloud SQL**: Managed database
- **Cloud Storage**: File storage
- **Cloud CDN**: Global content delivery

**Pros:**
- Excellent pricing
- Modern serverless options
- Global infrastructure
- Good free tier

**Cons:**
- Smaller ecosystem than AWS
- Less enterprise-focused

**Estimated Cost:** $30-150/month

---

### 2. **Platform-as-a-Service (PaaS) - Easiest Option**

#### **A. Heroku**
**Best for:** Quick deployment, easy management

**Setup:**
1. Install Heroku CLI
2. `heroku create mitas-ipmp`
3. `git push heroku main`
4. Add PostgreSQL addon
5. Configure environment variables

**Pros:**
- Very easy to deploy
- Automatic SSL certificates
- Built-in CI/CD
- Good documentation

**Cons:**
- Can be expensive at scale
- Limited customization
- Sleeps on free tier

**Estimated Cost:** $25-100/month (Hobby: $7/month, Standard: $25/month)

**Quick Start:**
```bash
# Install Heroku CLI
npm install -g heroku-cli

# Login
heroku login

# Create app
heroku create mitas-ipmp

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# Set environment variables
heroku config:set NODE_ENV=production
```

---

#### **B. Railway**
**Best for:** Modern, developer-friendly

**Setup:**
- Connect GitHub repository
- Auto-detects Node.js
- Provides PostgreSQL database
- Automatic deployments

**Pros:**
- Very easy setup
- Modern interface
- Good pricing
- Automatic HTTPS

**Cons:**
- Newer platform (less mature)
- Smaller community

**Estimated Cost:** $5-50/month (Pay-as-you-go)

---

#### **C. Render**
**Best for:** Simple deployments, good free tier

**Setup:**
- Connect GitHub
- Auto-deploy on push
- Free PostgreSQL included
- Automatic SSL

**Pros:**
- Free tier available
- Easy setup
- Good documentation
- Automatic HTTPS

**Cons:**
- Free tier has limitations
- Can be slow on free tier

**Estimated Cost:** $7-50/month (Free tier available)

**Quick Start:**
1. Sign up at render.com
2. Connect GitHub repository
3. Create new Web Service
4. Select your repository
5. Add PostgreSQL database
6. Deploy!

---

#### **D. DigitalOcean App Platform**
**Best for:** Balance of simplicity and control

**Setup:**
- Connect GitHub
- Auto-detects Node.js
- Managed database option
- Global CDN

**Pros:**
- Simple deployment
- Good pricing
- Reliable infrastructure
- Global CDN included

**Cons:**
- Less features than AWS
- Smaller ecosystem

**Estimated Cost:** $12-100/month

---

### 3. **Container Platforms**

#### **A. Docker + Cloud Provider**
**Best for:** Consistent deployments, scalability

**Setup:**
1. Create Dockerfile
2. Build Docker image
3. Deploy to:
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances
   - DigitalOcean App Platform

**Pros:**
- Consistent environments
- Easy to scale
- Works anywhere
- Good for microservices

**Cons:**
- Requires Docker knowledge
- More complex setup

---

### 4. **VPS (Virtual Private Server)**

#### **A. DigitalOcean Droplets**
**Best for:** Full control, cost-effective

**Setup:**
1. Create Ubuntu droplet ($6-40/month)
2. Install Node.js, PM2, Nginx
3. Set up reverse proxy
4. Configure SSL with Let's Encrypt
5. Set up database (PostgreSQL recommended)

**Pros:**
- Full control
- Cost-effective
- Good performance
- Predictable pricing

**Cons:**
- Requires server management
- You handle updates/security
- No automatic scaling

**Estimated Cost:** $6-40/month

**Quick Setup Script:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Clone and build your app
git clone <your-repo>
cd mitas-ipmp
npm install
npm run build

# Start with PM2
pm2 start dist/server.js --name mitas-ipmp
pm2 save
pm2 startup

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/mitas-ipmp
# Add configuration (see below)

# Enable site
sudo ln -s /etc/nginx/sites-available/mitas-ipmp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

#### **B. Linode / Vultr / Hetzner**
Similar to DigitalOcean, alternative VPS providers with competitive pricing.

---

## Database Migration (SQLite → PostgreSQL/MySQL)

Since you're using SQLite locally, you'll need to migrate to a production database:

### Option 1: PostgreSQL (Recommended)
```bash
# Install PostgreSQL locally for testing
npm install pg

# Update database/config.ts
# Change from 'better-sqlite3' to 'postgres'
```

### Option 2: MySQL
```bash
npm install mysql2

# Update database/config.ts
# Change from 'better-sqlite3' to 'mysql'
```

**Update `src/database/config.ts`:**
```typescript
// For PostgreSQL
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mitas_ipmp',
  entities: [/* your entities */],
  synchronize: process.env.NODE_ENV !== 'production', // false in production
  logging: false,
});
```

---

## Environment Variables to Set

Create a `.env` file or set these in your hosting platform:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=mitas_ipmp
API_BASE_URL=https://yourdomain.com
```

---

## Security Considerations

1. **SSL/HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to Git
3. **Database**: Use strong passwords, restrict access
4. **CORS**: Configure CORS properly for your domain
5. **Rate Limiting**: Add rate limiting to prevent abuse
6. **Backups**: Set up automated database backups
7. **Monitoring**: Use services like Sentry, LogRocket, or DataDog

---

## Recommended Setup for Global Teams

### **Best Overall: Railway or Render**
- Easiest to set up
- Automatic HTTPS
- Good performance globally
- Managed database included
- ~$20-50/month

### **For Enterprise: AWS or Azure**
- Maximum reliability
- Global CDN
- Enterprise features
- Better for compliance
- ~$100-300/month

### **For Budget: DigitalOcean Droplet**
- Full control
- Cost-effective
- Good performance
- Requires technical knowledge
- ~$12-40/month

---

## Quick Start Recommendation

**For fastest deployment, use Render:**

1. Sign up at https://render.com
2. Connect your GitHub repository
3. Create a new Web Service
4. Select your repository
5. Add a PostgreSQL database
6. Set environment variables
7. Deploy!

**Total time: ~15 minutes**

---

## Migration Checklist

- [ ] Choose hosting platform
- [ ] Set up database (PostgreSQL/MySQL)
- [ ] Update database configuration
- [ ] Set environment variables
- [ ] Configure domain name
- [ ] Set up SSL certificate
- [ ] Test deployment
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Update API_BASE_URL in frontend
- [ ] Test from different locations
- [ ] Share access with team

---

## Support

For deployment help, refer to:
- Platform-specific documentation
- Your hosting provider's support
- TypeORM migration guides
- Node.js production best practices








