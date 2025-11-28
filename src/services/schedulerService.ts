import * as cron from 'node-cron';
import { EmailService } from './emailService';
import { PdfService } from './pdfService';
import { getDataSource } from '../database/config';
import { OrderEntity } from '../database/entities/Order';

export class SchedulerService {
  private emailService: EmailService;
  private pdfService: PdfService;
  private scheduledTask: cron.ScheduledTask | null = null;

  constructor(emailService: EmailService, pdfService: PdfService) {
    this.emailService = emailService;
    this.pdfService = pdfService;
  }

  /**
   * Start the daily email scheduler (runs at 15:32 (3:32 PM) every day, Johannesburg time)
   */
  startDailyEmailScheduler(): void {
    // Stop any existing scheduler first
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }

    // Cron expression: "32 15 * * *" means "at 15:32 (3:32 PM) every day"
    // Format: minute hour day month day-of-week
    const cronExpression = '55 18 * * *';
    console.log(`Setting up cron schedule: ${cronExpression} (18:55 / 6:55 PM)`);
    console.log(`Timezone: Africa/Johannesburg`);
    
    this.scheduledTask = cron.schedule(cronExpression, async () => {
      const triggerTime = new Date();
      console.log('='.repeat(60));
      console.log('📧 Daily email scheduler TRIGGERED');
      console.log('='.repeat(60));
      console.log('UTC time:', triggerTime.toISOString());
      console.log('Local time:', triggerTime.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));
      console.log('Johannesburg time:', new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));
      console.log('');
      
      try {
        await this.sendDailyReports();
        console.log('✅ Daily reports sent successfully');
      } catch (error) {
        console.error('❌ Error sending daily reports:', error);
      }
      console.log('='.repeat(60));
    }, {
      timezone: 'Africa/Johannesburg', // Johannesburg, South Africa timezone
    });

    // Verify the task was created
    if (this.scheduledTask) {
      console.log('✅ Daily email scheduler started successfully');
      console.log('   Schedule: Every day at 18:55 (6:55 PM)');
      console.log('   Timezone: Africa/Johannesburg');
      
      // Calculate and display next run time
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(18, 55, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      console.log(`   Next run: ${nextRun.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);
    } else {
      console.error('❌ Failed to start daily email scheduler!');
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('Daily email scheduler stopped.');
    }
  }

  /**
   * Manually trigger the daily reports (for testing)
   */
  async sendDailyReports(): Promise<void> {
    try {
      console.log('📊 Starting daily report generation...');
      console.log(`   Current time: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);

      // Check if email service is configured
      const config = this.emailService.getConfig();
      if (!config) {
        console.warn('⚠️  Email service not configured. Skipping daily reports.');
        console.warn('   Please configure email settings in .env file or via API');
        return;
      }
      
      console.log(`   Email configured: From ${config.from} to ${Array.isArray(config.to) ? config.to.join(', ') : config.to}`);

      // Fetch all active orders
      const orderRepository = getDataSource().getRepository(OrderEntity);
      const orders = await orderRepository.find({
        where: {
          // You can filter by status if needed, e.g., only ACTIVE orders
          // status: OrderStatus.ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });

      if (orders.length === 0) {
        console.log('No orders found. Skipping email.');
        return;
      }

      console.log(`Generating PDFs for ${orders.length} order(s)...`);

      // Generate PDFs for all orders
      const reports: Array<{ orderNumber: string; pdfBuffer: Buffer }> = [];
      for (const order of orders) {
        try {
          const pdfBuffer = await this.pdfService.generateOrderPDF(order.id);
          reports.push({
            orderNumber: order.orderNumber,
            pdfBuffer,
          });
          console.log(`Generated PDF for order ${order.orderNumber}`);
        } catch (error) {
          console.error(`Failed to generate PDF for order ${order.orderNumber}:`, error);
          // Continue with other orders even if one fails
        }
      }

      if (reports.length === 0) {
        console.warn('No PDFs were generated. Skipping email.');
        return;
      }

      // Send email with all reports
      await this.emailService.sendDailyReports(reports);
      console.log(`Successfully sent daily reports email with ${reports.length} order report(s).`);
    } catch (error) {
      console.error('Error in daily report scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; nextRun?: string } {
    const running = this.scheduledTask !== null;
    // Calculate next run time (15:21 / 3:21 PM today or tomorrow)
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(18, 54, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return {
      running,
      nextRun: running ? nextRun.toISOString() : undefined,
    };
  }
}


