import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useEffect, Suspense, lazy } from 'react';
import { DeepLinkHandler } from './utils/deepLink';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { GolfLoader } from './components/ui/golf-loader';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const JoinGame = lazy(() => import('./pages/JoinGame'));
const GameScorecard = lazy(() => import('./pages/GameScorecard'));
const LockerRoom = lazy(() => import('./pages/LockerRoom'));
const Test = lazy(() => import('./pages/Test'));
const GameCreator = lazy(() => import('./pages/GameCreator'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function App() {
  useEffect(() => {
    // Initialize deep link handlers when app starts
    DeepLinkHandler.registerLinkHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <AuthProvider convex={convex}>
          <Router>
            <Suspense fallback={
              <div className="min-h-screen gradient-golf-green flex items-center justify-center">
                <GolfLoader size="lg" text="Loading..." />
              </div>
            }>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/test" element={<Test />} />
                <Route path="/create" element={<GameCreator />} />
                <Route path="/admin-courses" element={<AdminCourses />} />
                <Route path="/join/:gameId" element={<JoinGame />} />
                <Route path="/join" element={<JoinGame />} />
                <Route path="/game/:gameId" element={<GameScorecard />} />
                <Route path="/finish/:gameId" element={<LockerRoom />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}

export default App;
