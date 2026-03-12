import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getDataSource } from '../../database/config';
import { CliftonStrengthsEntity } from '../../database/entities/CliftonStrengths';
import { UserEntity } from '../../database/entities/User';
import { AuditService } from '../../services/auditService';
import { AuditAction, AuditEntityType } from '../../database/entities/AuditLog';
import { UserRole } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const auditService = new AuditService();

router.use(authMiddleware);

// Get strengths for a specific user
router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;

    // Users can only view their own strengths, unless they're admin
    const roleStr = typeof currentUserRole === 'string' ? currentUserRole.toUpperCase() : currentUserRole;
    const isAdmin = roleStr === UserRole.ADMIN || roleStr === 'ADMIN';
    
    if (!isAdmin && userId !== currentUserId) {
      res.status(403).json({ error: 'Access denied. You can only view your own strengths.' });
      return;
    }

    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);
    const strengths = await strengthsRepository.findOne({ where: { userId } });

    if (!strengths) {
      return res.json(null);
    }

    res.json(strengths);
  } catch (error) {
    console.error('Failed to fetch strengths:', error);
    res.status(500).json({ error: 'Failed to fetch strengths' });
  }
});

// Get strengths for current user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);
    const strengths = await strengthsRepository.findOne({ where: { userId } });

    if (!strengths) {
      return res.json(null);
    }

    res.json(strengths);
  } catch (error) {
    console.error('Failed to fetch strengths:', error);
    res.status(500).json({ error: 'Failed to fetch strengths' });
  }
});

// Get all users' strengths (admin only)
router.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user!.role;
    const roleStr = typeof currentUserRole === 'string' ? currentUserRole.toUpperCase() : currentUserRole;
    
    if (roleStr !== UserRole.ADMIN && roleStr !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied. Admin access required.' });
      return;
    }

    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);
    const userRepository = getDataSource().getRepository(UserEntity);
    
    const allStrengths = await strengthsRepository.find({
      order: { updatedAt: 'DESC' },
    });

    // Enrich with user information
    const strengthsWithUsers = await Promise.all(
      allStrengths.map(async (strength) => {
        const user = await userRepository.findOne({ where: { id: strength.userId } });
        const createdByUser = strength.createdBy 
          ? await userRepository.findOne({ where: { id: strength.createdBy } })
          : null;
        const updatedByUser = strength.updatedBy
          ? await userRepository.findOne({ where: { id: strength.updatedBy } })
          : null;

        return {
          ...strength,
          userName: user ? `${user.name} ${user.surname}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          createdByName: createdByUser ? `${createdByUser.name} ${createdByUser.surname}` : null,
          updatedByName: updatedByUser ? `${updatedByUser.name} ${updatedByUser.surname}` : null,
        };
      })
    );

    res.json(strengthsWithUsers);
  } catch (error) {
    console.error('Failed to fetch all strengths:', error);
    res.status(500).json({ error: 'Failed to fetch all strengths' });
  }
});

// Create or update strengths for a user (admin only)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user!.role;
    const roleStr = typeof currentUserRole === 'string' ? currentUserRole.toUpperCase() : currentUserRole;
    
    if (roleStr !== UserRole.ADMIN && roleStr !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied. Admin access required.' });
      return;
    }

    const { userEmail, topStrengths } = req.body;

    if (!userEmail || !topStrengths || !Array.isArray(topStrengths) || topStrengths.length !== 6) {
      res.status(400).json({ error: 'userEmail and topStrengths (array of 6) are required' });
      return;
    }

    const userRepository = getDataSource().getRepository(UserEntity);
    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);

    // Find user by email
    const user = await userRepository.findOne({ where: { email: userEmail } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if strengths already exist for this user
    const existingStrengths = await strengthsRepository.findOne({ where: { userId: user.id } });

    if (existingStrengths) {
      // Get user info for update
      const currentUser = await userRepository.findOne({ where: { id: req.user!.id } });
      const profileUser = await userRepository.findOne({ where: { id: user.id } });
      
      // Update existing
      existingStrengths.topStrengths = topStrengths;
      existingStrengths.updatedBy = req.user!.id;
      existingStrengths.updatedByName = currentUser?.name || undefined;
      existingStrengths.updatedBySurname = currentUser?.surname || undefined;
      existingStrengths.updatedByEmail = currentUser?.email || undefined;
      // Also update user info if it changed
      if (profileUser) {
        existingStrengths.userName = profileUser.name || undefined;
        existingStrengths.userSurname = profileUser.surname || undefined;
        existingStrengths.userEmail = profileUser.email || undefined;
      }
      await strengthsRepository.save(existingStrengths);

      // Log audit
      await auditService.log(AuditAction.UPDATE, AuditEntityType.USER, {
        entityId: user.id,
        entityName: `${user.name} ${user.surname}`,
        description: `Updated CliftonStrengths for ${user.email}`,
        userId: req.user!.id,
        metadata: JSON.stringify({ topStrengths }),
      });

      res.json(existingStrengths);
    } else {
      // Get user info for creation
      const currentUser = await userRepository.findOne({ where: { id: req.user!.id } });
      
      // Create new
      const newStrengths = strengthsRepository.create({
        userId: user.id,
        userName: user.name || undefined,
        userSurname: user.surname || undefined,
        userEmail: user.email || undefined,
        topStrengths,
        createdBy: req.user!.id,
        createdByName: currentUser?.name || undefined,
        createdBySurname: currentUser?.surname || undefined,
        createdByEmail: currentUser?.email || undefined,
        updatedBy: req.user!.id,
        updatedByName: currentUser?.name || undefined,
        updatedBySurname: currentUser?.surname || undefined,
        updatedByEmail: currentUser?.email || undefined,
      });
      newStrengths.id = uuidv4();

      await strengthsRepository.save(newStrengths);

      // Log audit
      await auditService.log(AuditAction.CREATE, AuditEntityType.USER, {
        entityId: user.id,
        entityName: `${user.name} ${user.surname}`,
        description: `Created CliftonStrengths profile for ${user.email}`,
        userId: req.user!.id,
        metadata: JSON.stringify({ topStrengths }),
      });

      res.status(201).json(newStrengths);
    }
  } catch (error) {
    console.error('Failed to save strengths:', error);
    res.status(500).json({ error: 'Failed to save strengths' });
  }
});

// Delete strengths for a user (admin only)
router.delete('/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserRole = req.user!.role;
    const roleStr = typeof currentUserRole === 'string' ? currentUserRole.toUpperCase() : currentUserRole;
    
    if (roleStr !== UserRole.ADMIN && roleStr !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied. Admin access required.' });
      return;
    }

    const { userId } = req.params;
    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const strengths = await strengthsRepository.findOne({ where: { userId } });
    if (!strengths) {
      res.status(404).json({ error: 'Strengths not found for this user' });
      return;
    }

    await strengthsRepository.remove(strengths);

    // Log audit
    await auditService.log(AuditAction.DELETE, AuditEntityType.USER, {
      entityId: user.id,
      entityName: `${user.name} ${user.surname}`,
      description: `Deleted CliftonStrengths profile for ${user.email}`,
      userId: req.user!.id,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete strengths:', error);
    res.status(500).json({ error: 'Failed to delete strengths' });
  }
});

// Get team synergy view (strengths across team members)
router.get('/team-synergy', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const userDepartmentId = req.user!.departmentId;

    const strengthsRepository = getDataSource().getRepository(CliftonStrengthsEntity);
    const userRepository = getDataSource().getRepository(UserEntity);

    // Get all users in the same department (or all users if admin)
    const roleStr = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;
    const isAdmin = roleStr === UserRole.ADMIN || roleStr === 'ADMIN';

    let users: UserEntity[] = [];
    if (isAdmin) {
      users = await userRepository.find();
    } else if (userDepartmentId) {
      users = await userRepository.find({ where: { departmentId: userDepartmentId } });
    } else {
      // If no department, only show current user
      const currentUser = await userRepository.findOne({ where: { id: userId } });
      users = currentUser ? [currentUser] : [];
    }

    // Get strengths for all team members
    const teamStrengths = await Promise.all(
      users.map(async (user) => {
        const strengths = await strengthsRepository.findOne({ where: { userId: user.id } });
        return {
          userId: user.id,
          userName: `${user.name} ${user.surname}`,
          userEmail: user.email,
          strengths: strengths?.topStrengths || [],
        };
      })
    );

    // Calculate strength distribution across team
    const strengthCounts: Record<string, number> = {};
    teamStrengths.forEach((member) => {
      member.strengths.forEach((strength) => {
        strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
      });
    });

    res.json({
      teamMembers: teamStrengths,
      strengthDistribution: strengthCounts,
      totalMembers: teamStrengths.length,
      membersWithStrengths: teamStrengths.filter((m) => m.strengths.length > 0).length,
    });
  } catch (error) {
    console.error('Failed to fetch team synergy:', error);
    res.status(500).json({ error: 'Failed to fetch team synergy' });
  }
});

export default router;



