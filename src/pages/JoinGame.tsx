import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRScanner from '@/components/QRScanner';
import { DeepLinkHandler, type GameLinkData } from '@/utils/deepLink';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { GuestSessionManager } from '@/lib/GuestSessionManager';
import type { Id } from '../../convex/_generated/dataModel';

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
  
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gamePreview, setGamePreview] = useState<GamePreview | null>(null);
  const [guestSessionManager] = useState(() => new GuestSessionManager(convex));

  // Validate game and load preview when gameId changes
  useEffect(() => {
    if (gameId) {
      loadGamePreview(gameId);
    } else {
      setGamePreview(null);
    }
  }, [gameId]);

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-green-800">
            Join Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}
          
          {/* Game Preview Section */}
          {loading && (
            <div className="text-center py-4">
              <div className="text-gray-600">Loading game information...</div>
            </div>
          )}

          {gamePreview && !loading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-800">{gamePreview.name}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  {gamePreview.format.charAt(0).toUpperCase() + gamePreview.format.slice(1)} Play
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Players</div>
                  <div className="font-semibold">{gamePreview.playerCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Status</div>
                  <div className={`font-semibold capitalize ${
                    gamePreview.status === 'active' ? 'text-green-600' : 
                    gamePreview.status === 'waiting' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {gamePreview.status}
                  </div>
                </div>
              </div>

              {gamePreview.course && (
                <div className="text-center text-sm">
                  <div className="text-gray-600">Course</div>
                  <div className="font-medium">{gamePreview.course.name}</div>
                  <div className="text-xs text-gray-500">{gamePreview.course.address}</div>
                </div>
              )}

              <div className="text-center text-xs text-gray-500">
                Started {new Date(gamePreview.startedAt).toLocaleString()}
              </div>
            </div>
          )}

          {!gameId && !loading && (
            <div className="text-center text-gray-600">
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
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleJoinGame}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Game'}
            </Button>
          ) : gameId && !loading && !gamePreview ? (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleScanQR}
            >
              Scan QR Code
            </Button>
          ) : !gameId ? (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
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

          <div className="text-center text-xs text-gray-500 space-y-1">
            <div>Deep link support: {DeepLinkHandler.isDeepLinkSupported() ? '✓' : '✗'}</div>
            <div>Share link: {gameId ? DeepLinkHandler.generateGameLink(gameId) : 'N/A'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}