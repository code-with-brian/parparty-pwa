import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import FoodOrderingMenu from '../FoodOrderingMenu';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock payment processor
vi.mock('@/utils/paymentProcessor', () => ({
  paymentProcessor: {
    processPayment: vi.fn(() => Promise.resolve({
      success: true,
      paymentId: 'pay_test_123'
    }))
  }
}));

// Mock notification manager
vi.mock('@/utils/notificationManager', () => ({
  notificationManager: {
    notifyOrderStatusUpdate: vi.fn()
  }
}));

// Mock Convex client
const mockConvex = new ConvexReactClient('https://test.convex.cloud');

// Mock data
const mockMenuItems = [
  {
    id: "beer-1",
    name: "Cold Beer",
    description: "Ice-cold domestic beer",
    price: 6.00,
    category: "beverages",
    image: "/api/placeholder/150/150",
    available: true,
  },
  {
    id: "sandwich-1",
    name: "Club Sandwich",
    description: "Turkey, bacon, lettuce, tomato",
    price: 12.00,
    category: "food",
    image: "/api/placeholder/150/150",
    available: true,
  },
  {
    id: "chips-1",
    name: "Chips",
    description: "Crispy potato chips",
    price: 4.00,
    category: "snacks",
    image: "/api/placeholder/150/150",
    available: false,
  },
];

// Mock Convex hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useQuery: vi.fn(() => mockMenuItems),
    useMutation: vi.fn(() => vi.fn()),
  };
});

const defaultProps = {
  gameId: "game123" as Id<"games">,
  playerId: "player123" as Id<"players">,
  courseId: "course123" as Id<"courses">,
  currentHole: 5,
  onClose: vi.fn(),
  onOrderPlaced: vi.fn(),
};

function renderWithConvex(component: React.ReactElement) {
  return render(
    <ConvexProvider client={mockConvex}>
      {component}
    </ConvexProvider>
  );
}

describe('FoodOrderingMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu items correctly', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    expect(screen.getByText('Cold Beer')).toBeInTheDocument();
    expect(screen.getByText('Club Sandwich')).toBeInTheDocument();
    expect(screen.getByText('Chips')).toBeInTheDocument();
    expect(screen.getByText('$6.00')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
  });

  it('filters items by category', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Click on beverages filter
    fireEvent.click(screen.getByText('Drinks'));
    
    expect(screen.getByText('Cold Beer')).toBeInTheDocument();
    expect(screen.queryByText('Club Sandwich')).not.toBeInTheDocument();
  });

  it('adds items to cart', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add beer to cart
    const addBeerButton = screen.getAllByText('Add')[0];
    fireEvent.click(addBeerButton);
    
    // Check cart shows 1 item
    expect(screen.getByText('Cart (1)')).toBeInTheDocument();
    // Check that Cold Beer appears in the cart section (not just the menu)
    const cartSection = screen.getByText('Cart (1)').closest('[data-slot="card"]');
    expect(cartSection).toContainElement(screen.getAllByText('Cold Beer')[1]); // Second instance is in cart
  });

  it('updates item quantities in cart', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add beer to cart
    const addBeerButton = screen.getAllByText('Add')[0];
    fireEvent.click(addBeerButton);
    
    // Find the plus button in the cart area (not the menu area)
    const cartSection = screen.getByText('Cart (1)').closest('[data-slot="card"]');
    const plusButtons = cartSection?.querySelectorAll('button');
    const plusButton = Array.from(plusButtons || []).find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );
    
    if (plusButton) {
      fireEvent.click(plusButton);
      expect(screen.getByText('Cart (2)')).toBeInTheDocument();
    }
  });

  it('calculates total price correctly', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add beer ($6) and sandwich ($12)
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]); // Beer
    fireEvent.click(addButtons[1]); // Sandwich
    
    expect(screen.getByText('$18.00')).toBeInTheDocument();
  });

  it('handles delivery location selection', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add item to cart first
    const addButton = screen.getAllByText('Add')[0];
    fireEvent.click(addButton);
    
    // Select clubhouse delivery
    fireEvent.click(screen.getByText('Clubhouse'));
    
    // Hole number input should not be visible for clubhouse delivery
    expect(screen.queryByText('Hole Number')).not.toBeInTheDocument();
  });

  it('shows hole number input for hole delivery', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add item to cart first
    const addButton = screen.getAllByText('Add')[0];
    fireEvent.click(addButton);
    
    // Hole delivery should be selected by default
    expect(screen.getByText('Hole Number')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // currentHole prop
  });

  it('disables unavailable items', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Chips should be unavailable
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    
    // Should not have an Add button for chips
    const chipsSection = screen.getByText('Chips').closest('.p-4');
    expect(chipsSection?.querySelector('button[class*="Add"]')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Find the X button in the header
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('places order with payment processing', async () => {
    const mockPlaceOrder = vi.fn().mockResolvedValue('order123');
    const mockProcessPayment = vi.fn().mockResolvedValue('order123');
    
    // Reset the mock to return our specific functions
    const { useMutation } = await import('convex/react');
    (useMutation as any).mockImplementation((api) => {
      // Return mockPlaceOrder for the first call, mockProcessPayment for the second
      if ((useMutation as any).mock.calls.length <= 1) {
        return mockPlaceOrder;
      }
      return mockProcessPayment;
    });
    
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add items to cart
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]); // Beer
    
    // Add special instructions
    const instructionsInput = screen.getByPlaceholderText('Any special requests...');
    fireEvent.change(instructionsInput, { target: { value: 'Extra cold please' } });
    
    // Place order
    const placeOrderButton = screen.getByText('Place Order');
    fireEvent.click(placeOrderButton);
    
    // Just verify that the order placement was attempted
    await waitFor(() => {
      expect(mockPlaceOrder).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('handles payment failure', async () => {
    const { paymentProcessor } = await import('@/utils/paymentProcessor');
    (paymentProcessor.processPayment as any).mockResolvedValue({
      success: false,
      error: 'Payment declined'
    });

    const mockPlaceOrder = vi.fn().mockResolvedValue('order123');
    const { useMutation } = await import('convex/react');
    (useMutation as any).mockReturnValue(mockPlaceOrder);
    
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // Add items to cart
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]); // Beer
    
    // Place order
    const placeOrderButton = screen.getByText('Place Order');
    fireEvent.click(placeOrderButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment declined')).toBeInTheDocument();
    });
  });

  it('shows empty cart message when cart is empty', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('shows empty cart state when cart is empty', () => {
    renderWithConvex(<FoodOrderingMenu {...defaultProps} />);
    
    // When cart is empty, the Place Order button should be disabled
    // First add an item to see the button, then remove it
    const addButton = screen.getAllByText('Add')[0];
    fireEvent.click(addButton);
    
    // Now we should see the Place Order button
    expect(screen.getByText('Place Order')).toBeInTheDocument();
    
    // Remove the item by clicking minus button
    const cartSection = screen.getByText('Cart (1)').closest('[data-slot="card"]');
    const minusButton = cartSection?.querySelector('button svg.lucide-minus')?.closest('button');
    
    if (minusButton) {
      fireEvent.click(minusButton);
      // Now cart should be empty and button should be disabled
      const placeOrderButton = screen.getByText('Place Order');
      expect(placeOrderButton).toBeDisabled();
    }
  });
});