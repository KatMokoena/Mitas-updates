import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config();
import { initializeDatabase } from './src/database/config';
import { seedDatabase } from './src/database/seed';
import { apiRouter } from './src/api/server';
import { setEmailService, setSchedulerService } from './src/api/routes/email';
import { EmailService } from './src/services/emailService';
import { PdfService } from './src/services/pdfService';
import { SchedulerService } from './src/services/schedulerService';

const app = express();
// In production, use port 3000. In dev, webpack dev server uses 3000, so API uses 3001
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

// Initialize services
let schedulerService: SchedulerService | null = null;

// Initialize database and services
(async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized');
    
    console.log('Seeding database...');
    await seedDatabase();
    console.log('Database seeded');

    // Initialize email and scheduler services
    console.log('Initializing email service...');
    const emailService = new EmailService();
    emailService.configureFromEnv();
    setEmailService(emailService);

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
  } catch (error) {
    console.error('Initialization failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
  }
})();

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

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  if (isDevelopment) {
    console.log(`\n⚠️  Development Mode: React app is on http://localhost:8080`);
    console.log(`   Open your browser and navigate to: http://localhost:8080\n`);
  } else {
    console.log(`\nOpen your browser and navigate to: http://localhost:${PORT}\n`);
  }
});

