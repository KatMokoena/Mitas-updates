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
      const userRepository = getDataSource().getRepository(UserEntity);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

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
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
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

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name || '',
          surname: user.surname || '',
          email: user.email,
          role: user.role,
          departmentId: user.departmentId || undefined,
        },
      };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }
}
