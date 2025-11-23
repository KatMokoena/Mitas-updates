import { getDataSource } from './config';
import { UserEntity } from './entities/User';
import { ConfigurationEntity } from './entities/Configuration';
import { UserRole } from '../shared/types';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const seedDatabase = async (): Promise<void> => {
  const userRepository = getDataSource().getRepository(UserEntity);
  const queryRunner = getDataSource().createQueryRunner();

  try {
    // First, update any existing users that have null name/surname
    // Only update existing users - do not create new ones unless they're seed users
    const usersWithNullName = await queryRunner.query(`
      SELECT id, email FROM users WHERE (name IS NULL OR name = '' OR surname IS NULL) AND email IS NOT NULL
    `);

    for (const user of usersWithNullName) {
      let name = 'User';
      let surname = '';
      
      if (user.email) {
        const emailPrefix = user.email.split('@')[0];
        // Try to split if it looks like a name
        if (emailPrefix.includes('.') || emailPrefix.includes('_')) {
          const parts = emailPrefix.split(/[._]/);
          name = parts[0] || 'User';
          surname = parts.slice(1).join(' ') || '';
        } else {
          name = emailPrefix;
        }
      }
      
      await queryRunner.query(`
        UPDATE users 
        SET name = ?, surname = ?
        WHERE id = ?
      `, [name, surname, user.id]);
    }

    if (usersWithNullName.length > 0) {
      console.log(`Updated ${usersWithNullName.length} existing users with name/surname`);
    }
  } catch (error) {
    console.warn('Error updating existing users:', error);
  } finally {
    await queryRunner.release();
  }

  // Only create seed users if they don't exist - never recreate deleted users
  // Check if admin user exists
  const adminExists = await userRepository.findOne({ where: { email: 'admin@mitas.com' } });
  
  if (!adminExists) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const admin = userRepository.create({
      id: uuidv4(),
      name: 'Admin',
      surname: 'User',
      email: 'admin@mitas.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    });
    await userRepository.save(admin);
    console.log('Default admin user created (email: admin@mitas.com, password: admin123)');
  } else {
    console.log('Admin user already exists, skipping creation');
  }

  // Create default project manager only if it doesn't exist
  const pmExists = await userRepository.findOne({ where: { email: 'pm@mitas.com' } });
  if (!pmExists) {
    const pmPasswordHash = await bcrypt.hash('pm123', 10);
    const pm = userRepository.create({
      id: uuidv4(),
      name: 'Project',
      surname: 'Manager',
      email: 'pm@mitas.com',
      passwordHash: pmPasswordHash,
      role: UserRole.PROJECT_MANAGER,
    });
    await userRepository.save(pm);
    console.log('Default project manager created (email: pm@mitas.com, password: pm123)');
  } else {
    console.log('Project manager user already exists, skipping creation');
  }

  // Create default role configurations if they don't exist
  const configRepository = getDataSource().getRepository(ConfigurationEntity);
  
  // Default configuration for PROJECT_MANAGER - NO ACCESS by default (admin must grant access)
  const pmConfigExists = await configRepository.findOne({ where: { role: UserRole.PROJECT_MANAGER } });
  if (!pmConfigExists) {
    const pmConfig = configRepository.create({
      id: uuidv4(),
      role: UserRole.PROJECT_MANAGER,
      allowedRoutes: [], // No access by default - admin must grant access via Configurations
      permissions: JSON.stringify({ 
        canDeleteOrders: false, 
        canCreateOrders: false,
        canEditOrders: false,
        canEditTasks: false,
        canDeleteTasks: false
      }),
    });
    await configRepository.save(pmConfig);
    console.log('Default PROJECT_MANAGER configuration created (no access by default)');
  } else {
    // Preserve existing permissions - only update if permissions field is missing or invalid
    if (!pmConfigExists.permissions || pmConfigExists.permissions === '{}' || pmConfigExists.permissions.trim() === '') {
      const defaultPermissions = {
        canDeleteOrders: false,
        canCreateOrders: false,
        canEditOrders: false,
        canEditTasks: false,
        canDeleteTasks: false
      };
      // Try to parse existing permissions and merge
      try {
        const existing = JSON.parse(pmConfigExists.permissions || '{}');
        const merged = { ...defaultPermissions, ...existing };
        pmConfigExists.permissions = JSON.stringify(merged);
      } catch {
        pmConfigExists.permissions = JSON.stringify(defaultPermissions);
      }
      await configRepository.save(pmConfigExists);
      console.log('PROJECT_MANAGER configuration permissions initialized');
    }
  }

  // Default configuration for USER - NO ACCESS by default (admin must grant access)
  const userConfigExists = await configRepository.findOne({ where: { role: UserRole.USER } });
  if (!userConfigExists) {
    const userConfig = configRepository.create({
      id: uuidv4(),
      role: UserRole.USER,
      allowedRoutes: [], // No access by default - admin must grant access via Configurations
      permissions: JSON.stringify({ 
        canDeleteOrders: false, 
        canCreateOrders: false,
        canEditOrders: false,
        canEditTasks: false,
        canDeleteTasks: false
      }),
    });
    await configRepository.save(userConfig);
    console.log('Default USER configuration created (no access by default)');
  } else {
    // Preserve existing permissions - only update if permissions field is missing or invalid
    if (!userConfigExists.permissions || userConfigExists.permissions === '{}' || userConfigExists.permissions.trim() === '') {
      const defaultPermissions = {
        canDeleteOrders: false,
        canCreateOrders: false,
        canEditOrders: false,
        canEditTasks: false,
        canDeleteTasks: false
      };
      // Try to parse existing permissions and merge
      try {
        const existing = JSON.parse(userConfigExists.permissions || '{}');
        const merged = { ...defaultPermissions, ...existing };
        userConfigExists.permissions = JSON.stringify(merged);
      } catch {
        userConfigExists.permissions = JSON.stringify(defaultPermissions);
      }
      await configRepository.save(userConfigExists);
      console.log('USER configuration permissions initialized');
    }
  }
};

