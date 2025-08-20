'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../../components/CartContext'
import { useToast } from '../../components/ToastContext'
import { useCollaborativeCart } from '../../components/CollaborativeCartContext'
import { auth, paymentAPI, orderAPI, apiClient } from '../../lib/api'

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
  const [isCollaborativeOrder, setIsCollaborativeOrder] = useState(false)
  const [collaborativeCart, setCollaborativeCart] = useState<any>(null)
  const [loadingCollaborativeCart, setLoadingCollaborativeCart] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, clearCart, getTotal } = useCart()
  const { fetchCartDetails, activeCart } = useCollaborativeCart()
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
      fetchPaymentMethods(userData)
    } else {
      router.push('/auth/login')
    }
  }, [router])

  // Check for collaborative cart and handle items
  useEffect(() => {
    const collaborativeCartId = searchParams.get('collaborativeCart')
    console.log('URL params check:', { collaborativeCartId, searchParams: Object.fromEntries(searchParams.entries()) })

    if (collaborativeCartId) {
      console.log('Setting collaborative order mode for cart:', collaborativeCartId)
      setIsCollaborativeOrder(true)
      fetchCollaborativeCart(collaborativeCartId)
    } else if (items.length === 0) {
      console.log('No items in regular cart, redirecting to /cart')
      router.push('/cart')
    }
  }, [items, searchParams, router])

  const fetchCollaborativeCart = async (cartId: string) => {
    try {
      setLoadingCollaborativeCart(true)
      console.log('Fetching collaborative cart:', cartId)
      await fetchCartDetails(cartId)
      // activeCart will be updated via the context
    } catch (error) {
      console.error('Error fetching collaborative cart:', error)
      showError('Failed to load collaborative cart')
      router.push('/collaborative-carts')
    } finally {
      setLoadingCollaborativeCart(false)
    }
  }

  // Update collaborative cart state when activeCart changes
  useEffect(() => {
    if (isCollaborativeOrder && activeCart) {
      console.log('Setting collaborative cart:', activeCart)
      setCollaborativeCart(activeCart)
    }
  }, [activeCart, isCollaborativeOrder])

  // Debug effect to log current state
  useEffect(() => {
    console.log('Checkout state:', {
      isCollaborativeOrder,
      collaborativeCart,
      activeCart,
      regularItems: items,
      currentItems: getCurrentItems()
    })
  }, [isCollaborativeOrder, collaborativeCart, activeCart, items])

  // Helper functions to get items and totals based on cart type
  const getCurrentItems = () => {
    if (isCollaborativeOrder && collaborativeCart) {
      // Only return approved items from collaborative cart
      const approvedItems = collaborativeCart.items?.filter((item: any) => item?.status === 'approved') || []
      console.log('Collaborative cart approved items:', approvedItems)
      return approvedItems
    }
    console.log('Regular cart items:', items)
    return items || []
  }

  const getCurrentTotal = () => {
    if (isCollaborativeOrder && collaborativeCart) {
      const approvedItems = collaborativeCart.items?.filter((item: any) => item?.status === 'approved') || []
      return approvedItems.reduce((total: number, item: any) => {
        // For collaborative cart, price and quantity are direct properties
        const price = item?.price || 0
        const quantity = item?.quantity || 0
        return total + (price * quantity)
      }, 0)
    }
    return getTotal()
  }

  const fetchPaymentMethods = async (currentUser?: any) => {
    try {
      // Use passed user data or fallback to state
      const userData = currentUser || user

      // Fetch user's personal payment methods
      const userMethodsData = await paymentAPI.getMethods()
      const userMethods = userMethodsData.paymentMethods || []

      let globalMethods = []

      // If user is manager or admin, also fetch global payment methods for their country
      if (userData && (userData.role === 'manager' || userData.role === 'admin')) {
        try {
          const globalData = await apiClient.get(`/payments/global?country=${userData.country}`)
          globalMethods = (globalData.paymentMethods || []).map((method: any) => ({
            ...method,
            isGlobal: true,
            displayName: `${method.name} (${method.country})`
          }))
        } catch (err) {
          console.error('Failed to fetch global payment methods:', err)
        }
      }

      // Combine methods
      const allMethods = [...userMethods, ...globalMethods]
      setPaymentMethods(allMethods)

      // Select default payment method (prioritize user defaults, then global defaults)
      const userDefault = userMethods.find((method: PaymentMethod) => method.isDefault)
      const globalDefault = globalMethods.find((method: any) => method.isDefault)

      if (userDefault) {
        setSelectedPaymentMethod(userDefault._id)
      } else if (globalDefault) {
        setSelectedPaymentMethod(globalDefault._id)
      } else if (allMethods.length > 0) {
        setSelectedPaymentMethod(allMethods[0]._id)
      }

      console.log('Fetched payment methods:', {
        userMethods: userMethods.length,
        globalMethods: globalMethods.length,
        total: allMethods.length,
        userRole: user?.role,
        userCountry: user?.country
      })
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
      const currentItems = getCurrentItems()

      if (currentItems.length === 0) {
        showError('No items to order')
        return
      }

      // For collaborative carts, use the collaborative cart place order API
      if (isCollaborativeOrder && collaborativeCart) {
        try {
          const response = await apiClient.post(`/collaborative-carts/${collaborativeCart._id}/place-order`, {
            deliveryAddress,
            phone: customerPhone,
            paymentMethod: getPaymentMethodType(selectedPaymentMethod)
          })
          console.log('Collaborative cart order response:', response.data)

          if (response.success) {
            // Use the detailed message from backend if available
            const backendMessage = response.message;

            success(backendMessage);

            // Show additional message about navigation
            setTimeout(() => {
              success('Redirecting to Orders...');
            }, 1000);

            // Redirect to orders after successful collaborative cart order
            setTimeout(() => {
              router.push('/orders');
            }, 1500);
            return
          } else {
            throw new Error(response.data.message || 'Failed to place collaborative cart order')
          }
        } catch (error: any) {
          console.error('Error placing collaborative cart order:', error)

          showError(error.message || 'Failed to place collaborative cart order')
          router.push('/dashboard');

          return
        }
      }

      // Regular single restaurant order flow
      const restaurantId = currentItems[0]?.restaurantId

      if (!restaurantId) {
        showError('Restaurant information is missing')
        return
      }

      const orderData = {
        restaurantId,
        cartType: 'regular',
        items: currentItems.map((item: any) => ({
          menuItemId: item?.menuItemId || item?.id || '',
          name: item?.name || 'Unknown Item',
          quantity: item?.quantity || 0,
          specialInstructions: item?.specialInstructions || '',
          price: item?.price || 0,
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
          router.push('/orders')

          setTimeout(() => {
            // Navigation is already handled above
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
    const subtotal = getCurrentTotal()
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
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
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
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
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
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
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
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })}
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
                  {paymentMethods.map((method: any) => (
                    <label key={method._id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method._id}
                        checked={selectedPaymentMethod === method._id}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">
                            {method.isGlobal ? method.name : method.type.charAt(0).toUpperCase() + method.type.slice(1)}
                          </span>
                          {method.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>
                          )}
                          {method.isGlobal && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Global
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {method.isGlobal ? (
                            <>
                              {method.type.replace('_', ' ').toUpperCase()} • {method.country}
                              {method.details?.description && (
                                <div className="text-xs text-gray-500 mt-1">{method.details.description}</div>
                              )}
                            </>
                          ) : (
                            <>
                              {method.type === 'card' && method.details.cardNumber}
                              {method.type === 'upi' && method.details.upiId}
                              {method.type === 'wallet' && method.details.walletId}
                            </>
                          )}
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
              <h2 className="text-xl font-semibold mb-4">
                Order Summary
                {isCollaborativeOrder && (
                  <span className="text-sm text-blue-600 font-normal ml-2">
                    (Collaborative Cart)
                  </span>
                )}
              </h2>

              {/* Loading state for collaborative cart */}
              {isCollaborativeOrder && loadingCollaborativeCart && (
                <div className="text-center py-6">
                  <p className="text-gray-600">Loading collaborative cart...</p>
                </div>
              )}

              {/* Items */}
              {!loadingCollaborativeCart && (
                <div className="space-y-3 mb-6">
                  {getCurrentItems().length === 0 ? (
                    <div className="text-center py-6 text-gray-600">
                      <p>No {isCollaborativeOrder ? 'approved ' : ''}items in cart</p>
                    </div>
                  ) : (
                    getCurrentItems().map((item: any) => {
                      // For collaborative cart, data is stored directly on item
                      // For regular cart, data is stored on item directly too
                      const displayItem = item // Both have name, price directly
                      const itemId = item?._id || item?.id

                      // Skip if item is undefined
                      if (!item) {
                        return null
                      }

                      console.log('Rendering item:', item)

                      return (
                        <div key={itemId} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{displayItem.name || 'Unknown Item'}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity || 0}</p>
                            {isCollaborativeOrder && (
                              <p className="text-xs text-green-600">✓ Approved</p>
                            )}
                          </div>
                          <p className="font-medium">
                            {getCurrency()}{((displayItem.price || 0) * (item.quantity || 0)).toFixed(2)}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 mb-6 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{getCurrency()}{getCurrentTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%):</span>
                  <span>{getCurrency()}{(getCurrentTotal() * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>{getCurrency()}{user?.country === 'India' ? '50.00' : '5.00'}</span>
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
                className={`w-full ${loading || user.role === 'member' || !selectedPaymentMethod
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
