import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseDiscovery } from '../CourseDiscovery';

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

const mockUseQuery = vi.mocked(await import('convex/react')).useQuery;

describe('CourseDiscovery', () => {
  const mockCourses = [
    {
      _id: 'course-1',
      name: 'Pine Valley Golf Club',
      address: '123 Golf Course Rd',
      city: 'Pine Valley',
      state: 'NJ',
      zipCode: '08021',
      phone: '(555) 123-4567',
      website: 'https://pinevalley.com',
      partnershipLevel: 'premium',
      analytics: {
        totalGames: 25,
        averageOrderValue: 45.50,
      },
    },
    {
      _id: 'course-2',
      name: 'Oak Hill Country Club',
      address: '456 Oak Hill Dr',
      city: 'Rochester',
      state: 'NY',
      partnershipLevel: 'enterprise',
      analytics: {
        totalGames: 50,
        averageOrderValue: 65.00,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course discovery interface', () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    expect(screen.getByPlaceholderText('Search by city...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by state...')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('displays courses when data is loaded', () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    expect(screen.getByText('Pine Valley Golf Club')).toBeInTheDocument();
    expect(screen.getByText('Oak Hill Country Club')).toBeInTheDocument();
    expect(screen.getByText('123 Golf Course Rd')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Hill Dr')).toBeInTheDocument();
  });

  it('shows loading state when data is not available', () => {
    mockUseQuery.mockReturnValue(undefined);

    const { container } = render(<CourseDiscovery />);

    // Check for the loading spinner element
    const loadingSpinner = container.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('displays partnership level badges correctly', () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    expect(screen.getByText('premium')).toBeInTheDocument();
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  it('shows course analytics when available', () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    expect(screen.getByText('25 games')).toBeInTheDocument();
    expect(screen.getByText('$46 avg')).toBeInTheDocument();
    expect(screen.getByText('50 games')).toBeInTheDocument();
    expect(screen.getByText('$65 avg')).toBeInTheDocument();
  });

  it('handles search input changes', async () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    const cityInput = screen.getByPlaceholderText('Search by city...');
    const stateInput = screen.getByPlaceholderText('Search by state...');

    fireEvent.change(cityInput, { target: { value: 'Pine Valley' } });
    fireEvent.change(stateInput, { target: { value: 'NJ' } });

    expect(cityInput).toHaveValue('Pine Valley');
    expect(stateInput).toHaveValue('NJ');
  });

  it('calls onCourseSelect when course is selected', () => {
    const mockOnCourseSelect = vi.fn();
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery onCourseSelect={mockOnCourseSelect} />);

    const viewButton = screen.getAllByText('View Course Events')[0];
    fireEvent.click(viewButton);

    expect(mockOnCourseSelect).toHaveBeenCalledWith('course-1');
  });

  it('shows empty state when no courses found', () => {
    mockUseQuery.mockReturnValue([]);

    render(<CourseDiscovery />);

    expect(screen.getByText('No courses found in this area. Try expanding your search.')).toBeInTheDocument();
  });

  it('displays contact information when available', () => {
    mockUseQuery.mockReturnValue(mockCourses);

    render(<CourseDiscovery />);

    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByText('Visit Website')).toBeInTheDocument();
  });

  it('handles courses without optional fields gracefully', () => {
    const coursesWithoutOptionalFields = [
      {
        _id: 'course-3',
        name: 'Basic Golf Course',
        address: '789 Basic St',
        partnershipLevel: 'basic',
      },
    ];

    mockUseQuery.mockReturnValue(coursesWithoutOptionalFields);

    render(<CourseDiscovery />);

    expect(screen.getByText('Basic Golf Course')).toBeInTheDocument();
    expect(screen.getByText('789 Basic St')).toBeInTheDocument();
    expect(screen.getByText('basic')).toBeInTheDocument();
  });
});