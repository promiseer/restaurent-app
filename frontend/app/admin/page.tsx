'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { userAPI, restaurantAPI, orderAPI, auth } from '../../lib/api'

interface User {
  _id: string
  name: string
  email: string
  role: string
  country: string
  createdAt: string
}

interface Restaurant {
  _id: string
  name: string
  country: string
  cuisine: string
  rating: number
  isActive: boolean
}

interface OrderStats {
  totalOrders: number
  totalRevenue: number
  todayOrders: number
  pendingOrders: number
}

interface Order {
  _id: string
  user: {
    _id: string
    name: string
    email: string
  }
  restaurant: {
    _id: string
    name: string
    address: {
      country: string
    }
  }
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  cartType: 'regular' | 'collaborative'
  createdAt: string
  notes?: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Order management states
  const [orders, setOrders] = useState<Order[]>([])
  const [orderPage, setOrderPage] = useState(1)
  const [totalOrderPages, setTotalOrderPages] = useState(1)
  const [orderFilters, setOrderFilters] = useState({
    status: '',
    restaurant: '',
    startDate: '',
    endDate: ''
  })
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusNotes, setStatusNotes] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const user = auth.getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      router.push('/dashboard')
      return
    }
    setCurrentUser(user)
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [usersRes, restaurantsRes, statsRes] = await Promise.all([
        userAPI.getAll(),
        restaurantAPI.getAll(),
        orderAPI.getStats()
      ])
      
      setUsers(usersRes.users || [])
      setRestaurants(restaurantsRes.restaurants || [])
      setOrderStats(statsRes.stats || null)
    } catch (error: any) {
      setError(error.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      await userAPI.delete(userId)
      setUsers(users.filter(user => user._id !== userId))
    } catch (error: any) {
      alert(error.message || 'Failed to delete user')
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await userAPI.update(userId, { role: newRole })
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ))
    } catch (error: any) {
      alert(error.message || 'Failed to update user role')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Manage users, restaurants, and view analytics</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {['dashboard', 'orders', 'users', 'restaurants'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">R</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Restaurants</dt>
                      <dd className="text-lg font-medium text-gray-900">{restaurants.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {orderStats && (
              <>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">O</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                          <dd className="text-lg font-medium text-gray-900">{orderStats.totalOrders}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold">$</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                          <dd className="text-lg font-medium text-gray-900">${orderStats.totalRevenue}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className="text-left p-4 border rounded-lg hover:bg-gray-50"
              >
                <h4 className="font-medium text-gray-900">Manage Users</h4>
                <p className="text-sm text-gray-500">View and manage user accounts</p>
              </button>
              <button
                onClick={() => setActiveTab('restaurants')}
                className="text-left p-4 border rounded-lg hover:bg-gray-50"
              >
                <h4 className="font-medium text-gray-900">Manage Restaurants</h4>
                <p className="text-sm text-gray-500">View and manage restaurants</p>
              </button>
              <div className="text-left p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900">View Reports</h4>
                <p className="text-sm text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={currentUser?.role !== 'admin'}
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        {currentUser?.role === 'admin' && <option value="admin">Admin</option>}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {currentUser?.role === 'admin' && user._id !== currentUser._id && (
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restaurants Tab */}
      {activeTab === 'restaurants' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Restaurant Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuisine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {restaurant.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {restaurant.cuisine}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {restaurant.rating}⭐
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        restaurant.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {restaurant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
