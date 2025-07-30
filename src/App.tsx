import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useEffect } from 'react';
import JoinGame from './pages/JoinGame';
import GameScorecard from './pages/GameScorecard';
import LockerRoom from './pages/LockerRoom';
import Test from './pages/Test';
import { DeepLinkHandler } from './utils/deepLink';
import { ErrorBoundary } from './components/ErrorBoundary';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function App() {
  useEffect(() => {
    // Initialize deep link handlers when app starts
    DeepLinkHandler.registerLinkHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/join/demo" replace />} />
            <Route path="/test" element={<Test />} />
            <Route path="/join/:gameId" element={<JoinGame />} />
            <Route path="/join" element={<JoinGame />} />
            <Route path="/game/:gameId" element={<GameScorecard />} />
            <Route path="/finish/:gameId" element={<LockerRoom />} />
          </Routes>
        </Router>
      </ConvexProvider>
    </ErrorBoundary>
  );
}

export default App;
