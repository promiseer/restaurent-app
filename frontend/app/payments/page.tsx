'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastContext'
import { auth, paymentAPI } from '../../lib/api'

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
  details: {
    cardNumber?: string
    expiryDate?: string
    cvv?: string
    upiId?: string
    walletId?: string
  }
  isDefault: boolean
}

interface PaymentHistory {
  _id: string
  finalAmount: number
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  restaurant: {
    name: string
  }
  user: {
    name: string
    email: string
  }
}

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card' as 'card' | 'upi' | 'wallet',
    details: {},
    isDefault: false
  })
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
      fetchPaymentData()
    } else {
      router.push('/auth/login')
    }
  }, [router])

  const fetchPaymentData = async () => {
    try {
      setLoading(true)
      
      // Fetch payment methods
      const methodsData = await paymentAPI.getMethods()
      setPaymentMethods(methodsData.paymentMethods || [])

      // Fetch payment history
      const historyData = await paymentAPI.getHistory()
      setPaymentHistory(historyData.payments || [])

    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment data')
      showError('Failed to load payment information')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || user.role !== 'admin') {
      warning('Only admins can add payment methods')
      return
    }

    try {
      await paymentAPI.addMethod(newPaymentMethod)
      setShowAddForm(false)
      setNewPaymentMethod({
        type: 'card',
        details: {},
        isDefault: false
      })
      await fetchPaymentData()
      success('Payment method added successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to add payment method')
    }
  }

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!user || user.role !== 'admin') {
      warning('Only admins can delete payment methods')
      return
    }

    if (!confirm('Are you sure you want to delete this payment method?')) {
      return
    }

    try {
      await paymentAPI.deleteMethod(methodId)
      await fetchPaymentData()
      success('Payment method deleted successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to delete payment method')
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCurrency = () => {
    return user?.country === 'India' ? '₹' : '$'
  }

  const renderPaymentMethodDetails = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `**** **** **** ${method.details.cardNumber?.slice(-4) || '****'}`
      case 'upi':
        return method.details.upiId
      case 'wallet':
        return method.details.walletId
      default:
        return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment information...</p>
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
            <h1 className="text-2xl font-bold text-primary-600">Payment Management</h1>
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

        {/* Access Control Notice */}
        {user?.role !== 'admin' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="text-sm">
              <strong>Note:</strong> Only admins can add, edit, or delete payment methods. 
              You can view your payment methods and history below.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Methods */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Payment Methods</h2>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary"
                >
                  Add New Method
                </button>
              )}
            </div>

            {/* Add Payment Method Form */}
            {showAddForm && user?.role === 'admin' && (
              <div className="card mb-6">
                <h3 className="text-lg font-medium mb-4">Add Payment Method</h3>
                <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
                    <select
                      value={newPaymentMethod.type}
                      onChange={(e) => setNewPaymentMethod({
                        ...newPaymentMethod, 
                        type: e.target.value as 'card' | 'upi' | 'wallet',
                        details: {}
                      })}
                      className="input-field"
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="upi">UPI</option>
                      <option value="wallet">Digital Wallet</option>
                    </select>
                  </div>

                  {newPaymentMethod.type === 'card' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="**** **** **** 1234"
                          onChange={(e) => setNewPaymentMethod({
                            ...newPaymentMethod,
                            details: { ...newPaymentMethod.details, cardNumber: e.target.value }
                          })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            onChange={(e) => setNewPaymentMethod({
                              ...newPaymentMethod,
                              details: { ...newPaymentMethod.details, expiryDate: e.target.value }
                            })}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            onChange={(e) => setNewPaymentMethod({
                              ...newPaymentMethod,
                              details: { ...newPaymentMethod.details, cvv: e.target.value }
                            })}
                            className="input-field"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {newPaymentMethod.type === 'upi' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        placeholder="user@paytm"
                        onChange={(e) => setNewPaymentMethod({
                          ...newPaymentMethod,
                          details: { ...newPaymentMethod.details, upiId: e.target.value }
                        })}
                        className="input-field"
                        required
                      />
                    </div>
                  )}

                  {newPaymentMethod.type === 'wallet' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wallet ID
                      </label>
                      <input
                        type="text"
                        placeholder="wallet@example.com"
                        onChange={(e) => setNewPaymentMethod({
                          ...newPaymentMethod,
                          details: { ...newPaymentMethod.details, walletId: e.target.value }
                        })}
                        className="input-field"
                        required
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newPaymentMethod.isDefault}
                      onChange={(e) => setNewPaymentMethod({
                        ...newPaymentMethod,
                        isDefault: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="isDefault" className="text-sm text-gray-700">
                      Set as default payment method
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button type="submit" className="btn-primary">
                      Add Payment Method
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Payment Methods List */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method._id} className="card">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium capitalize">{method.type}</h3>
                          {method.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{renderPaymentMethodDetails(method)}</p>
                      </div>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeletePaymentMethod(method._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">💳</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
                <p className="text-gray-600">
                  {user?.role === 'admin' 
                    ? 'Add a payment method to get started.'
                    : 'Contact admin to add payment methods.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Payment History</h2>
            
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div key={payment._id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{payment.restaurant.name}</h3>
                        <p className="text-sm text-gray-600">
                          {payment.user.name} ({payment.user.email})
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()} at {new Date(payment.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          {getCurrency()}{payment.finalAmount.toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.paymentStatus)}`}>
                          {payment.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Payment Method:</span> {payment.paymentMethod}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
                <p className="text-gray-600">
                  Payment history will appear here after completing orders.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
