import React from 'react'
import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
   
            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
                        Order Delicious Food
                        <span className="text-primary-600 block">From Your Favorite Restaurants</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Experience the best food ordering platform with role-based access control.
                        Admins, managers, and members can access different features based on their permissions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth/login" className="btn-primary text-lg px-8 py-3">
                            Get Started
                        </Link>
                        <Link href="/about" className="btn-outline text-lg px-8 py-3">
                            Learn More
                        </Link>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-20 grid md:grid-cols-3 gap-8">
                    <div className="card text-center">
                        <div className="text-primary-600 text-4xl mb-4">🍕</div>
                        <h3 className="text-xl font-semibold mb-2">Browse Restaurants</h3>
                        <p className="text-gray-600">
                            Discover amazing restaurants and explore their delicious menus
                        </p>
                    </div>
                    <div className="card text-center">
                        <div className="text-primary-600 text-4xl mb-4">🛒</div>
                        <h3 className="text-xl font-semibold mb-2">Easy Ordering</h3>
                        <p className="text-gray-600">
                            Add items to cart and place orders with our intuitive interface
                        </p>
                    </div>
                    <div className="card text-center">
                        <div className="text-primary-600 text-4xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
                        <p className="text-gray-600">
                            Different access levels for admins, managers, and members
                        </p>
                    </div>
                </div>

                {/* User Roles Section */}
                <div className="mt-20">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        User Roles & Permissions
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="card">
                            <h3 className="text-xl font-semibold text-primary-600 mb-4">Admin</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li>✓ View all restaurants & menus</li>
                                <li>✓ Create and place orders</li>
                                <li>✓ Cancel orders</li>
                                <li>✓ Update payment methods</li>
                                <li>✓ Access all countries</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-semibold text-secondary-600 mb-4">Manager</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li>✓ View restaurants & menus</li>
                                <li>✓ Create and place orders</li>
                                <li>✓ Cancel orders</li>
                                <li>✗ Update payment methods</li>
                                <li>✓ Country-specific access</li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-semibold text-gray-600 mb-4">Member</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li>✓ View restaurants & menus</li>
                                <li>✓ Add items to cart</li>
                                <li>✗ Place orders</li>
                                <li>✗ Cancel orders</li>
                                <li>✓ Country-specific access</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8 mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p>&copy; 2024 FoodOrder. All rights reserved.</p>
                    <p className="mt-2 text-gray-400">
                        Built with Next.js, Node.js, and MongoDB
                    </p>
                </div>
            </footer>
        </div>
    )
}
