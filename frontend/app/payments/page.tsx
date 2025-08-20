'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastContext'
import { auth, paymentAPI, apiClient } from '../../lib/api'

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
  restaurant?: {
    name?: string
  } | null
  user?: {
    name?: string
    email?: string
  } | null
}

interface GlobalPaymentMethod {
  _id: string
  name: string
  type: 'card' | 'upi' | 'wallet' | 'bank_transfer' | 'cash'
  country: 'India' | 'America' | 'Global'
  details: {
    cardNumber?: string
    expiryDate?: string
    cvv?: string
    upiId?: string
    walletId?: string
    accountNumber?: string
    routingNumber?: string
    bankName?: string
    description?: string
  }
  isActive: boolean
  isDefault: boolean
  createdBy: {
    name: string
    email: string
  }
  createdAt: string
}

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [globalPaymentMethods, setGlobalPaymentMethods] = useState<GlobalPaymentMethod[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showGlobalForm, setShowGlobalForm] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card' as 'card' | 'upi' | 'wallet',
    details: {},
    isDefault: false
  })
  const [newGlobalPaymentMethod, setNewGlobalPaymentMethod] = useState({
    name: '',
    type: 'card' as 'card' | 'upi' | 'wallet' | 'bank_transfer' | 'cash',
    country: 'Global' as 'India' | 'America' | 'Global',
    details: {
      description: ''
    },
    isActive: true,
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

      // Fetch global payment methods if admin
      if (user?.role === 'admin') {
        await fetchGlobalPaymentMethods()
      }

      // Fetch payment history
      const historyData = await paymentAPI.getHistory()
      console.log('Payment history data:', historyData)
      console.log('Individual payments:', historyData.payments)
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

  const fetchGlobalPaymentMethods = async () => {
    try {
      const data = await apiClient.get('/payments/global')
      setGlobalPaymentMethods(data.paymentMethods || [])
    } catch (err: any) {
      console.error('Failed to fetch global payment methods:', err)
    }
  }

  const handleAddGlobalPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || user.role !== 'admin') {
      warning('Only admins can add global payment methods')
      return
    }

    try {
      await apiClient.post('/payments/global', newGlobalPaymentMethod)
      
      setShowGlobalForm(false)
      setNewGlobalPaymentMethod({
        name: '',
        type: 'card',
        country: 'Global',
        details: { description: '' },
        isActive: true,
        isDefault: false
      })
      await fetchGlobalPaymentMethods()
      success('Global payment method added successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to add global payment method')
    }
  }

  const handleDeleteGlobalPaymentMethod = async (methodId: string) => {
    if (!user || user.role !== 'admin') {
      warning('Only admins can delete global payment methods')
      return
    }

    if (!confirm('Are you sure you want to delete this global payment method?')) {
      return
    }

    try {
      await apiClient.delete(`/payments/global/${methodId}`)
      await fetchGlobalPaymentMethods()
      success('Global payment method deleted successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to delete global payment method')
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

          {/* Global Payment Methods (Admin Only) */}
          {user?.role === 'admin' && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Global Payment Methods</h2>
                <div className="flex gap-3">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Countries</option>
                    <option value="Global">Global</option>
                    <option value="India">India</option>
                    <option value="America">America</option>
                  </select>
                  <button
                    onClick={() => setShowGlobalForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Add Global Method
                  </button>
                </div>
              </div>

              {/* Add Global Payment Method Form */}
              {showGlobalForm && (
                <div className="card mb-6">
                  <h3 className="text-lg font-medium mb-4">Add Global Payment Method</h3>
                  <form onSubmit={handleAddGlobalPaymentMethod} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Method Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Credit Card"
                          value={newGlobalPaymentMethod.name}
                          onChange={(e) => setNewGlobalPaymentMethod({
                            ...newGlobalPaymentMethod,
                            name: e.target.value
                          })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <select
                          value={newGlobalPaymentMethod.country}
                          onChange={(e) => setNewGlobalPaymentMethod({
                            ...newGlobalPaymentMethod,
                            country: e.target.value as 'India' | 'America' | 'Global'
                          })}
                          className="input-field"
                        >
                          <option value="Global">Global</option>
                          <option value="India">India</option>
                          <option value="America">America</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Type
                      </label>
                      <select
                        value={newGlobalPaymentMethod.type}
                        onChange={(e) => setNewGlobalPaymentMethod({
                          ...newGlobalPaymentMethod, 
                          type: e.target.value as 'card' | 'upi' | 'wallet' | 'bank_transfer' | 'cash'
                        })}
                        className="input-field"
                      >
                        <option value="card">Credit/Debit Card</option>
                        <option value="upi">UPI</option>
                        <option value="wallet">Digital Wallet</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash on Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        placeholder="Additional details about this payment method"
                        value={newGlobalPaymentMethod.details.description}
                        onChange={(e) => setNewGlobalPaymentMethod({
                          ...newGlobalPaymentMethod,
                          details: { ...newGlobalPaymentMethod.details, description: e.target.value }
                        })}
                        className="input-field"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newGlobalPaymentMethod.isDefault}
                          onChange={(e) => setNewGlobalPaymentMethod({
                            ...newGlobalPaymentMethod,
                            isDefault: e.target.checked
                          })}
                          className="mr-2"
                        />
                        Set as default for this country
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newGlobalPaymentMethod.isActive}
                          onChange={(e) => setNewGlobalPaymentMethod({
                            ...newGlobalPaymentMethod,
                            isActive: e.target.checked
                          })}
                          className="mr-2"
                        />
                        Active
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowGlobalForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add Global Method
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Global Payment Methods List */}
              <div className="space-y-4">
                {globalPaymentMethods.filter(method => 
                  selectedCountry === 'all' || method.country === selectedCountry
                ).map((method) => (
                  <div key={method._id} className="card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg">{method.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            method.country === 'Global' ? 'bg-purple-100 text-purple-800' :
                            method.country === 'India' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {method.country}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            method.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {method.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {method.isDefault && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Type:</span> {method.type.replace('_', ' ').toUpperCase()}
                        </div>
                        {method.details.description && (
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Description:</span> {method.details.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Created by {method.createdBy.name} on {new Date(method.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGlobalPaymentMethod(method._id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                
                {globalPaymentMethods.filter(method => 
                  selectedCountry === 'all' || method.country === selectedCountry
                ).length === 0 && (
                  <div className="card text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">💳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No global payment methods</h3>
                    <p className="text-gray-600">
                      Add global payment methods that will be available to managers during checkout.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Payment History</h2>
            
            {loading ? (
              <div className="card text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading payment history...</p>
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment) => {
                  console.log('Rendering payment:', payment)
                  return (
                    <div key={payment._id} className="card">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{payment?.restaurant?.name || 'Unknown Restaurant'}</h3>
                          <p className="text-sm text-gray-600">
                            {payment?.user?.name || 'Unknown User'} ({payment?.user?.email || 'No email'})
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()} at {new Date(payment.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {getCurrency()}{(payment?.finalAmount || 0).toFixed(2)}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment?.paymentStatus || 'unknown')}`}>
                            {payment?.paymentStatus || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Payment Method:</span> {payment?.paymentMethod || 'Unknown'}
                      </div>
                    </div>
                  )
                })}
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
