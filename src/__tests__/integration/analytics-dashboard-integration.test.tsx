import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { CoursePartnerDashboard } from '../../components/CoursePartnerDashboard';

// Mock Convex client
const mockConvexClient = new ConvexReactClient('https://test.convex.cloud');

// Mock data
const mockCourse = {
  _id: 'course123',
  name: 'Test Golf Course',
  address: '123 Golf Street, Golf City, GC 12345',
  partnershipLevel: 'premium',
  revenueShare: 15,
  qrCodes: [
    {
      location: 'Tee Box 1',
      code: 'parparty://course/course123?location=tee_1',
      isActive: true,
    },
    {
      location: 'Clubhouse',
      code: 'parparty://course/course123?location=clubhouse',
      isActive: true,
    },
  ],
  fbIntegration: {
    providerId: 'test-provider',
    isActive: true,
  },
  analytics: {
    totalGames: 150,
    totalRevenue: 25000,
    averageOrderValue: 35.50,
    lastUpdated: Date.now(),
  },
};

const mockCourseAnalytics = {
  overview: {
    totalGames: 150,
    activeGames: 5,
    finishedGames: 145,
    totalPlayers: 600,
    uniqueUsers: 180,
    guestPlayers: 420,
    conversionRate: 30.0,
    totalRevenue: 2500000, // in cents
    averageOrderValue: 4167, // in cents
    ordersPerGame: 2.5,
    totalRedemptions: 85,
  },
  trends: {
    recentGames: 12,
    last30DaysGames: 45,
    weekOverWeekGrowth: 15.5,
    dailyStats: [
      { date: '2024-01-01', games: 5, revenue: 50000, orders: 12 },
      { date: '2024-01-02', games: 8, revenue: 75000, orders: 18 },
    ],
  },
  engagement: {
    averagePlayersPerGame: 4.0,
    fbOrderRate: 65,
    rewardRedemptionRate: 14,
  },
  lastUpdated: Date.now(),
};

const mockSponsorAnalytics = {
  totalRedemptions: 85,
  totalValue: 12750,
  uniqueSponsors: 8,
  sponsorBreakdown: [
    {
      sponsorId: 'sponsor1',
      sponsorName: 'Golf Pro Shop',
      logo: 'https://example.com/logo1.png',
      totalRedemptions: 25,
      totalValue: 3750,
      averageRedemptionValue: 150,
      rewardTypes: { discount: 15, product: 10 },
    },
    {
      sponsorId: 'sponsor2',
      sponsorName: 'Sports Bar & Grill',
      logo: 'https://example.com/logo2.png',
      totalRedemptions: 20,
      totalValue: 3000,
      averageRedemptionValue: 150,
      rewardTypes: { product: 20 },
    },
  ],
  topPerformingSponsors: [
    {
      sponsorId: 'sponsor1',
      sponsorName: 'Golf Pro Shop',
      totalRedemptions: 25,
      totalValue: 3750,
      averageRedemptionValue: 150,
    },
  ],
  lastUpdated: Date.now(),
};

const mockPlayerJourneyAnalytics = {
  overview: {
    totalPlayers: 600,
    guestPlayers: 420,
    convertedPlayers: 180,
    conversionRate: 30.0,
  },
  engagement: {
    socialEngagementRate: 75.5,
    fbOrderRate: 65.0,
    rewardRedemptionRate: 14.2,
    averageSocialPostsPerPlayer: 2.3,
  },
  conversionFunnel: {
    gameJoined: 600,
    socialEngagement: 453,
    fbOrders: 390,
    rewardRedemptions: 85,
    accountCreated: 180,
  },
  dropoffRates: {
    gameToSocial: 24.5,
    socialToOrder: 13.9,
    orderToRedemption: 78.2,
    redemptionToConversion: 52.9,
  },
  lastUpdated: Date.now(),
};

const mockRealTimeDashboard = {
  today: {
    totalGames: 8,
    activeGames: 3,
    finishedGames: 5,
    totalPlayers: 32,
    totalOrders: 18,
    totalRevenue: 135000, // in cents
    totalRedemptions: 6,
  },
  liveActivity: {
    activeGames: [
      {
        _id: 'game1',
        name: 'Morning Foursome',
        startedAt: Date.now() - 3600000, // 1 hour ago
        playerCount: 4,
      },
      {
        _id: 'game2',
        name: 'Afternoon Round',
        startedAt: Date.now() - 1800000, // 30 minutes ago
        playerCount: 3,
      },
    ],
    recentActivity: [
      {
        type: 'order_placed',
        timestamp: Date.now() - 600000, // 10 minutes ago
        description: 'F&B order placed - $15.50',
        orderId: 'order1',
      },
      {
        type: 'reward_redeemed',
        timestamp: Date.now() - 900000, // 15 minutes ago
        description: 'Sponsor reward redeemed',
        redemptionId: 'redemption1',
      },
    ],
  },
  lastUpdated: Date.now(),
};

const mockEvents = {
  activeGames: [
    {
      _id: 'game1',
      name: 'Morning Foursome',
      startedAt: Date.now() - 3600000,
    },
    {
      _id: 'game2',
      name: 'Afternoon Round',
      startedAt: Date.now() - 1800000,
    },
  ],
  recentFinishedGames: [
    {
      _id: 'game3',
      name: 'Yesterday Round',
      startedAt: Date.now() - 86400000, // 1 day ago
    },
  ],
  totalActiveGames: 2,
};

// Mock useQuery and useMutation hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn((query) => {
      if (query.toString().includes('getCourse')) return mockCourse;
      if (query.toString().includes('getCourseEvents')) return mockEvents;
      if (query.toString().includes('getCourseAnalytics')) return mockCourseAnalytics;
      if (query.toString().includes('getSponsorEngagementAnalytics')) return mockSponsorAnalytics;
      if (query.toString().includes('getPlayerJourneyAnalytics')) return mockPlayerJourneyAnalytics;
      if (query.toString().includes('getRealTimeDashboard')) return mockRealTimeDashboard;
      return null;
    }),
    useMutation: vi.fn(() => vi.fn()),
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConvexProvider client={mockConvexClient}>
    {children}
  </ConvexProvider>
);

describe('CoursePartnerDashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render comprehensive analytics dashboard', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check header information
      expect(screen.getByText('Test Golf Course')).toBeInTheDocument();
      expect(screen.getByText('123 Golf Street, Golf City, GC 12345')).toBeInTheDocument();
      expect(screen.getByText('premium partner')).toBeInTheDocument();
    });
  });

  it('should display real-time today\'s performance metrics', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check today's performance section
      expect(screen.getByText('Today\'s Performance')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Active games
      expect(screen.getByText('8')).toBeInTheDocument(); // Total games today
      expect(screen.getByText('32')).toBeInTheDocument(); // Players today
      expect(screen.getByText('18')).toBeInTheDocument(); // Orders today
      expect(screen.getByText('6')).toBeInTheDocument(); // Redemptions today
    });
  });

  it('should display enhanced analytics cards with trends', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check main analytics cards
      expect(screen.getByText('Total Games')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('+15.5% vs last period')).toBeInTheDocument();

      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$25,000.00')).toBeInTheDocument();

      expect(screen.getByText('Player Conversion')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();

      expect(screen.getByText('Sponsor Engagement')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  it('should display sponsor engagement analytics', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check sponsor analytics section
      expect(screen.getByText('Sponsor Engagement Analytics')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // Active sponsors
      expect(screen.getByText('$127.50')).toBeInTheDocument(); // Total reward value
      expect(screen.getByText('Top Performing Sponsors')).toBeInTheDocument();
      expect(screen.getByText('Golf Pro Shop')).toBeInTheDocument();
    });
  });

  it('should display player journey analytics with conversion funnel', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check player journey section
      expect(screen.getByText('Player Journey & Conversion Analytics')).toBeInTheDocument();
      expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
      expect(screen.getByText('Game Joined')).toBeInTheDocument();
      expect(screen.getByText('600')).toBeInTheDocument(); // Game joined count
      expect(screen.getByText('Social Engagement')).toBeInTheDocument();
      expect(screen.getByText('453')).toBeInTheDocument(); // Social engagement count
      expect(screen.getByText('Account Created')).toBeInTheDocument();
      expect(screen.getByText('180')).toBeInTheDocument(); // Account created count

      // Check engagement metrics
      expect(screen.getByText('Engagement Metrics')).toBeInTheDocument();
      expect(screen.getByText('Social Engagement Rate')).toBeInTheDocument();
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });
  });

  it('should display live activity feed', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check live activity section
      expect(screen.getByText('Live Activity Feed')).toBeInTheDocument();
      expect(screen.getByText('Active Games (2)')).toBeInTheDocument();
      expect(screen.getByText('Morning Foursome')).toBeInTheDocument();
      expect(screen.getByText('Afternoon Round')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('F&B order placed - $15.50')).toBeInTheDocument();
      expect(screen.getByText('Sponsor reward redeemed')).toBeInTheDocument();
    });
  });

  it('should handle date range selection', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      const dateRangeSelect = screen.getByDisplayValue('Last 30 days');
      expect(dateRangeSelect).toBeInTheDocument();

      // Change date range
      fireEvent.change(dateRangeSelect, { target: { value: '7d' } });
      expect(dateRangeSelect.value).toBe('7d');
    });
  });

  it('should handle auto-refresh toggle', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      const liveButton = screen.getByText('Live');
      expect(liveButton).toBeInTheDocument();

      // Toggle auto-refresh
      fireEvent.click(liveButton);
      // The button should still be there but might change appearance
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  it('should display QR code management section', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check QR code management
      expect(screen.getByText('QR Code Management')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter location (e.g., \'Tee Box 1\', \'Clubhouse\')')).toBeInTheDocument();
      expect(screen.getByText('Generate QR')).toBeInTheDocument();
      expect(screen.getByText('Active QR Codes:')).toBeInTheDocument();
      expect(screen.getByText('Tee Box 1')).toBeInTheDocument();
      expect(screen.getByText('Clubhouse')).toBeInTheDocument();
    });
  });

  it('should handle QR code generation', async () => {
    const mockGenerateQR = vi.fn();
    vi.mocked(require('convex/react').useMutation).mockReturnValue(mockGenerateQR);

    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      const locationInput = screen.getByPlaceholderText('Enter location (e.g., \'Tee Box 1\', \'Clubhouse\')');
      const generateButton = screen.getByText('Generate QR');

      // Enter location and generate QR
      fireEvent.change(locationInput, { target: { value: 'Pro Shop' } });
      fireEvent.click(generateButton);

      expect(mockGenerateQR).toHaveBeenCalledWith({
        courseId: 'course123',
        location: 'Pro Shop',
      });
    });
  });

  it('should display automated reporting section', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check automated reporting section
      expect(screen.getByText('Automated Reporting')).toBeInTheDocument();
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
      expect(screen.getByText('Monthly Report')).toBeInTheDocument();
      expect(screen.getByText('Reports include comprehensive analytics, sponsor performance, and player journey insights.')).toBeInTheDocument();
    });
  });

  it('should handle report generation', async () => {
    const mockGenerateReport = vi.fn();
    vi.mocked(require('convex/react').useMutation).mockReturnValue(mockGenerateReport);

    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      const weeklyReportButton = screen.getByText('Weekly Report');
      fireEvent.click(weeklyReportButton);

      expect(mockGenerateReport).toHaveBeenCalledWith({
        courseId: 'course123',
        reportType: 'weekly',
        recipientEmail: 'partner@example.com',
      });
    });
  });

  it('should show loading state when data is not available', () => {
    // Mock loading state
    vi.mocked(require('convex/react').useQuery).mockReturnValue(undefined);

    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    expect(screen.getByText('Loading comprehensive analytics...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should display progress bars for engagement metrics', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for progress bars in engagement metrics
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('should format currency values correctly', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check currency formatting
      expect(screen.getByText('$25,000.00')).toBeInTheDocument(); // Total revenue
      expect(screen.getByText('$41.67')).toBeInTheDocument(); // Average order value
      expect(screen.getByText('$1,350.00')).toBeInTheDocument(); // Today's revenue
    });
  });

  it('should display trend indicators', async () => {
    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for trend indicators (up/down arrows)
      expect(screen.getByText('+15.5% vs last period')).toBeInTheDocument();
    });
  });

  it('should handle empty states gracefully', async () => {
    // Mock empty data
    const emptyMockRealTimeDashboard = {
      ...mockRealTimeDashboard,
      liveActivity: {
        activeGames: [],
        recentActivity: [],
      },
    };

    vi.mocked(require('convex/react').useQuery).mockImplementation((query) => {
      if (query.toString().includes('getRealTimeDashboard')) return emptyMockRealTimeDashboard;
      if (query.toString().includes('getCourse')) return mockCourse;
      if (query.toString().includes('getCourseEvents')) return mockEvents;
      if (query.toString().includes('getCourseAnalytics')) return mockCourseAnalytics;
      if (query.toString().includes('getSponsorEngagementAnalytics')) return mockSponsorAnalytics;
      if (query.toString().includes('getPlayerJourneyAnalytics')) return mockPlayerJourneyAnalytics;
      return null;
    });

    render(
      <TestWrapper>
        <CoursePartnerDashboard courseId="course123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No active games')).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });
});