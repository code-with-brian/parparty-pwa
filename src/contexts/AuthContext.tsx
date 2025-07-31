import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { notificationManager } from '../utils/notificationManager';

interface User {
  _id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
  tokenIdentifier: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokenIdentifier: string, name: string, email?: string, image?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'image'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  convex: ConvexReactClient;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, convex }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const storedToken = localStorage.getItem('parparty_auth_token');
        if (storedToken) {
          const userData = await convex.query(api.users.getByToken, {
            tokenIdentifier: storedToken,
          });
          
          if (userData) {
            setUser(userData);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('parparty_auth_token');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        localStorage.removeItem('parparty_auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, [convex]);

  // Initialize notifications when app loads
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await notificationManager.initialize();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  const login = async (tokenIdentifier: string, name: string, email?: string, image?: string) => {
    try {
      setIsLoading(true);
      
      // Create or get user
      const userId = await convex.mutation(api.users.create, {
        tokenIdentifier,
        name,
        email,
        image,
      });

      // Get full user data
      const userData = await convex.query(api.users.getByToken, {
        tokenIdentifier,
      });

      if (userData) {
        setUser(userData);
        localStorage.setItem('parparty_auth_token', tokenIdentifier);
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('parparty_auth_token');
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'email' | 'image'>>) => {
    if (!user) throw new Error('No user logged in');

    try {
      // Update user in database
      await convex.mutation(api.users.store, {
        tokenIdentifier: user.tokenIdentifier,
        name: updates.name || user.name,
        email: updates.email || user.email,
        image: updates.image || user.image,
      });

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook for guest-to-user conversion
export const useGuestConversion = () => {
  const { login } = useAuth();
  
  const convertGuestToUser = async (
    guestId: Id<"guests">,
    name: string,
    email?: string,
    image?: string
  ) => {
    try {
      // Generate a unique token identifier for the new user
      const tokenIdentifier = `converted_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Convert guest to user in backend
      const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
      const result = await convex.mutation(api.userConversion.convertGuestToUser, {
        guestId,
        name,
        email,
        tokenIdentifier,
        image,
      });

      if (result.success) {
        // Log in the new user
        await login(tokenIdentifier, name, email, image);
        return result;
      }

      throw new Error('Conversion failed');
    } catch (error) {
      console.error('Error converting guest to user:', error);
      throw error;
    }
  };

  return { convertGuestToUser };
};