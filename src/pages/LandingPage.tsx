import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Users, QrCode, Plus, ArrowRight, PlayCircle, Clock } from 'lucide-react';
export default function LandingPage() {
  const navigate = useNavigate();
  const [showJoinOptions, setShowJoinOptions] = useState(false);

  // Get guest session from localStorage to check for active games
  const getGuestIdFromStorage = () => {
    try {
      const stored = localStorage.getItem('parparty_guest_session');
      if (stored) {
        const session = JSON.parse(stored);
        return session.id;
      }
    } catch (error) {
      console.error('Error parsing guest session:', error);
    }
    return null;
  };

  const guestId = getGuestIdFromStorage();
  
  // Query for active games for this user/guest (only if we have a guestId)
  const activeGames = useQuery(
    api.games.getUserActiveGames,
    guestId 
      ? { guestId: guestId as Id<"guests"> }
      : "skip"
  );

  // Get the most recent active game
  const lastActiveGame = activeGames && activeGames.length > 0 ? activeGames[0] : null;

  return (
    <div className="min-h-screen gradient-party-hero relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <motion.img
              src="/parparty-logo.svg"
              alt="ParParty Logo"
              className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6"
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            />
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              ParParty Golf
            </h1>
            <p className="text-xl md:text-2xl text-gradient font-light">
              Score • Share • Celebrate
            </p>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-white/80 max-w-md mx-auto leading-relaxed"
          >
            The social golf app that turns every round into an experience worth sharing
          </motion.p>
        </motion.div>

        {/* Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-md space-y-4"
        >
          {/* Continue Last Round Card - Only show if there's an active game */}
          {lastActiveGame && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="glass-party card-hover border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <CardContent className="p-6">
                  <Button
                    onClick={() => navigate(`/game/${lastActiveGame._id}`)}
                    className="w-full h-16 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-cyan-400/30"
                  >
                    <PlayCircle className="w-6 h-6 mr-3" />
                    Continue Last Round
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Button>
                  <div className="text-center text-sm text-slate-300 mt-3 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      "{lastActiveGame.name}" • {lastActiveGame.playerCount} players • {lastActiveGame.status}
                    </span>
                  </div>
                  {lastActiveGame.userPlayer && (
                    <p className="text-center text-xs text-cyan-300 mt-1">
                      Playing as "{lastActiveGame.userPlayer.name}"
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Start a Round Card */}
          <Card className="glass-party card-hover border-green-500/30">
            <CardContent className="p-6">
              <Button
                onClick={() => navigate('/create')}
                className="w-full h-16 gradient-party-button text-white hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-6 h-6 mr-3" />
                Start a Round
                <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
              <p className="text-center text-sm text-slate-300 mt-3">
                Get instant QR code • Friends join in seconds
              </p>
            </CardContent>
          </Card>

          {/* Join Friends Card */}
          <Card className="glass-party card-hover border-purple-500/30">
            <CardContent className="p-6">
              {!showJoinOptions ? (
                <>
                  <Button
                    onClick={() => setShowJoinOptions(true)}
                    variant="outline"
                    className="w-full h-16 border-purple-500/50 text-white hover:bg-purple-500/20 font-semibold text-lg backdrop-blur-sm gradient-party-accent"
                  >
                    <Users className="w-6 h-6 mr-3" />
                    Join Friends
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </Button>
                  <p className="text-center text-sm text-slate-300 mt-3">
                    Join an existing game
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={() => navigate('/join')}
                    variant="outline"
                    className="w-full h-12 border-green-500/50 text-white hover:bg-green-500/20 backdrop-blur-sm"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Scan QR Code
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/join')}
                    variant="outline"
                    className="w-full h-12 border-purple-500/50 text-white hover:bg-purple-500/20 backdrop-blur-sm"
                  >
                    Enter Game Code
                  </Button>
                  
                  <Button
                    onClick={() => setShowJoinOptions(false)}
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white"
                  >
                    Back
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <div className="flex justify-center space-x-8 text-slate-400">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xs">Live Scores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📸</div>
              <div className="text-xs">Photo Sharing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🍔</div>
              <div className="text-xs">F&B Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs">Achievements</div>
            </div>
          </div>
        </motion.div>

        {/* Subtle app install hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-slate-500">
            📱 Add to home screen for the best experience
          </p>
        </motion.div>
      </div>
    </div>
  );
}