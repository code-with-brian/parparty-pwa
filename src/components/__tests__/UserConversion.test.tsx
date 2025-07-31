import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserConversion from '../UserConversion';
import { AuthProvider } from '../../contexts/AuthContext';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Mock Convex client
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
  subscribe: vi.fn(),
  close: vi.fn(),
  connectionState: vi.fn(),
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
  auth: {},
  watchQuery: vi.fn(),
} as unknown as ConvexReactClient;

// Mock useQuery and useMutation
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: () => mockUseQuery(),
    useMutation: () => mockUseMutation(),
    ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock the auth context
const mockConvertGuestToUser = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  }),
  useGuestConversion: () => ({
    convertGuestToUser: mockConvertGuestToUser,
  }),
}));

const renderUserConversion = (props: any = {}) => {
  const defaultProps = {
    guestId: 'test_guest_id' as any,
    onConversionComplete: vi.fn(),
    onCancel: vi.fn(),
    showBenefits: true,
    ...props,
  };

  return render(
    <ConvexProvider client={mockConvex}>
      <AuthProvider convex={mockConvex}>
        <UserConversion {...defaultProps} />
      </AuthProvider>
    </ConvexProvider>
  );
};

describe('UserConversion Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(null);
  });

  it('should show account creation locked when not eligible', () => {
    mockUseQuery
      .mockReturnValueOnce(null) // conversionData
      .mockReturnValueOnce({ eligible: false, reason: 'No game activity found' }) // eligibility
      .mockReturnValueOnce(null); // benefits

    renderUserConversion();

    expect(screen.getByText('Account Creation Locked')).toBeInTheDocument();
    expect(screen.getByText('No game activity found')).toBeInTheDocument();
    expect(screen.getByText('Continue Playing')).toBeInTheDocument();
  });

  it('should render without crashing when eligible', () => {
    const mockConversionData = {
      guest: { name: 'Test Guest' },
      summary: {
        totalGames: 2,
        totalScores: 18,
        totalPhotos: 5,
        totalRedemptions: 1,
      },
    };

    const mockBenefits = {
      benefits: [
        {
          title: 'Save Your Golf History',
          description: 'Keep track of all your rounds',
          icon: '📊',
        },
      ],
      features: ['Unlimited game history'],
    };

    mockUseQuery
      .mockReturnValueOnce(mockConversionData) // conversionData
      .mockReturnValueOnce({ eligible: true, message: 'Ready to save your golf journey!' }) // eligibility
      .mockReturnValueOnce(mockBenefits); // benefits

    const { container } = renderUserConversion();

    // Just verify the component renders without crashing
    expect(container).toBeInTheDocument();
  });

  it('should handle component structure validation', () => {
    // Test that the component can be imported and instantiated
    expect(UserConversion).toBeDefined();
    expect(typeof UserConversion).toBe('function');
  });

  it('should handle props correctly', () => {
    const mockProps = {
      guestId: 'test_guest_id' as any,
      onConversionComplete: vi.fn(),
      onCancel: vi.fn(),
      showBenefits: false,
    };

    mockUseQuery
      .mockReturnValueOnce(null) // conversionData
      .mockReturnValueOnce({ eligible: false, reason: 'Test reason' }) // eligibility
      .mockReturnValueOnce(null); // benefits

    const { container } = renderUserConversion(mockProps);

    // Verify component renders with props
    expect(container).toBeInTheDocument();
  });

  it('should handle missing data gracefully', () => {
    // Test with all null/undefined data
    mockUseQuery
      .mockReturnValueOnce(null) // conversionData
      .mockReturnValueOnce(null) // eligibility
      .mockReturnValueOnce(null); // benefits

    const { container } = renderUserConversion();

    // Should still render something (likely the locked state)
    expect(container).toBeInTheDocument();
  });
});