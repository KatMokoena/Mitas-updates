# Custom Email Tracking & SLA Management System
## Implementation Plan for MITAS IPMP

## Executive Summary

This document outlines the design and implementation plan for a **custom-built email tracking and SLA management system** integrated directly into the MITAS IPMP. This solution will provide the same capabilities as third-party services like TimeToReply, but with full control, no subscription costs, and complete customization to our specific needs.

---

## 1. System Overview

### 1.1 Core Capabilities

The custom system will provide:
- **Email Open Tracking**: Track when emails are opened using tracking pixels
- **Response Time Measurement**: Calculate time from email sent to first action (open/reply)
- **SLA Compliance Monitoring**: Monitor response times against defined thresholds
- **Real-time Alerts**: Notify when SLAs are at risk or breached
- **Analytics Dashboard**: Visualize email performance and SLA compliance
- **Audit Trail**: Complete history of all email events

### 1.2 Advantages Over Third-Party Solutions

- **No Subscription Costs**: Built into existing infrastructure
- **Full Control**: Complete customization and data ownership
- **Privacy**: All data stays within your system
- **Integration**: Seamless integration with existing IPMP features
- **Customization**: Tailored to specific SLA requirements
- **No External Dependencies**: No reliance on third-party API availability

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MITAS IPMP System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────────┐                │
│  │ EmailService │──────│ EmailTracking    │                │
│  │ (nodemailer) │      │ Service          │                │
│  └──────────────┘      └──────────────────┘                │
│         │                      │                             │
│         │                      │                             │
│         ▼                      ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │   Email Tracking Database Entities   │                   │
│  │  - EmailTrackingEntity               │                   │
│  │  - EmailEventEntity                  │                   │
│  │  - SLAMetricEntity                   │                   │
│  │  - SLAAlertEntity                    │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │   Tracking Pixel Endpoint            │                   │
│  │  GET /api/email-tracking/:trackingId │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │   SLA Monitoring Service             │                   │
│  │  - SLA Calculation                   │                   │
│  │  - Breach Detection                  │                   │
│  │  - Alert Generation                  │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │   Analytics API Endpoints             │                   │
│  │  GET /api/email-analytics            │                   │
│  │  GET /api/sla-status                 │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Email Sending with Tracking**:
   ```
   IPMP → EmailService → Generate Tracking ID 
   → Store in EmailTrackingEntity → Inject Tracking Pixel 
   → Send Email via nodemailer → Recipient
   ```

2. **Email Open Tracking**:
   ```
   Recipient Opens Email → Tracking Pixel Loads 
   → GET /api/email-tracking/:trackingId → Record Open Event 
   → Update EmailTrackingEntity → Check SLA Status
   ```

3. **Response Tracking**:
   ```
   User Takes Action (Accept/Decline/Reply) → API Call 
   → Update EmailTrackingEntity → Calculate Response Time 
   → Check SLA Compliance → Trigger Alert if Breached
   ```

---

## 3. Database Schema Design

### 3.1 Email Tracking Entity

```typescript
// src/database/entities/EmailTracking.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('email_tracking')
export class EmailTrackingEntity {
  @PrimaryColumn('uuid')
  id!: string; // Tracking ID (UUID)

  // Context - What is this email about?
  @Column('uuid', { nullable: true })
  orderId?: string;

  @Column('uuid', { nullable: true })
  projectId?: string;

  @Column('uuid', { nullable: true })
  taskId?: string;

  @Column('uuid', { nullable: true })
  requisitionId?: string;

  @Column('uuid', { nullable: true })
  invitationId?: string;

  @Column('text')
  emailType!: string; // 'task_assignment', 'task_completion', 'project_completion', 'requisition', 'ownership_transfer', etc.

  // Recipient Information
  @Column('uuid')
  recipientId!: string; // User ID of recipient

  @Column('text')
  @Index()
  recipientEmail!: string;

  // Sender Information
  @Column('uuid')
  senderId!: string; // User ID of sender (system or user)

  @Column('text')
  senderEmail!: string;

  // Email Details
  @Column('text')
  subject!: string;

  @Column('text', { nullable: true })
  messageId?: string; // SMTP message ID

  // Tracking Status
  @Column({ type: 'datetime' })
  @Index()
  sentAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  @Index()
  openedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  @Index()
  firstActionAt?: Date; // First meaningful action (accept, decline, reply, etc.)

  @Column('int', { nullable: true })
  responseTimeMinutes?: number; // Time to first action in minutes

  @Column('text', { default: 'sent' })
  status!: string; // 'sent', 'delivered', 'opened', 'action_taken', 'expired', 'failed'

  // SLA Configuration
  @Column('int', { nullable: true })
  slaThresholdMinutes?: number; // SLA threshold for this email type

  @Column('boolean', { default: false })
  slaBreached!: boolean; // Whether SLA was breached

  @Column({ type: 'datetime', nullable: true })
  slaDeadline?: Date; // Calculated deadline based on threshold

  @Column('int', { nullable: true })
  slaWarningMinutes?: number; // Minutes before deadline to send warning

  @Column('boolean', { default: false })
  slaWarningSent!: boolean; // Whether warning has been sent

  // Metadata
  @Column('text', { nullable: true, type: 'text' })
  metadata?: string; // JSON string with additional context

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 3.2 Email Event Entity

```typescript
// src/database/entities/EmailEvent.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('email_events')
export class EmailEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  emailTrackingId!: string; // Foreign key to EmailTrackingEntity

  @Column('text')
  eventType!: string; // 'sent', 'delivered', 'opened', 'clicked', 'action_taken', 'bounced', 'expired'

  @Column({ type: 'datetime' })
  @Index()
  eventTimestamp!: Date;

  @Column('text', { nullable: true })
  ipAddress?: string; // IP address of the event (for opens)

  @Column('text', { nullable: true })
  userAgent?: string; // User agent string

  @Column('text', { nullable: true, type: 'text' })
  metadata?: string; // JSON string with additional event data

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 3.3 SLA Metric Entity

```typescript
// src/database/entities/SLAMetric.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sla_metrics')
export class SLAMetricEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('text')
  @Index()
  emailType!: string; // Type of email being tracked

  @Column('int')
  slaThresholdMinutes!: number; // SLA threshold in minutes

  // Period Information
  @Column({ type: 'datetime' })
  @Index()
  periodStart!: Date; // Start of measurement period

  @Column({ type: 'datetime' })
  @Index()
  periodEnd!: Date; // End of measurement period

  // Metrics
  @Column('int', { default: 0 })
  totalEmails!: number; // Total emails sent of this type

  @Column('int', { default: 0 })
  emailsOpened!: number; // Emails that were opened

  @Column('int', { default: 0 })
  emailsActionTaken!: number; // Emails with action taken

  @Column('int', { default: 0 })
  emailsWithinSLA!: number; // Emails responded to within SLA

  @Column('int', { default: 0 })
  emailsBreachedSLA!: number; // Emails that breached SLA

  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  averageResponseTimeMinutes?: number; // Average response time

  @Column('decimal', { nullable: true, precision: 5, scale: 2 })
  openRate?: number; // Percentage of emails opened (0-100)

  @Column('decimal', { nullable: true, precision: 5, scale: 2 })
  actionRate?: number; // Percentage of emails with action taken (0-100)

  @Column('decimal', { nullable: true, precision: 5, scale: 2 })
  slaComplianceRate?: number; // Percentage compliance (0-100)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 3.4 SLA Alert Entity

```typescript
// src/database/entities/SLAAlert.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('sla_alerts')
export class SLAAlertEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  emailTrackingId!: string; // Foreign key to EmailTrackingEntity

  @Column('text')
  alertType!: string; // 'warning', 'breach', 'escalation'

  @Column('text')
  severity!: string; // 'low', 'medium', 'high', 'critical'

  @Column('text')
  message!: string; // Alert message

  @Column('uuid', { nullable: true })
  notifiedUserId?: string; // User who was notified

  @Column('boolean', { default: false })
  acknowledged!: boolean; // Whether alert was acknowledged

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt?: Date;

  @Column('uuid', { nullable: true })
  acknowledgedBy?: string; // User who acknowledged

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
```

---

## 4. Implementation Plan

### Phase 1: Database & Core Services (Week 1-2)

#### 4.1.1 Create Database Entities
- Create `EmailTrackingEntity`
- Create `EmailEventEntity`
- Create `SLAMetricEntity`
- Create `SLAAlertEntity`
- Update `src/database/entities/index.ts`
- Update `src/database/config.ts`

#### 4.1.2 Email Tracking Service
- **File**: `src/services/emailTrackingService.ts`
- **Purpose**: Core service for email tracking operations
- **Key Methods**:
  - `createTrackingRecord()` - Create new tracking record
  - `recordEmailOpen()` - Record when email is opened
  - `recordEmailAction()` - Record when user takes action
  - `calculateResponseTime()` - Calculate time to response
  - `checkSLACompliance()` - Check if SLA is met/breached

#### 4.1.3 SLA Service
- **File**: `src/services/slaService.ts`
- **Purpose**: SLA calculation and monitoring
- **Key Methods**:
  - `calculateSLAMetrics()` - Calculate compliance metrics
  - `checkSLAStatus()` - Check current SLA status
  - `generateSLAAlerts()` - Generate alerts for breaches
  - `getSLAThreshold()` - Get SLA threshold for email type

### Phase 2: Email Service Integration (Week 2-3)

#### 4.2.1 Enhance EmailService
- Modify `sendEmail()` to:
  1. Generate unique tracking ID (UUID)
  2. Create tracking record in database
  3. Inject tracking pixel into HTML
  4. Store tracking metadata
- Update all email sending methods to include tracking

#### 4.2.2 Tracking Pixel Injection
- Create utility function to inject tracking pixel
- Format: `<img src="{baseUrl}/api/email-tracking/{trackingId}.png" width="1" height="1" style="display:none">`
- Ensure pixel is invisible and doesn't affect email layout

### Phase 3: Tracking Endpoint (Week 3)

#### 4.3.1 Tracking Pixel Endpoint
- **Route**: `GET /api/email-tracking/:trackingId.png`
- **Purpose**: Serve tracking pixel and record email open
- **Functionality**:
  1. Return 1x1 transparent PNG image
  2. Record open event in database
  3. Update EmailTrackingEntity
  4. Check SLA status
  5. Trigger alerts if needed

#### 4.3.2 Action Tracking
- Update existing API endpoints to record actions:
  - Task acceptance → Record action
  - Requisition approval/rejection → Record action
  - Ownership transfer acceptance/rejection → Record action
  - Calculate response time
  - Update SLA status

### Phase 4: SLA Monitoring (Week 4)

#### 4.4.1 Background SLA Monitor
- **File**: `src/services/slaMonitorService.ts`
- **Purpose**: Background service to monitor SLA compliance
- **Functionality**:
  - Periodic check of pending emails
  - Calculate time until SLA deadline
  - Send warnings before deadline
  - Detect SLA breaches
  - Generate alerts

#### 4.4.2 SLA Alert System
- Email alerts to project managers when SLA at risk
- In-app notifications for SLA breaches
- Escalation rules for critical emails

### Phase 5: Analytics API (Week 5)

#### 4.5.1 Analytics Endpoints
- `GET /api/email-analytics` - Overall analytics
- `GET /api/email-analytics/:emailType` - Analytics by type
- `GET /api/email-analytics/user/:userId` - User-specific analytics
- `GET /api/sla-status` - Current SLA compliance status
- `GET /api/sla-status/:emailType` - SLA status by type
- `GET /api/sla-breaches` - List of SLA breaches
- `GET /api/email-tracking/:trackingId` - Individual email tracking

#### 4.5.2 Metrics Calculation
- Calculate open rates
- Calculate action rates
- Calculate average response times
- Calculate SLA compliance rates
- Generate time-based trends

### Phase 6: Frontend Dashboard (Week 6)

#### 4.6.1 Email Analytics Dashboard
- **Component**: `src/renderer/components/EmailAnalytics.tsx`
- **Features**:
  - Overall email performance metrics
  - SLA compliance dashboard
  - Email type breakdown
  - User performance rankings
  - Time-based charts
  - Filterable by date range, user, email type

#### 4.6.2 SLA Dashboard
- **Component**: `src/renderer/components/SLADashboard.tsx`
- **Features**:
  - Current SLA compliance rates
  - Breached SLA alerts
  - Trend indicators
  - Email type comparison
  - User performance metrics

#### 4.6.3 Email Tracking Badge
- **Component**: `src/renderer/components/EmailTrackingBadge.tsx`
- **Features**:
  - Display email status (Sent/Opened/Action Taken)
  - Show response time
  - Color-coded indicators
  - SLA status indicator

---

## 5. Technical Implementation

### 5.1 Email Tracking Service

```typescript
// src/services/emailTrackingService.ts
import { getDataSource } from '../database/config';
import { EmailTrackingEntity } from '../database/entities/EmailTracking';
import { EmailEventEntity } from '../database/entities/EmailEvent';
import { v4 as uuidv4 } from 'uuid';

export interface EmailTrackingParams {
  emailType: string;
  recipientId: string;
  recipientEmail: string;
  senderId: string;
  senderEmail: string;
  subject: string;
  orderId?: string;
  projectId?: string;
  taskId?: string;
  requisitionId?: string;
  invitationId?: string;
  slaThresholdMinutes?: number;
  slaWarningMinutes?: number;
}

export class EmailTrackingService {
  /**
   * Create a new email tracking record
   */
  async createTrackingRecord(params: EmailTrackingParams): Promise<string> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    
    const trackingId = uuidv4();
    const sentAt = new Date();
    
    // Calculate SLA deadline if threshold is set
    let slaDeadline: Date | undefined;
    if (params.slaThresholdMinutes) {
      slaDeadline = new Date(sentAt.getTime() + params.slaThresholdMinutes * 60 * 1000);
    }

    const tracking = trackingRepository.create({
      id: trackingId,
      emailType: params.emailType,
      recipientId: params.recipientId,
      recipientEmail: params.recipientEmail,
      senderId: params.senderId,
      senderEmail: params.senderEmail,
      subject: params.subject,
      orderId: params.orderId,
      projectId: params.projectId,
      taskId: params.taskId,
      requisitionId: params.requisitionId,
      invitationId: params.invitationId,
      sentAt,
      status: 'sent',
      slaThresholdMinutes: params.slaThresholdMinutes,
      slaDeadline,
      slaWarningMinutes: params.slaWarningMinutes,
    });

    await trackingRepository.save(tracking);

    // Create initial event
    await this.recordEvent(trackingId, 'sent', {
      timestamp: sentAt,
    });

    return trackingId;
  }

  /**
   * Record email open event
   */
  async recordEmailOpen(
    trackingId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    const tracking = await trackingRepository.findOne({ where: { id: trackingId } });

    if (!tracking) {
      console.warn(`Tracking record not found: ${trackingId}`);
      return;
    }

    // Only record first open
    if (!tracking.openedAt) {
      const openedAt = new Date();
      tracking.openedAt = openedAt;
      tracking.status = 'opened';
      await trackingRepository.save(tracking);

      await this.recordEvent(trackingId, 'opened', {
        timestamp: openedAt,
        ipAddress,
        userAgent,
      });
    }
  }

  /**
   * Record when user takes action (accept, decline, reply, etc.)
   */
  async recordEmailAction(
    trackingId: string,
    actionType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    const tracking = await trackingRepository.findOne({ where: { id: trackingId } });

    if (!tracking) {
      console.warn(`Tracking record not found: ${trackingId}`);
      return;
    }

    // Only record first action
    if (!tracking.firstActionAt) {
      const actionAt = new Date();
      tracking.firstActionAt = actionAt;
      tracking.status = 'action_taken';

      // Calculate response time
      if (tracking.sentAt) {
        const responseTime = (actionAt.getTime() - tracking.sentAt.getTime()) / (1000 * 60);
        tracking.responseTimeMinutes = Math.round(responseTime);

        // Check SLA compliance
        if (tracking.slaThresholdMinutes && tracking.responseTimeMinutes > tracking.slaThresholdMinutes) {
          tracking.slaBreached = true;
        }
      }

      await trackingRepository.save(tracking);

      await this.recordEvent(trackingId, 'action_taken', {
        timestamp: actionAt,
        actionType,
        ...metadata,
      });
    }
  }

  /**
   * Record an event
   */
  private async recordEvent(
    trackingId: string,
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    const eventRepository = getDataSource().getRepository(EmailEventEntity);
    
    const event = eventRepository.create({
      id: uuidv4(),
      emailTrackingId: trackingId,
      eventType,
      eventTimestamp: data.timestamp || new Date(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: JSON.stringify(data),
    });

    await eventRepository.save(event);
  }

  /**
   * Get tracking record
   */
  async getTrackingRecord(trackingId: string): Promise<EmailTrackingEntity | null> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    return await trackingRepository.findOne({ where: { id: trackingId } });
  }
}
```

### 5.2 SLA Service

```typescript
// src/services/slaService.ts
import { getDataSource } from '../database/config';
import { EmailTrackingEntity } from '../database/entities/EmailTracking';
import { SLAMetricEntity } from '../database/entities/SLAMetric';
import { SLAAlertEntity } from '../database/entities/SLAAlert';
import { v4 as uuidv4 } from 'uuid';

// Default SLA thresholds (in minutes)
export const DEFAULT_SLA_THRESHOLDS: Record<string, number> = {
  task_assignment: 60,           // 1 hour to acknowledge task
  task_completion: 0,            // No SLA (notification only)
  requisition_approval: 240,     // 4 hours to approve/reject
  ownership_transfer: 1440,     // 24 hours to accept/decline
  project_completion: 0,         // No SLA (notification only)
  order_completion: 0,          // No SLA (notification only)
  task_invitation: 1440,        // 24 hours to accept/decline
};

export class SLAService {
  /**
   * Get SLA threshold for email type
   */
  getSLAThreshold(emailType: string): number {
    // Check environment variables first
    const envKey = `SLA_${emailType.toUpperCase().replace(/-/g, '_')}`;
    const envValue = process.env[envKey];
    if (envValue) {
      return parseInt(envValue, 10);
    }

    // Fall back to defaults
    return DEFAULT_SLA_THRESHOLDS[emailType] || 0;
  }

  /**
   * Check SLA status for a tracking record
   */
  async checkSLAStatus(trackingId: string): Promise<{
    status: 'pending' | 'within_sla' | 'at_risk' | 'breached';
    timeRemaining?: number;
    timeOverdue?: number;
  }> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    const tracking = await trackingRepository.findOne({ where: { id: trackingId } });

    if (!tracking || !tracking.slaThresholdMinutes || !tracking.slaDeadline) {
      return { status: 'pending' };
    }

    const now = new Date();
    const deadline = new Date(tracking.slaDeadline);

    if (tracking.slaBreached || tracking.firstActionAt) {
      if (tracking.slaBreached) {
        const overdue = (now.getTime() - deadline.getTime()) / (1000 * 60);
        return { status: 'breached', timeOverdue: Math.round(overdue) };
      } else {
        return { status: 'within_sla' };
      }
    }

    // Check if at risk (within warning period)
    if (tracking.slaWarningMinutes) {
      const warningTime = new Date(deadline.getTime() - tracking.slaWarningMinutes * 60 * 1000);
      if (now >= warningTime && now < deadline) {
        const remaining = (deadline.getTime() - now.getTime()) / (1000 * 60);
        return { status: 'at_risk', timeRemaining: Math.round(remaining) };
      }
    }

    if (now >= deadline) {
      tracking.slaBreached = true;
      await trackingRepository.save(tracking);
      await this.createSLAAlert(trackingId, 'breach', 'SLA deadline has been breached');
      return { status: 'breached', timeOverdue: 0 };
    }

    const remaining = (deadline.getTime() - now.getTime()) / (1000 * 60);
    return { status: 'pending', timeRemaining: Math.round(remaining) };
  }

  /**
   * Create SLA alert
   */
  async createSLAAlert(
    trackingId: string,
    alertType: 'warning' | 'breach' | 'escalation',
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const alertRepository = getDataSource().getRepository(SLAAlertEntity);
    
    const alert = alertRepository.create({
      id: uuidv4(),
      emailTrackingId: trackingId,
      alertType,
      severity,
      message,
    });

    await alertRepository.save(alert);
  }

  /**
   * Calculate SLA metrics for a period
   */
  async calculateSLAMetrics(
    emailType: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SLAMetricEntity> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    const metricRepository = getDataSource().getRepository(SLAMetricEntity);

    // Get all emails of this type in the period
    const emails = await trackingRepository.find({
      where: {
        emailType,
        sentAt: {
          $gte: periodStart,
          $lte: periodEnd,
        } as any,
      },
    });

    const threshold = this.getSLAThreshold(emailType);
    const total = emails.length;
    const opened = emails.filter(e => e.openedAt).length;
    const actionTaken = emails.filter(e => e.firstActionAt).length;
    const withinSLA = emails.filter(e => 
      e.firstActionAt && 
      e.responseTimeMinutes && 
      e.responseTimeMinutes <= threshold &&
      !e.slaBreached
    ).length;
    const breached = emails.filter(e => e.slaBreached).length;

    const avgResponseTime = actionTaken > 0
      ? emails
          .filter(e => e.responseTimeMinutes)
          .reduce((sum, e) => sum + (e.responseTimeMinutes || 0), 0) / actionTaken
      : 0;

    const openRate = total > 0 ? (opened / total) * 100 : 0;
    const actionRate = total > 0 ? (actionTaken / total) * 100 : 0;
    const complianceRate = actionTaken > 0 ? (withinSLA / actionTaken) * 100 : 0;

    // Check if metric already exists for this period
    let metric = await metricRepository.findOne({
      where: {
        emailType,
        periodStart,
        periodEnd,
      },
    });

    if (metric) {
      // Update existing metric
      metric.totalEmails = total;
      metric.emailsOpened = opened;
      metric.emailsActionTaken = actionTaken;
      metric.emailsWithinSLA = withinSLA;
      metric.emailsBreachedSLA = breached;
      metric.averageResponseTimeMinutes = avgResponseTime;
      metric.openRate = openRate;
      metric.actionRate = actionRate;
      metric.slaComplianceRate = complianceRate;
      await metricRepository.save(metric);
    } else {
      // Create new metric
      metric = metricRepository.create({
        id: uuidv4(),
        emailType,
        slaThresholdMinutes: threshold,
        periodStart,
        periodEnd,
        totalEmails: total,
        emailsOpened: opened,
        emailsActionTaken: actionTaken,
        emailsWithinSLA: withinSLA,
        emailsBreachedSLA: breached,
        averageResponseTimeMinutes: avgResponseTime,
        openRate,
        actionRate,
        slaComplianceRate: complianceRate,
      });
      await metricRepository.save(metric);
    }

    return metric;
  }

  /**
   * Monitor pending emails and check SLA status
   */
  async monitorSLAs(): Promise<void> {
    const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
    
    // Get all pending emails with SLA thresholds
    const pendingEmails = await trackingRepository.find({
      where: {
        status: { $in: ['sent', 'opened'] } as any,
        slaThresholdMinutes: { $ne: null } as any,
        slaBreached: false,
        firstActionAt: null,
      },
    });

    const now = new Date();

    for (const email of pendingEmails) {
      if (!email.slaDeadline) continue;

      const deadline = new Date(email.slaDeadline);
      const warningTime = email.slaWarningMinutes
        ? new Date(deadline.getTime() - email.slaWarningMinutes * 60 * 1000)
        : null;

      // Check if SLA breached
      if (now >= deadline) {
        email.slaBreached = true;
        email.status = 'expired';
        await trackingRepository.save(email);
        await this.createSLAAlert(email.id, 'breach', `SLA deadline breached for ${email.emailType}`, 'high');
      }
      // Check if warning should be sent
      else if (warningTime && now >= warningTime && !email.slaWarningSent) {
        email.slaWarningSent = true;
        await trackingRepository.save(email);
        const remaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60));
        await this.createSLAAlert(
          email.id,
          'warning',
          `SLA deadline approaching: ${remaining} minutes remaining for ${email.emailType}`,
          'medium'
        );
      }
    }
  }
}
```

### 5.3 Enhanced Email Service

```typescript
// Enhanced EmailService.sendEmail method
async sendEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  trackingMetadata?: {
    emailType: string;
    orderId?: string;
    projectId?: string;
    taskId?: string;
    requisitionId?: string;
    invitationId?: string;
    recipientId: string;
    senderId: string;
  }
): Promise<{ messageId: string; trackingId?: string }> {
  if (!this.transporter || !this.config) {
    throw new Error('Email service not configured');
  }

  const recipients = Array.isArray(to) ? to.join(', ') : to;
  if (!recipients) {
    throw new Error('No recipient email address specified');
  }

  let trackingId: string | undefined;

  // Create tracking record if metadata provided
  if (trackingMetadata && emailTrackingService) {
    try {
      const slaThreshold = slaService.getSLAThreshold(trackingMetadata.emailType);
      const slaWarning = slaThreshold > 0 ? Math.floor(slaThreshold * 0.2) : undefined; // 20% warning

      trackingId = await emailTrackingService.createTrackingRecord({
        emailType: trackingMetadata.emailType,
        recipientId: trackingMetadata.recipientId,
        recipientEmail: Array.isArray(to) ? to[0] : to,
        senderId: trackingMetadata.senderId,
        senderEmail: this.config.from,
        subject,
        orderId: trackingMetadata.orderId,
        projectId: trackingMetadata.projectId,
        taskId: trackingMetadata.taskId,
        requisitionId: trackingMetadata.requisitionId,
        invitationId: trackingMetadata.invitationId,
        slaThresholdMinutes: slaThreshold > 0 ? slaThreshold : undefined,
        slaWarningMinutes: slaWarning,
      });

      // Inject tracking pixel
      htmlContent = this.injectTrackingPixel(htmlContent, trackingId);
    } catch (error) {
      console.error('Failed to create tracking record:', error);
      // Continue with email sending even if tracking fails
    }
  }

  const mailOptions: any = {
    from: this.config.from,
    to: recipients,
    subject,
    html: htmlContent,
  };

  try {
    const info = await this.transporter.sendMail(mailOptions);
    
    // Update tracking record with message ID if available
    if (trackingId && info.messageId) {
      try {
        const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
        const tracking = await trackingRepository.findOne({ where: { id: trackingId } });
        if (tracking) {
          tracking.messageId = info.messageId;
          await trackingRepository.save(tracking);
        }
      } catch (error) {
        console.error('Failed to update tracking with message ID:', error);
      }
    }

    console.log(`Email sent successfully to ${recipients}${trackingId ? ` (Tracking ID: ${trackingId})` : ''}`);
    return { messageId: info.messageId, trackingId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

private injectTrackingPixel(htmlContent: string, trackingId: string): string {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
  const trackingPixel = `<img src="${baseUrl}/api/email-tracking/${trackingId}.png" width="1" height="1" style="display:none;width:1px;height:1px;border:none;opacity:0;" alt="" />`;
  
  // Insert before closing body tag, or at the end if no body tag
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  } else {
    return htmlContent + trackingPixel;
  }
}
```

### 5.4 Tracking Pixel Endpoint

```typescript
// src/api/routes/emailTracking.ts
import { Router, Response } from 'express';
import { getDataSource } from '../../database/config';
import { EmailTrackingEntity } from '../../database/entities/EmailTracking';
import { EmailTrackingService } from '../../services/emailTrackingService';

const router = Router();
const emailTrackingService = new EmailTrackingService();

// Serve tracking pixel and record email open
router.get('/:trackingId.png', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Record email open
    await emailTrackingService.recordEmailOpen(trackingId, ipAddress as string, userAgent);

    // Return 1x1 transparent PNG
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pixel);
  } catch (error) {
    console.error('Failed to process tracking pixel:', error);
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/png');
    res.send(pixel);
  }
});

// Get tracking status
router.get('/:trackingId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackingId } = req.params;
    const tracking = await emailTrackingService.getTrackingRecord(trackingId);

    if (!tracking) {
      return res.status(404).json({ error: 'Tracking record not found' });
    }

    res.json(tracking);
  } catch (error) {
    console.error('Failed to get tracking record:', error);
    res.status(500).json({ error: 'Failed to get tracking record' });
  }
});

export default router;
```

### 5.5 Action Tracking Integration

Update existing endpoints to record actions:

```typescript
// Example: In task invitation accept endpoint
router.post('/:id/accept', async (req: AuthenticatedRequest, res: Response) => {
  // ... existing code ...
  
  // Record action in email tracking
  if (emailTrackingService && invitation.trackingId) {
    await emailTrackingService.recordEmailAction(
      invitation.trackingId,
      'accepted',
      {
        invitationType: 'task',
        taskId: invitation.taskId,
      }
    );
  }
  
  // ... rest of code ...
});
```

---

## 6. Background SLA Monitor

```typescript
// src/services/slaMonitorService.ts
import { SLAService } from './slaService';
import * as cron from 'node-cron';

export class SLAMonitorService {
  private slaService: SLAService;
  private monitorTask: cron.ScheduledTask | null = null;

  constructor() {
    this.slaService = new SLAService();
  }

  /**
   * Start the SLA monitoring background job
   * Runs every 5 minutes to check SLA status
   */
  startMonitoring(): void {
    if (this.monitorTask) {
      this.monitorTask.stop();
    }

    // Run every 5 minutes
    this.monitorTask = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('[SLA Monitor] Checking SLA compliance...');
        await this.slaService.monitorSLAs();
        console.log('[SLA Monitor] SLA check complete');
      } catch (error) {
        console.error('[SLA Monitor] Error monitoring SLAs:', error);
      }
    });

    console.log('[SLA Monitor] SLA monitoring started (runs every 5 minutes)');
  }

  /**
   * Stop the SLA monitoring
   */
  stopMonitoring(): void {
    if (this.monitorTask) {
      this.monitorTask.stop();
      this.monitorTask = null;
      console.log('[SLA Monitor] SLA monitoring stopped');
    }
  }
}
```

---

## 7. API Endpoints

### 7.1 Email Tracking Endpoints

```
GET    /api/email-tracking/:trackingId.png    # Tracking pixel (public)
GET    /api/email-tracking/:trackingId         # Get tracking status
```

### 7.2 Analytics Endpoints

```
GET    /api/email-analytics                    # Overall analytics
GET    /api/email-analytics/:emailType         # Analytics by type
GET    /api/email-analytics/user/:userId       # User analytics
GET    /api/email-analytics/order/:orderId     # Order-specific
GET    /api/email-analytics/project/:projectId # Project-specific
```

### 7.3 SLA Endpoints

```
GET    /api/sla-status                         # Current SLA status
GET    /api/sla-status/:emailType              # SLA status by type
GET    /api/sla-breaches                       # List SLA breaches
GET    /api/sla-metrics                        # SLA metrics and trends
GET    /api/sla-alerts                         # Active SLA alerts
POST   /api/sla-alerts/:alertId/acknowledge    # Acknowledge alert
```

---

## 8. Configuration

### 8.1 Environment Variables

```bash
# Email Tracking Configuration
EMAIL_TRACKING_ENABLED=true
APP_BASE_URL=https://your-domain.com  # For tracking pixel URLs

# SLA Thresholds (in minutes)
SLA_TASK_ASSIGNMENT=60
SLA_REQUISITION_APPROVAL=240
SLA_OWNERSHIP_TRANSFER=1440
SLA_TASK_INVITATION=1440
```

### 8.2 Default SLA Thresholds

Can be configured per email type via environment variables or database configuration.

---

## 9. Frontend Components

### 9.1 Email Analytics Dashboard

**Component**: `src/renderer/components/EmailAnalytics.tsx`

**Features**:
- Overall email performance metrics
- Open rates and action rates
- Response time statistics
- Email type breakdown
- User performance rankings
- Time-based charts (line, bar charts)
- Filterable by date range, user, email type, order, project

### 9.2 SLA Dashboard

**Component**: `src/renderer/components/SLADashboard.tsx`

**Features**:
- Current SLA compliance rates
- Breached SLA alerts
- At-risk emails (approaching deadline)
- Compliance trends over time
- Email type comparison
- User performance metrics
- Export functionality

### 9.3 Email Tracking Badge

**Component**: `src/renderer/components/EmailTrackingBadge.tsx`

**Features**:
- Display email status with icons
- Show response time
- Color-coded indicators (green=within SLA, yellow=at risk, red=breached)
- Tooltip with detailed information
- Click to view full tracking details

---

## 10. Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Database & Core Services | 2 weeks | Entities, EmailTrackingService, SLAService |
| Phase 2: Email Integration | 1 week | Enhanced EmailService, tracking pixel injection |
| Phase 3: Tracking Endpoint | 1 week | Tracking pixel endpoint, action tracking |
| Phase 4: SLA Monitoring | 1 week | Background monitor, alert system |
| Phase 5: Analytics API | 1 week | Analytics endpoints, metrics calculation |
| Phase 6: Frontend Dashboard | 1 week | Dashboard components, tracking badges |
| **Total** | **7 weeks** | Full custom tracking system |

---

## 11. Advantages of Custom Solution

### 11.1 Cost Savings
- **No Subscription Fees**: Save on TimeToReply subscription costs
- **No Per-Email Costs**: Unlimited tracking without per-email charges
- **Infrastructure**: Uses existing database and servers

### 11.2 Control & Customization
- **Full Data Ownership**: All data stays in your system
- **Custom SLA Rules**: Define exactly what you need
- **Integration**: Seamless with existing IPMP features
- **Privacy**: No third-party data sharing

### 11.3 Flexibility
- **Custom Metrics**: Track exactly what matters to you
- **Custom Alerts**: Define your own alert rules
- **Custom Dashboards**: Build exactly what stakeholders need
- **Future Enhancements**: Easy to extend and modify

---

## 12. Comparison: Custom vs TimeToReply

| Feature | Custom Solution | TimeToReply |
|---------|----------------|-------------|
| **Cost** | Free (development time) | Subscription fee |
| **Setup Time** | 7 weeks development | 1-2 weeks integration |
| **Customization** | Full control | Limited by API |
| **Data Ownership** | Complete | Shared with third-party |
| **Maintenance** | You maintain | They maintain |
| **Features** | Exactly what you need | Pre-built features |
| **Scalability** | Your infrastructure | Their infrastructure |
| **Privacy** | Complete | Shared data |

---

## 13. Success Metrics

### 13.1 Technical Metrics
- Email open rate tracking
- Response time measurement accuracy
- SLA breach detection accuracy
- System performance (response times)

### 13.2 Business Metrics
- SLA compliance rate improvement
- Reduced SLA breaches
- Improved team accountability
- Better client relationship management

---

## 14. Next Steps

1. **Review & Approve**: Review this implementation plan
2. **Prioritize**: Identify which email types need SLA tracking first
3. **Define SLAs**: Set specific SLA thresholds for each email type
4. **Start Development**: Begin Phase 1 implementation
5. **Test & Iterate**: Test with pilot group before full rollout

---

## Conclusion

Building a custom email tracking and SLA management system provides full control, eliminates subscription costs, and allows complete customization to your specific needs. While it requires development effort, the long-term benefits of ownership, flexibility, and cost savings make it an excellent choice for the MITAS IPMP.

**Recommended Approach**: Start with Phase 1-3 to get basic tracking working, then add SLA monitoring and analytics in subsequent phases. This allows for incremental value delivery while building the complete system.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

