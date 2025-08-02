# Google Sign-In Setup

This document describes the Google Sign-In implementation in the ParParty PWA.

## Implementation Overview

Google Sign-In has been implemented using:
- `@capgo/capacitor-social-login` for cross-platform functionality (iOS, Android, Web)
- Custom `GoogleAuthManager` utility class for unified API
- Platform-aware authentication with native and web support

## Configuration

### Capacitor Configuration
- **Plugin**: `@capgo/capacitor-social-login`
- **Configuration**: Added to `capacitor.config.ts`
- **Client IDs**: Separate for iOS, Android, and Web platforms

### Platform-Specific Client IDs
```typescript
// capacitor.config.ts
plugins: {
  SocialLogin: {
    google: {
      iOSClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      androidClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      webClientId: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    },
  },
}
```

## Usage

### In Components
```typescript
import { googleAuth } from '@/utils/googleAuth';

// Check availability
const isAvailable = await googleAuth.isAvailable();

// Authenticate
const result = await googleAuth.authenticate();
if (result.success) {
  // Handle successful authentication
  console.log('User:', result.user);
}
```

### In AuthContext
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { signInWithGoogle } = useAuth();

// Sign in with Google
await signInWithGoogle();
```

## Features

- **Platform Detection**: Works across iOS, Android, and Web
- **Guest Conversion**: Seamlessly converts guest users to authenticated users
- **Error Handling**: Proper handling of user cancellation and other errors
- **Token Management**: Refresh token support
- **Current User**: Get current authentication status

## Google Cloud Console Setup Required

To enable Google Sign-In in production, you need to:

1. **Google Cloud Project**: Create or select a project in Google Cloud Console
2. **OAuth 2.0 Credentials**: Create credentials for each platform:
   - **Web Client**: For web authentication
   - **iOS Client**: For native iOS app
   - **Android Client**: For native Android app
3. **SHA-1 Fingerprints**: Add development and production SHA-1 fingerprints for Android
4. **Bundle ID Configuration**: Configure iOS bundle identifier
5. **Authorized Domains**: Add your domain for web authentication

### Platform-Specific Setup

#### iOS Configuration
- Bundle Identifier: `com.parparty.pwa`
- Create iOS OAuth 2.0 client in Google Cloud Console
- Add client ID to `capacitor.config.ts`

#### Android Configuration
- Package Name: `com.parparty.pwa`
- SHA-1 Certificate Fingerprints (development and production)
- Create Android OAuth 2.0 client in Google Cloud Console
- Add client ID to `capacitor.config.ts`

#### Web Configuration
- Authorized JavaScript Origins: `https://parparty.app`, `http://localhost:5173`
- Authorized Redirect URIs: Your app's callback URLs
- Create Web OAuth 2.0 client in Google Cloud Console
- Add client ID to `capacitor.config.ts`

## Testing

- **Development**: All platforms supported with proper configuration
- **iOS Simulator**: May have limitations, real device recommended
- **Android Emulator**: Should work with proper Google Play Services
- **Web Browser**: Full Google authentication flow

## Security

- **Secure Client IDs**: Platform-specific client IDs for security
- **Token Validation**: Server-side validation recommended for production
- **Scope Management**: Minimal required scopes (profile, email)
- **Refresh Tokens**: Automatic token refresh support

## Error Handling

The implementation handles:
- Platform availability detection
- User cancellation (silent failure)
- Network errors
- Invalid credentials
- Service unavailable
- Token expiration

## Available Methods

- `googleAuth.authenticate()`: Main sign-in method
- `googleAuth.signOut()`: Sign out current user
- `googleAuth.getCurrentUser()`: Get current user info
- `googleAuth.refreshToken()`: Refresh access token
- `googleAuth.isAvailable()`: Check platform availability

## Integration Status

✅ **Completed**:
- Capacitor plugin installation (@capgo/capacitor-social-login)
- Utility class implementation
- Modal integration with availability checking
- AuthContext integration
- Cross-platform configuration
- Error handling and user cancellation

🔄 **Next Steps** (for production):
- Google Cloud Console project setup
- OAuth 2.0 client credentials for each platform
- SHA-1 fingerprint configuration for Android
- Domain verification for web
- Server-side token validation

## Plugin Details

- **Package**: `@capgo/capacitor-social-login@7.8.3`
- **Supports**: Google, Apple, Facebook authentication
- **Platforms**: iOS, Android, Web
- **Capacitor**: v7 compatible
- **Maintenance**: Actively maintained fork of archived plugin

## Differences from Apple Sign-In

- **Availability**: Google Sign-In available on all platforms
- **Setup Complexity**: Requires more platform-specific configuration
- **Token Management**: More comprehensive token handling
- **User Data**: Provides avatar URLs (unlike Apple)
- **Refresh Flow**: Built-in token refresh capabilities