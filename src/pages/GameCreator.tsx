import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { QrCode, Copy, Share, Users, ArrowLeft, MapPin, ChevronRight, Loader2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGeolocation } from '@/hooks/useGeolocation';

// Temporarily disable Convex dataModel import to fix build issues
// import type { Id } from '../../convex/_generated/dataModel';
type Id<T> = string;

// Fun game name generation
const generateGameName = () => {
  const adjectives = [
    'Epic', 'Legendary', 'Wild', 'Awesome', 'Ultimate', 'Super', 
    'Amazing', 'Fantastic', 'Incredible', 'Spectacular', 'Magical',
    'Thunder', 'Lightning', 'Power', 'Turbo', 'Mega', 'Ultra'
  ];
  
  const nouns = [
    'Eagles', 'Birdies', 'Aces', 'Tigers', 'Sharks', 'Champions',
    'Legends', 'Masters', 'Pros', 'Heroes', 'Warriors', 'Ninjas',
    'Bombers', 'Crushers', 'Swingers', 'Putters', 'Drivers', 'Irons'
  ];
  
  const times = [
    'Morning', 'Afternoon', 'Evening', 'Twilight', 'Sunrise', 'Sunset',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'
  ];
  
  // Get current day and time
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = now.getDay();
  
  let timeOfDay = 'Round';
  if (hour < 12) timeOfDay = times[0]; // Morning
  else if (hour < 17) timeOfDay = times[1]; // Afternoon
  else if (hour < 20) timeOfDay = times[2]; // Evening
  else timeOfDay = times[3]; // Twilight
  
  // Sometimes use day of week instead
  if (Math.random() > 0.5) {
    timeOfDay = times[6 + dayIndex] || 'Weekend';
  }
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective} ${timeOfDay} ${noun}`;
};

export default function GameCreator() {
  const [gameName, setGameName] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Id<'courses'> | null>(null);
  const [step, setStep] = useState<'form' | 'created'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const navigate = useNavigate();
  const createGame = useMutation(api.games.createGame);
  const createTestUser = useMutation(api.users.createTestUser);
  const addPlayerToGame = useMutation(api.games.addPlayerToGame);
  
  // Get user's location
  const { latitude, longitude, error: locationError, loading: locationLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5 minutes
  });
  
  // Get courses sorted by proximity to user's location
  const courses = useQuery(
    api.golfCourses.getCoursesByProximity, 
    latitude && longitude ? {
      userLatitude: latitude,
      userLongitude: longitude,
      limit: 10
    } : { limit: 10 }
  );
  
  // Auto-select the first (closest) course when courses load
  useEffect(() => {
    if (courses && courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0]._id);
    }
  }, [courses, selectedCourse]);
  
  // Get live game state to show players joining
  const gameState = useQuery(
    api.games.getGameState, 
    createdGameId ? { gameId: createdGameId as any } : "skip"
  );

  const handleFormSubmit = () => {
    if (!selectedCourse) {
      setError('Please select a golf course');
      return;
    }
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    handleCreateGame();
  };

  const handleCreateGame = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate a fun game name
      const generatedGameName = generateGameName();
      setGameName(generatedGameName);

      // Create a test user first
      const userId = await createTestUser({
        name: userName.trim()
      });

      const gameId = await createGame({
        name: generatedGameName,
        createdBy: userId,
        format: 'stroke',
        courseId: selectedCourse!
      });

      // Automatically add the creator as the first player
      await addPlayerToGame({
        gameId: gameId,
        name: userName.trim(),
        userId: userId
      });

      setCreatedGameId(gameId);
      setStep('created');
      
      // Generate QR code immediately with auto-join parameter
      const gameUrl = `${window.location.origin}/join/${gameId}?auto=true`;
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
      const gameUrl = `${window.location.origin}/join/${createdGameId}?auto=true`;
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
      const gameUrl = `${window.location.origin}/join/${createdGameId}?auto=true`;
      
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
      // Navigate directly to the game since the creator is already a player
      navigate(`/game/${createdGameId}`);
    }
  };

  return (
    <div className="min-h-screen gradient-party-main flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <Card className="w-full max-w-md glass-party">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gradient">
            🏌️‍♂️ Start New Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          {step === 'created' && createdGameId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-6"
            >
              {/* Success Message */}
              <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg border border-green-500/30">
                <div className="text-lg font-semibold mb-1">🎉 Game created successfully!</div>
                <div className="text-green-300">{gameName}</div>
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
                  Start Playing
                </Button>
                
                <Button 
                  onClick={() => {
                    setCreatedGameId(null);
                    setGameName('');
                    setQrCodeUrl('');
                    setStep('form');
                    setSelectedCourse(null);
                    setUserName('');
                  }}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                >
                  Create Another Game
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-white mb-2">
                  Start a New Round 🏌️‍♂️
                </h3>
                <p className="text-sm text-slate-300">
                  Choose your course and enter your name
                </p>
                
                {/* Location Status */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                  {locationLoading ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Finding your location...</span>
                    </div>
                  ) : latitude && longitude ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <Navigation className="w-3 h-3" />
                      <span>Courses sorted by distance</span>
                    </div>
                  ) : locationError ? (
                    <div className="text-amber-400">
                      <span>Using default course order</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Golf Course
                  </label>
                  {courses && courses.length > 0 ? (
                    <Select
                      value={selectedCourse || ''}
                      onValueChange={(value) => setSelectedCourse(value as Id<'courses'>)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a course..." />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course, index) => (
                          <SelectItem key={course._id} value={course._id}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {index === 0 && latitude && longitude && (course as any).distance && (
                                  <span className="text-xs text-green-500 font-medium">CLOSEST</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{course.clubName}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{course.name} • {course.city}, {course.state}</span>
                                  {(course as any).distance && (
                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                      {Math.round((course as any).distance)} km
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-600 rounded-lg">
                      <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No courses available</p>
                    </div>
                  )}
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    First Name
                  </label>
                  <Input
                    placeholder="Enter your first name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    disabled={loading}
                    className="text-lg"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && userName.trim() && selectedCourse) {
                        handleFormSubmit();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 mt-8">
                <Button 
                  onClick={handleFormSubmit}
                  disabled={loading || !userName.trim() || !selectedCourse}
                  className="w-full h-12 gradient-party-button text-white hover:scale-105 transition-all duration-300 font-semibold text-lg"
                >
                  {loading ? 'Creating Game...' : 'Create Game'} 
                  {!loading && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>

                <Button 
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Main Menu
                </Button>
              </div>
            </motion.div>
          )}

          {step !== 'created' && (
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Main Menu
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}