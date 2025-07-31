import React, { useState, useEffect } from 'react';
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
  Settings,
  Activity,
  Target,
  Award,
  ShoppingCart,
  UserCheck,
  TrendingDown,
  RefreshCw,
  Download,
  Mail,
  Eye,
  Share2
} from 'lucide-react';
// Temporarily disable Convex dataModel import to fix build issues
// import { Id } from '../../../convex/_generated/dataModel';
type Id<T> = string;

interface CoursePartnerDashboardProps {
  courseId: Id<"courses">;
}

export const CoursePartnerDashboard: React.FC<CoursePartnerDashboardProps> = ({ 
  courseId 
}) => {
  const [newQRLocation, setNewQRLocation] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Basic course data
  const course = useQuery(api.courses.getCourse, { courseId });
  const events = useQuery(api.courses.getCourseEvents, { courseId });
  
  // Enhanced analytics data
  const courseAnalytics = useQuery(api.analytics.getCourseAnalytics, { 
    courseId,
    startDate: getStartDate(dateRange),
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const sponsorAnalytics = useQuery(api.analytics.getSponsorEngagementAnalytics, { 
    courseId,
    startDate: getStartDate(dateRange),
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const playerJourneyAnalytics = useQuery(api.analytics.getPlayerJourneyAnalytics, { 
    courseId,
    startDate: getStartDate(dateRange),
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const realTimeDashboard = useQuery(api.analytics.getRealTimeDashboard, { courseId });
  
  // Mutations
  const generateQRCode = useMutation(api.courses.generateQRCode);
  const generateReport = useMutation(api.analytics.generateAutomatedReport);

  // Auto-refresh every 30 seconds for real-time data
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Trigger re-fetch of real-time data
      // This is handled automatically by Convex subscriptions
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function getStartDate(range: '7d' | '30d' | '90d'): string {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

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

  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    try {
      await generateReport({
        courseId,
        reportType,
        recipientEmail: 'partner@example.com', // This would come from course settings
      });
      alert(`${reportType} report generated successfully!`);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100); // Convert from cents
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  if (!course || !courseAnalytics || !sponsorAnalytics || !playerJourneyAnalytics || !realTimeDashboard) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comprehensive analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
          <p className="text-gray-600 mt-1">{course.address}</p>
          <div className="flex items-center mt-2 space-x-4">
            <Badge className={getPartnershipBadgeColor(course.partnershipLevel)}>
              {course.partnershipLevel} partner
            </Badge>
            <span className="text-sm text-gray-500">
              Last updated: {new Date(courseAnalytics.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Date Range Selector */}
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Live
          </Button>
          
          {/* Report generation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateReport('weekly')}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-time Today's Stats */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            Today's Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{realTimeDashboard.today.activeGames}</div>
              <div className="text-xs text-gray-500">Active Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{realTimeDashboard.today.totalGames}</div>
              <div className="text-xs text-gray-500">Total Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{realTimeDashboard.today.totalPlayers}</div>
              <div className="text-xs text-gray-500">Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{realTimeDashboard.today.totalOrders}</div>
              <div className="text-xs text-gray-500">F&B Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(realTimeDashboard.today.totalRevenue)}</div>
              <div className="text-xs text-gray-500">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{realTimeDashboard.today.totalRedemptions}</div>
              <div className="text-xs text-gray-500">Rewards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{course.qrCodes?.filter(qr => qr.isActive).length || 0}</div>
              <div className="text-xs text-gray-500">QR Codes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseAnalytics.overview.totalGames}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(courseAnalytics.trends.weekOverWeekGrowth)}
              <span className="ml-1">
                {courseAnalytics.trends.weekOverWeekGrowth > 0 ? '+' : ''}{courseAnalytics.trends.weekOverWeekGrowth}% vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(courseAnalytics.overview.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(courseAnalytics.overview.averageOrderValue)} avg order • {course.revenueShare}% share
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Player Conversion</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(playerJourneyAnalytics.overview.conversionRate)}</div>
            <p className="text-xs text-muted-foreground">
              {playerJourneyAnalytics.overview.convertedPlayers} of {playerJourneyAnalytics.overview.totalPlayers} players
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sponsor Engagement</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sponsorAnalytics.totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(courseAnalytics.engagement.rewardRedemptionRate)} redemption rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sponsor Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Sponsor Engagement Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{sponsorAnalytics.uniqueSponsors}</div>
              <div className="text-sm text-gray-600">Active Sponsors</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(sponsorAnalytics.totalValue)}</div>
              <div className="text-sm text-gray-600">Total Reward Value</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {sponsorAnalytics.totalRedemptions > 0 ? 
                  formatCurrency(sponsorAnalytics.totalValue / sponsorAnalytics.totalRedemptions) : '$0'}
              </div>
              <div className="text-sm text-gray-600">Avg Reward Value</div>
            </div>
          </div>

          {sponsorAnalytics.topPerformingSponsors.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Top Performing Sponsors</h4>
              <div className="space-y-3">
                {sponsorAnalytics.topPerformingSponsors.map((sponsor, index) => (
                  <div key={sponsor.sponsorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{sponsor.sponsorName}</div>
                        <div className="text-sm text-gray-500">
                          {sponsor.totalRedemptions} redemptions • {formatCurrency(sponsor.averageRedemptionValue)} avg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(sponsor.totalValue)}</div>
                      <div className="text-sm text-gray-500">Total Value</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Journey Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Player Journey & Conversion Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div>
              <h4 className="font-medium mb-3">Conversion Funnel</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">Game Joined</span>
                  <span className="font-bold">{playerJourneyAnalytics.conversionFunnel.gameJoined}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">Social Engagement</span>
                  <span className="font-bold">{playerJourneyAnalytics.conversionFunnel.socialEngagement}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-sm">F&B Orders</span>
                  <span className="font-bold">{playerJourneyAnalytics.conversionFunnel.fbOrders}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm">Reward Redemptions</span>
                  <span className="font-bold">{playerJourneyAnalytics.conversionFunnel.rewardRedemptions}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-indigo-50 rounded">
                  <span className="text-sm">Account Created</span>
                  <span className="font-bold">{playerJourneyAnalytics.conversionFunnel.accountCreated}</span>
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div>
              <h4 className="font-medium mb-3">Engagement Metrics</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Social Engagement Rate</span>
                    <span>{formatPercentage(playerJourneyAnalytics.engagement.socialEngagementRate)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(playerJourneyAnalytics.engagement.socialEngagementRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>F&B Order Rate</span>
                    <span>{formatPercentage(playerJourneyAnalytics.engagement.fbOrderRate)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(playerJourneyAnalytics.engagement.fbOrderRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Reward Redemption Rate</span>
                    <span>{formatPercentage(playerJourneyAnalytics.engagement.rewardRedemptionRate)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(playerJourneyAnalytics.engagement.rewardRedemptionRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Games */}
            <div>
              <h4 className="font-medium mb-3">Active Games ({realTimeDashboard.liveActivity.activeGames.length})</h4>
              {realTimeDashboard.liveActivity.activeGames.length > 0 ? (
                <div className="space-y-2">
                  {realTimeDashboard.liveActivity.activeGames.map((game) => (
                    <div key={game._id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{game.name}</div>
                        <div className="text-sm text-gray-500">
                          {game.playerCount} players • Started {new Date(game.startedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Live</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No active games</div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="font-medium mb-3">Recent Activity</h4>
              {realTimeDashboard.liveActivity.recentActivity.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {realTimeDashboard.liveActivity.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <div className="text-sm">{activity.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No recent activity</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Automated Reporting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Automated Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('daily')}
              className="flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Daily Report
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('weekly')}
              className="flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Weekly Report
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('monthly')}
              className="flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Monthly Report
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Reports include comprehensive analytics, sponsor performance, and player journey insights.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};