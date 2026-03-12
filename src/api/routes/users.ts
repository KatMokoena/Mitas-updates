import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, destroyUserSessions } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { UserEntity } from '../../database/entities/User';
import { PermissionService } from '../../auth/permissions';
import { AuthService } from '../../auth/auth';
import { UserRole } from '../../shared/types';

const router = Router();
const permissionService = new PermissionService();
const authService = new AuthService();

router.use(authMiddleware);

// Get all users (for assignment - accessible to all authenticated users)
// Full user management requires admin permissions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepository = getDataSource().getRepository(UserEntity);
    // For assignment purposes, all authenticated users can see the list
    // but only admins can manage users
    const users = await userRepository.find({
      select: ['id', 'name', 'surname', 'email', 'role', 'departmentId', 'createdAt', 'updatedAt'],
      order: { name: 'ASC', surname: 'ASC' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageUsers(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const { name, surname, email, password, role, departmentId } = req.body;
    const result = await authService.createUser(name, surname, email, password, role as UserRole, departmentId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageUsers(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const userRepository = getDataSource().getRepository(UserEntity);
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Update user fields
    if (req.body.role) {
      user.role = req.body.role;
    }
    if (req.body.email) {
      user.email = req.body.email;
    }
    if (req.body.name) {
      user.name = req.body.name;
    }
    if (req.body.surname) {
      user.surname = req.body.surname;
    }
    if (req.body.departmentId !== undefined) {
      user.departmentId = req.body.departmentId || null;
    }

    // Handle password update if provided
    if (req.body.password && req.body.password.trim() !== '') {
      const passwordResult = await authService.updatePassword(user.id, req.body.password);
      if (!passwordResult.success) {
        res.status(400).json({ error: passwordResult.error || 'Failed to update password' });
        return;
      }
      // Reload user after password update to get the updated passwordHash
      // This prevents the save below from overwriting the password change
      const userAfterPasswordUpdate = await userRepository.findOne({ where: { id: user.id } });
      if (userAfterPasswordUpdate) {
        // Copy updated fields to the reloaded user
        if (req.body.role) {
          userAfterPasswordUpdate.role = req.body.role;
        }
        if (req.body.email) {
          userAfterPasswordUpdate.email = req.body.email;
        }
        if (req.body.name) {
          userAfterPasswordUpdate.name = req.body.name;
        }
        if (req.body.surname) {
          userAfterPasswordUpdate.surname = req.body.surname;
        }
        if (req.body.departmentId !== undefined) {
          userAfterPasswordUpdate.departmentId = req.body.departmentId || null;
        }
        // Save the reloaded user with all updates
        await userRepository.save(userAfterPasswordUpdate);
        
        res.json({
          id: userAfterPasswordUpdate.id,
          name: userAfterPasswordUpdate.name,
          surname: userAfterPasswordUpdate.surname,
          email: userAfterPasswordUpdate.email,
          role: userAfterPasswordUpdate.role,
          departmentId: userAfterPasswordUpdate.departmentId,
        });
        return;
      }
    }

    // Save user (no password update)
    await userRepository.save(user);
    
    res.json({
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!permissionService.canManageUsers(req.user!.role)) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
    const userRepository = getDataSource().getRepository(UserEntity);
    const queryRunner = getDataSource().createQueryRunner();
    
    // First, verify the user exists
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent deletion of default seed users (optional - you can remove this if you want to allow deletion)
    // Only prevent if they're the exact seed users
    const isSeedUser = user.email === 'admin@mitas.com' || user.email === 'pm@mitas.com';
    if (isSeedUser) {
      res.status(400).json({ error: 'Cannot delete default seed users' });
      return;
    }

    // Use direct SQL delete to ensure hard deletion
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      // Delete using raw SQL to ensure it's actually deleted
      const deleteResult = await queryRunner.query(
        `DELETE FROM users WHERE id = ?`,
        [req.params.id]
      );
      
      await queryRunner.commitTransaction();
      
      // Verify deletion by checking if user still exists
      const verifyUser = await userRepository.findOne({ where: { id: req.params.id } });
      if (verifyUser) {
        console.error(`WARNING: User ${user.email} (ID: ${req.params.id}) still exists after deletion attempt`);
        res.status(500).json({ error: 'Failed to delete user - user still exists' });
        return;
      }
      
      // Invalidate all sessions for this user
      destroyUserSessions(req.params.id);
      
      console.log(`User permanently deleted: ${user.email} (ID: ${req.params.id})`);
      res.status(204).send();
    } catch (deleteError) {
      await queryRunner.rollbackTransaction();
      throw deleteError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

