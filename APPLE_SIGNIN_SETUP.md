# Apple Sign-In Setup

This document describes the Apple Sign-In implementation in the ParParty PWA.

## Implementation Overview

Apple Sign-In has been implemented using:
- `@capacitor-community/apple-sign-in` for native iOS functionality
- Apple's JavaScript SDK for web fallback
- Custom `AppleAuthManager` utility class for unified API

## Configuration

### iOS Configuration
- **Bundle Identifier**: `com.parparty.pwa`
- **Entitlements**: Apple Sign-In capability added to `ios/App/App/App.entitlements`
- **Dependencies**: Automatically synced via `npx cap sync`

### Web Configuration
- **Client ID**: `com.parparty.pwa` (same as bundle identifier)
- **Redirect URI**: `https://parparty.app/auth/apple/callback`
- **SDK**: Apple's JavaScript SDK loaded dynamically

## Usage

### In Components
```typescript
import { appleAuth } from '@/utils/appleAuth';

// Check availability
const isAvailable = await appleAuth.isAvailable();

// Authenticate
const result = await appleAuth.authenticate();
if (result.success) {
  // Handle successful authentication
  console.log('User:', result.user);
}
```

### In AuthContext
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { signInWithApple } = useAuth();

// Sign in with Apple
await signInWithApple();
```

## Features

- **Platform Detection**: Automatically uses native implementation on iOS, web fallback elsewhere
- **Guest Conversion**: Seamlessly converts guest users to authenticated users
- **Error Handling**: Proper handling of user cancellation and other errors
- **Availability Check**: Only shows Apple Sign-In when available

## Apple Developer Setup Required

To enable Apple Sign-In in production, you need to:

1. **Apple Developer Account**: Enroll in Apple Developer Program
2. **App ID Configuration**: Enable "Sign In with Apple" capability
3. **Services ID**: Create and configure for web authentication
4. **Key Generation**: Create Apple Sign-In key for server-side verification
5. **Domain Verification**: Verify your domain for web authentication

## Testing

- **iOS Simulator**: Apple Sign-In not available (requires real device)
- **Real iOS Device**: Full Apple Sign-In functionality
- **Web Browser**: Uses Apple's web authentication flow

## Security

- **Nonce Generation**: Random nonce generated for each request
- **Token Validation**: Server-side validation recommended for production
- **Private Relay**: Supports Apple's private email relay feature

## Error Handling

The implementation handles:
- Platform availability detection
- User cancellation (silent failure)
- Network errors
- Invalid credentials
- Service unavailable

## Integration Status

✅ **Completed**:
- Capacitor plugin installation
- Utility class implementation
- Modal integration
- AuthContext integration
- iOS configuration
- Web fallback

🔄 **Next Steps** (for production):
- Apple Developer account setup
- Production certificate configuration
- Server-side token validation
- Domain verification