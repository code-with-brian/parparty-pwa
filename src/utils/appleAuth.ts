import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

export interface AppleAuthResult {
  success: boolean;
  user?: {
    email: string;
    name: string;
    providerId: string;
    avatarUrl?: string;
  };
  error?: string;
}

export class AppleAuthManager {
  private static initialized = false;

  /**
   * Initialize Apple Sign-In with configuration
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await SocialLogin.initialize({
        apple: {
          clientId: 'com.parparty.pwa',
          redirectUrl: 'https://parparty.app/auth/apple/callback',
        },
      });
      this.initialized = true;
    } catch (error) {
      console.error('Apple Auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if Apple Sign-In is available on the current platform
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Apple Sign-In is available on iOS and web
      if (Capacitor.isNativePlatform()) {
        return Capacitor.getPlatform() === 'ios';
      } else {
        // Web platform - Apple Sign-In can be used
        return true;
      }
    } catch (error) {
      console.error('Error checking Apple Sign-In availability:', error);
      return false;
    }
  }

  /**
   * Initiate Apple Sign-In flow
   */
  static async signIn(): Promise<AppleAuthResult> {
    try {
      // Initialize if not already done
      await this.initialize();

      // Check availability first
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device'
        };
      }

      const response = await SocialLogin.login({
        provider: 'apple',
        options: {}
      });

      // Process the response
      return {
        success: true,
        user: {
          email: response.result.profile?.email || '',
          name: [response.result.profile?.givenName, response.result.profile?.familyName].filter(Boolean).join(' ') || 'Apple User',
          providerId: response.result.profile?.user || 'apple_user',
          // Apple doesn't provide avatar URLs
        }
      };

    } catch (error: unknown) {
      console.error('Apple Sign-In error:', error);
      
      // Handle specific error codes
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'USER_CANCELLED' || errorObj.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'Sign-in was cancelled by user'
        };
      }

      return {
        success: false,
        error: (error as Error).message || 'Apple Sign-In failed'
      };
    }
  }

  /**
   * Sign out from Apple
   */
  static async signOut(): Promise<void> {
    try {
      await SocialLogin.logout({
        provider: 'apple',
      });
    } catch (error) {
      console.error('Apple Sign-Out error:', error);
      // Don't throw error for logout failures
    }
  }

  /**
   * Main sign-in method that handles platform-specific logic
   */
  static async authenticate(): Promise<AppleAuthResult> {
    return this.signIn();
  }
}

// Export for easier imports
export const appleAuth = AppleAuthManager;
export default AppleAuthManager;