'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../../components/CartContext'
import { useToast } from '../../../components/ToastContext'
import { restaurantAPI, auth } from '../../../lib/api'

interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  isVegetarian: boolean
  spiceLevel: string
  preparationTime: number
  isAvailable: boolean
}

interface Restaurant {
  _id: string
  name: string
  description: string
  cuisine: string
  rating: number
  image: string
  address: {
    street: string
    city: string
    state: string
    country: string
  }
  phone: string
  operatingHours: any
  deliveryFee: number
  minimumOrder: number
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { addItem, getItemCount } = useCart()
  const { success, error: showError } = useToast()

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    const user = auth.getCurrentUser()
    if (user) {
      setUser(user)
      fetchRestaurantData()
    } else {
      router.push('/auth/login')
    }
  }, [params.id, router])

  const fetchRestaurantData = async () => {
    try {
      setLoading(true)
      
      // Fetch restaurant details
      const restaurantData = await restaurantAPI.getById(params.id)
      setRestaurant(restaurantData.restaurant)
      
      // Fetch menu
      const menuData = await restaurantAPI.getMenu(params.id)
      setMenu(menuData.menu || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch restaurant data')
      showError('Failed to load restaurant data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item: MenuItem) => {
    if (!restaurant) return

    try {
      addItem({
        id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name
      })

      success(`${item.name} added to cart!`)
    } catch (err: any) {
      showError('Failed to add item to cart')
    }
  }

  const getSpiceLevelIcon = (level: string) => {
    switch (level) {
      case 'mild': return '🌶️'
      case 'medium': return '🌶️🌶️'
      case 'hot': return '🌶️🌶️🌶️'
      case 'very_hot': return '🌶️🌶️🌶️🌶️'
      default: return ''
    }
  }

  const getCountryFlag = (country: string) => {
    return country === 'India' ? '🇮🇳' : '🇺🇸'
  }

  const categories = ['all', ...Array.from(new Set(menu.map(item => item.category)))]
  const filteredMenu = selectedCategory === 'all' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Restaurant not found'}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  onClick={() => router.push('/cart')}
                  className="btn-outline relative"
                >
                  🛒 Cart
                  {getItemCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getItemCount()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Restaurant Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://via.placeholder.com/400x300?text=Restaurant+Image'
                }}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                <div className="flex items-center">
                  <span className="text-yellow-400 text-xl">★</span>
                  <span className="text-lg text-gray-600 ml-1">{restaurant.rating}</span>
                </div>
              </div>
              <p className="text-gray-600 text-lg mb-4">{restaurant.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cuisine:</span> {restaurant.cuisine}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {getCountryFlag(restaurant.address.country)} {restaurant.address.city}
                </div>
                <div>
                  <span className="font-medium">Delivery Fee:</span> {restaurant.address.country === 'India' ? '₹' : '$'}{restaurant.deliveryFee}
                </div>
                <div>
                  <span className="font-medium">Minimum Order:</span> {restaurant.address.country === 'India' ? '₹' : '$'}{restaurant.minimumOrder}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Menu</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category === 'all' ? 'All Items' : category.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        {filteredMenu.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenu.map((item) => (
              <div key={item._id} className="card hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://via.placeholder.com/300x200?text=Food+Image'
                    }}
                  />
                  {item.isVegetarian && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      🌱 Veg
                    </span>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <span className="text-white font-medium">Not Available</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-lg font-bold text-primary-600">
                    {restaurant.address.country === 'India' ? '₹' : '$'}{item.price}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {item.category.replace('_', ' ')}
                    </span>
                    {item.spiceLevel !== 'mild' && (
                      <span className="text-xs" title={`Spice level: ${item.spiceLevel}`}>
                        {getSpiceLevelIcon(item.spiceLevel)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    🕒 {item.preparationTime} min
                  </span>
                </div>
                
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={!item.isAvailable}
                  className={`w-full ${
                    item.isAvailable 
                      ? 'btn-primary' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed py-2 px-4 rounded-lg'
                  }`}
                >
                  {item.isAvailable ? 'Add to Cart' : 'Not Available'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🍽️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'This restaurant has no available menu items.'
                : `No items found in ${selectedCategory.replace('_', ' ')} category.`
              }
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
