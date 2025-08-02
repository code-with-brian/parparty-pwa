import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  MapPin,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Zap,
  Clock
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

type StatsTabType = 'overview' | 'rounds' | 'course' | 'achievements';

// Mock data - in a real app, this would come from the backend
const mockStats = {
  overview: {
    totalRounds: 42,
    averageScore: 78.5,
    bestScore: 68,
    holesInOne: 3,
    handicap: 12.4,
    totalStrokes: 3297,
    bestStreak: 5,
    coursesPlayed: 15
  },
  recentRounds: [
    { date: '2024-02-01', course: 'Pebble Beach', score: 72, par: 72 },
    { date: '2024-01-28', course: 'Augusta National', score: 76, par: 72 },
    { date: '2024-01-25', course: 'St. Andrews', score: 74, par: 72 },
    { date: '2024-01-20', course: 'TPC Sawgrass', score: 79, par: 72 },
    { date: '2024-01-15', course: 'Pinehurst No. 2', score: 68, par: 72 }
  ],
  achievements: [
    { title: 'Hole in One', description: 'Ace on hole 7', date: '2024-01-28', icon: '🎯' },
    { title: 'Eagle', description: 'Eagle on par 5', date: '2024-01-25', icon: '🦅' },
    { title: 'Streak Master', description: '5 rounds under 80', date: '2024-01-20', icon: '🔥' },
    { title: 'Course Explorer', description: 'Played 15 different courses', date: '2024-01-15', icon: '🗺️' }
  ],
  courseStats: {
    favorites: [
      { name: 'Pebble Beach', timesPlayed: 8, bestScore: 70, avgScore: 74.2 },
      { name: 'Augusta National', timesPlayed: 5, bestScore: 72, avgScore: 76.8 },
      { name: 'St. Andrews', timesPlayed: 6, bestScore: 68, avgScore: 73.5 }
    ]
  }
};

export default function StatsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<StatsTabType>('overview');

  if (!isAuthenticated || !user) {
    navigate('/');
    return null;
  }

  const tabs = [
    { id: 'overview' as StatsTabType, label: 'Overview', icon: BarChart3 },
    { id: 'rounds' as StatsTabType, label: 'Rounds', icon: Calendar },
    { id: 'course' as StatsTabType, label: 'Courses', icon: MapPin },
    { id: 'achievements' as StatsTabType, label: 'Awards', icon: Trophy }
  ];

  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return 'text-purple-400'; // Eagle or better
    if (diff === -1) return 'text-yellow-400'; // Birdie
    if (diff === 0) return 'text-green-400'; // Par
    if (diff === 1) return 'text-orange-400'; // Bogey
    return 'text-red-400'; // Double bogey or worse
  };

  const getScoreLabel = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double';
    return `+${diff}`;
  };

  return (
    <MobileLayout
      header={
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
            <div>
              <h1 className="text-lg font-light text-white">Golf Stats</h1>
              <p className="text-sm text-gray-400">{user.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-cyan-400">{mockStats.overview.handicap}</p>
            <p className="text-xs text-gray-400">Handicap</p>
          </div>
        </div>
      }
    >
      <div className="p-4 pb-20">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {mockStats.overview.totalRounds}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Rounds Played
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {mockStats.overview.averageScore}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" />
                    Average Score
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {mockStats.overview.bestScore}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3" />
                    Best Score
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {mockStats.overview.holesInOne}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" />
                    Holes in One
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart Placeholder */}
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Score Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <PieChart className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Chart visualization coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Strokes</span>
                  <span className="text-white font-medium">{mockStats.overview.totalStrokes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Best Streak</span>
                  <span className="text-white font-medium">{mockStats.overview.bestStreak} rounds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Courses Played</span>
                  <span className="text-white font-medium">{mockStats.overview.coursesPlayed}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Rounds Tab */}
        {activeTab === 'rounds' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Rounds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockStats.recentRounds.map((round, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{round.course}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(round.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getScoreColor(round.score, round.par)}`}>
                        {round.score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getScoreLabel(round.score, round.par)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Course Tab */}
        {activeTab === 'course' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Favorite Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockStats.courseStats.favorites.map((course, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-white font-medium">{course.name}</p>
                      <span className="text-xs text-gray-400">{course.timesPlayed} rounds</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Best Score</p>
                        <p className="text-yellow-400 font-medium">{course.bestScore}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Average</p>
                        <p className="text-cyan-400 font-medium">{course.avgScore}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockStats.achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{achievement.title}</p>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(achievement.date).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Achievement Progress */}
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Next Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Break 70</span>
                    <span className="text-cyan-400">Best: 68</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-full"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">50 Rounds Played</span>
                    <span className="text-cyan-400">{mockStats.overview.totalRounds}/50</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full" 
                      style={{ width: `${(mockStats.overview.totalRounds / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
}