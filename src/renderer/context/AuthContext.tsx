import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: string;
  departmentId?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (sessionId: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthContext');
  }
  return context;
};

