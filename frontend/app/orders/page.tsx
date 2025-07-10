'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastContext'
import { auth, orderAPI } from '../../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  country: string
}

interface Order {
  _id: string
  restaurant: {
    _id?: string
    name: string
    address: { city: string, country: string }
  }
  items: Array<{
    name: string
    price: number
    quantity: number
  }>
  status: string
  totalAmount: number
  finalAmount: number
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  estimatedDeliveryTime?: string
  actualDeliveryTime?: string
  cancellationReason?: string
}

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const router = useRouter()
  const { success, error: showError, warning } = useToast()

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const userData = auth.getCurrentUser()
    if (userData) {
      setUser(userData)
      fetchOrders()
    } else {
      router.push('/auth/login')
    }
  }, [router])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await orderAPI.getAll()
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders')
      showError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string, reason: string) => {
    if (!user) return

    if (user.role === 'member') {
      warning('Members cannot cancel orders. Only Admins and Managers can cancel orders.')
      return
    }

    try {
      await orderAPI.cancel(orderId, reason)
      await fetchOrders() // Refresh orders
      success('Order cancelled successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to cancel order')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrency = () => {
    return user?.country === 'India' ? '₹' : '$'
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter)

  const orderStatuses = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-orange-600">My Orders</h1>
            <div></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {orderStatuses.map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order._id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {order.restaurant.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Order #{order._id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      {getCurrency()}{order.finalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{getCurrency()}{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Payment Method:</span> {order.paymentMethod}
                  </div>
                  {order.estimatedDeliveryTime && (
                    <div>
                      <span className="font-medium">Est. Delivery:</span> {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
                    </div>
                  )}
                  {order.actualDeliveryTime && (
                    <div>
                      <span className="font-medium">Delivered At:</span> {new Date(order.actualDeliveryTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Cancellation Reason */}
                {order.cancellationReason && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      <strong>Cancellation Reason:</strong> {order.cancellationReason}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => router.push(`/orders/${order._id}`)}
                      className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => router.push(`/restaurant/${order.restaurant._id || order.restaurant}`)}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                      >
                        Order Again
                      </button>
                    )}
                  </div>
                  
                  {/* Cancel Order Button */}
                  {['pending', 'confirmed', 'preparing'].includes(order.status) && 
                   user?.role !== 'member' && (
                    <button
                      onClick={() => {
                        const reason = prompt('Please provide a reason for cancellation:')
                        if (reason) {
                          handleCancelOrder(order._id, reason)
                        }
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 text-8xl mb-6">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {filter === 'all' ? 'No orders found' : `No ${filter} orders`}
            </h2>
            <p className="text-gray-600 mb-8">
              {filter === 'all' 
                ? "You haven't placed any orders yet."
                : `You don't have any ${filter} orders.`
              }
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary text-lg px-8 py-3"
            >
              Start Ordering
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
