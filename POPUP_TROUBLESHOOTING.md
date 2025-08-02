# Google Sign-In Popup Troubleshooting

If you're seeing "Sign-in failed: Popup closed" errors, here are the most common causes and solutions:

## 🔍 Quick Diagnosis

### 1. Check Your Development URL
Your dev server is currently running on port **5173**. The exact URL is:
```
http://localhost:5173/
```

### 2. Verify Google Cloud Console Configuration

**In Google Cloud Console > APIs & Services > Credentials:**

1. **Authorized JavaScript origins** should include:
   ```
   http://localhost:5173
   ```

2. **Authorized redirect URIs** should include:
   ```
   http://localhost:5173
   ```

## 🛠 Common Solutions

### Solution 1: Update Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Edit your Web OAuth 2.0 Client ID
4. Add your exact development URL (`http://localhost:5173`) to both:
   - Authorized JavaScript origins
   - Authorized redirect URIs
5. **Save** the changes
6. Wait 5-10 minutes for changes to propagate
7. Try signing in again

### Solution 2: Check Popup Blockers
1. Ensure popup blockers are disabled for localhost
2. Check browser settings for popup permissions
3. Try in an incognito/private browsing window

### Solution 3: Clear Browser Cache
1. Clear browser cache and cookies for localhost
2. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. Try signing in again

### Solution 4: Check OAuth Consent Screen
1. In Google Cloud Console, go to **OAuth consent screen**
2. Add your email to **Test users** section
3. Ensure the app is in "Testing" mode (for development)

## 🔧 Development-Specific Fixes

### If Using Placeholder Credentials
The popup error combined with account selection suggests you have real OAuth client IDs set up, which is great! The issue is likely just the redirect URI configuration.

### Quick Test
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try Google Sign-In
4. Look for any additional error messages that might provide more details

### Alternative: Check Network Tab
1. Open Developer Tools > Network tab
2. Try signing in
3. Look for any failed requests (red entries)
4. Check if there are 400/403 errors that might give more specific information

## 📝 Still Having Issues?

If the above doesn't work, please check:

1. **Exact port number**: Make sure the port in Google Console matches your dev server
2. **Protocol**: Use `http://` for localhost (not `https://`)
3. **No trailing slashes**: Use `http://localhost:5174` not `http://localhost:5174/`
4. **Multiple ports**: If Vite switches ports, add multiple entries (5173, 5174, 5175, 5176)

## ✅ Success Indicators & Expected Behavior

When properly configured, here's what should happen:

### Expected Flow:
1. **Click "Continue with Google"** in the app
2. **Popup opens** showing "Choose an account to continue to ParParty"
3. **Select your Google account** in the popup
4. **DO NOT close the popup manually** - let it complete the process
5. **Popup should close automatically** after authentication
6. **You should be signed in** to the main application

### ⚠️ Important: Do NOT Close the Popup Manually

**Common mistake**: Closing the popup window after selecting your account will cause the "Popup closed" error. 

**What to do**: After selecting your Google account in the popup, wait for it to complete the authentication process and close automatically.

### If the Popup Stays Open Too Long:
- Wait up to 30-60 seconds for the authentication to complete
- Check if there are any error messages in the popup
- Look for additional permission prompts that might need approval
- If it stays open indefinitely, there might be a redirect URI configuration issue

## 🔧 Debug Steps

If the popup keeps failing:

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Try Google Sign-In**
4. **Look for these debug messages**:
   - "🔍 Starting Google Sign-In..."
   - "✅ Google Sign-In response received:" (if successful)
   - Any error messages in red

5. **In the Network tab**, look for:
   - Failed requests to googleapis.com
   - 400/403 error responses
   - CORS-related errors