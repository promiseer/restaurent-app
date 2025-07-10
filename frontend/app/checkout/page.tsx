'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../components/CartContext'
import { useToast } from '../../components/ToastContext'
import { auth, paymentAPI, orderAPI } from '../../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  country: string
}

interface PaymentMethod {
  _id: string
  type: 'card' | 'upi' | 'wallet'
  details: any
  isDefault: boolean
}

export default function CheckoutPage() {
  const [user, setUser] = useState<User | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  })
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const { items, clearCart, getTotal } = useCart()
  const { success, error: showError, warning } = useToast()

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const userData = auth.getCurrentUser()
    if (userData) {
      setUser(userData)
      setDeliveryAddress(prev => ({ ...prev, country: userData.country }))
      fetchPaymentMethods()
    } else {
      router.push('/auth/login')
    }
  }, [router])

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [items, router])

  const fetchPaymentMethods = async () => {
    try {
      const data = await paymentAPI.getMethods()
      setPaymentMethods(data.paymentMethods || [])
      
      // Select default payment method
      const defaultMethod = data.paymentMethods?.find((method: PaymentMethod) => method.isDefault)
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod._id)
      } else if (data.paymentMethods?.length > 0) {
        setSelectedPaymentMethod(data.paymentMethods[0]._id)
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err)
      showError('Failed to load payment methods')
    }
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    if (user.role === 'member') {
      showError('Members cannot place orders. Only Admins and Managers can place orders.')
      return
    }

    if (!selectedPaymentMethod) {
      showError('Please select a payment method')
      return
    }

    if (!deliveryAddress.street || !deliveryAddress.city || !customerPhone) {
      showError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Group items by restaurant (assuming single restaurant per order)
      const restaurantId = items[0]?.restaurantId
      
      const orderData = {
        restaurantId,
        items: items.map(item => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || '',
          price: item.price,
        })),
        totalAmount: getTotalWithTax(),
        deliveryAddress,
        customerPhone,
        paymentMethod: getPaymentMethodType(selectedPaymentMethod)
      }

      const orderResponse = await orderAPI.create(orderData)

      if (orderResponse.order) {
        // Process payment
        const paymentData = {
          orderId: orderResponse.order._id,
          paymentMethodId: selectedPaymentMethod,
          amount: orderResponse.order.finalAmount
        }

        const paymentResult = await paymentAPI.processPayment(paymentData)

        if (paymentResult.success) {
          success('Order placed successfully!')
          clearCart()
          setTimeout(() => {
            router.push('/orders')
          }, 2000)
        } else {
          showError(paymentResult.message || 'Payment failed')
        }
      } else {
        showError('Failed to place order')
      }
    } catch (err: any) {
      showError(err.message || 'An error occurred while placing the order')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethodType = (methodId: string) => {
    const method = paymentMethods.find(m => m._id === methodId)
    return method?.type || 'card'
  }

  const getCurrency = () => {
    return user?.country === 'India' ? '₹' : '$'
  }

  const getTotalWithTax = () => {
    const subtotal = getTotal()
    const tax = subtotal * 0.18
    const deliveryFee = user?.country === 'India' ? 50 : 5 // Estimated delivery fee
    return subtotal + tax + deliveryFee
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
              onClick={() => router.push('/cart')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Cart
            </button>
            <h1 className="text-2xl font-bold text-primary-600">Checkout</h1>
            <div></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    className="input-field"
                    placeholder="Enter your street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    className="input-field"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                    className="input-field"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress.zipCode}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, zipCode: e.target.value})}
                    className="input-field"
                    placeholder="ZIP Code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={user.country}
                    className="input-field bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="input-field"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={user.email}
                    className="input-field bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              {paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label key={method._id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method._id}
                        checked={selectedPaymentMethod === method._id}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">{method.type}</span>
                          {method.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {method.type === 'card' && method.details.cardNumber}
                          {method.type === 'upi' && method.details.upiId}
                          {method.type === 'wallet' && method.details.walletId}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-600">
                  <p>No payment methods available.</p>
                  <p className="text-sm mt-2">Contact admin to add payment methods.</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {getCurrency()}{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{getCurrency()}{getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%):</span>
                  <span>{getCurrency()}{(getTotal() * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{getCurrency()}{user.country === 'India' ? '50.00' : '5.00'}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>{getCurrency()}{getTotalWithTax().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || user.role === 'member' || !selectedPaymentMethod}
                className={`w-full ${
                  loading || user.role === 'member' || !selectedPaymentMethod
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed py-3 px-4 rounded-lg'
                    : 'btn-primary text-lg py-3'
                }`}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

              {user.role === 'member' && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Members cannot place orders
                </p>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
