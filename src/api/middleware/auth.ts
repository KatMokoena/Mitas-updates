import { Request, Response, NextFunction } from 'express';

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

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

  req.user = {
    id: session.userId,
    name: session.name,
    surname: session.surname,
    email: session.email,
    role: session.role,
    departmentId: session.departmentId,
  };

  next();
};

