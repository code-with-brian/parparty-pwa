import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useState, useEffect } from 'react';
import { Users, Clock, Target } from 'lucide-react';
import SocialFeed from '@/components/SocialFeed';
import PhotoCapture from '@/components/PhotoCapture';
import FoodOrderingMenu from '@/components/FoodOrderingMenu';
import OrderStatus from '@/components/OrderStatus';
import { GolfLoader } from '@/components/ui/golf-loader';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { BottomTabNavigation } from '@/components/layout/BottomTabNavigation';
import { ScorecardScreen } from '@/components/screens/ScorecardScreen';


export default function GameScorecard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedHole, setSelectedHole] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'social' | 'orders'>('scorecard');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showFoodMenu, setShowFoodMenu] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<Id<"players"> | null>(null);

  // Real-time game state subscription
  const gameState = useQuery(api.games.getGameState, 
    (gameId && gameId !== 'demo') ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Get detailed game data including scores
  const gameData = useQuery(api.games.getGameData,
    (gameId && gameId !== 'demo') ? { gameId: gameId as Id<"games"> } : "skip"
  );

  // Demo data for demo mode
  const demoGameState = gameId === 'demo' ? {
    game: {
      _id: 'demo',
      name: 'Demo Golf Round',
      status: 'active',
      format: 'stroke',
      startedAt: Date.now() - 30 * 60 * 1000,
    },
    players: [
      { _id: 'demo-player-1', name: 'Demo Player', totalStrokes: 15, holesPlayed: 4, currentPosition: 1 },
      { _id: 'demo-player-2', name: 'Alex Johnson', totalStrokes: 18, holesPlayed: 4, currentPosition: 2 },
      { _id: 'demo-player-3', name: 'Sam Wilson', totalStrokes: 22, holesPlayed: 4, currentPosition: 3 }
    ]
  } : null;

  const demoGameData = gameId === 'demo' ? {
    game: demoGameState?.game,
    players: demoGameState?.players,
    scores: [
      { playerId: 'demo-player-1', holeNumber: 1, strokes: 4, timestamp: Date.now() - 25 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 2, strokes: 3, timestamp: Date.now() - 20 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 3, strokes: 5, timestamp: Date.now() - 15 * 60 * 1000 },
      { playerId: 'demo-player-1', holeNumber: 4, strokes: 3, timestamp: Date.now() - 10 * 60 * 1000 },
    ],
    photos: []
  } : null;

  // Use demo data if in demo mode
  const currentGameState = gameId === 'demo' ? demoGameState : gameState;
  const currentGameData = gameId === 'demo' ? demoGameData : gameData;

  // Record score mutation
  const recordScore = useMutation(api.games.recordScore);

  // Update game status mutation
  const updateGameStatus = useMutation(api.games.updateGameStatus);

  // Achievement creation mutation
  const createAchievementPost = useMutation(api.socialPosts.createAchievementPost);

  // Set current player ID from guest session or user context
  useEffect(() => {
    // For now, we'll use the first player as current player
    // In a real app, this would come from authentication context
    if (currentGameState?.players && currentGameState.players.length > 0) {
      setCurrentPlayerId(currentGameState.players[0]._id);
    }
  }, [currentGameState]);

  const detectAchievements = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    try {
      // Get player's previous scores to detect achievements
      const playerScores = currentGameData?.scores.filter(s => s.playerId === playerId) || [];
      const isFirstScore = playerScores.length === 0;
      
      // Detect hole-in-one
      if (strokes === 1) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "hole_in_one",
          holeNumber,
          score: strokes,
        });
      }
      // Detect eagle (2 under par, assuming par 4)
      else if (strokes === 2) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "eagle",
          holeNumber,
          score: strokes,
        });
      }
      // Detect birdie (1 under par, assuming par 4)
      else if (strokes === 3) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "birdie",
          holeNumber,
          score: strokes,
        });
      }
      // First score achievement
      else if (isFirstScore) {
        await createAchievementPost({
          gameId: gameId as Id<"games">,
          playerId,
          achievementType: "first_score",
        });
      }
    } catch (error) {
      console.error('Error creating achievement post:', error);
    }
  };

  const handleScoreUpdate = async (playerId: Id<"players">, holeNumber: number, strokes: number) => {
    try {
      setError(null);
      
      // Skip backend calls in demo mode
      if (gameId !== 'demo') {
        await recordScore({
          playerId,
          holeNumber,
          strokes,
        });
        
        // Detect and create achievement posts
        await detectAchievements(playerId, holeNumber, strokes);
      } else {
        // In demo mode, just show celebration
        await detectAchievements(playerId, holeNumber, strokes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record score');
    }
  };

  const handleFinishGame = async () => {
    if (!gameId) return;
    
    try {
      await updateGameStatus({
        gameId: gameId as Id<"games">,
        status: "finished"
      });
      navigate(`/finish/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish game');
    }
  };

  if (!gameId) {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">Invalid game ID</div>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGameState || !currentGameData) {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <GolfLoader size="lg" text="Loading game..." />
      </div>
    );
  }

  if (currentGameState.game.status === "finished") {
    return (
      <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Card className="w-full max-w-md glass">
            <CardContent className="p-6 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2">Game Finished!</h2>
              <p className="text-gray-600 mb-4">This game has already ended.</p>
              <Button onClick={() => navigate(`/finish/${gameId}`)}>
                View Results
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Create score lookup for easy access
  const scoresByPlayerAndHole = currentGameData.scores.reduce((acc, score) => {
    const key = `${score.playerId}-${score.holeNumber}`;
    acc[key] = score.strokes;
    return acc;
  }, {} as Record<string, number>);

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <MobileLayout
      header={
        <NavigationHeader
          title={currentGameState.game.name}
          subtitle={`${currentGameState.players.length} players • ${currentGameState.game.status}`}
          onBack={() => navigate(-1)}
          onShare={() => {
            if (navigator.share) {
              navigator.share({
                title: 'ParParty Golf Game',
                text: `Join my golf game: ${currentGameState.game.name}`,
                url: window.location.href,
              });
            }
          }}
          rightAction={
            <button
              onClick={handleFinishGame}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Finish
            </button>
          }
        />
      }
      footer={
        <BottomTabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
          onCameraPress={() => setShowPhotoCapture(true)}
        />
      }
    >

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'scorecard' ? (
        <ScorecardScreen
          players={currentGameState.players}
          scores={currentGameData.scores}
          onScoreUpdate={handleScoreUpdate}
        />
      ) : activeTab === 'social' ? (
        <div className="p-4">
          <SocialFeed
            gameId={gameId as Id<"games">}
            currentPlayerId={currentPlayerId}
          />
        </div>
      ) : activeTab === 'orders' ? (
        <div className="p-4">
          {currentPlayerId && (
            <>
              <button
                onClick={() => setShowFoodMenu(true)}
                className="w-full mb-6 p-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                🍔 Order Food & Beverages
              </button>
              <OrderStatus
                playerId={currentPlayerId}
                gameId={gameId as Id<"games">}
              />
            </>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="text-center py-8 text-gray-500">
            Coming soon...
          </div>
        </div>
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && currentPlayerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <PhotoCapture
            gameId={gameId as Id<"games">}
            playerId={currentPlayerId}
            holeNumber={1}
            onPhotoShared={() => {
              setShowPhotoCapture(false);
              setActiveTab('social');
            }}
            onClose={() => setShowPhotoCapture(false)}
          />
        </div>
      )}

      {/* Food Ordering Menu Modal */}
      {showFoodMenu && currentPlayerId && currentGameState.game.courseId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <FoodOrderingMenu
            gameId={gameId as Id<"games">}
            playerId={currentPlayerId}
            courseId={currentGameState.game.courseId}
            currentHole={1}
            onClose={() => setShowFoodMenu(false)}
            onOrderPlaced={() => {
              setShowFoodMenu(false);
              setActiveTab('orders');
            }}
          />
        </div>
      )}
    </MobileLayout>
  );
}