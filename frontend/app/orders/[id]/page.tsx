'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orderAPI, auth } from '../../../lib/api';
import { toast } from 'react-hot-toast';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface Order {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  restaurant: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
    };
    phone?: string;
  };
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryFee: number;
  tax: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  customerPhone: string;
  cartType: 'regular' | 'collaborative';
  collaborativeCartId?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  cancellationReason?: string;
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdate: (orderId: string, status: string, notes?: string) => Promise<void>;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ isOpen, onClose, order, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setNotes('');
    }
  }, [order]);

  const getNextStatuses = (currentStatus: string) => {
    const statusFlow = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || [];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'ready': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || selectedStatus === order.status) return;

    setLoading(true);
    try {
      await onUpdate(order._id, selectedStatus, notes || undefined);
      onClose();
      toast.success('Order status updated successfully!');
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const nextStatuses = getNextStatuses(order.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Update Order Status</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Order #{order._id.slice(-8)}</p>
            <p className="text-sm text-gray-600 mb-2">Customer: {order.user.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Current Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              {nextStatuses.length > 0 ? (
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={order.status}>Keep Current Status</option>
                  {nextStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  No status updates available. This order is in final status.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about this status update..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              {nextStatuses.length > 0 && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading || selectedStatus === order.status}
                >
                  {loading ? 'Updating...' : 'Update Status'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (!auth.isAuthenticated()) {
        router.push('/auth/login');
        return;
      }

      const userData = auth.getCurrentUser();
      if (!userData) {
        router.push('/auth/login');
        return;
      }

      setUser(userData);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user && params.id) {
      fetchOrder();
    }
  }, [user, params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getById(params.id);
      setOrder(response.order);
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to fetch order details');
      if (error.response?.status === 404) {
        router.push('/orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string, notes?: string) => {
    try {
      await orderAPI.updateStatus(orderId, status, notes);
      await fetchOrder(); // Refresh order data
    } catch (error) {
      throw error; // Re-throw to be handled by modal
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-purple-100 text-purple-800',
      'ready': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const canUpdateStatus = () => {
    return user && (user.role === 'admin' || user.role === 'manager');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number, country: string = 'India') => {
    const symbol = country === 'India' ? '₹' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                Order Details
              </h1>
              <p className="text-gray-600">Order #{order._id.slice(-8)}</p>
            </div>
            {canUpdateStatus() && (
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Status
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Order Information */}
          <div className="lg:col-span-2">
            {/* Status and Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Order Status</h2>
              <div className="flex items-center gap-4 mb-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <div className="text-sm text-gray-600">
                  <p>Ordered: {formatDateTime(order.createdAt)}</p>
                  {order.actualDeliveryTime && (
                    <p>Delivered: {formatDateTime(order.actualDeliveryTime)}</p>
                  )}
                </div>
              </div>
              
              {order.cartType === 'collaborative' && (
                <div className="bg-blue-50 p-3 rounded-md mb-4">
                  <p className="text-blue-800 text-sm font-medium">
                    🤝 Collaborative Cart Order
                  </p>
                  <p className="text-blue-600 text-sm">
                    This order was placed from a team collaborative cart
                  </p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      {item.specialInstructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Quantity: {item.quantity}</span>
                        <span>Price: {formatCurrency(item.price, order.deliveryAddress.country)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">
                        {formatCurrency(item.price * item.quantity, order.deliveryAddress.country)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order Total */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.totalAmount, order.deliveryAddress.country)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee:</span>
                    <span>{formatCurrency(order.deliveryFee, order.deliveryAddress.country)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(order.tax, order.deliveryAddress.country)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(order.finalAmount, order.deliveryAddress.country)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Notes</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{order.notes}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Customer</h2>
              <div className="space-y-2">
                <p className="font-medium">{order.user.name}</p>
                <p className="text-gray-600">{order.user.email}</p>
                <p className="text-gray-600">{order.customerPhone}</p>
              </div>
            </div>

            {/* Restaurant Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Restaurant</h2>
              <div className="space-y-2">
                <p className="font-medium">{order.restaurant.name}</p>
                <div className="text-sm text-gray-600">
                  <p>{order.restaurant.address.street}</p>
                  <p>{order.restaurant.address.city}, {order.restaurant.address.state}</p>
                  <p>{order.restaurant.address.country}</p>
                </div>
                {order.restaurant.phone && (
                  <p className="text-gray-600">{order.restaurant.phone}</p>
                )}
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
                <p>{order.deliveryAddress.zipCode}</p>
                <p>{order.deliveryAddress.country}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Payment</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        order={order}
        onUpdate={handleStatusUpdate}
      />
    </div>
  );
}
