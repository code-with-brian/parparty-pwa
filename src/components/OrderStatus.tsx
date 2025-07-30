import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  MapPin,
  Package,
  ChefHat
} from 'lucide-react';

interface OrderStatusProps {
  playerId: Id<"players">;
  gameId?: Id<"games">;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Order Received",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Your order has been received and is being processed"
  },
  confirmed: {
    icon: CheckCircle,
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Payment confirmed, order is being prepared"
  },
  preparing: {
    icon: ChefHat,
    label: "Preparing",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Your order is being prepared by the kitchen"
  },
  ready: {
    icon: Package,
    label: "Ready",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Your order is ready for pickup/delivery"
  },
  delivered: {
    icon: Truck,
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Your order has been delivered"
  }
};

export default function OrderStatus({ playerId, gameId, className = "" }: OrderStatusProps) {
  // Get player orders
  const playerOrders = useQuery(api.foodOrders.getPlayerOrders, { playerId });

  // Get game orders if gameId is provided
  const gameOrders = useQuery(
    gameId ? api.foodOrders.getGameOrders : "skip",
    gameId ? { gameId } : "skip"
  );

  const orders = playerOrders || [];
  const activeOrders = orders.filter(order => 
    order.status !== "delivered" && order.status !== "cancelled"
  );
  const recentOrders = orders.slice(0, 5);

  if (!orders || orders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Place your first F&B order to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Active Orders ({activeOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeOrders.map(order => {
              const statusInfo = statusConfig[order.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={order._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium">
                          Order #{order._id.slice(-6)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {order.deliveryLocation === "hole" && order.holeNumber
                          ? `Hole ${order.holeNumber}`
                          : order.deliveryLocation === "clubhouse"
                          ? "Clubhouse"
                          : "Golf Cart"
                        }
                      </span>
                    </div>
                    <div className="font-bold">
                      Total: ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {order.specialInstructions && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Special Instructions:</strong> {order.specialInstructions}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    {statusInfo.description}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent Orders History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map(order => {
              const statusInfo = statusConfig[order.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </Badge>
                    <div className="text-sm font-medium mt-1">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Game Orders Summary (if gameId provided) */}
      {gameId && gameOrders && gameOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Game Orders ({gameOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameOrders.slice(0, 3).map(order => (
                <div key={order._id} className="flex items-center justify-between text-sm">
                  <span>{order.playerName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {statusConfig[order.status].label}
                    </Badge>
                    <span>${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {gameOrders.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{gameOrders.length - 3} more orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}