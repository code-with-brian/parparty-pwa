import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Clock,
  MapPin,
  CheckCircle,
  CreditCard,
  Utensils,
  Coffee,
  Beer,
  Sandwich,
  X,
  Star
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'food' | 'drinks' | 'snacks';
  image?: string;
  popular?: boolean;
  prepTime: number; // minutes
  available: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  orderTime: Date;
  deliveryLocation: string;
  estimatedTime: number;
}

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Club Sandwich',
    description: 'Triple-decker with turkey, bacon, lettuce, tomato',
    price: 14.99,
    category: 'food',
    popular: true,
    prepTime: 12,
    available: true
  },
  {
    id: '2',
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, house dressing',
    price: 11.99,
    category: 'food',
    prepTime: 8,
    available: true
  },
  {
    id: '3',
    name: 'Craft Beer',
    description: 'Local IPA on tap, perfectly chilled',
    price: 7.99,
    category: 'drinks',
    popular: true,
    prepTime: 2,
    available: true
  },
  {
    id: '4',
    name: 'Fresh Lemonade',
    description: 'House-made with mint, served ice cold',
    price: 4.99,
    category: 'drinks',
    prepTime: 3,
    available: true
  },
  {
    id: '5',
    name: 'Trail Mix',
    description: 'Mixed nuts, dried fruit, dark chocolate',
    price: 6.99,
    category: 'snacks',
    prepTime: 1,
    available: true
  },
  {
    id: '6',
    name: 'Energy Bar',
    description: 'Protein-packed granola bar with berries',
    price: 3.99,
    category: 'snacks',
    prepTime: 1,
    available: true
  },
  {
    id: '7',
    name: 'Grilled Chicken Wrap',
    description: 'Seasoned chicken, fresh vegetables, chipotle sauce',
    price: 12.99,
    category: 'food',
    prepTime: 10,
    available: true
  },
  {
    id: '8',
    name: 'Iced Coffee',
    description: 'Cold brew with cream and sugar on the side',
    price: 5.99,
    category: 'drinks',
    prepTime: 2,
    available: true
  }
];

const deliveryLocations = [
  { id: 'tee-1', name: 'Tee Box 1', distance: '5 min' },
  { id: 'tee-9', name: 'Tee Box 9', distance: '8 min' },
  { id: 'tee-10', name: 'Tee Box 10', distance: '12 min' },
  { id: 'tee-18', name: 'Tee Box 18', distance: '15 min' },
  { id: 'clubhouse', name: 'Clubhouse Pickup', distance: '0 min' }
];

export function FoodBeverageScreen() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'food' | 'drinks' | 'snacks'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(deliveryLocations[0]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);

  const categories = [
    { id: 'all', label: 'All', icon: Utensils },
    { id: 'food', label: 'Food', icon: Sandwich },
    { id: 'drinks', label: 'Drinks', icon: Coffee },
    { id: 'snacks', label: 'Snacks', icon: Beer }
  ];

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      } else {
        return prevCart.filter(cartItem => cartItem.id !== itemId);
      }
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getEstimatedPrepTime = () => {
    return Math.max(...cart.map(item => item.prepTime));
  };

  const placeOrder = () => {
    const order: Order = {
      id: Date.now().toString(),
      items: cart,
      total: getCartTotal(),
      status: 'pending',
      orderTime: new Date(),
      deliveryLocation: selectedLocation.name,
      estimatedTime: getEstimatedPrepTime() + parseInt(selectedLocation.distance)
    };

    // In a real app, this would be sent to your backend
    console.log('Order placed:', order);
    
    setOrderPlaced(true);
    setCart([]);
    setShowCheckout(false);

    // Auto-close success message after 3 seconds
    setTimeout(() => {
      setOrderPlaced(false);
    }, 3000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return Sandwich;
      case 'drinks': return Coffee;
      case 'snacks': return Beer;
      default: return Utensils;
    }
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
              <h1 className="text-2xl font-bold text-white">Food & Beverage</h1>
              <p className="text-slate-400 text-sm">Order delivered to your location</p>
            </div>
            
            {/* Cart button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCart(true)}
              className="relative p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-lg"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {getCartItemCount() > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  {getCartItemCount()}
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>

        {/* Category filters */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(category.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{category.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Menu items */}
        <div className="px-6 space-y-4">
          {filteredItems.map((item, index) => {
            const cartItem = cart.find(cartItem => cartItem.id === item.id);
            const Icon = getCategoryIcon(item.category);
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Item icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold">{item.name}</h3>
                            {item.popular && (
                              <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                                <Star className="w-3 h-3 text-yellow-400" />
                                <span className="text-yellow-400 text-xs font-medium">Popular</span>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{item.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-cyan-400 font-bold">${item.price}</span>
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{item.prepTime} min</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add to cart controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {!item.available && (
                            <span className="text-red-400 text-sm font-medium">Out of stock</span>
                          )}
                        </div>

                        {cartItem ? (
                          <div className="flex items-center gap-3 bg-white/5 rounded-full p-1">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </motion.button>
                            <span className="text-white font-medium w-8 text-center">{cartItem.quantity}</span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => addToCart(item)}
                              className="w-8 h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => addToCart(item)}
                            disabled={!item.available}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add to Cart
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Cart Modal */}
        <AnimatePresence>
          {showCart && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-end justify-center"
              onClick={() => setShowCart(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Your Order</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    {/* Cart items */}
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{item.name}</h4>
                            <p className="text-slate-400 text-sm">${item.price} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromCart(item.id)}
                              className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </motion.button>
                            <span className="text-white font-medium w-6 text-center">{item.quantity}</span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </motion.button>
                          </div>
                          <div className="text-cyan-400 font-bold ml-4">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order summary */}
                    <div className="border-t border-white/10 pt-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Subtotal</span>
                        <span className="text-white">${getCartTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Delivery</span>
                        <span className="text-green-400">Free</span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span className="text-white">Total</span>
                        <span className="text-cyan-400">${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Checkout button */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowCart(false);
                        setShowCheckout(true);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium"
                    >
                      Proceed to Checkout
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkout Modal */}
        <AnimatePresence>
          {showCheckout && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-slate-900 rounded-3xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6">Checkout</h2>

                {/* Delivery location */}
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-3">Delivery Location</label>
                  <div className="space-y-2">
                    {deliveryLocations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => setSelectedLocation(location)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          selectedLocation.id === location.id
                            ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{location.name}</span>
                        </div>
                        <span className="text-sm">{location.distance}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special instructions */}
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">Special Instructions</label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Any special requests..."
                    className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-400 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Estimated time */}
                <div className="mb-6 p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Estimated Delivery</span>
                  </div>
                  <p className="text-white text-sm">
                    {getEstimatedPrepTime() + parseInt(selectedLocation.distance)} minutes to {selectedLocation.name}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  >
                    Back
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={placeOrder}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium"
                  >
                    <CreditCard className="w-4 h-4" />
                    Place Order
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order success */}
        <AnimatePresence>
          {orderPlaced && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-6"
            >
              <div className="bg-slate-900 rounded-3xl p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">Order Placed!</h2>
                <p className="text-slate-400 mb-4">Your food will be delivered soon</p>
                <div className="text-cyan-400 font-medium">Order #12345</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}