# Google OAuth Setup Guide

This guide will help you set up Google OAuth credentials to fix the "Error 401: invalid_client" error.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "ParParty PWA" or use existing project

## Step 2: Enable Google+ API

1. Navigate to **APIs & Services > Library**
2. Search for "Google+ API" 
3. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `ParParty`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `email`, `profile`
5. Add test users (your email addresses for testing)

## Step 4: Create OAuth 2.0 Credentials

### For Web Application
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Name: `ParParty Web`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   http://localhost:5174
   http://localhost:5175
   http://localhost:5176
   https://parparty.app
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:5173
   http://localhost:5174
   http://localhost:5175
   http://localhost:5176
   https://parparty.app
   ```
   
   **Important**: For web-based authentication, the redirect URIs should be the base URLs (without `/auth/google/callback` path). The social login plugin handles the callback internally.
7. Copy the **Client ID** (format: `xxxxx.apps.googleusercontent.com`)

### For iOS Application
1. Create another credential
2. Choose **iOS** application type
3. Name: `ParParty iOS`
4. Bundle ID: `com.parparty.pwa`
5. Copy the **Client ID**

### For Android Application (Optional)
1. Create another credential
2. Choose **Android** application type
3. Name: `ParParty Android`
4. Package name: `com.parparty.pwa`
5. SHA-1 certificate fingerprint:
   ```bash
   # For debug (development):
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For release (production):
   keytool -list -v -keystore /path/to/your/release.keystore -alias your_alias
   ```
6. Copy the **Client ID**

## Step 5: Update Configuration

Replace the placeholder client IDs in `capacitor.config.ts`:

```typescript
SocialLogin: {
  google: {
    iOSClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  },
  apple: {
    clientId: 'com.parparty.pwa',
    redirectUrl: 'https://parparty.app/auth/apple/callback',
  },
},
```

Also update `src/utils/googleAuth.ts` initialization:

```typescript
await SocialLogin.initialize({
  google: {
    iOSClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  },
});
```

## Step 6: Environment Variables (Recommended)

Create `.env.local`:
```env
VITE_GOOGLE_IOS_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
VITE_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
```

Update the configuration to use environment variables:
```typescript
SocialLogin: {
  google: {
    iOSClientId: process.env.VITE_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.VITE_GOOGLE_WEB_CLIENT_ID,
  },
}
```

## Step 7: Sync and Test

1. Run `npx cap sync` to update native configurations
2. Test in web browser first
3. Test on iOS device/simulator

## Common Issues & Solutions

### "Error 401: invalid_client"
- Double-check client IDs are correct
- Ensure you're using the right client ID for the platform (web vs iOS)
- Verify authorized origins include your development URLs

### "Error 403: access_denied"
- Add your email to test users in OAuth consent screen
- Make sure required scopes are requested

### "Popup closed" / "Sign-in failed: Popup closed"
- User closed the popup before completing authentication
- Popup was blocked by browser - check popup blocker settings
- Redirect URI configuration issue - ensure base URLs (not callback paths) are in authorized redirect URIs
- Try disabling popup blockers and trying again
- Ensure the authorized JavaScript origins include your exact development URL

### "redirect_uri_mismatch"
- Check authorized redirect URIs match exactly
- For web authentication, use base URLs (e.g., `http://localhost:5173`) not callback paths
- Include both development and production URLs
- Make sure the port number matches exactly (Vite may use 5173, 5174, etc.)

### Development vs Production
- Development: Use `http://localhost:5173` (or your dev port - check your terminal)
- Production: Use `https://parparty.app`
- Both need to be added to authorized origins AND redirect URIs
- Include multiple ports (5173-5176) to handle Vite's port selection

## Testing Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Web client ID created and configured
- [ ] iOS client ID created and configured
- [ ] Client IDs updated in code
- [ ] Authorized origins include development URLs
- [ ] Test user emails added to OAuth consent
- [ ] `npx cap sync` executed
- [ ] Web authentication tested
- [ ] iOS authentication tested (if available)

## Security Notes

- Never commit client secrets to version control
- Use environment variables for sensitive data
- Restrict client IDs to specific domains/bundle IDs
- Regularly rotate credentials in production