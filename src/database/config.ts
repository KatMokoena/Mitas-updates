import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { UserEntity } from './entities/User';
import { ProjectEntity } from './entities/Project';
import { TaskEntity } from './entities/Task';
import { ResourceEntity } from './entities/Resource';
import { DeliverableEntity } from './entities/Deliverable';
import { OrderEntity } from './entities/Order';
import { PurchaseEntity } from './entities/Purchase';
import { DepartmentEntity } from './entities/Department';
import { ConfigurationEntity } from './entities/Configuration';
import { TaskInvitationEntity } from './entities/TaskInvitation';
import { RequisitionEntity, RequisitionItemEntity } from './entities/Requisition';
import { AuditLogEntity } from './entities/AuditLog';

let AppDataSource: DataSource | null = null;

const getDatabasePath = (): string => {
  // Use the project root directory
  // __dirname in compiled code will be dist/database or dist/src/database
  // In source code, it will be src/database
  // We need to find the project root by looking for package.json or going up until we find it
  let currentDir = __dirname;
  let projectRoot = currentDir;
  
  // Go up directories until we find package.json (project root)
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }
  
  // If we didn't find package.json, fall back to going up directories
  // When compiled: dist/src/database -> go up 3 levels to project root
  // When source: src/database -> go up 1 level to project root
  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    if (__dirname.includes('dist')) {
      // From dist/src/database, go up 3 levels to project root
      projectRoot = path.resolve(__dirname, '../../..');
    } else {
      // From src/database, go up 1 level to project root
      projectRoot = path.resolve(__dirname, '..');
    }
  }
  
  const dbPath = path.resolve(projectRoot, 'ipmp.db');
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  console.log('Database path (absolute):', dbPath);
  console.log('Database path exists:', fs.existsSync(dbPath));
  return dbPath;
};

/**
 * Run migrations to ensure database schema is up to date
 */
const runMigrations = async (queryRunner: any): Promise<void> => {
  try {
    // Check if configurations table exists
    const tables = await queryRunner.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='configurations';
    `);
    
    if (tables.length === 0) {
      console.log('Creating configurations table...');
      await queryRunner.query(`
        CREATE TABLE "configurations" (
          "id" varchar PRIMARY KEY NOT NULL,
          "role" varchar NOT NULL,
          "allowedRoutes" text NOT NULL DEFAULT '',
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      console.log('Configurations table created successfully');
    } else {
      // Check if allowedRoutes column exists (in case of partial migration)
      const configTableInfo = await queryRunner.query(`PRAGMA table_info(configurations);`);
      const hasAllowedRoutes = configTableInfo.some((col: any) => col.name === 'allowedRoutes');
      
      if (!hasAllowedRoutes) {
        console.log('Adding allowedRoutes column to configurations table...');
        await queryRunner.query(`ALTER TABLE configurations ADD COLUMN "allowedRoutes" text NOT NULL DEFAULT '';`);
        console.log('allowedRoutes column added successfully');
      }
      
      // Check if permissions column exists
      const hasPermissions = configTableInfo.some((col: any) => col.name === 'permissions');
      if (!hasPermissions) {
        console.log('Adding permissions column to configurations table...');
        await queryRunner.query(`ALTER TABLE configurations ADD COLUMN "permissions" text DEFAULT '{}';`);
        console.log('permissions column added successfully');
      }
    }

    // Normalize role values - consolidate "project_manager" to "PROJECT_MANAGER"
    console.log('Normalizing role values...');
    try {
      // Update users table
      const usersWithLowercaseRole = await queryRunner.query(`
        SELECT id, role FROM users WHERE LOWER(role) = 'project_manager'
      `);
      if (usersWithLowercaseRole.length > 0) {
        await queryRunner.query(`
          UPDATE users SET role = 'PROJECT_MANAGER' WHERE LOWER(role) = 'project_manager'
        `);
        console.log(`Normalized ${usersWithLowercaseRole.length} user role(s) from 'project_manager' to 'PROJECT_MANAGER'`);
      }
      
      // Update configurations table
      const configsWithLowercaseRole = await queryRunner.query(`
        SELECT id, role FROM configurations WHERE LOWER(role) = 'project_manager'
      `);
      if (configsWithLowercaseRole.length > 0) {
        await queryRunner.query(`
          UPDATE configurations SET role = 'PROJECT_MANAGER' WHERE LOWER(role) = 'project_manager'
        `);
        console.log(`Normalized ${configsWithLowercaseRole.length} configuration role(s) from 'project_manager' to 'PROJECT_MANAGER'`);
      }
      
      // Also handle any other case variations
      await queryRunner.query(`
        UPDATE users SET role = 'PROJECT_MANAGER' 
        WHERE LOWER(role) = 'project_manager' OR role = 'Project_Manager' OR role = 'Project Manager'
      `);
      await queryRunner.query(`
        UPDATE configurations SET role = 'PROJECT_MANAGER' 
        WHERE LOWER(role) = 'project_manager' OR role = 'Project_Manager' OR role = 'Project Manager'
      `);
    } catch (roleError) {
      console.warn('Error normalizing PROJECT_MANAGER roles:', roleError);
    }

    // Normalize role values - consolidate "user" variations to "USER"
    try {
      // Check for lowercase "user" in users table
      const usersWithLowercaseUser = await queryRunner.query(`
        SELECT id, role FROM users WHERE LOWER(role) = 'user' AND role != 'USER'
      `);
      if (usersWithLowercaseUser.length > 0) {
        await queryRunner.query(`
          UPDATE users SET role = 'USER' WHERE LOWER(role) = 'user' AND role != 'USER'
        `);
        console.log(`Normalized ${usersWithLowercaseUser.length} user role(s) from 'user' to 'USER'`);
      }

      // Check for lowercase "user" in configurations table
      const configsWithLowercaseUser = await queryRunner.query(`
        SELECT id, role FROM configurations WHERE LOWER(role) = 'user' AND role != 'USER'
      `);
      if (configsWithLowercaseUser.length > 0) {
        await queryRunner.query(`
          UPDATE configurations SET role = 'USER' WHERE LOWER(role) = 'user' AND role != 'USER'
        `);
        console.log(`Normalized ${configsWithLowercaseUser.length} configuration role(s) from 'user' to 'USER'`);
      }
      
      // Also handle any other case variations for USER
      await queryRunner.query(`
        UPDATE users SET role = 'USER' 
        WHERE (LOWER(role) = 'user' OR role = 'User') AND role != 'USER'
      `);
      await queryRunner.query(`
        UPDATE configurations SET role = 'USER' 
        WHERE (LOWER(role) = 'user' OR role = 'User') AND role != 'USER'
      `);
    } catch (roleError) {
      console.warn('Error normalizing USER roles:', roleError);
    }

    // Check if resources table has category column
    const resourcesTableInfo = await queryRunner.query(`PRAGMA table_info(resources);`);
    const hasCategory = resourcesTableInfo.some((col: any) => col.name === 'category');
    
    if (!hasCategory) {
      console.log('Adding category column to resources table...');
      await queryRunner.query(`ALTER TABLE resources ADD COLUMN "category" varchar;`);
      console.log('Category column added to resources table successfully');
    }

    // Check if orders table has departmentId column
    const ordersTableInfo = await queryRunner.query(`PRAGMA table_info(orders);`);
    const hasDepartmentId = ordersTableInfo.some((col: any) => col.name === 'departmentId');
    
    if (!hasDepartmentId) {
      console.log('Adding departmentId column to orders table...');
      await queryRunner.query(`ALTER TABLE orders ADD COLUMN "departmentId" varchar;`);
      console.log('departmentId column added to orders table successfully');
    }

    // Check if orders table has createdBy column
    const hasCreatedBy = ordersTableInfo.some((col: any) => col.name === 'createdBy');
    if (!hasCreatedBy) {
      console.log('Adding createdBy column to orders table...');
      await queryRunner.query(`ALTER TABLE orders ADD COLUMN "createdBy" varchar;`);
      console.log('createdBy column added to orders table successfully');
    }

    // Check if task_invitations table exists
    const invitationsTable = await queryRunner.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='task_invitations';
    `);
    
    if (invitationsTable.length === 0) {
      console.log('Creating task_invitations table...');
      await queryRunner.query(`
        CREATE TABLE "task_invitations" (
          "id" varchar PRIMARY KEY NOT NULL,
          "taskId" varchar NOT NULL,
          "inviterId" varchar NOT NULL,
          "inviteeId" varchar NOT NULL,
          "status" varchar NOT NULL DEFAULT 'pending',
          "message" text,
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      console.log('task_invitations table created successfully');
    }

    // Check if users table has name and surname columns (legacy migration)
    const usersTableInfo = await queryRunner.query(`PRAGMA table_info(users);`);
    const hasUsernameColumn = usersTableInfo.some((col: any) => col.name === 'username');
    const hasNameColumn = usersTableInfo.some((col: any) => col.name === 'name');
    
    if (hasUsernameColumn && !hasNameColumn) {
      console.log('Detected old user schema. Running migration...');
      // Run migration first
      await queryRunner.query(`ALTER TABLE users ADD COLUMN name TEXT;`);
      await queryRunner.query(`ALTER TABLE users ADD COLUMN surname TEXT;`);
      await queryRunner.query(`ALTER TABLE users ADD COLUMN "departmentId" TEXT;`);
      
      // Migrate existing users
      const oldUsers = await queryRunner.query(`SELECT id, username, email FROM users`);
      for (const oldUser of oldUsers) {
        let name = 'User';
        let surname = '';
        if (oldUser.username) {
          const parts = oldUser.username.split(' ');
          name = parts[0] || 'User';
          surname = parts.slice(1).join(' ') || '';
        } else if (oldUser.email) {
          name = oldUser.email.split('@')[0];
        }
        await queryRunner.query(`UPDATE users SET name = ?, surname = ? WHERE id = ?`, [name, surname, oldUser.id]);
      }
      
      // Create new table and migrate
      await queryRunner.query(`
        CREATE TABLE "users_new" (
          "id" varchar PRIMARY KEY NOT NULL,
          "name" varchar,
          "surname" varchar,
          "email" varchar UNIQUE NOT NULL,
          "passwordHash" varchar NOT NULL,
          "role" varchar DEFAULT 'user',
          "departmentId" varchar,
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      await queryRunner.query(`
        INSERT INTO "users_new" (id, name, surname, email, "passwordHash", role, "departmentId", "createdAt", "updatedAt")
        SELECT id, name, surname, email, "passwordHash", role, "departmentId", "createdAt", "updatedAt"
        FROM users
      `);
      await queryRunner.query(`DROP TABLE users`);
      await queryRunner.query(`ALTER TABLE "users_new" RENAME TO "users"`);
      console.log('User migration completed successfully');
    }
  } catch (migrationError) {
    console.warn('Migration error (will continue with synchronize):', migrationError);
  }
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource && AppDataSource.isInitialized) {
      return;
    }

    const dbPath = getDatabasePath();
    const dbExists = fs.existsSync(dbPath);
    
    // Run migrations before synchronize if database exists
    if (dbExists) {
      try {
        // Initialize temporary DataSource for migrations
        const tempDataSource = new DataSource({
          type: 'better-sqlite3',
          database: dbPath,
          entities: [],
          synchronize: false,
          logging: false,
        });
        await tempDataSource.initialize();
        const queryRunner = tempDataSource.createQueryRunner();
        try {
          await runMigrations(queryRunner);
        } finally {
          await queryRunner.release();
          await tempDataSource.destroy();
        }
      } catch (migrationError) {
        console.warn('Pre-migration check failed, continuing with normal initialization:', migrationError);
      }
    }
    
    // Initialize main DataSource with synchronize enabled
    AppDataSource = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [UserEntity, ProjectEntity, TaskEntity, ResourceEntity, DeliverableEntity, OrderEntity, PurchaseEntity, DepartmentEntity, ConfigurationEntity, TaskInvitationEntity, RequisitionEntity, RequisitionItemEntity, AuditLogEntity],
      synchronize: true, // Auto-sync schema in development - ensures all entities match
      logging: false,
    });

    await AppDataSource.initialize();
    console.log('Database initialized successfully at:', dbPath);
  } catch (error) {
    console.error('Error initializing database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const getDataSource = (): DataSource => {
  if (!AppDataSource || !AppDataSource.isInitialized) {
    throw new Error('Database not initialized');
  }
  return AppDataSource;
};

