# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

```bash
# Development server (runs on port 5173-5176 depending on availability)
npm run dev

# Production build
npm run build

# Run tests
npm test              # Watch mode
npm run test:run      # Run once without watch mode
npm run test:ui       # Open Vitest UI

# Linting
npm run lint

# Preview production build
npm run preview

# Mobile platform sync
npx cap sync
npx cap open ios      # Open in Xcode
npx cap open android  # Open in Android Studio

# Convex backend
npx convex dev        # Start Convex development
npx convex deploy     # Deploy Convex functions
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Convex (real-time, serverless)
- **Styling**: Tailwind CSS v3 + shadcn/ui + Framer Motion
- **Mobile**: Capacitor for iOS/Android PWA
- **State**: Convex React hooks + Context API
- **Payments**: Stripe (backend integration via Convex)
- **Testing**: Vitest + React Testing Library + Convex Test

### Critical Known Issues & Workarounds

1. **Convex Type Generation Issue**: Due to Stripe initialization in convex/payments.ts preventing proper type generation, ALL components that import Id from dataModel must use this workaround:
   ```typescript
   // Temporarily disable Convex dataModel import to fix build issues
   // import type { Id } from '../../convex/_generated/dataModel';
   type Id<T> = string;
   ```

2. **TypeScript Import Pattern**: Always separate runtime and type imports to avoid Vite errors:
   ```typescript
   import { SomeClass } from './module';
   import type { SomeType } from './module';
   ```

3. **Capacitor Type Imports**: Some Capacitor types don't export properly:
   ```typescript
   // Instead of: import { ActionPerformed } from '@capacitor/push-notifications';
   // Use: notification: any
   ```

### Core User Flow

1. **Landing Page** (`/`) → Create game with instant QR code
2. **Join Game** (`/join/:gameId`) → 1-step auto-join with `?auto=true` parameter
3. **Live Game** (`/game/:gameId`) → Real-time scoring with tabs (scorecard/social/orders)
4. **Post-Game** (`/locker-room/:gameId`) → Stats, AI highlights, rewards

### Key Architectural Decisions

- **Guest-First Design**: Players join without accounts via device ID, convert later
- **Real-Time Everything**: All game state via Convex subscriptions
- **1-Step QR Join**: QR codes include `?auto=true` for instant joining
- **Performance Optimizations**:
  - Lazy loading with React.lazy() for heavy components
  - Custom `useOptimizedQuery` hook with debouncing and selective fields
  - React.memo() for expensive list items
  - Suspense boundaries with GolfLoader component
- **Dark Party Theme**: CSS variables in index.css define dark theme
- **Mobile-First**: BottomTabNavigation, MobileLayout wrapper

### Convex Backend Structure

```
convex/
├── games.ts          # Core game logic, scoring, player management
├── socialPosts.ts    # Social feed, reactions, posts
├── sponsors.ts       # Sponsor rewards system
├── foodOrders.ts     # F&B ordering integration (menu hardcoded)
├── highlights.ts     # AI-powered highlight generation
├── payments.ts       # Stripe payment processing
├── userConversion.ts # Guest to user conversion flow
├── guests.ts         # Guest session management
├── photos.ts         # Photo storage and management
└── schema.ts         # Database schema definitions
```

### Frontend Component Organization

```
src/
├── pages/             # Route components
│   ├── LandingPage    # Entry with game creation
│   ├── JoinGame       # Auto-join flow implementation
│   ├── GameScorecard  # Live game with lazy-loaded tabs
│   └── LockerRoom     # Post-game with lazy components
├── components/
│   ├── layout/        # MobileLayout, BottomTabNavigation
│   ├── screens/       # ScorecardScreen (main scoring UI)
│   ├── ui/            # Reusable (shadcn/ui + custom)
│   └── [features]     # Feature components (SocialFeed, etc.)
├── hooks/             # Custom hooks (useOptimizedQuery)
├── utils/             # Utilities
│   ├── notificationManager.ts  # Push/web notifications
│   ├── paymentProcessor.ts     # Stripe integration
│   └── socialSharing.ts        # Share functionality
├── lib/               # Core libraries
│   └── GuestSessionManager.ts  # Device ID sessions
└── contexts/          # React contexts (AuthContext)
```

### Environment Configuration

Required `.env.local`:
```
VITE_CONVEX_URL=your_convex_deployment_url
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Backend environment (set in Convex dashboard):
```
STRIPE_SECRET_KEY=sk_test_...
```

### Testing Approach

- **Unit Tests**: `vitest` for components and utilities
- **Integration Tests**: Full user flows in `src/__tests__/integration/`
- **Convex Tests**: Backend functions in `convex/__tests__/`
- **Single Test**: `npm test -- path/to/test.test.ts`

### Key Implementation Details

1. **Auto-Join Flow**: 
   - GameCreator adds `?auto=true` to QR URL
   - JoinGame detects parameter and triggers auto-join
   - Smart naming: "Player 1", "Player 2", etc.

2. **Real-Time Updates**:
   - All Convex queries auto-refresh on data changes
   - Optimistic updates for scores via mutations
   - Social feed uses AnimatePresence for smooth updates

3. **PWA Configuration**:
   - manifest.json with all icon sizes (generated in public/icons/)
   - Service worker via Vite PWA plugin
   - Offline consideration in components

4. **Performance Patterns**:
   ```typescript
   // Lazy load heavy components
   const SocialFeed = lazy(() => import('@/components/SocialFeed'));
   
   // Optimize queries
   const gameState = useOptimizedQuery(
     api.games.getGameState,
     { gameId },
     { selectiveFields: ['game.status'], debounce: 100 }
   );
   
   // Memoize expensive operations
   const SocialPost = memo(({ post, ... }) => { ... });
   ```

5. **Dark Theme Implementation**:
   - CSS variables in `src/index.css`
   - Tailwind classes use these variables
   - No theme switching - always dark

### Golf Course POI System

The course mapping system uses a specific POI (Point of Interest) schema:

**POI Types**:
- 1 = Green
- 2 = Green Bunker
- 3 = Fairway Bunker
- 4 = Water
- 5 = Trees
- 6 = 100 Yard Marker
- 7 = 150 Yard Marker
- 8 = 200 Yard Marker
- 9 = Dogleg
- 10 = Road
- 11 = Front Tee
- 12 = Back Tee

**Location Positioning**:
- location: 1 (front), 2 (middle), 3 (back)
- sideFW: 1 (left), 2 (center), 3 (right of fairway)

**Coordinate Structure**:
```typescript
{
  poi: number,        // POI type (1-12)
  location: number,   // Position (1-3)
  sideFW: number,     // Fairway side (1-3)
  hole: number,       // Hole number
  latitude: number,   // GPS latitude
  longitude: number   // GPS longitude
}
```

### Current State & Notes

- **Working Features**: Game creation, QR join, real-time scoring, social feed
- **Hardcoded Data**: F&B menu items, course information
- **Import Workarounds**: Applied to ~15 components due to Convex type issue
- **Mobile**: PWA ready but native features need device testing
- **AI Highlights**: Backend ready but needs OpenAI key configuration