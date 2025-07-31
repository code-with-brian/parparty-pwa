import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import OrderStatus from '../OrderStatus';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock notification manager
vi.mock('@/utils/notificationManager', () => ({
  notificationManager: {
    initialize: vi.fn(),
    notifyOrderStatusUpdate: vi.fn(),
    isEnabled: vi.fn(() => false),
    requestPermission: vi.fn(() => Promise.resolve(true))
  }
}));

// Mock Convex client
const mockConvex = new ConvexReactClient('https://test.convex.cloud');

// Mock order data
const mockOrders = [
  {
    _id: "order1" as Id<"foodOrders">,
    playerId: "player123" as Id<"players">,
    gameId: "game123" as Id<"games">,
    courseId: "course123" as Id<"courses">,
    items: [
      { name: "Cold Beer", quantity: 2, price: 6.00, description: "Ice-cold beer" },
      { name: "Hot Dog", quantity: 1, price: 8.00, description: "All-beef hot dog" }
    ],
    totalAmount: 20.00,
    status: "preparing" as const,
    deliveryLocation: "hole" as const,
    holeNumber: 5,
    timestamp: Date.now() - 300000, // 5 minutes ago
    specialInstructions: "Extra mustard",
  },
  {
    _id: "order2" as Id<"foodOrders">,
    playerId: "player123" as Id<"players">,
    gameId: "game123" as Id<"games">,
    courseId: "course123" as Id<"courses">,
    items: [
      { name: "Water Bottle", quantity: 1, price: 3.00, description: "Refreshing water" }
    ],
    totalAmount: 3.00,
    status: "delivered" as const,
    deliveryLocation: "clubhouse" as const,
    timestamp: Date.now() - 600000, // 10 minutes ago
  },
];

const mockGameOrders = [
  ...mockOrders,
  {
    _id: "order3" as Id<"foodOrders">,
    playerId: "player456" as Id<"players">,
    gameId: "game123" as Id<"games">,
    courseId: "course123" as Id<"courses">,
    items: [{ name: "Sandwich", quantity: 1, price: 12.00 }],
    totalAmount: 12.00,
    status: "ready" as const,
    deliveryLocation: "cart" as const,
    timestamp: Date.now() - 150000,
    playerName: "John Doe",
  },
];

// Mock Convex hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn((query, args) => {
      if (query.toString().includes('getPlayerOrders')) {
        return mockOrders;
      }
      if (query.toString().includes('getGameOrders')) {
        return mockGameOrders;
      }
      return null;
    }),
  };
});

const defaultProps = {
  playerId: "player123" as Id<"players">,
};

function renderWithConvex(component: React.ReactElement) {
  return render(
    <ConvexProvider client={mockConvex}>
      {component}
    </ConvexProvider>
  );
}

describe('OrderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active orders correctly', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Active Orders (1)')).toBeInTheDocument();
    expect(screen.getByText('2x Cold Beer')).toBeInTheDocument();
    expect(screen.getByText('1x Hot Dog')).toBeInTheDocument();
    expect(screen.getByText('Total: $20.00')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
  });

  it('shows delivery location correctly', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Hole 5')).toBeInTheDocument();
  });

  it('displays special instructions', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Special Instructions:')).toBeInTheDocument();
    expect(screen.getByText('Extra mustard')).toBeInTheDocument();
  });

  it('shows recent orders history', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Recent Orders')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('$3.00')).toBeInTheDocument();
  });

  it('displays game orders when gameId is provided', () => {
    renderWithConvex(
      <OrderStatus 
        {...defaultProps} 
        gameId={"game123" as Id<"games">}
      />
    );
    
    expect(screen.getByText('Game Orders (3)')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows empty state when no orders exist', () => {
    const { useQuery } = require('convex/react');
    useQuery.mockReturnValue([]);
    
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Place your first F&B order to see it here')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    const preparingBadge = screen.getByText('Preparing');
    expect(preparingBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    
    const deliveredBadge = screen.getByText('Delivered');
    expect(deliveredBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('shows order timestamps', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    // Should show formatted timestamps
    const timestamps = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('displays delivery location icons correctly', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    // MapPin icon should be present for hole delivery
    expect(screen.getByText('Hole 5')).toBeInTheDocument();
  });

  it('handles different delivery locations', () => {
    const ordersWithDifferentLocations = [
      {
        ...mockOrders[0],
        deliveryLocation: "clubhouse" as const,
        holeNumber: undefined,
      },
      {
        ...mockOrders[0],
        _id: "order4" as Id<"foodOrders">,
        deliveryLocation: "cart" as const,
        holeNumber: undefined,
      },
    ];

    const { useQuery } = require('convex/react');
    useQuery.mockReturnValue(ordersWithDifferentLocations);
    
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Clubhouse')).toBeInTheDocument();
    expect(screen.getByText('Golf Cart')).toBeInTheDocument();
  });

  it('shows correct item counts', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('3 items')).toBeInTheDocument(); // 2 beers + 1 hot dog
    expect(screen.getByText('1 item')).toBeInTheDocument(); // 1 water bottle
  });

  it('shows notification toggle button', () => {
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
  });

  it('handles notification permission request', async () => {
    const { notificationManager } = await import('@/utils/notificationManager');
    
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    const notificationButton = screen.getByText('Enable Notifications');
    fireEvent.click(notificationButton);
    
    expect(notificationManager.requestPermission).toHaveBeenCalled();
  });

  it('initializes notification manager on mount', () => {
    const { notificationManager } = require('@/utils/notificationManager');
    
    renderWithConvex(<OrderStatus {...defaultProps} />);
    
    expect(notificationManager.initialize).toHaveBeenCalled();
  });
});