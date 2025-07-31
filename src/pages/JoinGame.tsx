import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRScanner from '@/components/QRScanner';
import { DeepLinkHandler, type GameLinkData } from '@/utils/deepLink';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { GuestSessionManager } from '@/lib/GuestSessionManager';
import { motion } from 'framer-motion';
import { GolfLoader } from '@/components/ui/golf-loader';

interface GamePreview {
  id: Id<"games">;
  name: string;
  status: string;
  format: string;
  startedAt: number;
  playerCount: number;
  course: { name: string; address: string } | null;
  canJoin: boolean;
}

export default function JoinGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const convex = useConvex();
  const [searchParams] = useSearchParams();
  
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gamePreview, setGamePreview] = useState<GamePreview | null>(null);
  const [guestSessionManager] = useState(() => new GuestSessionManager(convex));
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  // Validate game and load preview when gameId changes
  useEffect(() => {
    if (gameId) {
      loadGamePreview(gameId);
    } else {
      setGamePreview(null);
    }
  }, [gameId]);

  // Auto-join if coming from QR code
  useEffect(() => {
    const shouldAutoJoin = searchParams.get('auto') === 'true';
    if (shouldAutoJoin && gamePreview && gamePreview.canJoin && !isAutoJoining && !error) {
      setIsAutoJoining(true);
      handleAutoJoin();
    }
  }, [gamePreview, searchParams]);

  // Handle deep link events
  useEffect(() => {
    const handleDeepLink = (data: GameLinkData) => {
      if (data.action === 'join' && data.gameId !== gameId) {
        navigate(`/join/${data.gameId}`);
      }
    };

    DeepLinkHandler.addListener(handleDeepLink);

    return () => {
      DeepLinkHandler.removeListener(handleDeepLink);
    };
  }, [gameId, navigate]);

  const loadGamePreview = async (gameIdParam: string) => {
    try {
      setLoading(true);
      setError(null);

      // First validate the gameId format
      if (!DeepLinkHandler.validateGameId(gameIdParam)) {
        setError('Invalid game ID format. Game IDs should be 6-12 alphanumeric characters.');
        return;
      }

      // Try to get game preview from Convex
      const preview = await convex.query(api.games.getGamePreview, {
        gameId: gameIdParam as Id<"games">,
      });

      if (!preview) {
        setError('Game not found. Please check the game ID and try again.');
        return;
      }

      setGamePreview(preview);

      if (!preview.canJoin) {
        setError('This game has already finished and cannot be joined.');
      }
    } catch (err) {
      console.error('Error loading game preview:', err);
      setError('Failed to load game information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (qrData: string) => {
    try {
      const linkData = DeepLinkHandler.validateQRData(qrData);
      if (linkData) {
        setShowQRScanner(false);
        setError(null);
        
        if (linkData.gameId !== gameId) {
          navigate(`/join/${linkData.gameId}`);
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setShowQRScanner(false);
    }
  };

  const handleQRError = (error: Error) => {
    setError(`QR Scan Error: ${error.message}`);
    setShowQRScanner(false);
  };

  const handleAutoJoin = async () => {
    if (!gamePreview || !gamePreview.canJoin) {
      setError('Cannot join this game');
      setIsAutoJoining(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate smart default name based on current player count
      const autoName = `Player ${gamePreview.playerCount + 1}`;

      // Create guest session with auto-generated name
      const guestSession = await guestSessionManager.createSession(autoName);

      // Join the game as a guest
      const playerId = await convex.mutation(api.guests.joinGameAsGuest, {
        gameId: gamePreview.id,
        guestId: guestSession.id,
      });

      // Set active game ID in session manager
      guestSessionManager.setActiveGameId(gamePreview.id);

      // Navigate to the game page
      navigate(`/game/${gameId}`, { 
        state: { 
          playerId, 
          guestSession,
          gamePreview 
        } 
      });
    } catch (err) {
      console.error('Error auto-joining game:', err);
      setError('Failed to join game. Please try again.');
      setIsAutoJoining(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gamePreview || !gamePreview.canJoin) {
      setError('Cannot join this game');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create or resume guest session
      const guestSession = await guestSessionManager.createSession(playerName.trim() || undefined);

      // Join the game as a guest
      const playerId = await convex.mutation(api.guests.joinGameAsGuest, {
        gameId: gamePreview.id,
        guestId: guestSession.id,
      });

      // Set active game ID in session manager
      guestSessionManager.setActiveGameId(gamePreview.id);

      // Navigate to the game page
      navigate(`/game/${gameId}`, { 
        state: { 
          playerId, 
          guestSession,
          gamePreview 
        } 
      });
    } catch (err) {
      console.error('Error joining game:', err);
      setError('Failed to join game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = () => {
    setError(null);
    setShowQRScanner(true);
  };

  if (showQRScanner) {
    return (
      <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <QRScanner
            onScan={handleQRScan}
            onError={handleQRError}
            fallbackToCamera={true}
          />
          <Button 
            onClick={() => setShowQRScanner(false)}
            variant="outline"
            className="w-full"
          >
            Back to Join Game
          </Button>
        </motion.div>
      </div>
    );
  }

  // Show auto-join loading state
  if (isAutoJoining || (searchParams.get('auto') === 'true' && loading)) {
    return (
      <div className="min-h-screen gradient-party-hero flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.img
            src="/parparty-logo.svg"
            alt="ParParty Logo"
            className="w-24 h-24 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-2xl font-bold text-white mb-2">Joining Game...</h2>
          <p className="text-white/80">Just a moment</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md card-hover glass-party">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gradient">
              ⛳ Join Game
            </CardTitle>
          </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded border border-red-500/30">
              {error}
            </div>
          )}
          
          {/* Game Preview Section */}
          {loading && (
            <div className="text-center py-4">
              <GolfLoader size="md" text="Loading game information..." />
            </div>
          )}

          {gamePreview && !loading && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-400">{gamePreview.name}</h3>
                <div className="text-sm text-slate-300 mt-1">
                  {gamePreview.format.charAt(0).toUpperCase() + gamePreview.format.slice(1)} Play
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-slate-400">Players</div>
                  <div className="font-semibold text-white">{gamePreview.playerCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Status</div>
                  <div className={`font-semibold capitalize ${
                    gamePreview.status === 'active' ? 'text-green-400' : 
                    gamePreview.status === 'waiting' ? 'text-yellow-400' : 'text-slate-400'
                  }`}>
                    {gamePreview.status}
                  </div>
                </div>
              </div>

              {gamePreview.course && (
                <div className="text-center text-sm">
                  <div className="text-slate-400">Course</div>
                  <div className="font-medium text-white">{gamePreview.course.name}</div>
                  <div className="text-xs text-slate-400">{gamePreview.course.address}</div>
                </div>
              )}

              <div className="text-center text-xs text-slate-400">
                Started {new Date(gamePreview.startedAt).toLocaleString()}
              </div>
            </div>
          )}

          {!gameId && !loading && (
            <div className="text-center text-slate-400">
              Scan a QR code or enter a game ID to join
            </div>
          )}

          {/* Name Input */}
          <Input 
            placeholder="Enter your name (optional)" 
            className="w-full"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={loading}
          />

          {/* Action Buttons */}
          {gamePreview && gamePreview.canJoin ? (
            <Button 
              className="w-full gradient-party-button text-white hover:scale-105 transition-all duration-300"
              onClick={handleJoinGame}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <GolfLoader size="sm" />
                  <span>Joining...</span>
                </div>
              ) : (
                'Join Game'
              )}
            </Button>
          ) : gameId && !loading && !gamePreview ? (
            <Button 
              className="w-full gradient-party-accent text-white hover:scale-105 transition-all duration-300"
              onClick={handleScanQR}
            >
              Scan QR Code
            </Button>
          ) : !gameId ? (
            <Button 
              className="w-full gradient-party-accent text-white hover:scale-105 transition-all duration-300"
              onClick={handleScanQR}
            >
              Scan QR Code
            </Button>
          ) : null}

          {gameId && (
            <Button 
              variant="outline"
              className="w-full"
              onClick={handleScanQR}
              disabled={loading}
            >
              Scan Different QR Code
            </Button>
          )}

          <div className="text-center space-y-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/create')}
              className="w-full"
            >
              Create New Game
            </Button>
            
            <div className="text-xs text-slate-500 space-y-1">
              <div>Deep link support: {DeepLinkHandler.isDeepLinkSupported() ? '✓' : '✗'}</div>
              <div>Share link: {gameId ? DeepLinkHandler.generateGameLink(gameId) : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}