import { getDataSource } from './config';
import { UserEntity } from './entities/User';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../shared/types';

/**
 * Migrates existing users from old schema (username) to new schema (name, surname)
 * This handles the transition from username-based to email-based authentication
 */
export const migrateUsers = async (): Promise<void> => {
  try {
    const userRepository = getDataSource().getRepository(UserEntity);
    
    // Check if we have any users with null name/surname (indicating old schema)
    // We'll check by looking for users where name is null or empty
    // Since TypeORM might have already created the columns, we need to handle this carefully
    
    // First, let's try to find users that might need migration
    // We'll use a raw query to check the actual table structure
    const queryRunner = getDataSource().createQueryRunner();
    
    try {
      // Check if 'username' column exists (old schema)
      const tableInfo = await queryRunner.query(`
        PRAGMA table_info(users);
      `);
      
      const hasUsernameColumn = tableInfo.some((col: any) => col.name === 'username');
      const hasNameColumn = tableInfo.some((col: any) => col.name === 'name');
      
      if (hasUsernameColumn && !hasNameColumn) {
        // Old schema - need to migrate
        console.log('Detected old user schema. Migrating users...');
        
        // Get all users with old schema
        const oldUsers = await queryRunner.query(`
          SELECT id, username, email, "passwordHash", role, "createdAt", "updatedAt"
          FROM users
        `);
        
        // Add new columns (nullable first)
        await queryRunner.query(`
          ALTER TABLE users ADD COLUMN name TEXT;
        `);
        await queryRunner.query(`
          ALTER TABLE users ADD COLUMN surname TEXT;
        `);
        await queryRunner.query(`
          ALTER TABLE users ADD COLUMN "departmentId" TEXT;
        `);
        
        // Migrate data: split username or use email prefix as name
        for (const oldUser of oldUsers) {
          let name = 'User';
          let surname = '';
          
          if (oldUser.username) {
            const parts = oldUser.username.split(' ');
            if (parts.length > 1) {
              name = parts[0];
              surname = parts.slice(1).join(' ');
            } else {
              name = oldUser.username;
            }
          } else if (oldUser.email) {
            // Use email prefix as name
            name = oldUser.email.split('@')[0];
          }
          
          await queryRunner.query(`
            UPDATE users 
            SET name = ?, surname = ?
            WHERE id = ?
          `, [name, surname, oldUser.id]);
        }
        
        // Drop old username column
        await queryRunner.query(`
          CREATE TABLE "users_new" (
            "id" varchar PRIMARY KEY NOT NULL,
            "name" varchar NOT NULL,
            "surname" varchar NOT NULL,
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
        
        console.log(`Migrated ${oldUsers.length} users to new schema`);
      } else if (hasNameColumn) {
        // New schema already exists, but check for users with null name/surname
        const usersWithNullName = await queryRunner.query(`
          SELECT id, email FROM users WHERE name IS NULL OR name = ''
        `);
        
        if (usersWithNullName.length > 0) {
          console.log(`Found ${usersWithNullName.length} users with null names. Updating...`);
          for (const user of usersWithNullName) {
            const name = user.email.split('@')[0] || 'User';
            await queryRunner.query(`
              UPDATE users 
              SET name = ?, surname = ?
              WHERE id = ?
            `, [name, '', user.id]);
          }
        }
      }
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - let the app continue, but log the error
  }
};








