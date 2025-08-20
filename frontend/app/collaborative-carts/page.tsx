'use client';

import { useState, useEffect } from 'react';
import { useCollaborativeCart } from '../../components/CollaborativeCartContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  PlusIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  LockClosedIcon, 
  LockOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon 
} from '../../components/Icons';

export default function CollaborativeCartsPage() {
  const { carts, loading, fetchUserCarts, createCart, deleteCart, discardCart } = useCollaborativeCart();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newCartData, setNewCartData] = useState({
    name: '',
    description: '',
    country: 'India' as 'India' | 'America'
  });

  useEffect(() => {
    fetchUserCarts();
    
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleCreateCart = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCartData.name.trim()) {
      toast.error('Cart name is required');
      return;
    }

    const success = await createCart(newCartData.name, newCartData.description, newCartData.country);
    if (success) {
      setShowCreateModal(false);
      setNewCartData({ name: '', description: '', country: 'India' });
    }
  };

  const handleDeleteCart = async (e: React.MouseEvent, cartId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this cart? This action cannot be undone.')) {
      await deleteCart(cartId);
    }
  };

  const handleDiscardCart = async (e: React.MouseEvent, cartId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to discard this completed cart? This will remove it from your list.')) {
      await discardCart(cartId);
    }
  };

  const isUserManager = (cart: any) => {
    if (!user) return false;
    return cart.manager._id === user.id || cart.creator._id === user.id;
  };

  const getStatusIcon = (cart: any) => {
    if (cart.isLocked) return <LockClosedIcon className="w-5 h-5 text-yellow-500" />;
    if (cart.status === 'completed') return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (cart.status === 'cancelled') return <XCircleIcon className="w-5 h-5 text-red-500" />;
    return <ClockIcon className="w-5 h-5 text-blue-500" />;
  };

  const getStatusText = (cart: any) => {
    if (cart.isLocked) return 'Locked';
    return cart.status.charAt(0).toUpperCase() + cart.status.slice(1);
  };

  const getStatusColor = (cart: any) => {
    if (cart.isLocked) return 'bg-yellow-100 text-yellow-800';
    if (cart.status === 'completed') return 'bg-green-100 text-green-800';
    if (cart.status === 'cancelled') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading && carts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collaborative Carts</h1>
          <p className="text-gray-600 mt-2">Manage shared carts with your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create New Cart
        </button>
      </div>

      {/* Carts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carts.map((cart) => (
          <Link key={cart._id} href={`/collaborative-carts/${cart._id}`}>
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 cursor-pointer">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">{cart.name}</h3>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(cart)}
                    {isUserManager(cart) && (
                      <>
                        {cart.status === 'completed' ? (
                          <button
                            onClick={(e) => handleDiscardCart(e, cart._id)}
                            className="text-orange-500 hover:text-orange-700 p-1 rounded-md hover:bg-orange-50 transition-colors"
                            title="Discard Completed Cart"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleDeleteCart(e, cart._id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete Cart"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {cart.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{cart.description}</p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cart)}`}>
                    {getStatusText(cart)}
                  </span>
                  <span className="text-sm text-gray-500">{cart.country}</span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCartIcon className="w-4 h-4" />
                      <span>Items</span>
                    </div>
                    <span className="font-medium">
                      {cart.items.filter(item => item.status === 'approved').length} / {cart.items.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-4 h-4" />
                      <span>Members</span>
                    </div>
                    <span className="font-medium">{cart.members.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="font-semibold text-green-600">
                      ${cart.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Manager: {cart.manager.name}</span>
                    <span>{new Date(cart.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {carts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collaborative carts yet</h3>
          <p className="text-gray-600 mb-6">Create your first collaborative cart to start working with your team</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Your First Cart
          </button>
        </div>
      )}

      {/* Create Cart Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Create New Collaborative Cart</h3>
              
              <form onSubmit={handleCreateCart}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cart Name *
                    </label>
                    <input
                      type="text"
                      value={newCartData.name}
                      onChange={(e) => setNewCartData({...newCartData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter cart name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newCartData.description}
                      onChange={(e) => setNewCartData({...newCartData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      value={newCartData.country}
                      onChange={(e) => setNewCartData({...newCartData, country: e.target.value as 'India' | 'America'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="India">India</option>
                      <option value="America">America</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewCartData({ name: '', description: '', country: 'India' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Cart
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
