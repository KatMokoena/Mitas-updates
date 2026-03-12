import { Router, Response } from 'express';
import { AuthService } from '../../auth/auth';
import { createSession, destroySession } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { EmailService } from '../../services/emailService';
import { UserEntity } from '../../database/entities/User';

const router = Router();
const authService = new AuthService();

// Database health check endpoint
router.get('/health', (req, res: Response) => {
  try {
    const dataSource = getDataSource();
    const isInitialized = dataSource && dataSource.isInitialized;
    res.json({ 
      status: isInitialized ? 'ok' : 'not_initialized',
      database: isInitialized ? 'connected' : 'not_connected',
      message: isInitialized 
        ? 'Database is ready' 
        : 'Database is not initialized. Please wait for server startup to complete.'
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      database: 'not_connected',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database is not available. Please check server logs.'
    });
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    // Check if database is initialized first
    try {
      getDataSource();
    } catch (dbError) {
      console.error('Database not initialized during login attempt:', dbError);
      res.status(503).json({ 
        error: 'Database not initialized. Please wait for server startup to complete and try again.',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
      return;
    }

    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await authService.login(email, password);
    
    if (!result.success) {
      console.log(`Login failed for email: ${email}, reason: ${result.error}`);
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
      needsPasswordChange: result.needsPasswordChange || false,
    });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Login error details:', {
      message: errorMessage,
      stack: errorStack,
      body: req.body
    });
    
    res.status(500).json({ 
      error: 'Login failed due to server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
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

// Change Password (for users with temporary passwords)
router.post('/change-password', async (req, res: Response) => {
  try {
    const { email, temporaryPassword, newPassword, confirmPassword } = req.body;
    
    if (!email || !temporaryPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New password and confirm password do not match' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    // Verify the temporary password
    const loginResult = await authService.login(email, temporaryPassword);
    if (!loginResult.success) {
      res.status(401).json({ error: 'Invalid temporary password' });
      return;
    }

    // Update the password
    const passwordResult = await authService.updatePassword(loginResult.user!.id, newPassword);
    if (!passwordResult.success) {
      res.status(500).json({ error: passwordResult.error || 'Failed to update password' });
      return;
    }

    // Clear the needsPasswordChange flag
    const userRepository = getDataSource().getRepository(UserEntity);
    const user = await userRepository.findOne({ where: { id: loginResult.user!.id } });
    if (user) {
      user.needsPasswordChange = false;
      await userRepository.save(user);
    }

    // Create a new session with the updated user
    const sessionId = createSession(
      loginResult.user!.id,
      loginResult.user!.name + ' ' + loginResult.user!.surname,
      loginResult.user!.email,
      loginResult.user!.role,
      loginResult.user!.departmentId
    );

    res.json({
      success: true,
      sessionId,
      user: loginResult.user,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if database is initialized first
    try {
      getDataSource();
    } catch (dbError) {
      console.error('Database not initialized during forgot password attempt:', dbError);
      res.status(503).json({ 
        error: 'Database not initialized. Please wait for server startup to complete and try again.',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
      return;
    }

    const result = await authService.resetPassword(email);
    
    if (!result.success) {
      console.error(`Password reset failed for email: ${email}, reason: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to reset password' });
      return;
    }

    // If user exists, send email with temporary password
    if (result.temporaryPassword) {
      try {
        const emailService = new EmailService();
        emailService.configureFromEnv();

        if (emailService.isConfigured()) {
          try {
            const userRepository = getDataSource().getRepository(UserEntity);
            const user = await userRepository.findOne({ where: { email } });
            
            if (user) {
              await emailService.sendEmail(
                email,
                'Password Reset - MITAS IPMP',
                `
                  <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                          <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
                          <p style="color: white; margin: 5px 0 0 0;">Internal Project Management Platform</p>
                        </div>
                        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
                          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                          <p>Hello ${user.name || 'User'},</p>
                          <p>You have requested to reset your password for the MITAS Internal Project Management Platform.</p>
                          <div style="background-color: #fff; border: 2px solid #f97316; border-radius: 5px; padding: 20px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #666;">Your temporary password is:</p>
                            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #f97316; letter-spacing: 2px; font-family: monospace;">${result.temporaryPassword}</p>
                          </div>
                          <p><strong>Please use this password to log in and change it to a new password of your choice.</strong></p>
                          <p style="color: #666; font-size: 12px; margin-top: 30px;">If you did not request this password reset, please contact your administrator immediately.</p>
                          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                          <p style="color: #999; font-size: 11px; text-align: center;">This is an automated message from MITAS Corporation - IPMP</p>
                        </div>
                      </div>
                    </body>
                  </html>
                `
              );
              console.log(`Password reset email sent to: ${email}`);
            }
          } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            if (emailError instanceof Error) {
              console.error('Email error details:', emailError.message, emailError.stack);
            }
            // Still return success - password was reset, just email failed
          }
        } else {
          console.warn('Email service not configured - password reset email not sent');
        }
      } catch (importError) {
        console.error('Failed to import email service or user entity:', importError);
        if (importError instanceof Error) {
          console.error('Import error details:', importError.message, importError.stack);
        }
        // Still return success - password was reset, just email failed
      }
    }

    // Always return success (don't reveal if user exists)
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset email has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Failed to process password reset request',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

export default router;

