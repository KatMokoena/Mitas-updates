import { getDataSource } from '../database/config';
import { AuditLogEntity, AuditAction, AuditEntityType } from '../database/entities/AuditLog';
import { UserEntity } from '../database/entities/User';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  /**
   * Log an audit event
   */
  async log(
    action: AuditAction,
    entityType: AuditEntityType,
    options: {
      userId?: string;
      entityId?: string;
      entityName?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
    } = {}
  ): Promise<void> {
    try {
      const auditRepository = getDataSource().getRepository(AuditLogEntity);
      
      // Get user info if userId is provided
      let userInfo = {};
      if (options.userId) {
        const userRepository = getDataSource().getRepository(UserEntity);
        const user = await userRepository.findOne({ where: { id: options.userId } });
        if (user) {
          userInfo = {
            userName: user.name || null,
            userSurname: user.surname || null,
            userEmail: user.email || null,
          };
        }
      }

      const auditLog = auditRepository.create({
        action,
        entityType,
        userId: options.userId,
        ...userInfo,
        entityId: options.entityId,
        entityName: options.entityName,
        description: options.description,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        oldValues: options.oldValues ? JSON.stringify(options.oldValues) : undefined,
        newValues: options.newValues ? JSON.stringify(options.newValues) : undefined,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
      });
      auditLog.id = uuidv4();
      await auditRepository.save(auditLog);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: AuditEntityType, entityId: string): Promise<AuditLogEntity[]> {
    try {
      const auditRepository = getDataSource().getRepository(AuditLogEntity);
      return await auditRepository.find({
        where: { entityType, entityId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit?: number): Promise<AuditLogEntity[]> {
    try {
      const auditRepository = getDataSource().getRepository(AuditLogEntity);
      const query = auditRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (limit) {
        query.then(logs => logs.slice(0, limit));
      }
      return await query;
    } catch (error) {
      console.error('Failed to fetch user audit logs:', error);
      return [];
    }
  }
}










