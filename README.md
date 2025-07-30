# ParParty MVP

A social-first, event-centric golf application that transforms every round into a live, memorable experience.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Mobile**: Capacitor for iOS/Android deployment
- **Backend**: Convex real-time backend with authentication
- **Routing**: React Router

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Mobile Development

1. Sync with native platforms:
   ```bash
   npx cap sync
   ```

2. Open in Xcode (iOS):
   ```bash
   npx cap open ios
   ```

3. Open in Android Studio:
   ```bash
   npx cap open android
   ```

## Project Structure

```
src/
├── components/
│   └── ui/           # shadcn/ui components
├── pages/            # Route components
├── utils/            # Utility functions
└── lib/              # Library configurations
```

## Routes

- `/join/:gameId` - Guest onboarding flow
- `/game/:gameId` - Live game scorecard
- `/finish/:gameId` - Post-game locker room (coming soon)

## Environment Variables

Create a `.env.local` file with:
```
VITE_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment_name
```