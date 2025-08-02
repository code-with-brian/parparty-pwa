import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { notificationManager } from '../utils/notificationManager';
import { SmartConversionModal } from '../components/SmartConversionModal';
import { appleAuth } from '../utils/appleAuth';
import { googleAuth } from '../utils/googleAuth';

interface User {
  _id: Id<"users">;
  name: string;
  email?: string;
  image?: string;
  tokenIdentifier: string;
}

type ConversionTrigger = 'photo_share' | 'achievement' | 'reaction' | 'comment' | 'post';

interface SignUpData {
  name: string;
  email?: string;
  phone?: string;
  method: 'google' | 'apple' | 'form';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokenIdentifier: string, name: string, email?: string, image?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'image'>>) => Promise<void>;
  promptSignUp: (trigger: ConversionTrigger, callback: () => void) => void;
  quickSignUp: (data: SignUpData) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  convex: ConvexReactClient;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, convex }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversionContext, setConversionContext] = useState<{
    trigger: ConversionTrigger;
    callback: () => void;
  } | null>(null);

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

  const promptSignUp = (trigger: ConversionTrigger, callback: () => void) => {
    setConversionContext({ trigger, callback });
  };

  const quickSignUp = async (data: SignUpData) => {
    try {
      setIsLoading(true);
      
      // Generate unique token identifier
      const tokenIdentifier = `quick_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Handle guest conversion if we have guest session
      const guestSession = localStorage.getItem('parparty_guest_session');
      if (guestSession) {
        try {
          const session = JSON.parse(guestSession);
          const result = await convex.mutation(api.userConversion.convertGuestToUser, {
            guestId: session.id,
            name: data.name,
            email: data.email,
            tokenIdentifier,
            image: undefined,
          });

          if (result.success) {
            await login(tokenIdentifier, data.name, data.email);
            
            // Execute the stored callback
            if (conversionContext?.callback) {
              conversionContext.callback();
            }
            
            // Clear conversion context
            setConversionContext(null);
            return;
          }
        } catch (error) {
          console.error('Guest conversion failed, creating new user:', error);
        }
      }

      // Fallback: create new user
      await login(tokenIdentifier, data.name, data.email);
      
      // Execute the stored callback
      if (conversionContext?.callback) {
        conversionContext.callback();
      }
      
      // Clear conversion context
      setConversionContext(null);
      
    } catch (error) {
      console.error('Error during quick sign up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setIsLoading(true);

      const result = await appleAuth.authenticate();
      
      if (result.success && result.user) {
        // Generate a unique token identifier for Apple user
        const tokenIdentifier = `apple_${result.user.providerId}_${Date.now()}`;
        
        // Handle guest conversion if we have guest session
        const guestSession = localStorage.getItem('parparty_guest_session');
        if (guestSession) {
          try {
            const session = JSON.parse(guestSession);
            const conversionResult = await convex.mutation(api.userConversion.convertGuestToUser, {
              guestId: session.id,
              name: result.user.name,
              email: result.user.email,
              tokenIdentifier,
              image: result.user.avatarUrl,
            });

            if (conversionResult.success) {
              await login(tokenIdentifier, result.user.name, result.user.email, result.user.avatarUrl);
              return;
            }
          } catch (error) {
            console.error('Guest conversion failed, creating new user:', error);
          }
        }

        // Fallback: create new user or login existing Apple user
        await login(tokenIdentifier, result.user.name, result.user.email, result.user.avatarUrl);
        
      } else {
        throw new Error(result.error || 'Apple Sign-In failed');
      }
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);
      
      // Don't show error for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('USER_CANCELLED')) {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);

      const result = await googleAuth.authenticate();
      
      if (result.success && result.user) {
        // Generate a unique token identifier for Google user
        const tokenIdentifier = `google_${result.user.providerId}_${Date.now()}`;
        
        // Handle guest conversion if we have guest session
        const guestSession = localStorage.getItem('parparty_guest_session');
        if (guestSession) {
          try {
            const session = JSON.parse(guestSession);
            const conversionResult = await convex.mutation(api.userConversion.convertGuestToUser, {
              guestId: session.id,
              name: result.user.name,
              email: result.user.email,
              tokenIdentifier,
              image: result.user.avatarUrl,
            });

            if (conversionResult.success) {
              await login(tokenIdentifier, result.user.name, result.user.email, result.user.avatarUrl);
              return;
            }
          } catch (error) {
            console.error('Guest conversion failed, creating new user:', error);
          }
        }

        // Fallback: create new user or login existing Google user
        await login(tokenIdentifier, result.user.name, result.user.email, result.user.avatarUrl);
        
      } else {
        throw new Error(result.error || 'Google Sign-In failed');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      // Don't show error for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('USER_CANCELLED')) {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    promptSignUp,
    quickSignUp,
    signInWithApple,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SmartConversionModal
        isOpen={!!conversionContext}
        onClose={() => setConversionContext(null)}
        trigger={conversionContext?.trigger || 'post'}
        onSignUp={quickSignUp}
        onExecuteAction={() => {
          if (conversionContext?.callback) {
            conversionContext.callback();
          }
        }}
      />
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