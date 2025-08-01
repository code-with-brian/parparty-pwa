import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Trophy,
  Star,
  Thermometer,
  Wind,
  DollarSign,
  ChevronRight,
  Flag,
  Target
} from 'lucide-react';

interface Course {
  _id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  partnershipLevel: 'basic' | 'premium' | 'enterprise';
}

interface ClubEventsScreenProps {
  course?: Course;
  gameId?: string;
}

export function ClubEventsScreen({ course }: ClubEventsScreenProps) {
  // Mock data for club events (in production, this would come from a Convex query)
  const upcomingEvents = [
    {
      id: '1',
      title: 'Member-Guest Tournament',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      time: '8:00 AM',
      type: 'tournament',
      description: 'Annual member-guest tournament with prizes and dinner',
      spots: 24,
      spotsAvailable: 8,
      fee: 95,
      featured: true
    },
    {
      id: '2',
      title: 'Ladies Night Golf',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      time: '5:30 PM',
      type: 'social',
      description: 'Weekly ladies night with drinks and appetizers',
      spots: 16,
      spotsAvailable: 5,
      fee: 25
    },
    {
      id: '3',
      title: 'Junior Golf Clinic',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      time: '10:00 AM',
      type: 'clinic',
      description: 'Golf instruction for kids ages 8-16',
      spots: 12,
      spotsAvailable: 3,
      fee: 40
    },
    {
      id: '4',
      title: 'Charity Scramble',
      date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
      time: '1:00 PM',
      type: 'charity',
      description: 'Fundraising tournament for local children\'s hospital',
      spots: 32,
      spotsAvailable: 18,
      fee: 75,
      featured: true
    }
  ];

  const announcements = [
    {
      id: '1',
      title: 'Course Conditions Update',
      content: 'All 18 holes are in excellent condition. Greens were recently aerated and are rolling true.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      type: 'conditions'
    },
    {
      id: '2',
      title: 'Pro Shop Sale',
      content: 'Save 20% on all golf apparel and accessories through the end of the month.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      type: 'promotion'
    },
    {
      id: '3',
      title: 'New Menu Items',
      content: 'Try our new craft burger and seasonal cocktails at the 19th hole!',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      type: 'dining'
    }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tournament': return Trophy;
      case 'social': return Users;
      case 'clinic': return Target;
      case 'charity': return Star;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'tournament': return 'text-yellow-400 bg-yellow-400/20';
      case 'social': return 'text-cyan-400 bg-cyan-400/20';
      case 'clinic': return 'text-green-400 bg-green-400/20';
      case 'charity': return 'text-purple-400 bg-purple-400/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  const formatEventDate = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatAnnouncementTime = (timestamp: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
      
      <div className="relative pb-20">
        {/* Header */}
        <div className="pt-4 px-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Club Events</h1>
              <p className="text-slate-400 text-sm">
                {course ? course.name : 'Club activities and announcements'}
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              <Flag className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Quick Course Info */}
        {course && (
          <div className="px-6 mb-6">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">{course.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{course.address}</span>
                    {course.city && course.state && (
                      <span>• {course.city}, {course.state}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-green-400">
                      <Thermometer className="w-3 h-3" />
                      <span>72°F</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400">
                      <Wind className="w-3 h-3" />
                      <span>5mph SW</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3 h-3" />
                      <span>Excellent</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    course.partnershipLevel === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                    course.partnershipLevel === 'premium' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {course.partnershipLevel.charAt(0).toUpperCase() + course.partnershipLevel.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="px-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Upcoming Events
          </h2>
          
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => {
              const EventIcon = getEventIcon(event.type);
              const eventColors = getEventColor(event.type);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-3xl ${
                    event.featured 
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30' 
                      : 'bg-white/[0.02] border border-white/10'
                  } backdrop-blur-xl`}
                >
                  {event.featured && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs font-medium">
                        Featured
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Event Icon */}
                      <div className={`w-12 h-12 rounded-2xl ${eventColors} flex items-center justify-center flex-shrink-0`}>
                        <EventIcon className="w-6 h-6" />
                      </div>
                      
                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-white font-semibold">{event.title}</h3>
                            <p className="text-slate-400 text-sm mt-1">{event.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatEventDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${event.fee}</span>
                          </div>
                        </div>
                        
                        {/* Availability */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-slate-500">
                              {event.spotsAvailable} of {event.spots} spots available
                            </div>
                            <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${((event.spots - event.spotsAvailable) / event.spots) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          <button className="flex items-center gap-1 text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors">
                            <span>Register</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Club Announcements */}
        <div className="px-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-green-400" />
            Club Announcements
          </h2>
          
          <div className="space-y-3">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium">{announcement.title}</h4>
                  <span className="text-xs text-slate-500">
                    {formatAnnouncementTime(announcement.timestamp)}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {announcement.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}