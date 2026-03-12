import * as cron from 'node-cron';
import { EmailService } from './emailService';
import { PdfService } from './pdfService';
import { getDataSource } from '../database/config';
import { OrderEntity } from '../database/entities/Order';

export class SchedulerService {
  private emailService: EmailService;
  private pdfService: PdfService;
  private scheduledTask: cron.ScheduledTask | null = null;
  private scheduledHour: number = 18; // Default: 6 PM
  private scheduledMinute: number = 55; // Default: 55 minutes past the hour

  constructor(emailService: EmailService, pdfService: PdfService) {
    this.emailService = emailService;
    this.pdfService = pdfService;
    this.loadScheduleFromEnv();
  }

  /**
   * Load schedule time from environment variables
   * Supports format: HH:MM (24-hour format)
   * Example: EMAIL_SCHEDULE_TIME=18:55 or EMAIL_SCHEDULE_TIME=08:00
   */
  private loadScheduleFromEnv(): void {
    const scheduleTime = process.env.EMAIL_SCHEDULE_TIME || '';
    
    if (scheduleTime) {
      // Parse time in format HH:MM
      const timeMatch = scheduleTime.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          this.scheduledHour = hour;
          this.scheduledMinute = minute;
          console.log(`📅 Email schedule time loaded from .env: ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        } else {
          console.warn(`⚠️  Invalid EMAIL_SCHEDULE_TIME format: ${scheduleTime}. Using default: 18:55`);
        }
      } else {
        console.warn(`⚠️  Invalid EMAIL_SCHEDULE_TIME format: ${scheduleTime}. Expected HH:MM (24-hour format). Using default: 18:55`);
      }
    } else {
      console.log(`📅 Using default email schedule time: 18:55 (set EMAIL_SCHEDULE_TIME in .env to customize)`);
    }
  }

  /**
   * Start the daily email scheduler
   * Time is configurable via EMAIL_SCHEDULE_TIME environment variable (format: HH:MM)
   * Default: 18:55 (6:55 PM) Johannesburg time
   */
  startDailyEmailScheduler(): void {
    // Stop any existing scheduler first
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }

    // Reload schedule from env in case it changed
    this.loadScheduleFromEnv();

    // Cron expression: "minute hour * * *" means "at hour:minute every day"
    // Format: minute hour day month day-of-week
    const cronExpression = `${this.scheduledMinute} ${this.scheduledHour} * * *`;
    const timeString = `${String(this.scheduledHour).padStart(2, '0')}:${String(this.scheduledMinute).padStart(2, '0')}`;
    const time12Hour = this.scheduledHour > 12 
      ? `${this.scheduledHour - 12}:${String(this.scheduledMinute).padStart(2, '0')} PM`
      : this.scheduledHour === 12
      ? `12:${String(this.scheduledMinute).padStart(2, '0')} PM`
      : this.scheduledHour === 0
      ? `12:${String(this.scheduledMinute).padStart(2, '0')} AM`
      : `${this.scheduledHour}:${String(this.scheduledMinute).padStart(2, '0')} AM`;
    
    console.log(`Setting up cron schedule: ${cronExpression} (${timeString} / ${time12Hour})`);
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
      const timeString = `${String(this.scheduledHour).padStart(2, '0')}:${String(this.scheduledMinute).padStart(2, '0')}`;
      const time12Hour = this.scheduledHour > 12 
        ? `${this.scheduledHour - 12}:${String(this.scheduledMinute).padStart(2, '0')} PM`
        : this.scheduledHour === 12
        ? `12:${String(this.scheduledMinute).padStart(2, '0')} PM`
        : this.scheduledHour === 0
        ? `12:${String(this.scheduledMinute).padStart(2, '0')} AM`
        : `${this.scheduledHour}:${String(this.scheduledMinute).padStart(2, '0')} AM`;
      
      console.log('✅ Daily email scheduler started successfully');
      console.log(`   Schedule: Every day at ${timeString} (${time12Hour})`);
      console.log('   Timezone: Africa/Johannesburg');
      
      // Calculate and display next run time
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(this.scheduledHour, this.scheduledMinute, 0, 0);
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
        console.log('No orders found. Sending notification email without PDFs...');
        // Send email indicating no active projects
        await this.emailService.sendDailyReports([]);
        console.log('✅ Notification email sent (no active projects)');
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
  getStatus(): { running: boolean; nextRun?: string; scheduleTime?: string } {
    const running = this.scheduledTask !== null;
    // Calculate next run time using configured schedule
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(this.scheduledHour, this.scheduledMinute, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeString = `${String(this.scheduledHour).padStart(2, '0')}:${String(this.scheduledMinute).padStart(2, '0')}`;

    return {
      running,
      nextRun: running ? nextRun.toISOString() : undefined,
      scheduleTime: timeString,
    };
  }
}


