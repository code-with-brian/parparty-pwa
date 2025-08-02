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

interface UserSettings {
  // Appearance settings
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  animationLevel: 'none' | 'reduced' | 'full';
  soundEffects: boolean;
  compactMode: boolean;
  showAnimatedBackgrounds: boolean;
  highContrast: boolean;
  // Privacy settings
  profileVisibility: 'public' | 'friends' | 'private';
  gameActivity: 'public' | 'friends' | 'private';
  statsVisible: boolean;
  achievementsVisible: boolean;
  allowFriendRequests: boolean;
  allowGameInvites: boolean;
  showOnlineStatus: boolean;
  dataSharing: boolean;
  // Notification preferences
  pushNotificationsEnabled: boolean;
  notificationTypes: {
    gameUpdates: boolean;
    socialActivity: boolean;
    achievements: boolean;
    marketing: boolean;
  };
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
  userSettings: UserSettings | null;
  isLoading: boolean;
  isSettingsLoading: boolean;
  isAuthenticated: boolean;
  login: (tokenIdentifier: string, name: string, email?: string, image?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'image'>>) => Promise<void>;
  updateAppearanceSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updatePrivacySettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<UserSettings>) => Promise<void>;
  resetSettingsToDefaults: () => Promise<void>;
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
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [conversionContext, setConversionContext] = useState<{
    trigger: ConversionTrigger;
    callback: () => void;
  } | null>(null);

  // Check for existing session on mount and handle OAuth callbacks
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // First, check for OAuth callback
        const oauthResult = await googleAuth.handleOAuthCallback();
        if (oauthResult && oauthResult.success && oauthResult.user) {
          // Handle successful OAuth callback
          const tokenIdentifier = `google_${oauthResult.user.providerId}_${Date.now()}`;
          await login(tokenIdentifier, oauthResult.user.name, oauthResult.user.email, oauthResult.user.avatarUrl);
          return;
        } else if (oauthResult && !oauthResult.success) {
          console.error('OAuth callback failed:', oauthResult.error);
        }

        // Check for existing stored session
        const storedToken = localStorage.getItem('parparty_auth_token');
        if (storedToken) {
          const userData = await convex.query(api.users.getByToken, {
            tokenIdentifier: storedToken,
          });
          
          if (userData) {
            setUser(userData);
            // Load user settings for existing session
            await loadUserSettings(userData._id);
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

  // Load user settings
  const loadUserSettings = async (userId: Id<"users">) => {
    try {
      setIsSettingsLoading(true);
      const settings = await convex.query(api.userSettings.getUserSettings, { userId });
      setUserSettings(settings);
    } catch (error) {
      console.error('Failed to load user settings:', error);
      // Use defaults if loading fails
      setUserSettings({
        theme: 'dark',
        accentColor: 'cyan',
        fontSize: 'medium',
        animationLevel: 'full',
        soundEffects: true,
        compactMode: false,
        showAnimatedBackgrounds: true,
        highContrast: false,
        profileVisibility: 'public',
        gameActivity: 'friends',
        statsVisible: true,
        achievementsVisible: true,
        allowFriendRequests: true,
        allowGameInvites: true,
        showOnlineStatus: true,
        dataSharing: false,
        pushNotificationsEnabled: true,
        notificationTypes: {
          gameUpdates: true,
          socialActivity: true,
          achievements: true,
          marketing: false,
        },
      });
    } finally {
      setIsSettingsLoading(false);
    }
  };

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
        
        // Load user settings after successful login
        await loadUserSettings(userData._id);
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
    setUserSettings(null);
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

  const updateAppearanceSettings = async (settings: Partial<UserSettings>) => {
    if (!user) throw new Error('No user logged in');

    try {
      await convex.mutation(api.userSettings.updateAppearanceSettings, {
        userId: user._id,
        theme: settings.theme,
        accentColor: settings.accentColor,
        fontSize: settings.fontSize,
        animationLevel: settings.animationLevel,
        soundEffects: settings.soundEffects,
        compactMode: settings.compactMode,
        showAnimatedBackgrounds: settings.showAnimatedBackgrounds,
        highContrast: settings.highContrast,
      });

      // Update local state
      setUserSettings(prev => prev ? { ...prev, ...settings } : null);
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      throw error;
    }
  };

  const updatePrivacySettings = async (settings: Partial<UserSettings>) => {
    if (!user) throw new Error('No user logged in');

    try {
      await convex.mutation(api.userSettings.updatePrivacySettings, {
        userId: user._id,
        profileVisibility: settings.profileVisibility,
        gameActivity: settings.gameActivity,
        statsVisible: settings.statsVisible,
        achievementsVisible: settings.achievementsVisible,
        allowFriendRequests: settings.allowFriendRequests,
        allowGameInvites: settings.allowGameInvites,
        showOnlineStatus: settings.showOnlineStatus,
        dataSharing: settings.dataSharing,
      });

      // Update local state
      setUserSettings(prev => prev ? { ...prev, ...settings } : null);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  };

  const updateNotificationSettings = async (settings: Partial<UserSettings>) => {
    if (!user) throw new Error('No user logged in');

    try {
      await convex.mutation(api.userSettings.updateNotificationSettings, {
        userId: user._id,
        pushNotificationsEnabled: settings.pushNotificationsEnabled,
        notificationTypes: settings.notificationTypes,
      });

      // Update local state
      setUserSettings(prev => prev ? { ...prev, ...settings } : null);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  };

  const resetSettingsToDefaults = async () => {
    if (!user) throw new Error('No user logged in');

    try {
      await convex.mutation(api.userSettings.resetSettingsToDefaults, {
        userId: user._id,
      });

      // Reload settings from server
      await loadUserSettings(user._id);
    } catch (error) {
      console.error('Error resetting settings:', error);
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
            
            // Check if there was a preserved active game from guest conversion
            const preservedGame = localStorage.getItem('parparty_user_active_game');
            if (preservedGame) {
              // The active game info is now handled by the backend after conversion
              localStorage.removeItem('parparty_user_active_game');
            }
            
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
              
              // Check if there was a preserved active game from guest conversion
              const preservedGame = localStorage.getItem('parparty_user_active_game');
              if (preservedGame) {
                // The active game info is now handled by the backend after conversion
                localStorage.removeItem('parparty_user_active_game');
              }
              
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

      // This will redirect to Google OAuth, so we don't expect a response
      await googleAuth.authenticate();
      
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      setIsLoading(false);
      
      // Don't show error for redirect or cancellation
      if (!error.message?.includes('cancelled') && 
          !error.message?.includes('USER_CANCELLED') &&
          !error.message?.includes('Redirecting')) {
        throw error;
      }
    }
    // Note: setIsLoading(false) will be handled when the page loads after redirect
  };

  const value: AuthContextType = {
    user,
    userSettings,
    isLoading,
    isSettingsLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    updateAppearanceSettings,
    updatePrivacySettings,
    updateNotificationSettings,
    resetSettingsToDefaults,
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