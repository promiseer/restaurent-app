'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/ToastContext'
import { auth, restaurantAPI } from '../../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  country: string
}

interface Restaurant {
  _id: string
  name: string
  description: string
  cuisine: string
  rating: number
  image: string
  address: {
    country: string
    city: string
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { success, error: showError } = useToast()

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const userData = auth.getCurrentUser()
    if (userData) {
      setUser(userData)
      fetchRestaurants()
    } else {
      router.push('/auth/login')
    }
  }, [router])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const data = await restaurantAPI.getAll()
      setRestaurants(data.restaurants || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurants')
      showError('Failed to load restaurants')
    } finally {
      setLoading(false)
    }
  }

  const handleViewMenu = (restaurantId: string) => {
    router.push(`/restaurant/${restaurantId}`)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCountryFlag = (country: string) => {
    return country === 'India' ? '🇮🇳' : '🇺🇸'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-2 text-gray-600">
            You are logged in as a <strong>{user?.role}</strong> with access to <strong>{user?.country}</strong> restaurants.
          </p>
        </div>

        {/* Role-specific Information */}
        <div className="mb-8 card">
          <h3 className="text-lg font-semibold mb-4">Your Permissions</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">View restaurants & menus</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Add items to cart</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={user?.role === 'member' ? 'text-red-500' : 'text-green-500'}>
                {user?.role === 'member' ? '✗' : '✓'}
              </span>
              <span className="text-sm">Place orders</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={user?.role === 'admin' ? 'text-green-500' : 'text-red-500'}>
                {user?.role === 'admin' ? '✓' : '✗'}
              </span>
              <span className="text-sm">Manage payments</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Restaurants Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Available Restaurants
              {user?.role === 'admin' ? ' (All Countries)' : ` in ${user?.country}`}
            </h3>
            <span className="text-sm text-gray-500">
              {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {restaurants.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div key={restaurant._id} className="card hover:shadow-lg transition-shadow">
                  <div className="aspect-w-16 aspect-h-9 mb-4">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://via.placeholder.com/400x300?text=Restaurant+Image'
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {restaurant.name}
                    </h4>
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-600 ml-1">
                        {restaurant.rating}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {restaurant.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {restaurant.cuisine}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getCountryFlag(restaurant.address.country)} {restaurant.address.city}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleViewMenu(restaurant._id)}
                      className="btn-primary text-sm"
                    >
                      View Menu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No restaurants available
              </h3>
              <p className="text-gray-600">
                {user?.role === 'admin' 
                  ? 'No restaurants have been added to the system yet.'
                  : `No restaurants are available in ${user?.country} at the moment.`
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
