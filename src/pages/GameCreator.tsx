import { useState, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { QrCode, Copy, Share, Users, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function GameCreator() {
  const [gameName, setGameName] = useState('');
  const [userName, setUserName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const navigate = useNavigate();
  const createGame = useMutation(api.games.createGame);
  const createTestUser = useMutation(api.users.createTestUser);
  
  // Get live game state to show players joining
  const gameState = useQuery(
    api.games.getGameState, 
    createdGameId ? { gameId: createdGameId as any } : "skip"
  );

  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      setError('Please enter a game name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create a test user first
      const userId = await createTestUser({
        name: userName.trim()
      });

      const gameId = await createGame({
        name: gameName.trim(),
        createdBy: userId,
        format: 'stroke'
      });

      setCreatedGameId(gameId);
      
      // Generate QR code immediately
      const gameUrl = `${window.location.origin}/join/${gameId}`;
      try {
        const qrDataUrl = await QRCodeLib.toDataURL(gameUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#059669',  // Green color
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
      }
      
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdGameId) {
      const gameUrl = `${window.location.origin}/join/${createdGameId}`;
      try {
        await navigator.clipboard.writeText(gameUrl);
        toast.success('Game link copied!');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const handleShare = async () => {
    if (createdGameId) {
      const gameUrl = `${window.location.origin}/join/${createdGameId}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join my ParParty Golf game: ${gameName}`,
            text: 'Join my golf round!',
            url: gameUrl,
          });
        } catch (err) {
          // User cancelled sharing
        }
      } else {
        // Fallback to copy
        handleCopyLink();
      }
    }
  };

  const handleJoinGame = () => {
    if (createdGameId) {
      navigate(`/join/${createdGameId}`);
    }
  };

  return (
    <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <Card className="w-full max-w-md glass-party">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gradient">
            🏌️‍♂️ Create Test Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          {createdGameId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-6"
            >
              {/* Success Message */}
              <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg border border-green-500/30">
                🎉 Game created successfully!
              </div>

              {/* QR Code Display */}
              <div className="bg-slate-800/90 p-6 rounded-xl shadow-lg border border-green-500/30">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Share this QR Code
                </h3>
                {qrCodeUrl ? (
                  <motion.img
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    src={qrCodeUrl}
                    alt="Game QR Code"
                    className="mx-auto mb-4 rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                    <QrCode className="w-16 h-16 text-slate-400" />
                  </div>
                )}
                <p className="text-sm text-slate-300">
                  Friends can scan this to join instantly
                </p>
              </div>

              {/* Live Player Count */}
              <AnimatePresence>
                {gameState && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30"
                  >
                    <div className="flex items-center justify-center space-x-2 text-purple-300">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">
                        {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''} joined
                      </span>
                    </div>
                    {gameState.players.length > 0 && (
                      <div className="mt-2 text-sm text-purple-200">
                        {gameState.players.map((player, index) => (
                          <motion.div
                            key={player._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="truncate"
                          >
                            • {player.name}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="h-12"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  
                  <Button
                    onClick={handleShare}
                    variant="outline" 
                    className="h-12"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                <Button 
                  onClick={handleJoinGame}
                  className="w-full h-12 gradient-party-button text-white hover:scale-105 text-lg font-semibold transition-all duration-300"
                >
                  Join Game Now
                </Button>
                
                <Button 
                  onClick={() => {
                    setCreatedGameId(null);
                    setGameName('');
                    setQrCodeUrl('');
                  }}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                >
                  Create Another Game
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <Input
                placeholder="Enter game name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                disabled={loading}
              />

              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={loading}
              />

              <Button 
                onClick={handleCreateGame}
                disabled={loading || !gameName.trim()}
                className="w-full gradient-party-button text-white hover:scale-105 transition-all duration-300"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </Button>
            </>
          )}

          <div className="text-center">
            <Button 
              variant="outline"
              onClick={() => navigate('/join')}
              className="w-full"
            >
              Back to Join Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}