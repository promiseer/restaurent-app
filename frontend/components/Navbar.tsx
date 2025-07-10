'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useCart } from './CartContext'
import { apiClient } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  country: string
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { getItemCount } = useCart()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
    
    // Listen for storage changes (when login happens in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth()
      }
    }
    
    // Listen for custom login event
    const handleLoginEvent = () => {
      checkAuth()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userLoggedIn', handleLoginEvent)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userLoggedIn', handleLoginEvent)
    }
  }, [])

  // Check auth state when route changes
  useEffect(() => {
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const userData = localStorage.getItem('user')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
  }

  const cartItemCount = getItemCount()

  return (
    <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" onClick={handleLogout} className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-orange-600">FoodieApp</span>
            </Link>
            
            {user && (
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link href="/dashboard" className="text-gray-900 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/orders" className="text-gray-900 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium">
                  Orders
                </Link>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <Link href="/admin" className="text-gray-900 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium">
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/cart" className="relative p-2 text-gray-600 hover:text-orange-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 9h9L13 13M13 13v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m6 0H7" />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
                
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center text-sm rounded-full text-gray-900 hover:text-orange-600 focus:outline-none"
                  >
                    <span className="mr-2">{user.name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{user.role}</span>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                      <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile
                      </Link>
                      <Link href="/payments" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Payment Methods
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link href="/auth/login" className="text-gray-900 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium">
                  Sign in
                </Link>
                <Link href="/auth/register" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && user && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            <Link href="/dashboard" className="text-gray-900 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium">
              Dashboard
            </Link>
            <Link href="/orders" className="text-gray-900 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium">
              Orders
            </Link>
            {(user.role === 'admin' || user.role === 'manager') && (
              <Link href="/admin" className="text-gray-900 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium">
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
