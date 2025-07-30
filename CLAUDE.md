# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ParParty MVP is a social-first, event-centric golf application built with React, TypeScript, Vite, and Convex. It transforms golf rounds into live, memorable experiences with real-time features for players, sponsors, and courses.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev          # Start Vite dev server (http://localhost:5173)

# Building
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build

# Testing
npm test             # Run tests in watch mode (Vitest)
npm run test:run     # Run tests once
npm run test:ui      # Open Vitest UI

# Code Quality
npm run lint         # Run ESLint
```

### Mobile Development (Capacitor)
```bash
npx cap sync         # Sync web app with native platforms
npx cap open ios     # Open in Xcode
npx cap open android # Open in Android Studio
```

### Convex Backend
```bash
npx convex dev       # Start Convex development
npx convex deploy    # Deploy Convex functions
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Mobile**: Capacitor for iOS/Android PWA
- **Backend**: Convex real-time serverless platform
- **Testing**: Vitest + React Testing Library

### Key Architectural Patterns

1. **Real-time Architecture**: All data flows through Convex for real-time synchronization
   - Games, scores, social posts update instantly across all clients
   - Optimistic updates for responsive UI

2. **Guest-First Design**: Players can join games without accounts
   - Device-based guest sessions (see `lib/GuestSessionManager.ts`)
   - Progressive enhancement to full accounts

3. **Event-Driven Social Feed**: Live game moments captured and shared
   - Social posts tied to game events (scores, photos, achievements)
   - Real-time reactions and interactions

4. **Mobile-First PWA**: Designed for golf course usage
   - Offline capability considerations
   - Camera integration for photo capture
   - GPS location tracking for shots

### Data Model (Convex Schema)

Core entities and their relationships:
- **games**: Active golf games with status tracking
- **players**: Both authenticated users and guests
- **scores**: Hole-by-hole scoring with GPS data
- **socialPosts**: Live feed of game moments
- **photos**: Media captured during rounds
- **foodOrders**: In-game F&B ordering
- **sponsors/sponsorRewards**: Partner rewards system
- **highlights**: AI-generated game summaries

### Key Components & Pages

**Pages** (`src/pages/`):
- `JoinGame`: Guest onboarding with QR/deep link support
- `GameScorecard`: Live scoring and social feed
- `LockerRoom`: Post-game highlights and memories

**Core Components** (`src/components/`):
- `SocialFeed`: Real-time game moments
- `PhotoCapture`: Camera integration
- `SponsorRewards`: Partner rewards display
- `FoodOrderingMenu`: F&B ordering interface

### Testing Strategy

- **Unit Tests**: Component logic and utilities
- **Integration Tests**: Full user flows (see `src/__tests__/integration/`)
- **Convex Tests**: Backend function testing (`convex/__tests__/`)

Run specific test: `npm test -- GameScorecard.test`

### Environment Configuration

Required environment variables:
```
VITE_CONVEX_URL=<your_convex_deployment_url>
CONVEX_DEPLOYMENT=<deployment_name>
```

### Path Aliases

Use `@/` for src imports:
```typescript
import { Button } from '@/components/ui/button'
```

## Development Workflow

1. **Feature Development**:
   - Create Convex schema/functions first
   - Build React components with real-time hooks
   - Add comprehensive tests

2. **Real-time Considerations**:
   - Use `useQuery` for reactive data
   - Implement optimistic updates with `useMutation`
   - Handle loading/error states properly

3. **Mobile Testing**:
   - Test in browser with device emulation
   - Use `npx cap sync` after changes
   - Test native features (camera, GPS) on devices

## Important Notes

- All timestamps use `Date.now()` (milliseconds since epoch)
- Guest sessions persist via device ID
- Deep links format: `parparty://join/{gameId}`
- Food orders integrate with course F&B systems
- Sponsor rewards have validation rules and redemption tracking