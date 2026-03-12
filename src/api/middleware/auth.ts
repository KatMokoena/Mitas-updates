import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../../database/config';
import { UserEntity } from '../../database/entities/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: string;
    departmentId?: string;
  };
}

// Simple session store (in production, use proper session management)
const sessions = new Map<string, { userId: string; name: string; surname: string; email: string; role: string; departmentId?: string }>();

export const createSession = (userId: string, displayName: string, email: string, role: string, departmentId?: string): string => {
  const sessionId = require('uuid').v4();
  const [name, ...surnameParts] = displayName.split(' ');
  const surname = surnameParts.join(' ') || '';
  sessions.set(sessionId, { userId, name, surname, email, role, departmentId });
  return sessionId;
};

export const getSession = (sessionId: string) => {
  return sessions.get(sessionId);
};

export const destroySession = (sessionId: string): void => {
  sessions.delete(sessionId);
};

/**
 * Invalidate all sessions for a specific user
 */
export const destroyUserSessions = (userId: string): void => {
  const sessionsToDelete: string[] = [];
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessionsToDelete.push(sessionId);
    }
  }
  sessionsToDelete.forEach(sessionId => sessions.delete(sessionId));
  console.log(`Invalidated ${sessionsToDelete.length} session(s) for user ${userId}`);
};

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  // Verify that the user still exists in the database
  // This prevents deleted users from using active sessions
  try {
    const userRepository = getDataSource().getRepository(UserEntity);
    const user = await userRepository.findOne({ where: { id: session.userId } });
    
    if (!user) {
      // User was deleted - invalidate this session
      destroySession(sessionId);
      console.log(`Session ${sessionId} invalidated - user ${session.userId} no longer exists`);
      res.status(401).json({ error: 'User account no longer exists' });
      return;
    }

    // Update session with current user data in case it changed
    req.user = {
      id: user.id,
      name: user.name || session.name,
      surname: user.surname || session.surname,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || session.departmentId,
    };
  } catch (error) {
    console.error('Error verifying user in auth middleware:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
    return;
  }

  next();
};

