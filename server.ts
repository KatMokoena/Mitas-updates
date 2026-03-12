import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// Load environment variables from .env file
dotenv.config();
import { initializeDatabase } from './src/database/config';
import { seedDatabase } from './src/database/seed';
import { apiRouter } from './src/api/server';
import { setEmailService, setSchedulerService } from './src/api/routes/email';
import { setInvitationsEmailService } from './src/api/routes/invitations';
import { setProjectsEmailService } from './src/api/routes/projects';
import { setOrdersEmailService } from './src/api/routes/orders';
import { setTasksEmailService } from './src/api/routes/tasks';
import { setRequisitionsEmailService } from './src/api/routes/requisitions';
import { EmailService } from './src/services/emailService';
import { PdfService } from './src/services/pdfService';
import { SchedulerService } from './src/services/schedulerService';

const app = express();
// In production, use port 3000. In dev, webpack dev server uses 3000, so API uses 3001
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

// Initialize services
let schedulerService: SchedulerService | null = null;
let isDatabaseReady = false;

// Initialize database and services
async function initializeServices(): Promise<void> {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    console.log('Seeding database...');
    await seedDatabase();
    console.log('Database seeded successfully');

    // Initialize email and scheduler services
    console.log('Initializing email service...');
    const emailService = new EmailService();
    emailService.configureFromEnv();
    
    // Check if email service was configured
    const emailConfigCheck = emailService.getConfig();
    if (emailConfigCheck) {
      console.log('✅ Email service configured successfully');
      console.log(`   SMTP Host: ${emailConfigCheck.host}`);
      console.log(`   SMTP Port: ${emailConfigCheck.port}`);
      console.log(`   From: ${emailConfigCheck.from}`);
    } else {
      console.warn('⚠️  Email service NOT configured - notification emails will not be sent');
      console.warn('   Please set SMTP_USER and SMTP_PASSWORD environment variables');
    }
    
    setEmailService(emailService);
    setInvitationsEmailService(emailService);
    setProjectsEmailService(emailService);
    setOrdersEmailService(emailService);
    setTasksEmailService(emailService);
    setRequisitionsEmailService(emailService);

    const pdfService = new PdfService();
    schedulerService = new SchedulerService(emailService, pdfService);
    setSchedulerService(schedulerService);

    // Start the daily email scheduler
    const emailConfig = emailService.getConfig();
    if (emailConfig) {
      console.log('Starting daily email scheduler (15:32 / 3:32 PM Johannesburg time)...');
      schedulerService.startDailyEmailScheduler();
    } else {
      console.warn('Email service not configured. Daily email scheduler will not start.');
      console.warn('To enable daily emails, set environment variables:');
      console.warn('  SMTP_HOST (default: smtp.office365.com)');
      console.warn('  SMTP_PORT (default: 587)');
      console.warn('  SMTP_SECURE (default: false)');
      console.warn('  SMTP_USER (your Outlook email address)');
      console.warn('  SMTP_PASSWORD (your Outlook password or app password)');
      console.warn('  EMAIL_FROM (sender email address)');
      console.warn('  EMAIL_TO (recipient email address(es))');
      console.warn('Or configure via API: POST /api/email/config (Admin only)');
    }

    isDatabaseReady = true;
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    console.error('Server will start but database operations will fail until initialization succeeds.');
    console.error('Please check the error above and restart the server.');
    // Don't set isDatabaseReady = true, so health checks will fail
  }
}

// Middleware to check database readiness for API routes (except health checks)
app.use('/api', (req, res, next) => {
  // Allow health check endpoints to work even if database isn't ready
  if (req.path === '/health' || req.path === '/auth/health') {
    return next();
  }
  
  if (!isDatabaseReady) {
    return res.status(503).json({ 
      error: 'Server is still initializing. Please wait and try again.',
      status: 'initializing'
    });
  }
  
  next();
});

// Mount API routes
app.use('/api', apiRouter);

// Serve static files from the public folder (images, uploads, etc.)
const publicPath = __dirname.includes('dist')
  ? path.join(__dirname, '..', 'public')
  : path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Serve static files from the React app
// When running from dist/server.js, __dirname is 'dist', so we need 'renderer'
// When running from server.ts directly, __dirname is project root, so we need 'dist/renderer'
const rendererPath = __dirname.includes('dist') 
  ? path.join(__dirname, 'renderer')
  : path.join(__dirname, 'dist', 'renderer');
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  // In development, webpack dev server handles the frontend on port 8080
  // This server only handles API requests
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    // Redirect non-API requests to webpack dev server
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Development Mode</title>
          <meta http-equiv="refresh" content="0; url=http://localhost:8080">
        </head>
        <body>
          <h1>Development Mode</h1>
          <p>This is the API server (port ${PORT}).</p>
          <p>The React app is running on <a href="http://localhost:8080">http://localhost:8080</a></p>
          <p>Redirecting...</p>
          <script>window.location.href = 'http://localhost:8080';</script>
        </body>
      </html>
    `);
  });
} else if (fs.existsSync(rendererPath)) {
  // Production: serve static files
  app.use(express.static(rendererPath));
  
  // Serve index.html for all routes (SPA routing)
  app.get('*', (req, res) => {
    // Don't serve HTML for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(rendererPath, 'index.html'));
  });
} else {
  console.warn('Renderer build not found. Run "npm run build:renderer" first.');
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.send('Please build the renderer first: npm run build:renderer');
  });
}

// Start the server after initializing services
(async () => {
  try {
    // Initialize services first
    await initializeServices();
    
    // Check for SSL certificates
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'key.pem');
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'cert.pem');
    const useHttps = process.env.USE_HTTPS === 'true' || (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath));
    
    if (useHttps) {
      try {
        const key = fs.readFileSync(sslKeyPath);
        const cert = fs.readFileSync(sslCertPath);
        
        const httpsServer = https.createServer({ key, cert }, app);
        httpsServer.listen(PORT, () => {
          console.log(`\n🔒 Server running with HTTPS at https://localhost:${PORT}`);
          console.log(`📊 API available at https://localhost:${PORT}/api`);
          if (isDatabaseReady) {
            console.log(`✅ Database is ready - login should work`);
          } else {
            console.log(`⚠️  Database initialization failed - login will not work`);
          }
          if (isDevelopment) {
            console.log(`\n⚠️  Development Mode: React app is on http://localhost:8080`);
            console.log(`   Open your browser and navigate to: http://localhost:8080\n`);
          } else {
            console.log(`\nOpen your browser and navigate to: https://localhost:${PORT}`);
            console.log(`   (Note: You may see a security warning for self-signed certificates)`);
            console.log(`   Click "Advanced" → "Proceed to localhost" to continue\n`);
          }
        });
      } catch (sslError) {
        console.error('❌ Failed to load SSL certificates:', sslError);
        console.error('   Falling back to HTTP...');
        startHttpServer();
      }
    } else {
      startHttpServer();
    }
    
    function startHttpServer() {
      const httpServer = http.createServer(app);
      httpServer.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
        if (isDatabaseReady) {
          console.log(`✅ Database is ready - login should work`);
        } else {
          console.log(`⚠️  Database initialization failed - login will not work`);
        }
        if (isDevelopment) {
          console.log(`\n⚠️  Development Mode: React app is on http://localhost:8080`);
          console.log(`   Open your browser and navigate to: http://localhost:8080\n`);
        } else {
          console.log(`\nOpen your browser and navigate to: http://localhost:${PORT}`);
          console.log(`\n⚠️  Note: For HTTPS (secure connection), set USE_HTTPS=true in .env`);
          console.log(`   and provide SSL certificates in the ssl/ directory\n`);
        }
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

