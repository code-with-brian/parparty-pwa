import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { paymentProcessor } from '@/utils/paymentProcessor';
import { notificationManager } from '@/utils/notificationManager';
import { PaymentForm } from './PaymentForm';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  MapPin, 
  Clock, 
  CreditCard,
  X,
  Utensils,
  Coffee,
  Cookie,
  AlertCircle
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface FoodOrderingMenuProps {
  gameId: Id<"games">;
  playerId: Id<"players">;
  courseId: Id<"courses">;
  currentHole?: number;
  onClose: () => void;
  onOrderPlaced?: () => void;
}

export default function FoodOrderingMenu({
  gameId,
  playerId,
  courseId,
  currentHole,
  onClose,
  onOrderPlaced
}: FoodOrderingMenuProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<"hole" | "clubhouse" | "cart">("hole");
  const [holeNumber, setHoleNumber] = useState(currentHole || 1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<Id<"foodOrders"> | null>(null);

  // Get menu items
  const menuItems = useQuery(api.foodOrders.getMenuItems, { courseId });

  // Mutations
  const placeOrder = useMutation(api.foodOrders.placeOrder);
  const processPayment = useMutation(api.foodOrders.processPayment);

  const categories = [
    { id: "all", name: "All", icon: Utensils },
    { id: "beverages", name: "Drinks", icon: Coffee },
    { id: "food", name: "Food", icon: Utensils },
    { id: "snacks", name: "Snacks", icon: Cookie },
  ];

  const filteredItems = menuItems?.filter(item => 
    selectedCategory === "all" || item.category === selectedCategory
  ) || [];

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prev.filter(cartItem => cartItem.id !== itemId);
    });
  };

  const getCartItemQuantity = (itemId: string) => {
    return cart.find(item => item.id === itemId)?.quantity || 0;
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    setIsPlacingOrder(true);
    setPaymentError(null);

    try {
      const orderItems = cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        description: item.description,
      }));

      // First, create the order
      const orderId = await placeOrder({
        playerId,
        gameId,
        courseId,
        items: orderItems,
        deliveryLocation,
        holeNumber: deliveryLocation === "hole" ? holeNumber : undefined,
        specialInstructions: specialInstructions || undefined,
      });

      // Store the order ID and show payment modal
      setPendingOrderId(orderId);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Failed to place order:', error);
      setPaymentError('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!pendingOrderId) return;

    try {
      // Update order with payment information
      await processPayment({
        orderId: pendingOrderId,
        paymentId: paymentId,
      });

      // Show success notification
      const orderItems = cart.map(item => `${item.quantity}x ${item.name}`);
      await notificationManager.notifyOrderStatusUpdate(
        'confirmed',
        orderItems,
        deliveryLocation === "hole" && holeNumber 
          ? `Hole ${holeNumber}` 
          : deliveryLocation === "clubhouse" 
          ? "Clubhouse" 
          : "Golf Cart"
      );

      // Clear cart and close
      setCart([]);
      setShowPaymentModal(false);
      setPendingOrderId(null);
      onOrderPlaced?.();
      onClose();
    } catch (error) {
      console.error('Failed to process payment:', error);
      setPaymentError('Failed to process payment. Please try again.');
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentError(error);
    setShowPaymentModal(false);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPendingOrderId(null);
  };

  if (!menuItems) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div>Loading menu...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5" />
            F&B Menu
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-6">
        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 ${
                  selectedCategory === category.id ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </Button>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className={`${!item.available ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {item.available && (
                          <div className="flex items-center gap-2 mt-3">
                            {getCartItemQuantity(item.id) > 0 ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-8 h-8 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {getCartItemQuantity(item.id)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(item)}
                                  className="w-8 h-8 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => addToCart(item)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {!item.available && (
                          <Badge variant="destructive" className="mt-2">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({getTotalItems()})
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-4">
                {cart.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Your cart is empty</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto mb-4">
                      <div className="space-y-3">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-600">
                                ${item.price.toFixed(2)} × {item.quantity}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                                className="w-6 h-6 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addToCart(item)}
                                className="w-6 h-6 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Options */}
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Delivery Location</label>
                        <div className="space-y-2">
                          {[
                            { value: "hole", label: "Current Hole", icon: MapPin },
                            { value: "clubhouse", label: "Clubhouse", icon: Clock },
                            { value: "cart", label: "Golf Cart", icon: ShoppingCart },
                          ].map(option => (
                            <Button
                              key={option.value}
                              variant={deliveryLocation === option.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setDeliveryLocation(option.value as any)}
                              className={`w-full justify-start ${
                                deliveryLocation === option.value ? 'bg-green-600 hover:bg-green-700' : ''
                              }`}
                            >
                              <option.icon className="w-4 h-4 mr-2" />
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {deliveryLocation === "hole" && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Hole Number</label>
                          <Input
                            type="number"
                            min="1"
                            max="18"
                            value={holeNumber}
                            onChange={(e) => setHoleNumber(parseInt(e.target.value) || 1)}
                            className="w-full"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Special Instructions</label>
                        <Input
                          placeholder="Any special requests..."
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Total and Checkout */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold text-green-600">
                          ${getTotalPrice().toFixed(2)}
                        </span>
                      </div>

                      {/* Payment Error */}
                      {paymentError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{paymentError}</span>
                          </div>
                        </div>
                      )}
                      
                      <Button
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder || cart.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isPlacingOrder ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Placing Order...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Place Order
                          </div>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>

      {/* Payment Modal */}
      {showPaymentModal && pendingOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <PaymentForm
              orderId={pendingOrderId}
              amount={Math.round(getTotalPrice() * 100)} // Convert to cents
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </Card>
  );
}