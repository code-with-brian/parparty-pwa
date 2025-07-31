import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect, Suspense, lazy } from 'react';
import { 
  Trophy, 
  Users, 
  Clock, 
  Target, 
  Star, 
  Gift, 
  Camera, 
  Share2,
  UserPlus,
  ArrowLeft,
  Medal,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GuestSessionManager } from '@/lib/GuestSessionManager';
import { ConvexReactClient } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion';
import { GolfLoader } from '@/components/ui/golf-loader';

// Lazy load heavy components for better performance
const SponsorRewards = lazy(() => import('@/components/SponsorRewards'));
const RedemptionHistory = lazy(() => import('@/components/RedemptionHistory'));
const HighlightManager = lazy(() => import('@/components/HighlightManager'));
const UserConversion = lazy(() => import('@/components/UserConversion'));

interface GameSummaryProps {
  game: any;
  players: any[];
  scores: any[];
  photos: any[];
  orders?: any[];
  highlights?: any;
  currentPlayerId: Id<"players"> | null;
}

function GameSummary({ game, players, scores, photos, orders = [], highlights, currentPlayerId }: GameSummaryProps) {
  // Calculate player statistics
  const playerStats = players.map(player => {
    const playerScores = scores.filter(s => s.playerId === player._id);
    const totalStrokes = playerScores.reduce((sum, score) => sum + score.strokes, 0);
    const holesPlayed = playerScores.length;
    const averageScore = holesPlayed > 0 ? (totalStrokes / holesPlayed).toFixed(1) : '0.0';
    
    // Find best and worst holes
    const sortedScores = [...playerScores].sort((a, b) => a.strokes - b.strokes);
    const bestHole = sortedScores[0];
    const worstHole = sortedScores[sortedScores.length - 1];
    
    return {
      ...player,
      totalStrokes,
      holesPlayed,
      averageScore: parseFloat(averageScore),
      bestHole,
      worstHole,
      playerPhotos: photos.filter(p => p.playerId === player._id),
      playerOrders: orders.filter(o => o.playerId === player._id),
    };
  }).sort((a, b) => {
    if (a.totalStrokes !== b.totalStrokes) {
      return a.totalStrokes - b.totalStrokes;
    }
    return b.holesPlayed - a.holesPlayed;
  });

  const currentPlayer = currentPlayerId ? playerStats.find(p => p._id === currentPlayerId) : null;
  const currentPlayerPosition = currentPlayer ? playerStats.findIndex(p => p._id === currentPlayerId) + 1 : 0;

  const gameDuration = game.endedAt ? 
    Math.round((game.endedAt - game.startedAt) / (1000 * 60)) : 0; // in minutes

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800 mb-2">
            🎉 Round Complete!
          </CardTitle>
          <p className="text-green-700 font-medium">{game.name}</p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {gameDuration} minutes
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {players.length} players
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {game.format}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Player Highlight */}
      {currentPlayer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Medal className="w-5 h-5" />
              Your Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  #{currentPlayerPosition}
                </div>
                <div className="text-sm text-gray-600">Final Position</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {currentPlayer.totalStrokes}
                </div>
                <div className="text-sm text-gray-600">Total Strokes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {currentPlayer.averageScore}
                </div>
                <div className="text-sm text-gray-600">Avg per Hole</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {currentPlayer.holesPlayed}
                </div>
                <div className="text-sm text-gray-600">Holes Played</div>
              </div>
            </div>
            
            {currentPlayer.bestHole && (
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-green-700">Best Hole</div>
                    <div className="text-sm text-gray-600">
                      Hole {currentPlayer.bestHole.holeNumber} - {currentPlayer.bestHole.strokes} strokes
                    </div>
                  </div>
                  {currentPlayer.worstHole && (
                    <div className="text-right">
                      <div className="font-medium text-red-700">Toughest Hole</div>
                      <div className="text-sm text-gray-600">
                        Hole {currentPlayer.worstHole.holeNumber} - {currentPlayer.worstHole.strokes} strokes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Final Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerStats.map((player, index) => (
              <div
                key={player._id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' 
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200'
                    : 'bg-gray-50'
                } ${player._id === currentPlayerId ? 'ring-2 ring-blue-300' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 
                      ? 'bg-yellow-500 text-white' 
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {player.name}
                      {player._id === currentPlayerId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.holesPlayed} holes • Avg {player.averageScore}
                      {player.playerPhotos.length > 0 && (
                        <span className="ml-2">📸 {player.playerPhotos.length}</span>
                      )}
                      {player.playerOrders.length > 0 && (
                        <span className="ml-2">🍔 {player.playerOrders.length}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold">{player.totalStrokes}</div>
                  <div className="text-sm text-gray-500">strokes</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Highlights */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-500" />
              Round Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo) => (
                <div key={photo._id} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Game photo'}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  {photo.caption && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                      <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.caption}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {photos.length > 8 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All {photos.length} Photos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* F&B Orders Summary */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍔 F&B Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      🍔
                    </div>
                    <div>
                      <div className="font-medium text-sm">{order.playerName}</div>
                      <div className="text-xs text-gray-500">
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.deliveryLocation === "hole" && order.holeNumber
                          ? `Hole ${order.holeNumber}`
                          : order.deliveryLocation === "clubhouse"
                          ? "Clubhouse"
                          : "Golf Cart"
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${order.totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 capitalize">{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
            {orders.length > 5 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All {orders.length} Orders
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Highlights Manager */}
      {currentPlayerId && (
        <Suspense fallback={<GolfLoader size="md" text="Loading highlights..." />}>
          <HighlightManager
            gameId={game._id}
            playerId={currentPlayerId}
          />
        </Suspense>
      )}
    </div>
  );
}

interface AccountCreationCTAProps {
  gameData: any;
  currentPlayerId: Id<"players"> | null;
  onCreateAccount: () => void;
}

function AccountCreationCTA({ gameData, currentPlayerId, onCreateAccount }: AccountCreationCTAProps) {
  const currentPlayer = currentPlayerId ? 
    gameData.players.find((p: any) => p._id === currentPlayerId) : null;
  
  const playerScores = currentPlayerId ? 
    gameData.scores.filter((s: any) => s.playerId === currentPlayerId) : [];
  
  const playerPhotos = currentPlayerId ? 
    gameData.photos.filter((p: any) => p.playerId === currentPlayerId) : [];

  return (
    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-xl text-green-800">
          Save This Round Forever!
        </CardTitle>
        <p className="text-green-700 mt-2">
          Create your ParParty account to keep your golf memories and stats
        </p>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-800 mb-3">What you'll save:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span>{playerScores.length} hole scores</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-500" />
              <span>{playerPhotos.length} photos</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Game achievements</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>Performance stats</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={onCreateAccount}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            size="lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create Your ParParty Account
          </Button>
          
          <div className="text-center">
            <Button variant="ghost" size="sm" className="text-gray-500">
              Maybe later
            </Button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Free account • No spam • Keep your golf memories
        </div>
      </CardContent>
    </Card>
  );
}

export default function LockerRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'summary' | 'rewards' | 'history'>('summary');
  const [currentPlayerId, setCurrentPlayerId] = useState<Id<"players"> | null>(null);
  const [currentGuestId, setCurrentGuestId] = useState<Id<"guests"> | null>(null);
  const [showAccountCreation, setShowAccountCreation] = useState(false);

  // Get complete game data
  const gameData = useQuery(api.games.getGameData,
    gameId ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Get F&B orders for the game
  const gameOrders = useQuery(api.foodOrders.getGameOrders,
    gameId ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Get highlights for the current player
  const playerHighlights = useQuery(
    currentPlayerId && gameId ? api.highlights.getPlayerHighlights : "skip",
    currentPlayerId && gameId ? { 
      gameId: gameId as Id<"games">, 
      playerId: currentPlayerId 
    } : "skip"
  );

  // Set current player ID from guest session or user context
  useEffect(() => {
    const initializeCurrentPlayer = async () => {
      if (gameData?.players && gameData.players.length > 0) {
        if (!isAuthenticated) {
          // For guest users, find the player associated with their guest session
          try {
            const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
            const guestManager = new GuestSessionManager(convex);
            const currentSession = await guestManager.getCurrentSession();
            
            // Find the player record for this guest
            const guestPlayer = gameData.players.find((p: any) => p.guestId === currentSession.id);
            if (guestPlayer) {
              setCurrentPlayerId(guestPlayer._id);
              setCurrentGuestId(currentSession.id);
            } else {
              // Fallback to first player if no guest match found
              setCurrentPlayerId(gameData.players[0]._id);
            }
          } catch (error) {
            console.error('Error getting guest session:', error);
            setCurrentPlayerId(gameData.players[0]._id);
          }
        } else {
          // For authenticated users, find their player record
          // This would be implemented when user authentication is fully integrated
          setCurrentPlayerId(gameData.players[0]._id);
        }
      }
    };

    initializeCurrentPlayer();
  }, [gameData, isAuthenticated]);

  const handleCreateAccount = () => {
    setShowAccountCreation(true);
  };

  const handleConversionComplete = () => {
    setShowAccountCreation(false);
    // Optionally refresh the page or update UI to reflect the new user status
    window.location.reload();
  };

  const handleConversionCancel = () => {
    setShowAccountCreation(false);
  };

  const handleShareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: `${gameData?.game.name} - Golf Round Results`,
        text: `Just finished a great round of golf! Check out the results.`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers without native sharing
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">Invalid game ID</div>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div>Loading results...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameData.game.status !== "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Game Still Active</h2>
            <p className="text-gray-600 mb-4">This game hasn't finished yet.</p>
            <Button onClick={() => navigate(`/game/${gameId}`)}>
              Back to Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/game/${gameId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Game
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShareResults}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={activeTab === 'summary' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('summary')}
                className={activeTab === 'summary' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Summary
              </Button>
              <Button
                variant={activeTab === 'rewards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('rewards')}
                className={activeTab === 'rewards' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Gift className="w-4 h-4 mr-2" />
                Rewards
              </Button>
              {currentPlayerId && (
                <Button
                  variant={activeTab === 'history' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('history')}
                  className={activeTab === 'history' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  History
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <GameSummary
              game={gameData.game}
              players={gameData.players}
              scores={gameData.scores}
              photos={gameData.photos}
              orders={gameOrders || []}
              highlights={playerHighlights}
              currentPlayerId={currentPlayerId}
            />
            
            {/* Account Creation CTA */}
            {!showAccountCreation && currentPlayerId && (
              <AccountCreationCTA
                gameData={gameData}
                currentPlayerId={currentPlayerId}
                onCreateAccount={() => setShowAccountCreation(true)}
              />
            )}
          </div>
        )}

        {activeTab === 'rewards' && currentPlayerId && (
          <Suspense fallback={<GolfLoader size="md" text="Loading rewards..." />}>
            <SponsorRewards
              gameId={gameId as Id<"games">}
              playerId={currentPlayerId}
              onRewardRedeemed={(redemption) => {
                console.log('Reward redeemed:', redemption);
                // Could show a success message or update UI
              }}
            />
          </Suspense>
        )}

        {activeTab === 'history' && currentPlayerId && (
          <Suspense fallback={<GolfLoader size="md" text="Loading history..." />}>
            <RedemptionHistory playerId={currentPlayerId} />
          </Suspense>
        )}

        {/* User Conversion Modal */}
        {showAccountCreation && currentGuestId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <Suspense fallback={
                <div className="p-8 text-center">
                  <GolfLoader size="md" text="Loading account creation..." />
                </div>
              }>
                <UserConversion
                  guestId={currentGuestId}
                  onConversionComplete={handleConversionComplete}
                  onCancel={handleConversionCancel}
                  showBenefits={true}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}