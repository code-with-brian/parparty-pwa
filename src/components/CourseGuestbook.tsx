import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Camera, Trophy, ShoppingCart, MessageCircle, Heart } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface CourseGuestbookProps {
  courseId: Id<"courses">;
  limit?: number;
}

export const CourseGuestbook: React.FC<CourseGuestbookProps> = ({ 
  courseId, 
  limit = 20 
}) => {
  const guestbookEntries = useQuery(api.courses.getCourseGuestbook, { 
    courseId, 
    limit 
  });

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <Camera className="h-4 w-4" />;
      case 'score':
        return <Trophy className="h-4 w-4" />;
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'achievement':
        return <Trophy className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'photo':
        return 'text-blue-600';
      case 'score':
        return 'text-green-600';
      case 'order':
        return 'text-orange-600';
      case 'achievement':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  if (!guestbookEntries) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Heart className="h-5 w-5 mr-2 text-red-500" />
        Course Guestbook
      </h3>

      {guestbookEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No recent activity to show.</p>
          <p className="text-sm mt-2">Play a round to add to the guestbook!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guestbookEntries.map((entry) => (
            <Card key={entry._id} className="border-l-4 border-l-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-gray-100 ${getPostTypeColor(entry.type)}`}>
                    {getPostIcon(entry.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {entry.player?.name || 'Anonymous Player'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {entry.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(entry.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-2">{entry.content}</p>
                    
                    {entry.game && (
                      <div className="text-xs text-gray-500">
                        from game: {entry.game.name}
                      </div>
                    )}

                    {entry.reactions && entry.reactions.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex space-x-1">
                          {entry.reactions.slice(0, 3).map((reaction, index) => (
                            <span key={index} className="text-sm">
                              {reaction.type === 'like' && '👍'}
                              {reaction.type === 'love' && '❤️'}
                              {reaction.type === 'laugh' && '😂'}
                              {reaction.type === 'wow' && '😮'}
                            </span>
                          ))}
                        </div>
                        {entry.reactions.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{entry.reactions.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};