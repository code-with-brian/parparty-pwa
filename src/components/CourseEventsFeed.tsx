import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, Users, Trophy, Calendar } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface CourseEventsFeedProps {
  courseId: Id<"courses">;
  onJoinGame?: (gameId: string) => void;
}

export const CourseEventsFeed: React.FC<CourseEventsFeedProps> = ({ 
  courseId, 
  onJoinGame 
}) => {
  const events = useQuery(api.courses.getCourseEvents, { courseId });
  const course = useQuery(api.courses.getCourse, { courseId });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Live</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-100 text-yellow-800">Starting Soon</Badge>;
      case 'finished':
        return <Badge className="bg-gray-100 text-gray-800">Finished</Badge>;
      default:
        return null;
    }
  };

  if (!events || !course) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{course.name}</h2>
        <p className="text-gray-600 mt-2">{course.address}</p>
        <div className="flex justify-center items-center mt-4 space-x-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            <span>{events.totalActiveGames} active games</span>
          </div>
        </div>
      </div>

      {events.activeGames.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-green-600" />
            Live Games
          </h3>
          <div className="grid gap-4">
            {events.activeGames.map((game) => (
              <Card key={game._id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{game.name}</CardTitle>
                    {getStatusBadge(game.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Started {formatTime(game.startedAt)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Trophy className="h-4 w-4 mr-2" />
                        <span>{game.format} play</span>
                      </div>
                    </div>
                    {onJoinGame && game.status === 'waiting' && (
                      <Button 
                        onClick={() => onJoinGame(game._id)}
                        size="sm"
                      >
                        Join Game
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {events.recentFinishedGames.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-gray-600" />
            Recent Games
          </h3>
          <div className="grid gap-4">
            {events.recentFinishedGames.map((game) => (
              <Card key={game._id} className="border-l-4 border-l-gray-300">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{game.name}</CardTitle>
                    {getStatusBadge(game.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {formatDate(game.startedAt)} at {formatTime(game.startedAt)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Trophy className="h-4 w-4 mr-2" />
                      <span>{game.format} play</span>
                    </div>
                    {game.endedAt && (
                      <div className="text-sm text-gray-500">
                        Finished at {formatTime(game.endedAt)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {events.activeGames.length === 0 && events.recentFinishedGames.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No recent activity at this course.</p>
          <p className="text-sm mt-2">Be the first to start a game!</p>
        </div>
      )}
    </div>
  );
};