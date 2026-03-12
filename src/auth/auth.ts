import { getDataSource } from '../database/config';
import { UserEntity } from '../database/entities/User';
import { UserRole } from '../shared/types';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: string;
    departmentId?: string;
  };
  needsPasswordChange?: boolean;
  error?: string;
}

export interface CreateUserResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    role: string;
    departmentId?: string;
  };
  error?: string;
}

export class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Check database connection first
      let dataSource;
      try {
        dataSource = getDataSource();
      } catch (dbError) {
        console.error('Database connection error during login:', dbError);
        return { 
          success: false, 
          error: 'Database not available. Please check server logs and ensure database is initialized.' 
        };
      }

      const userRepository = dataSource.getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        console.log(`Login attempt failed: User not found for email: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        console.log(`Login attempt failed: Invalid password for email: ${email}`);
        return { success: false, error: 'Invalid email or password' };
      }

      console.log(`Login successful for user: ${email} (${user.role})`);
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name || '',
          surname: user.surname || '',
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        },
        needsPasswordChange: user.needsPasswordChange || false,
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return { 
        success: false, 
        error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async createUser(
    name: string,
    surname: string,
    email: string,
    password: string,
    role: UserRole,
    departmentId?: string
  ): Promise<CreateUserResult> {
    try {
      const userRepository = getDataSource().getRepository(UserEntity);
      
      // Check if user already exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const userData: any = {
        id: uuidv4(),
        name,
        surname,
        email,
        passwordHash,
        role,
      };
      
      if (departmentId) {
        userData.departmentId = departmentId;
      }
      
      const user = userRepository.create(userData) as unknown as UserEntity;

      await userRepository.save(user);
      
      // Verify the user was actually saved to the database
      const savedUser = await userRepository.findOne({ where: { id: user.id } });
      if (!savedUser) {
        console.error('Failed to verify user creation - user not found after save');
        return { success: false, error: 'Failed to create user - user not saved to database' };
      }

      console.log(`User successfully created: ${savedUser.email} (ID: ${savedUser.id})`);

      return {
        success: true,
        user: {
          id: savedUser.id,
          name: savedUser.name || '',
          surname: savedUser.surname || '',
          email: savedUser.email,
          role: savedUser.role,
          departmentId: savedUser.departmentId || undefined,
        },
      };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRepository = getDataSource().getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.passwordHash = passwordHash;
      await userRepository.save(user);
      
      // Verify the password was actually updated
      const verifyUser = await userRepository.findOne({ where: { id: userId } });
      if (!verifyUser) {
        console.error('Failed to verify password update - user not found after save');
        return { success: false, error: 'Failed to verify password update' };
      }
      
      // Test that the new password hash is different (verify it was saved)
      const isPasswordUpdated = verifyUser.passwordHash === passwordHash;
      if (!isPasswordUpdated) {
        console.error('Password hash mismatch after update');
        return { success: false, error: 'Password update verification failed' };
      }

      console.log(`Password updated successfully for user: ${user.email} (ID: ${userId})`);
      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: 'Failed to update password' };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    try {
      const userRepository = getDataSource().getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { email } });
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return { success: true, temporaryPassword: undefined };
      }

      // Generate a temporary password (8 characters: 2 uppercase, 2 lowercase, 2 numbers, 2 special)
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const special = '!@#$%&*';
      
      let tempPassword = '';
      tempPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
      tempPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
      tempPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
      tempPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
      tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
      tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
      tempPassword += special[Math.floor(Math.random() * special.length)];
      tempPassword += special[Math.floor(Math.random() * special.length)];
      
      // Shuffle the password
      tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');

      // Hash the temporary password
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      user.passwordHash = passwordHash;
      user.needsPasswordChange = true; // Mark that user needs to change password
      await userRepository.save(user);

      console.log(`Password reset for user: ${user.email} (ID: ${user.id})`);
      return { success: true, temporaryPassword: tempPassword };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }
}
