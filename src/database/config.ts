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
import { RequisitionStatusHistoryEntity } from './entities/RequisitionStatusHistory';
import { RequisitionProofEntity } from './entities/RequisitionProof';
import { AuditLogEntity } from './entities/AuditLog';
import { TimeEntryEntity } from './entities/TimeEntry';
import { CliftonStrengthsEntity } from './entities/CliftonStrengths';
import { ProcurementDocumentEntity } from './entities/ProcurementDocument';
import { RequisitionDocumentEntity } from './entities/RequisitionDocument';
import { ProjectOwnershipTransferEntity } from './entities/ProjectOwnershipTransfer';
import { ProjectOwnershipInvitationEntity } from './entities/ProjectOwnershipInvitation';
import { OrderOwnershipTransferEntity } from './entities/OrderOwnershipTransfer';
import { OrderOwnershipInvitationEntity } from './entities/OrderOwnershipInvitation';
import { ProjectAnalysisEntity } from './entities/ProjectAnalysis';

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

    // Check if orders table has completedDate column
    const hasCompletedDate = ordersTableInfo.some((col: any) => col.name === 'completedDate');
    if (!hasCompletedDate) {
      console.log('Adding completedDate column to orders table...');
      await queryRunner.query(`ALTER TABLE orders ADD COLUMN "completedDate" datetime;`);
      console.log('completedDate column added to orders table successfully');
    }

    // Check if projects table has departmentId column
    const projectsTableInfo = await queryRunner.query(`PRAGMA table_info(projects);`);
    const projectsHasDepartmentId = projectsTableInfo.some((col: any) => col.name === 'departmentId');
    
    if (!projectsHasDepartmentId) {
      console.log('Adding departmentId column to projects table...');
      await queryRunner.query(`ALTER TABLE projects ADD COLUMN "departmentId" varchar;`);
      console.log('departmentId column added to projects table successfully');
    }

    // Check if time_entries table exists
    const timeEntriesTable = await queryRunner.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='time_entries';
    `);
    
    if (timeEntriesTable.length === 0) {
      console.log('Creating time_entries table...');
      await queryRunner.query(`
        CREATE TABLE "time_entries" (
          "id" varchar PRIMARY KEY NOT NULL,
          "projectId" varchar NOT NULL,
          "taskId" varchar,
          "orderId" varchar,
          "userId" varchar NOT NULL,
          "entryType" varchar NOT NULL DEFAULT 'manual',
          "status" varchar NOT NULL DEFAULT 'completed',
          "startTime" datetime NOT NULL,
          "endTime" datetime,
          "durationHours" decimal(10,2) NOT NULL,
          "description" text,
          "notes" text,
          "departmentId" varchar,
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      console.log('time_entries table created successfully');
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

    // Check if tasks table has assigned user info columns
    const tasksTableInfo = await queryRunner.query(`PRAGMA table_info(tasks);`);
    const hasAssignedUserName = tasksTableInfo.some((col: any) => col.name === 'assignedUserName');
    const hasAssignedUserSurname = tasksTableInfo.some((col: any) => col.name === 'assignedUserSurname');
    const hasAssignedUserEmail = tasksTableInfo.some((col: any) => col.name === 'assignedUserEmail');
    
    if (!hasAssignedUserName) {
      console.log('Adding assignedUserName column to tasks table...');
      await queryRunner.query(`ALTER TABLE tasks ADD COLUMN "assignedUserName" varchar;`);
      console.log('assignedUserName column added to tasks table successfully');
    }
    if (!hasAssignedUserSurname) {
      console.log('Adding assignedUserSurname column to tasks table...');
      await queryRunner.query(`ALTER TABLE tasks ADD COLUMN "assignedUserSurname" varchar;`);
      console.log('assignedUserSurname column added to tasks table successfully');
    }
    if (!hasAssignedUserEmail) {
      console.log('Adding assignedUserEmail column to tasks table...');
      await queryRunner.query(`ALTER TABLE tasks ADD COLUMN "assignedUserEmail" varchar;`);
      console.log('assignedUserEmail column added to tasks table successfully');
    }

    // Check if clifton_strengths table exists
    const cliftonStrengthsTable = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='clifton_strengths';
    `);
    
    if (cliftonStrengthsTable.length === 0) {
      console.log('Creating clifton_strengths table...');
      await queryRunner.query(`
        CREATE TABLE "clifton_strengths" (
          "id" varchar PRIMARY KEY NOT NULL,
          "userId" varchar NOT NULL,
          "topStrengths" text NOT NULL,
          "createdBy" varchar,
          "updatedBy" varchar,
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      console.log('clifton_strengths table created successfully');
    }

    // Check if requisition_proofs table exists
    const requisitionProofsTable = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='requisition_proofs';
    `);
    
    if (requisitionProofsTable.length === 0) {
      console.log('Creating requisition_proofs table...');
      await queryRunner.query(`
        CREATE TABLE "requisition_proofs" (
          "id" varchar PRIMARY KEY NOT NULL,
          "requisitionId" varchar NOT NULL,
          "uploadedBy" varchar NOT NULL,
          "fileName" text NOT NULL,
          "filePath" text NOT NULL,
          "mimeType" text NOT NULL,
          "fileSize" integer NOT NULL,
          "description" text,
          "uploadedAt" datetime NOT NULL
        )
      `);
      console.log('requisition_proofs table created successfully');
    }

    // Check if procurement_documents table exists
    const procurementDocsTable = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='procurement_documents';
    `);
    
    if (procurementDocsTable.length === 0) {
      console.log('Creating procurement_documents table...');
      await queryRunner.query(`
        CREATE TABLE "procurement_documents" (
          "id" varchar PRIMARY KEY NOT NULL,
          "orderId" varchar NOT NULL,
          "createdBy" varchar NOT NULL,
          "createdByName" text,
          "createdBySurname" text,
          "createdByEmail" text,
          "itemName" text NOT NULL,
          "itemCode" text NOT NULL,
          "itemDescription" text NOT NULL,
          "quantity" integer NOT NULL,
          "customerNumber" text NOT NULL,
          "additionalCriteria" text,
          "fileName" text NOT NULL,
          "pdfData" blob NOT NULL,
          "fileSize" integer NOT NULL,
          "taggedUsers" text,
          "taggedUserNames" text,
          "uploadedFileName" text,
          "uploadedFileData" blob,
          "uploadedFileSize" integer,
          "uploadedFileMimeType" text,
          "createdAt" datetime NOT NULL
        )
      `);
      console.log('procurement_documents table created successfully');
    } else {
      // Check for new columns and add them if missing
      const procurementDocsTableInfo = await queryRunner.query(`PRAGMA table_info(procurement_documents);`);
      const columnNames = procurementDocsTableInfo.map((col: any) => col.name);
      
      if (!columnNames.includes('uploadedFileName')) {
        console.log('Adding uploadedFileName column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "uploadedFileName" text;`);
      }
      if (!columnNames.includes('uploadedFileData')) {
        console.log('Adding uploadedFileData column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "uploadedFileData" blob;`);
      }
      if (!columnNames.includes('uploadedFileSize')) {
        console.log('Adding uploadedFileSize column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "uploadedFileSize" integer;`);
      }
      if (!columnNames.includes('uploadedFileMimeType')) {
        console.log('Adding uploadedFileMimeType column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "uploadedFileMimeType" text;`);
      }
      // Also check for other missing columns that might have been added later
      if (!columnNames.includes('createdByName')) {
        console.log('Adding createdByName column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "createdByName" text;`);
      }
      if (!columnNames.includes('createdBySurname')) {
        console.log('Adding createdBySurname column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "createdBySurname" text;`);
      }
      if (!columnNames.includes('createdByEmail')) {
        console.log('Adding createdByEmail column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "createdByEmail" text;`);
      }
      if (!columnNames.includes('taggedUserNames')) {
        console.log('Adding taggedUserNames column to procurement_documents table...');
        await queryRunner.query(`ALTER TABLE procurement_documents ADD COLUMN "taggedUserNames" text;`);
      }
    }

    // Check if requisition_documents table exists
    const requisitionDocsTable = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='requisition_documents';
    `);
    
    if (requisitionDocsTable.length === 0) {
      console.log('Creating requisition_documents table...');
      await queryRunner.query(`
        CREATE TABLE "requisition_documents" (
          "id" varchar PRIMARY KEY NOT NULL,
          "requisitionId" varchar NOT NULL,
          "uploadedBy" varchar NOT NULL,
          "uploadedByName" text,
          "uploadedBySurname" text,
          "uploadedByEmail" text,
          "fileName" text NOT NULL,
          "fileData" blob NOT NULL,
          "fileSize" integer NOT NULL,
          "mimeType" text NOT NULL,
          "description" text,
          "uploadedAt" datetime NOT NULL
        )
      `);
      console.log('requisition_documents table created successfully');
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

    // Check if needsPasswordChange column exists
    const usersTableInfoAfter = await queryRunner.query(`PRAGMA table_info(users);`);
    const hasNeedsPasswordChangeColumn = usersTableInfoAfter.some((col: any) => col.name === 'needsPasswordChange');
    
    if (!hasNeedsPasswordChangeColumn) {
      console.log('Adding needsPasswordChange column to users table...');
      await queryRunner.query(`ALTER TABLE users ADD COLUMN "needsPasswordChange" boolean NOT NULL DEFAULT 0;`);
      console.log('needsPasswordChange column added successfully');
    }

    // Check if project_analysis table exists
    const projectAnalysisTable = await queryRunner.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='project_analysis';
    `);
    
    if (projectAnalysisTable.length === 0) {
      console.log('Creating project_analysis table...');
      await queryRunner.query(`
        CREATE TABLE "project_analysis" (
          "id" varchar PRIMARY KEY NOT NULL,
          "orderId" varchar NOT NULL,
          "recommendations" text NOT NULL,
          "weaknesses" text NOT NULL,
          "faults" text NOT NULL,
          "mistakes" text NOT NULL,
          "summary" text,
          "rawData" text,
          "analyzedBy" varchar,
          "createdAt" datetime NOT NULL,
          "updatedAt" datetime NOT NULL
        )
      `);
      console.log('project_analysis table created successfully');
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
      entities: [UserEntity, ProjectEntity, TaskEntity, ResourceEntity, DeliverableEntity, OrderEntity, PurchaseEntity, DepartmentEntity, ConfigurationEntity, TaskInvitationEntity, RequisitionEntity, RequisitionItemEntity, RequisitionStatusHistoryEntity, RequisitionProofEntity, RequisitionDocumentEntity, AuditLogEntity, TimeEntryEntity, CliftonStrengthsEntity, ProcurementDocumentEntity, ProjectOwnershipTransferEntity, ProjectOwnershipInvitationEntity, OrderOwnershipTransferEntity, OrderOwnershipInvitationEntity, ProjectAnalysisEntity],
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

