import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

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
  private static webGoogleAuth: any = null;

  /**
   * Initialize Google Sign-In with configuration
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
      const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';

      // Check if we're using placeholder credentials
      if (iOSClientId.includes('1234567890') || webClientId.includes('1234567890')) {
        console.warn('⚠️ Using placeholder Google OAuth client IDs. Please set up real credentials to avoid 401 errors.');
        console.warn('📖 See GOOGLE_OAUTH_SETUP.md for detailed setup instructions');
      }

      // For web platform, initialize Google Identity Services directly
      if (Capacitor.getPlatform() === 'web') {
        await this.initializeWebGoogleAuth(webClientId);
      } else {
        // For mobile platforms, use the Capacitor plugin
        await SocialLogin.initialize({
          google: {
            iOSClientId,
            webClientId,
            popup: false,
            redirectUrl: `${window.location.origin}/`,
          },
        });
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Google Identity Services for web
   */
  private static async initializeWebGoogleAuth(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Google Identity Services script
      if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.setupGoogleIdentityServices(clientId);
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this.setupGoogleIdentityServices(clientId);
        resolve();
      }
    });
  }

  /**
   * Setup Google Identity Services
   */
  private static setupGoogleIdentityServices(clientId: string): void {
    if (typeof window !== 'undefined' && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }
  }

  /**
   * Handle credential response from Google
   */
  private static handleCredentialResponse(response: any): void {
    // This will be handled by the promise in signInWithWeb
    this.webGoogleAuth = response;
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
  static async signIn(retryCount: number = 0): Promise<GoogleAuthResult> {
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

      console.log('🔍 Starting Google Sign-In...');
      
      // Use web-specific implementation for web platform
      if (Capacitor.getPlatform() === 'web') {
        return await this.signInWithWeb();
      }
      
      // Add timeout for redirect-based authentication on mobile
      const response = await Promise.race([
        SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['profile', 'email'],
            popup: false,
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication timeout')), 60000)
        )
      ]) as any;

      console.log('✅ Google Sign-In response received:', response);

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

      if (errorObj.message?.includes('invalid_client') || errorObj.message?.includes('401')) {
        return {
          success: false,
          error: 'Invalid Google OAuth configuration. Please check client IDs in GOOGLE_OAUTH_SETUP.md'
        };
      }

      if (errorObj.message?.includes('Authentication timeout')) {
        return {
          success: false,
          error: 'Sign-in timed out. Please try again.'
        };
      }

      if (errorObj.message?.includes('redirect_uri_mismatch')) {
        return {
          success: false,
          error: 'Redirect URI mismatch. Please check authorized redirect URIs in Google Cloud Console.'
        };
      }

      return {
        success: false,
        error: (error as Error).message || 'Google Sign-In failed'
      };
    }
  }

  /**
   * Web-specific sign-in using Google Identity Services
   */
  private static async signInWithWeb(): Promise<GoogleAuthResult> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          // Create a temporary div for the Google Sign-In button
          const buttonDiv = document.createElement('div');
          buttonDiv.id = 'google-signin-button';
          buttonDiv.style.position = 'fixed';
          buttonDiv.style.top = '-9999px';
          document.body.appendChild(buttonDiv);

          // Store the resolve function to call it from the callback
          (window as any).__googleSignInResolve = resolve;
          
          // Update the callback to use our resolve function
          (window as any).google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '860809923710-040a8v1e6jj8jvcaa8qicdaebbc362p9.apps.googleusercontent.com',
            callback: (response: any) => {
              this.processWebCredentialResponse(response).then((result) => {
                if ((window as any).__googleSignInResolve) {
                  (window as any).__googleSignInResolve(result);
                  delete (window as any).__googleSignInResolve;
                }
                // Clean up the button
                const button = document.getElementById('google-signin-button');
                if (button) button.remove();
              });
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render the button
          (window as any).google.accounts.id.renderButton(
            buttonDiv,
            { 
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              width: 250
            }
          );

          // Programmatically click the button
          setTimeout(() => {
            const button = buttonDiv.querySelector('[role="button"]') as HTMLElement;
            if (button) {
              button.click();
            } else {
              resolve({
                success: false,
                error: 'Could not trigger Google Sign-In'
              });
            }
          }, 100);
          
        } catch (error) {
          resolve({
            success: false,
            error: 'Failed to initialize Google Sign-In'
          });
        }
      } else {
        resolve({
          success: false,
          error: 'Google Identity Services not loaded'
        });
      }
    });
  }


  /**
   * Process credential response from Google Identity Services
   */
  private static async processWebCredentialResponse(response: any): Promise<GoogleAuthResult> {
    try {
      // Decode JWT token to get user info
      const token = response.credential;
      const payload = this.parseJWT(token);
      
      return {
        success: true,
        user: {
          email: payload.email || '',
          name: payload.name || payload.given_name || 'Google User',
          providerId: payload.sub || 'google_user',
          avatarUrl: payload.picture,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process Google credentials'
      };
    }
  }

  /**
   * Parse JWT token
   */
  private static parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
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