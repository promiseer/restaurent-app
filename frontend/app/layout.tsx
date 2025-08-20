import React from 'react'
import '../styles/globals.css'
import { CartProvider } from '../components/CartContext'
import { CollaborativeCartProvider } from '../components/CollaborativeCartContext'
import { ToastProvider } from '../components/ToastContext'
import Navbar from '../components/Navbar'

export const metadata = {
  title: 'Restaurant Ordering App',
  description: 'Order delicious food from your favorite restaurants',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <ToastProvider>
          <CartProvider>
            <CollaborativeCartProvider>
              <Navbar />
              <main className="pt-16">
                {children}
              </main>
            </CollaborativeCartProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
