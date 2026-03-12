# TimeToReply Integration Plan for MITAS IPMP

## Executive Summary

This document outlines the research findings and implementation plan for integrating TimeToReply email tracking and analytics into the MITAS Internal Project Management Platform (IPMP). The integration will enable SLA compliance monitoring, email response time tracking, and enhanced accountability for all email notifications sent by the system.

---

## 1. Research Findings

### 1.1 TimeToReply Overview

**TimeToReply** is an email analytics and response time tracking service that provides:
- **Email Open Tracking**: Tracks when emails are opened
- **Response Time Analytics**: Measures time to first reply and overall reply times
- **SLA Compliance Monitoring**: Alerts when response times approach SLA thresholds
- **Performance Dashboards**: Visual analytics and reporting
- **API Access**: RESTful API for custom integrations
- **Webhook Support**: Real-time event notifications

### 1.2 Integration Options

#### Option A: Direct API Integration (Recommended)
- **Pros**: 
  - Full control over integration
  - Custom data mapping
  - Real-time webhook support
  - No third-party dependencies
- **Cons**: 
  - Requires development effort
  - Need to maintain API integration
- **Best For**: Custom applications with specific requirements

#### Option B: Zapier Integration
- **Pros**: 
  - Quick setup, minimal coding
  - Pre-built connectors
- **Cons**: 
  - Limited customization
  - Additional subscription cost
  - Less control over data flow
- **Best For**: Quick prototypes or simple integrations

#### Option C: Microsoft 365 / Google Workspace Native Integration
- **Pros**: 
  - Seamless integration with email platforms
  - Automatic tracking of all emails
- **Cons**: 
  - Only tracks emails sent through those platforms
  - May not capture system-generated emails
- **Best For**: Organizations using TimeToReply primarily for client communications

### 1.3 API Capabilities

Based on research, TimeToReply API provides:
- **Authentication**: API key-based authentication
- **Email Tracking**: Register emails for tracking
- **Webhooks**: Receive real-time events (opened, replied, etc.)
- **Analytics**: Query response times, open rates, engagement metrics
- **User Management**: Track individual user performance
- **SLA Monitoring**: Set and monitor SLA thresholds

### 1.4 Integration with Nodemailer

**Compatibility**: TimeToReply can work with nodemailer through:
1. **Tracking Pixels**: Add invisible tracking images to HTML emails
2. **Custom Headers**: Add TimeToReply tracking headers to email metadata
3. **API Registration**: Register emails via API before sending
4. **Webhook Callbacks**: Receive tracking events via webhooks

---

## 2. Implementation Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    MITAS IPMP System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ EmailService │──────│TimeToReply  │                     │
│  │ (nodemailer) │      │   Service   │                     │
│  └──────────────┘      └──────────────┘                     │
│         │                      │                             │
│         │                      │                             │
│         ▼                      ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │   Email Tracking Database Entities   │                   │
│  │  - EmailTrackingEntity              │                   │
│  │  - EmailEventEntity                 │                   │
│  │  - SLAMetricEntity                  │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │      Webhook Endpoint                │                   │
│  │  POST /api/timetoreply/webhook       │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │      Analytics API Endpoints         │                   │
│  │  GET /api/timetoreply/analytics      │                   │
│  │  GET /api/timetoreply/sla-status     │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  TimeToReply API │          │ TimeToReply       │
│  (REST)          │          │ Webhooks          │
└──────────────────┘          └──────────────────┘
```

### 2.2 Data Flow

1. **Email Sending Flow**:
   ```
   IPMP → EmailService → TimeToReplyService.registerEmail() 
   → TimeToReply API → EmailService.sendEmail() → Recipient
   ```

2. **Tracking Event Flow**:
   ```
   Recipient Opens/Replies → TimeToReply → Webhook → IPMP 
   → EmailEventEntity → Analytics Update
   ```

3. **SLA Monitoring Flow**:
   ```
   EmailEventEntity → SLACalculator → SLAAlert (if threshold exceeded) 
   → Notification to Project Manager/Admin
   ```

---

## 3. Database Schema Design

### 3.1 Email Tracking Entity

```typescript
@Entity('email_tracking')
export class EmailTrackingEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  orderId?: string; // If email is related to an order

  @Column('uuid', { nullable: true })
  projectId?: string; // If email is related to a project

  @Column('uuid', { nullable: true })
  taskId?: string; // If email is related to a task

  @Column('uuid', { nullable: true })
  requisitionId?: string; // If email is related to a requisition

  @Column('uuid', { nullable: true })
  invitationId?: string; // If email is related to an invitation

  @Column('text')
  emailType!: string; // 'task_assignment', 'task_completion', 'project_completion', 'requisition', 'ownership_transfer', etc.

  @Column('uuid')
  recipientId!: string; // User ID of recipient

  @Column('text')
  recipientEmail!: string;

  @Column('uuid')
  senderId!: string; // User ID of sender (system or user)

  @Column('text')
  senderEmail!: string;

  @Column('text')
  subject!: string;

  @Column('text', { nullable: true })
  timeToReplyTrackingId?: string; // TimeToReply's tracking ID

  @Column('text', { nullable: true })
  timeToReplyMessageId?: string; // TimeToReply's message ID

  @Column({ type: 'datetime', nullable: true })
  sentAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  openedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  firstReplyAt?: Date;

  @Column('int', { nullable: true })
  responseTimeMinutes?: number; // Time to first reply in minutes

  @Column('text', { default: 'pending' })
  status!: string; // 'pending', 'sent', 'opened', 'replied', 'failed'

  @Column('int', { nullable: true })
  slaThresholdMinutes?: number; // SLA threshold for this email type

  @Column('boolean', { default: false })
  slaBreached!: boolean; // Whether SLA was breached

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 3.2 Email Event Entity (for detailed event history)

```typescript
@Entity('email_events')
export class EmailEventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  emailTrackingId!: string; // Foreign key to EmailTrackingEntity

  @Column('text')
  eventType!: string; // 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'

  @Column({ type: 'datetime' })
  eventTimestamp!: Date;

  @Column('text', { nullable: true })
  metadata?: string; // JSON string with additional event data

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 3.3 SLA Metric Entity

```typescript
@Entity('sla_metrics')
export class SLAMetricEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('text')
  emailType!: string; // Type of email being tracked

  @Column('int')
  slaThresholdMinutes!: number; // SLA threshold in minutes

  @Column('int', { default: 0 })
  totalEmails!: number; // Total emails sent of this type

  @Column('int', { default: 0 })
  emailsWithinSLA!: number; // Emails responded to within SLA

  @Column('int', { default: 0 })
  emailsBreachedSLA!: number; // Emails that breached SLA

  @Column('decimal', { nullable: true })
  averageResponseTimeMinutes?: number; // Average response time

  @Column('decimal', { nullable: true })
  slaComplianceRate?: number; // Percentage compliance (0-100)

  @Column({ type: 'datetime' })
  periodStart!: Date; // Start of measurement period

  @Column({ type: 'datetime' })
  periodEnd!: Date; // End of measurement period

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

---

## 4. Implementation Plan

### Phase 1: Foundation Setup (Week 1-2)

#### 4.1.1 TimeToReply Service Creation
- **File**: `src/services/timetoreplyService.ts`
- **Purpose**: Wrapper service for TimeToReply API interactions
- **Key Methods**:
  - `registerEmail()` - Register email for tracking
  - `getEmailStatus()` - Get current tracking status
  - `getAnalytics()` - Retrieve analytics data
  - `handleWebhook()` - Process webhook events

#### 4.1.2 Database Entities
- Create `EmailTrackingEntity`
- Create `EmailEventEntity`
- Create `SLAMetricEntity`
- Update `src/database/entities/index.ts`
- Update `src/database/config.ts` to include new entities

#### 4.1.3 Configuration
- Add TimeToReply configuration to environment variables:
  ```
  TIMETOREPLY_API_KEY=your_api_key
  TIMETOREPLY_API_URL=https://api.timetoreply.com
  TIMETOREPLY_WEBHOOK_SECRET=your_webhook_secret
  ```
- Add configuration endpoint: `POST /api/timetoreply/config`

### Phase 2: Email Service Integration (Week 2-3)

#### 4.2.1 Enhance EmailService
- Modify `sendEmail()` method to:
  1. Register email with TimeToReply before sending
  2. Add tracking pixel to HTML content
  3. Add custom headers for tracking
  4. Store tracking record in database
- Update all email sending methods:
  - `sendTaskAssignmentEmail()`
  - `sendTaskCompletionEmail()`
  - `sendProjectCompletionEmail()`
  - `sendRequisitionNotificationEmail()`
  - `sendTaskInvitationEmail()`
  - `sendProjectOwnershipInvitationEmail()`
  - `sendOrderOwnershipInvitationEmail()`

#### 4.2.2 Tracking Pixel Injection
- Create utility function to inject tracking pixel into HTML
- Format: `<img src="https://timetoreply.com/track/{tracking_id}" width="1" height="1" style="display:none">`

### Phase 3: Webhook Implementation (Week 3-4)

#### 4.3.1 Webhook Endpoint
- **Route**: `POST /api/timetoreply/webhook`
- **Purpose**: Receive tracking events from TimeToReply
- **Security**: Verify webhook signature
- **Events to Handle**:
  - `email.sent` - Email was sent
  - `email.delivered` - Email was delivered
  - `email.opened` - Email was opened
  - `email.replied` - Email received a reply
  - `email.bounced` - Email bounced

#### 4.3.2 Event Processing
- Update `EmailTrackingEntity` with event data
- Create `EmailEventEntity` records for audit trail
- Calculate response times
- Check SLA compliance
- Trigger alerts if SLA breached

### Phase 4: Analytics & Reporting (Week 4-5)

#### 4.4.1 Analytics API Endpoints
- `GET /api/timetoreply/analytics` - Overall analytics
- `GET /api/timetoreply/analytics/:emailType` - Analytics by email type
- `GET /api/timetoreply/analytics/user/:userId` - User-specific analytics
- `GET /api/timetoreply/sla-status` - SLA compliance status
- `GET /api/timetoreply/tracking/:trackingId` - Individual email tracking

#### 4.4.2 SLA Calculation Service
- **File**: `src/services/slaService.ts`
- Calculate SLA compliance rates
- Generate SLA metrics
- Identify trends and patterns

### Phase 5: Frontend Integration (Week 5-6)

#### 4.5.1 Analytics Dashboard Component
- **File**: `src/renderer/components/EmailAnalytics.tsx`
- Display:
  - Response time metrics
  - SLA compliance rates
  - Email open rates
  - User performance rankings
  - Breached SLA alerts

#### 4.5.2 Email Tracking Badge
- Add tracking indicators to email notifications
- Show status: "Sent", "Opened", "Replied"
- Display response time if replied

#### 4.5.3 SLA Dashboard
- Visual dashboard showing SLA compliance
- Charts and graphs for metrics
- Filterable by date range, email type, user

### Phase 6: Alerting & Notifications (Week 6)

#### 4.6.1 SLA Breach Alerts
- Real-time alerts when SLA is about to be breached
- Notifications to project managers/admins
- Escalation rules for critical emails

#### 4.6.2 Daily/Weekly Reports
- Automated reports on email performance
- SLA compliance summaries
- User performance reports

---

## 5. Technical Implementation Details

### 5.1 TimeToReply Service Structure

```typescript
// src/services/timetoreplyService.ts
export class TimeToReplyService {
  private apiKey: string;
  private apiUrl: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.TIMETOREPLY_API_KEY || '';
    this.apiUrl = process.env.TIMETOREPLY_API_URL || 'https://api.timetoreply.com';
    this.webhookSecret = process.env.TIMETOREPLY_WEBHOOK_SECRET || '';
  }

  /**
   * Register an email for tracking
   */
  async registerEmail(params: {
    to: string;
    from: string;
    subject: string;
    emailType: string;
    metadata?: Record<string, any>;
  }): Promise<{ trackingId: string; messageId: string }> {
    // Implementation
  }

  /**
   * Get email tracking status
   */
  async getEmailStatus(trackingId: string): Promise<EmailStatus> {
    // Implementation
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implementation
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    // Implementation
  }
}
```

### 5.2 Email Service Enhancement

```typescript
// Enhanced sendEmail method
async sendEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  trackingMetadata?: {
    emailType: string;
    orderId?: string;
    projectId?: string;
    taskId?: string;
    recipientId: string;
    senderId: string;
  }
): Promise<{ messageId: string; trackingId?: string }> {
  // 1. Register with TimeToReply if tracking enabled
  let trackingId: string | undefined;
  if (trackingMetadata && timeToReplyService) {
    const tracking = await timeToReplyService.registerEmail({
      to: Array.isArray(to) ? to[0] : to,
      from: this.config.from,
      subject,
      emailType: trackingMetadata.emailType,
      metadata: trackingMetadata,
    });
    trackingId = tracking.trackingId;
    
    // 2. Inject tracking pixel
    htmlContent = this.injectTrackingPixel(htmlContent, trackingId);
  }

  // 3. Send email via nodemailer
  const mailOptions = {
    from: this.config.from,
    to: recipients,
    subject,
    html: htmlContent,
    headers: trackingId ? {
      'X-TimeToReply-Tracking-ID': trackingId,
    } : {},
  };

  const info = await this.transporter.sendMail(mailOptions);

  // 4. Store tracking record in database
  if (trackingMetadata && trackingId) {
    await this.storeTrackingRecord({
      trackingId,
      ...trackingMetadata,
      messageId: info.messageId,
    });
  }

  return { messageId: info.messageId, trackingId };
}
```

### 5.3 Webhook Endpoint Implementation

```typescript
// src/api/routes/timetoreply.ts
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-timetoreply-signature'] as string;
    const payload = req.body.toString();

    // Verify webhook signature
    if (!timeToReplyService.verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload);
    
    // Process event
    await timeToReplyService.processWebhookEvent(event);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

---

## 6. Configuration Requirements

### 6.1 Environment Variables

```bash
# TimeToReply Configuration
TIMETOREPLY_API_KEY=your_api_key_here
TIMETOREPLY_API_URL=https://api.timetoreply.com
TIMETOREPLY_WEBHOOK_SECRET=your_webhook_secret_here
TIMETOREPLY_ENABLED=true

# SLA Thresholds (in minutes)
TIMETOREPLY_SLA_TASK_ASSIGNMENT=60      # 1 hour to acknowledge task
TIMETOREPLY_SLA_REQUISITION=240        # 4 hours to approve/reject
TIMETOREPLY_SLA_OWNERSHIP_TRANSFER=1440 # 24 hours to accept/decline
TIMETOREPLY_SLA_PROJECT_COMPLETION=0    # No SLA (notification only)
```

### 6.2 TimeToReply Account Setup

1. **Create TimeToReply Account**
   - Sign up at timetoreply.com
   - Choose appropriate plan (based on email volume)

2. **Generate API Credentials**
   - Navigate to API settings
   - Generate API key
   - Set up webhook URL: `https://your-domain.com/api/timetoreply/webhook`
   - Generate webhook secret

3. **Configure SLA Thresholds**
   - Set default response time thresholds
   - Configure alert rules

---

## 7. API Endpoints Design

### 7.1 Configuration Endpoints

```
POST   /api/timetoreply/config          # Configure TimeToReply (Admin only)
GET    /api/timetoreply/config          # Get current configuration
POST   /api/timetoreply/test            # Test API connection
```

### 7.2 Analytics Endpoints

```
GET    /api/timetoreply/analytics                    # Overall analytics
GET    /api/timetoreply/analytics/:emailType         # Analytics by type
GET    /api/timetoreply/analytics/user/:userId        # User analytics
GET    /api/timetoreply/analytics/order/:orderId      # Order-specific analytics
GET    /api/timetoreply/analytics/project/:projectId  # Project-specific analytics
```

### 7.3 SLA Endpoints

```
GET    /api/timetoreply/sla-status                   # Current SLA status
GET    /api/timetoreply/sla-status/:emailType         # SLA status by type
GET    /api/timetoreply/sla-breaches                  # List of SLA breaches
GET    /api/timetoreply/sla-metrics                   # SLA metrics and trends
```

### 7.4 Tracking Endpoints

```
GET    /api/timetoreply/tracking/:trackingId          # Get email tracking details
GET    /api/timetoreply/tracking/email/:emailId        # Get tracking by email
POST   /api/timetoreply/webhook                       # Webhook endpoint (public)
```

---

## 8. Frontend Components

### 8.1 Email Analytics Dashboard

**Component**: `EmailAnalytics.tsx`
**Features**:
- Overall response time metrics
- SLA compliance dashboard
- Email type breakdown
- User performance rankings
- Time-based charts and graphs
- Export functionality

### 8.2 Email Tracking Badge

**Component**: `EmailTrackingBadge.tsx`
**Features**:
- Display email status (Sent/Opened/Replied)
- Show response time
- Color-coded indicators
- Tooltip with detailed info

### 8.3 SLA Compliance Widget

**Component**: `SLAComplianceWidget.tsx`
**Features**:
- Current SLA compliance rate
- Breached SLA alerts
- Trend indicators
- Quick access to detailed reports

---

## 9. Testing Strategy

### 9.1 Unit Tests
- TimeToReply service methods
- Email tracking entity operations
- SLA calculation logic
- Webhook signature verification

### 9.2 Integration Tests
- End-to-end email sending with tracking
- Webhook event processing
- Analytics data retrieval
- SLA breach detection

### 9.3 Manual Testing
- Send test emails and verify tracking
- Simulate webhook events
- Test SLA breach scenarios
- Verify dashboard displays

---

## 10. Deployment Considerations

### 10.1 Security
- Secure API key storage (environment variables)
- Webhook signature verification
- Rate limiting on webhook endpoint
- HTTPS required for webhook URL

### 10.2 Performance
- Async processing of webhook events
- Database indexing on tracking fields
- Caching of analytics data
- Background jobs for SLA calculations

### 10.3 Monitoring
- Log all TimeToReply API calls
- Monitor webhook endpoint health
- Track API rate limits
- Alert on integration failures

---

## 11. Cost Considerations

### 11.1 TimeToReply Pricing
- **Starter Plan**: ~$X/month (up to Y emails)
- **Professional Plan**: ~$X/month (up to Y emails)
- **Enterprise Plan**: Custom pricing

### 11.2 Cost-Benefit Analysis
- **Benefits**:
  - SLA compliance monitoring
  - Improved accountability
  - Client relationship management
  - Performance insights
- **Costs**:
  - TimeToReply subscription
  - Development time
  - Maintenance overhead

---

## 12. Migration Plan

### 12.1 Phase 1: Setup (Week 1)
- Create TimeToReply account
- Configure API credentials
- Set up webhook endpoint
- Test basic integration

### 12.2 Phase 2: Database Migration (Week 2)
- Create new database entities
- Run migrations
- Set up indexes
- Test data storage

### 12.3 Phase 3: Email Integration (Week 3-4)
- Integrate with existing email methods
- Test email sending with tracking
- Verify tracking pixel injection
- Test webhook reception

### 12.4 Phase 4: Analytics (Week 5)
- Build analytics endpoints
- Create dashboard components
- Test reporting functionality

### 12.5 Phase 5: Rollout (Week 6)
- Enable tracking for all emails
- Monitor performance
- Gather user feedback
- Iterate and improve

---

## 13. Success Metrics

### 13.1 Key Performance Indicators (KPIs)
- **Email Open Rate**: Target >80%
- **Response Time**: Average < SLA threshold
- **SLA Compliance**: Target >95%
- **User Engagement**: Track which notifications get responses

### 13.2 Business Metrics
- **Client Satisfaction**: Improved due to faster responses
- **SLA Compliance**: Reduced SLA breaches
- **Accountability**: Clear visibility into response times
- **Process Improvement**: Identify bottlenecks

---

## 14. Risk Mitigation

### 14.1 Technical Risks
- **API Rate Limits**: Implement rate limiting and queuing
- **Webhook Failures**: Retry mechanism and error logging
- **Data Loss**: Regular backups of tracking data
- **Performance Impact**: Async processing and caching

### 14.2 Business Risks
- **Privacy Concerns**: Transparent tracking policies
- **Cost Overruns**: Monitor email volume and costs
- **User Adoption**: Training and change management
- **SLA Pressure**: Realistic threshold setting

---

## 15. Future Enhancements

### 15.1 Advanced Features
- Predictive SLA breach alerts
- Machine learning for response time prediction
- Integration with client communication portals
- Automated escalation workflows

### 15.2 Integrations
- Slack notifications for SLA breaches
- Dashboard widgets for executives
- Export to business intelligence tools
- Integration with CRM systems

---

## 16. Documentation Requirements

### 16.1 Technical Documentation
- API endpoint documentation
- Database schema documentation
- Service architecture diagrams
- Webhook event specifications

### 16.2 User Documentation
- How to interpret analytics
- Understanding SLA metrics
- Best practices for email responses
- Troubleshooting guide

---

## 17. Support & Maintenance

### 17.1 Ongoing Maintenance
- Monitor API health
- Update integration as TimeToReply API evolves
- Regular performance optimization
- Database cleanup of old tracking data

### 17.2 Support Plan
- Designate integration owner
- Create support documentation
- Establish escalation procedures
- Regular review meetings

---

## Conclusion

This integration plan provides a comprehensive roadmap for integrating TimeToReply into the MITAS IPMP system. The phased approach ensures minimal disruption while delivering value incrementally. The integration will significantly enhance SLA compliance monitoring and provide valuable insights into email communication patterns.

**Next Steps**:
1. Review and approve this plan
2. Obtain TimeToReply API credentials
3. Begin Phase 1 implementation
4. Set up development environment
5. Create TimeToReply service foundation

---

## Appendix A: TimeToReply API Reference

### A.1 Authentication
```
Header: X-API-Key: {your_api_key}
```

### A.2 Register Email
```
POST /api/v1/emails/register
Body: {
  "to": "recipient@example.com",
  "from": "sender@example.com",
  "subject": "Email Subject",
  "metadata": { ... }
}
Response: {
  "trackingId": "track_123",
  "messageId": "msg_456"
}
```

### A.3 Get Email Status
```
GET /api/v1/emails/{trackingId}/status
Response: {
  "status": "opened",
  "openedAt": "2024-01-01T10:00:00Z",
  "repliedAt": "2024-01-01T11:00:00Z",
  "responseTimeMinutes": 60
}
```

### A.4 Webhook Event Format
```json
{
  "event": "email.opened",
  "trackingId": "track_123",
  "timestamp": "2024-01-01T10:00:00Z",
  "data": {
    "openedAt": "2024-01-01T10:00:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

## Appendix B: Code Examples

### B.1 TimeToReply Service Implementation

```typescript
// src/services/timetoreplyService.ts
import axios from 'axios';
import crypto from 'crypto';

export interface EmailTrackingParams {
  to: string;
  from: string;
  subject: string;
  emailType: string;
  metadata?: Record<string, any>;
}

export interface EmailStatus {
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
  openedAt?: Date;
  repliedAt?: Date;
  responseTimeMinutes?: number;
}

export class TimeToReplyService {
  private apiKey: string;
  private apiUrl: string;
  private webhookSecret: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.TIMETOREPLY_API_KEY || '';
    this.apiUrl = process.env.TIMETOREPLY_API_URL || 'https://api.timetoreply.com';
    this.webhookSecret = process.env.TIMETOREPLY_WEBHOOK_SECRET || '';
    this.enabled = process.env.TIMETOREPLY_ENABLED === 'true' && !!this.apiKey;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async registerEmail(params: EmailTrackingParams): Promise<{ trackingId: string; messageId: string }> {
    if (!this.enabled) {
      throw new Error('TimeToReply is not enabled or configured');
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/emails/register`,
        {
          to: params.to,
          from: params.from,
          subject: params.subject,
          metadata: {
            emailType: params.emailType,
            ...params.metadata,
          },
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        trackingId: response.data.trackingId,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error('Failed to register email with TimeToReply:', error);
      throw error;
    }
  }

  async getEmailStatus(trackingId: string): Promise<EmailStatus> {
    if (!this.enabled) {
      throw new Error('TimeToReply is not enabled or configured');
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/emails/${trackingId}/status`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
        }
      );

      return {
        status: response.data.status,
        openedAt: response.data.openedAt ? new Date(response.data.openedAt) : undefined,
        repliedAt: response.data.repliedAt ? new Date(response.data.repliedAt) : undefined,
        responseTimeMinutes: response.data.responseTimeMinutes,
      };
    } catch (error) {
      console.error('Failed to get email status from TimeToReply:', error);
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async processWebhookEvent(event: any): Promise<void> {
    // This will be called by the webhook endpoint
    // Implementation depends on event type
    console.log('Processing TimeToReply webhook event:', event);
  }
}
```

### B.2 Enhanced Email Service with Tracking

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
  let messageId: string | undefined;

  // Register with TimeToReply if tracking is enabled and metadata provided
  if (trackingMetadata && timeToReplyService?.isEnabled()) {
    try {
      const tracking = await timeToReplyService.registerEmail({
        to: Array.isArray(to) ? to[0] : to,
        from: this.config.from,
        subject,
        emailType: trackingMetadata.emailType,
        metadata: {
          orderId: trackingMetadata.orderId,
          projectId: trackingMetadata.projectId,
          taskId: trackingMetadata.taskId,
          requisitionId: trackingMetadata.requisitionId,
          invitationId: trackingMetadata.invitationId,
        },
      });
      trackingId = tracking.trackingId;
      messageId = tracking.messageId;

      // Inject tracking pixel into HTML
      htmlContent = this.injectTrackingPixel(htmlContent, trackingId);
    } catch (error) {
      console.error('Failed to register email with TimeToReply:', error);
      // Continue with email sending even if tracking fails
    }
  }

  const mailOptions: any = {
    from: this.config.from,
    to: recipients,
    subject,
    html: htmlContent,
  };

  // Add tracking headers if available
  if (trackingId) {
    mailOptions.headers = {
      'X-TimeToReply-Tracking-ID': trackingId,
    };
  }

  try {
    const info = await this.transporter.sendMail(mailOptions);
    const finalMessageId = messageId || info.messageId;

    // Store tracking record in database if tracking is enabled
    if (trackingMetadata && trackingId) {
      await this.storeEmailTrackingRecord({
        trackingId,
        messageId: finalMessageId,
        ...trackingMetadata,
        recipientEmail: Array.isArray(to) ? to[0] : to,
        senderEmail: this.config.from,
        subject,
        sentAt: new Date(),
      });
    }

    console.log(`Email sent successfully to ${recipients}${trackingId ? ` (Tracking ID: ${trackingId})` : ''}`);
    return { messageId: finalMessageId, trackingId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

private injectTrackingPixel(htmlContent: string, trackingId: string): string {
  const trackingPixel = `<img src="${process.env.TIMETOREPLY_API_URL || 'https://api.timetoreply.com'}/track/${trackingId}" width="1" height="1" style="display:none;width:1px;height:1px;border:none;" alt="" />`;
  
  // Insert before closing body tag, or at the end if no body tag
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixel}</body>`);
  } else {
    return htmlContent + trackingPixel;
  }
}
```

---

## Appendix C: SLA Configuration Examples

### C.1 Default SLA Thresholds

```typescript
export const DEFAULT_SLA_THRESHOLDS = {
  task_assignment: 60,           // 1 hour to acknowledge task assignment
  task_completion: 0,            // No SLA (notification only)
  requisition_approval: 240,     // 4 hours to approve/reject requisition
  ownership_transfer: 1440,      // 24 hours to accept/decline ownership
  project_completion: 0,         // No SLA (notification only)
  order_completion: 0,           // No SLA (notification only)
  task_invitation: 1440,         // 24 hours to accept/decline invitation
};
```

### C.2 SLA Calculation Logic

```typescript
function calculateSLACompliance(
  emails: EmailTrackingEntity[],
  thresholdMinutes: number
): {
  total: number;
  withinSLA: number;
  breached: number;
  complianceRate: number;
  averageResponseTime: number;
} {
  const respondedEmails = emails.filter(e => e.firstReplyAt);
  const total = respondedEmails.length;
  const withinSLA = respondedEmails.filter(
    e => e.responseTimeMinutes && e.responseTimeMinutes <= thresholdMinutes
  ).length;
  const breached = total - withinSLA;
  const complianceRate = total > 0 ? (withinSLA / total) * 100 : 0;
  const averageResponseTime = respondedEmails.length > 0
    ? respondedEmails.reduce((sum, e) => sum + (e.responseTimeMinutes || 0), 0) / total
    : 0;

  return {
    total,
    withinSLA,
    breached,
    complianceRate,
    averageResponseTime,
  };
}
```

---

## Appendix D: Webhook Event Processing

### D.1 Webhook Event Handler

```typescript
async processWebhookEvent(event: any): Promise<void> {
  const { event: eventType, trackingId, timestamp, data } = event;

  // Find tracking record
  const trackingRepository = getDataSource().getRepository(EmailTrackingEntity);
  const tracking = await trackingRepository.findOne({
    where: { timeToReplyTrackingId: trackingId },
  });

  if (!tracking) {
    console.warn(`Tracking record not found for trackingId: ${trackingId}`);
    return;
  }

  // Create event record
  const eventRepository = getDataSource().getRepository(EmailEventEntity);
  const emailEvent = eventRepository.create({
    id: uuidv4(),
    emailTrackingId: tracking.id,
    eventType,
    eventTimestamp: new Date(timestamp),
    metadata: JSON.stringify(data),
  });
  await eventRepository.save(emailEvent);

  // Update tracking record based on event type
  switch (eventType) {
    case 'email.opened':
      tracking.openedAt = new Date(timestamp);
      tracking.status = 'opened';
      break;

    case 'email.replied':
      tracking.firstReplyAt = new Date(timestamp);
      tracking.status = 'replied';
      if (tracking.sentAt) {
        const responseTime = (new Date(timestamp).getTime() - tracking.sentAt.getTime()) / (1000 * 60);
        tracking.responseTimeMinutes = Math.round(responseTime);
        
        // Check SLA compliance
        if (tracking.slaThresholdMinutes && tracking.responseTimeMinutes > tracking.slaThresholdMinutes) {
          tracking.slaBreached = true;
          // Trigger SLA breach alert
          await this.triggerSLABreachAlert(tracking);
        }
      }
      break;

    case 'email.bounced':
      tracking.status = 'failed';
      break;
  }

  await trackingRepository.save(tracking);
}
```

---

## Appendix E: Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | 2 weeks | TimeToReply service, database entities, configuration |
| Phase 2: Email Integration | 2 weeks | Enhanced email service, tracking pixel injection |
| Phase 3: Webhook Implementation | 1 week | Webhook endpoint, event processing |
| Phase 4: Analytics | 1 week | Analytics API, SLA calculation service |
| Phase 5: Frontend | 1 week | Dashboard components, tracking badges |
| Phase 6: Alerting | 1 week | SLA breach alerts, reports |
| **Total** | **8 weeks** | Full integration |

---

## Appendix F: Resource Requirements

### F.1 Development Resources
- **Backend Developer**: 6-8 weeks
- **Frontend Developer**: 1-2 weeks
- **QA Engineer**: 1 week
- **DevOps**: 0.5 weeks (for webhook endpoint setup)

### F.2 Infrastructure
- **TimeToReply Subscription**: Required
- **Webhook Endpoint**: Public HTTPS URL required
- **Database Storage**: Additional tables for tracking data
- **API Rate Limits**: Monitor TimeToReply API usage

---

## Questions & Next Steps

1. **Approval**: Review and approve this implementation plan
2. **Budget**: Confirm TimeToReply subscription budget
3. **Timeline**: Confirm 8-week timeline is acceptable
4. **Priorities**: Identify which email types are highest priority for tracking
5. **SLA Thresholds**: Define specific SLA requirements for each email type

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: AI Assistant  
**Status**: Draft - Pending Review

