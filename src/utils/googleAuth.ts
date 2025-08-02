import { SocialLogin } from '@capgo/capacitor-social-login';

export interface GoogleAuthResult {
  success: boolean;
  user?: {
    email: string;
    name: string;
    providerId: string;
    avatarUrl?: string;
  };
  error?: string;
}

export class GoogleAuthManager {
  private static initialized = false;

  /**
   * Initialize Google Sign-In with configuration
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await SocialLogin.initialize({
        google: {
          iOSClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
          webClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
        },
      });
      this.initialized = true;
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if Google Sign-In is available on the current platform
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Google Sign-In is available on all platforms with this plugin
      return true;
    } catch (error) {
      console.error('Error checking Google Sign-In availability:', error);
      return false;
    }
  }

  /**
   * Initiate Google Sign-In flow
   */
  static async signIn(): Promise<GoogleAuthResult> {
    try {
      // Initialize if not already done
      await this.initialize();

      // Check availability first
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Google Sign-In is not available on this device'
        };
      }

      const response = await SocialLogin.login({
        provider: 'google',
        options: {}
      });

      // Process the response
      // Handle different response types (online vs offline)
      const profile = 'profile' in response.result ? response.result.profile : null;
      
      return {
        success: true,
        user: {
          email: profile?.email || '',
          name: profile?.name || profile?.givenName || 'Google User',
          providerId: profile?.id || 'google_user',
          avatarUrl: profile?.imageUrl,
        }
      };

    } catch (error: unknown) {
      console.error('Google Sign-In error:', error);
      
      // Handle specific error codes
      const errorObj = error as { code?: string; message?: string };
      if (errorObj.code === 'USER_CANCELLED' || errorObj.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'Sign-in was cancelled by user'
        };
      }

      if (errorObj.code === 'NETWORK_ERROR') {
        return {
          success: false,
          error: 'Network error occurred during sign-in'
        };
      }

      return {
        success: false,
        error: (error as Error).message || 'Google Sign-In failed'
      };
    }
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    try {
      await SocialLogin.logout({
        provider: 'google',
      });
    } catch (error) {
      console.error('Google Sign-Out error:', error);
      // Don't throw error for logout failures
    }
  }

  /**
   * Refresh the Google access token
   */
  static async refreshToken(): Promise<string | null> {
    try {
      // Note: refresh functionality may not be available in all plugin versions
      console.warn('Token refresh not implemented in current plugin version');
      return null;
    } catch (error) {
      console.error('Google token refresh error:', error);
      return null;
    }
  }

  /**
   * Get current authentication status
   */
  static async getCurrentUser(): Promise<GoogleAuthResult> {
    try {
      // Note: getCurrentUser functionality may not be available in all plugin versions
      return {
        success: false,
        error: 'getCurrentUser not implemented in current plugin version'
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: (error as Error).message || 'Failed to get current user'
      };
    }
  }

  /**
   * Main sign-in method that handles platform-specific logic
   */
  static async authenticate(): Promise<GoogleAuthResult> {
    return this.signIn();
  }
}

// Export for easier imports
export const googleAuth = GoogleAuthManager;
export default GoogleAuthManager;