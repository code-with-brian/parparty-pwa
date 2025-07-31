import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  QrCode, 
  MapPin,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface CoursePartnerDashboardProps {
  courseId: Id<"courses">;
}

export const CoursePartnerDashboard: React.FC<CoursePartnerDashboardProps> = ({ 
  courseId 
}) => {
  const [newQRLocation, setNewQRLocation] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const course = useQuery(api.courses.getCourse, { courseId });
  const events = useQuery(api.courses.getCourseEvents, { courseId });
  const generateQRCode = useMutation(api.courses.generateQRCode);

  const handleGenerateQR = async () => {
    if (!newQRLocation.trim()) return;
    
    setIsGeneratingQR(true);
    try {
      await generateQRCode({
        courseId,
        location: newQRLocation.trim(),
      });
      setNewQRLocation('');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPartnershipBadgeColor = (level: string) => {
    switch (level) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (!course) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const analytics = course.analytics || {
    totalGames: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    lastUpdated: Date.now(),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
          <p className="text-gray-600 mt-1">{course.address}</p>
        </div>
        <Badge className={getPartnershipBadgeColor(course.partnershipLevel)}>
          {course.partnershipLevel} partner
        </Badge>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalGames}</div>
            <p className="text-xs text-muted-foreground">
              {events?.totalActiveGames || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {course.revenueShare}% revenue share
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per game average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.qrCodes?.filter(qr => qr.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            QR Code Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter location (e.g., 'Tee Box 1', 'Clubhouse')"
              value={newQRLocation}
              onChange={(e) => setNewQRLocation(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleGenerateQR}
              disabled={isGeneratingQR || !newQRLocation.trim()}
            >
              {isGeneratingQR ? 'Generating...' : 'Generate QR'}
            </Button>
          </div>

          {course.qrCodes && course.qrCodes.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Active QR Codes:</h4>
              <div className="grid gap-2">
                {course.qrCodes
                  .filter(qr => qr.isActive)
                  .map((qr, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">{qr.location}</span>
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        {qr.code.split('?')[0].split('/').pop()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {events && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.activeGames.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Active Games ({events.activeGames.length})</h4>
                <div className="space-y-2">
                  {events.activeGames.slice(0, 3).map((game) => (
                    <div key={game._id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="font-medium">{game.name}</span>
                      <Badge className="bg-green-100 text-green-800">Live</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.recentFinishedGames.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Completed Games</h4>
                <div className="space-y-2">
                  {events.recentFinishedGames.slice(0, 5).map((game) => (
                    <div key={game._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{game.name}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(game.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.activeGames.length === 0 && events.recentFinishedGames.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No recent activity to display
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <p className="text-sm text-gray-600">{course.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Website</label>
              <p className="text-sm text-gray-600">
                {course.website ? (
                  <a href={course.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {course.website}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Partnership Level</label>
              <p className="text-sm text-gray-600 capitalize">{course.partnershipLevel}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Revenue Share</label>
              <p className="text-sm text-gray-600">{course.revenueShare}%</p>
            </div>
          </div>
          
          {course.fbIntegration && (
            <div>
              <label className="text-sm font-medium text-gray-700">F&B Integration</label>
              <p className="text-sm text-gray-600">
                {course.fbIntegration.isActive ? 'Active' : 'Inactive'} 
                {course.fbIntegration.providerId && ` (${course.fbIntegration.providerId})`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};