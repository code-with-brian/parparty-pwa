import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CoursePartnerDashboard } from '../CoursePartnerDashboard';

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock the API
vi.mock('../../../convex/_generated/api', () => ({
  api: {
    courses: {
      getCourse: 'courses.getCourse',
      getCourseEvents: 'courses.getCourseEvents',
      generateQRCode: 'courses.generateQRCode',
    },
    analytics: {
      getCourseAnalytics: 'analytics.getCourseAnalytics',
      getSponsorEngagementAnalytics: 'analytics.getSponsorEngagementAnalytics',
      getPlayerJourneyAnalytics: 'analytics.getPlayerJourneyAnalytics',
      getRealTimeDashboard: 'analytics.getRealTimeDashboard',
      generateAutomatedReport: 'analytics.generateAutomatedReport',
    },
  },
}));

describe('CoursePartnerDashboard', () => {
  it('should render loading state when data is not available', () => {
    render(<CoursePartnerDashboard courseId="test-course-id" />);
    
    expect(screen.getByText('Loading comprehensive analytics...')).toBeInTheDocument();
  });

  it('should render basic structure', () => {
    // This test just verifies the component can be rendered without crashing
    // when all data is null (loading state)
    render(<CoursePartnerDashboard courseId="test-course-id" />);
    
    // Should show loading state
    expect(screen.getByText('Loading comprehensive analytics...')).toBeInTheDocument();
  });
});