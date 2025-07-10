'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../components/CartContext'
import { useToast } from '../../components/ToastContext'
import { auth } from '../../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  country: string
}

export default function CartPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart()
  const { success, error: showError, warning } = useToast()

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const userData = auth.getCurrentUser()
    if (userData) {
      setUser(userData)
    } else {
      router.push('/auth/login')
    }
  }, [router])

  const handleCheckout = async () => {
    if (!user) return

    // Check if user can place orders
    if (user.role === 'member') {
      warning('Members cannot place orders. Only Admins and Managers can checkout.')
      return
    }

    if (items.length === 0) {
      showError('Your cart is empty!')
      return
    }

    // Group items by restaurant
    const restaurantGroups = items.reduce((groups, item) => {
      if (!groups[item.restaurantId]) {
        groups[item.restaurantId] = []
      }
      groups[item.restaurantId].push(item)
      return groups
    }, {} as Record<string, typeof items>)

    // For simplicity, we'll only allow ordering from one restaurant at a time
    const restaurantIds = Object.keys(restaurantGroups)
    if (restaurantIds.length > 1) {
      warning('You can only order from one restaurant at a time. Please remove items from other restaurants.')
      return
    }

    success('Proceeding to checkout...')
    router.push('/checkout')
  }

  const handleClearCart = () => {
    if (items.length === 0) return
    
    clearCart()
    success('Cart cleared successfully')
  }

  const handleRemoveItem = (itemName: string, itemId: string) => {
    removeItem(itemId)
    success(`${itemName} removed from cart`)
  }

  const getTotalWithTax = () => {
    const subtotal = getTotal()
    const tax = subtotal * 0.18 // 18% tax
    return subtotal + tax
  }

  const getCurrency = () => {
    return user?.country === 'India' ? '₹' : '$'
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
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-primary-600">Shopping Cart</h1>
            <div></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Cart Items ({items.length})</h2>
                  <button
                    onClick={handleClearCart}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://via.placeholder.com/64x64?text=Food'
                        }}
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.restaurantName}</p>
                        <p className="text-lg font-semibold text-primary-600">
                          {getCurrency()}{item.price}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {getCurrency()}{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemoveItem(item.name, item.id)}
                          className="text-red-600 hover:text-red-800 text-sm mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="card sticky top-8">
                <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{getCurrency()}{getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%):</span>
                    <span>{getCurrency()}{(getTotal() * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>{getCurrency()}{getTotalWithTax().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Role-based checkout access */}
                {user.role === 'member' ? (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Members can add items to cart but cannot place orders. 
                      Only Admins and Managers can checkout.
                    </p>
                  </div>
                ) : null}

                <button
                  onClick={handleCheckout}
                  disabled={user.role === 'member' || loading}
                  className={`w-full ${
                    user.role === 'member' 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed py-3 px-4 rounded-lg'
                      : 'btn-primary text-lg py-3'
                  }`}
                >
                  {loading ? 'Processing...' : 'Proceed to Checkout'}
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full btn-outline mt-3"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 text-8xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary text-lg px-8 py-3"
            >
              Start Shopping
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}
