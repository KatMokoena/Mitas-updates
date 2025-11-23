import { Router, Response } from 'express';
import { AuthService } from '../../auth/auth';
import { createSession, destroySession } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    const sessionId = createSession(
      result.user!.id,
      result.user!.name + ' ' + result.user!.surname,
      result.user!.email,
      result.user!.role,
      result.user!.departmentId
    );

    res.json({
      sessionId,
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    destroySession(sessionId);
  }
  res.json({ success: true });
});

export default router;

