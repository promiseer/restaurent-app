'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useCollaborativeCart } from '../../../components/CollaborativeCartContext';
import { auth } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PlusIcon,
  UsersIcon,
  LockClosedIcon,
  LockOpenIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '../../../components/Icons';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  restaurantId: string;
  restaurantName?: string;
}

interface User {
  _id: string
  name: string
  email: string
  role: string
}


export default function CollaborativeCartDetailPage() {
  const params = useParams();
  const cartId = params.id as string;
  const { 
    activeCart, 
    loading, 
    fetchCartDetails, 
    addItemToCart,
    updateItemStatus,
    removeItemFromCart,
    voteOnItem,
    addNoteToItem,
    addMemberToCart,
    toggleCartLock,
    updateCartSettings
  } = useCollaborativeCart();
  const [user, setUser] = useState<User | null>(null)

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [settings, setSettings] = useState({
    requireApproval: true,
    allowMemberRemoval: false,
    requireVoting: false,
    minimumVotes: 1
  });

    const router = useRouter()
  

    useEffect(() => {
      if (!auth.isAuthenticated()) {
        router.push('/auth/login')
        return
      }
  
      const userData = auth.getCurrentUser()
      console.log("userData", userData)
      if (userData) {
        setUser(userData)
      } else {
        router.push('/auth/login')
      }
    }, [router])


  useEffect(() => {
    if (cartId) {
      fetchCartDetails(cartId);
    }
  }, [cartId]);

  useEffect(() => {
    if (activeCart?.settings) {
      setSettings(activeCart.settings);
    }
  }, [activeCart]);

  const isManager = () => {
    return user && activeCart && (
      activeCart.manager._id === user._id ||
      activeCart.members.some(member => 
        member.user._id === user._id && member.role === 'manager'
      )
    );
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    const success = await addMemberToCart(cartId, newMemberEmail, 'member');
    if (success) {
      setShowAddMemberModal(false);
      setNewMemberEmail('');
      fetchCartDetails(cartId);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateCartSettings(cartId, settings);
    if (success) {
      setShowSettingsModal(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const success = await addNoteToItem(cartId, itemId, newNote);
    if (success) {
      setShowNoteModal(null);
      setNewNote('');
      fetchCartDetails(cartId);
    }
  };

  const handlePlaceOrder = async () => {
    // Redirect to checkout with collaborative cart information
    router.push(`/checkout?collaborativeCart=${cartId}`);
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading || !activeCart) {
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/collaborative-carts" className="text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{activeCart.name}</h1>
              {activeCart.isLocked ? (
                <LockClosedIcon className="w-6 h-6 text-yellow-500" />
              ) : (
                <LockOpenIcon className="w-6 h-6 text-green-500" />
              )}
            </div>
            {activeCart.description && (
              <p className="text-gray-600 mt-1">{activeCart.description}</p>
            )}
          </div>
        </div>

        {user?.role === 'manager' && (
          <div className="flex gap-2">
            {!activeCart.isLocked && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <UsersIcon className="w-4 h-4" />
                Add Member
              </button>
            )}
            <button
              onClick={() => toggleCartLock(cartId)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeCart.isLocked 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {activeCart.isLocked ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
              {activeCart.isLocked ? 'Unlock' : 'Lock'}
            </button>
            {!activeCart.isLocked && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <CogIcon className="w-4 h-4" />
                Settings
              </button>
            )}
            {activeCart.isLocked && 
             activeCart.status !== 'completed' && 
             activeCart.items.filter((item: any) => item.status === 'approved').length > 0 && (
              <button
                onClick={handlePlaceOrder}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Place Order
              </button>
            )}
            {activeCart.status === 'completed' && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                Order Placed
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cart Items */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Cart Items ({activeCart.items.length})</h2>
                {!activeCart.isLocked && (
                  <Link 
                    href="/restaurants"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Items
                  </Link>
                )}
              </div>

              <div className="space-y-4">
                {activeCart.items.map((item: any) => (
                  <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-gray-600">{item.restaurantName}</p>
                            <p className="text-green-600 font-medium">${item.price.toFixed(2)} × {item.quantity}</p>
                            {item.specialInstructions && (
                              <p className="text-sm text-gray-500 mt-1">Note: {item.specialInstructions}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getItemStatusIcon(item.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-sm text-gray-600">
                            Added by: {item.addedBy.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Item Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Manager Actions */}
                      {user?.role === 'manager' && item.status === 'suggested' && (
                        <>
                          <button
                            onClick={() => updateItemStatus(cartId, item._id, 'approved')}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateItemStatus(cartId, item._id, 'rejected')}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}

                      {/* Voting */}
                      {activeCart.settings.requireVoting && (
                        <>
                          <button
                            onClick={() => voteOnItem(cartId, item._id, 'approve')}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <HandThumbUpIcon className="w-4 h-4" />
                            Vote Approve ({item.votes?.filter((v: any) => v.type === 'approve').length || 0})
                          </button>
                          <button
                            onClick={() => voteOnItem(cartId, item._id, 'reject')}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <HandThumbDownIcon className="w-4 h-4" />
                            Vote Reject ({item.votes?.filter((v: any) => v.type === 'reject').length || 0})
                          </button>
                        </>
                      )}

                      {/* Notes */}
                      <button
                        onClick={() => setShowNoteModal(item._id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        <ChatBubbleLeftIcon className="w-4 h-4" />
                        Add Note ({item.notes?.length || 0})
                      </button>

                      {/* Remove Item */}
                      {(user?.role === 'manager' || (item.addedBy._id === user?._id && activeCart.settings.allowMemberRemoval)) && (
                        <button
                          onClick={() => removeItemFromCart(cartId, item._id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Notes Display */}
                    {item.notes && item.notes.length > 0 && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">Notes:</h4>
                        <div className="space-y-2">
                          {item.notes.map((note: any) => (
                            <div key={note._id} className="text-sm">
                              <span className="font-medium">{note.user.name}:</span>
                              <span className="ml-2">{note.text}</span>
                              <span className="text-gray-500 text-xs ml-2">
                                {new Date(note.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {activeCart.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items in this cart yet.</p>
                    {!activeCart.isLocked && (
                      <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 underline">
                        Browse restaurants to add items
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cart Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Cart Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span>{activeCart.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved:</span>
                <span>{activeCart.items.filter((item: any) => item.status === 'approved').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span>{activeCart.items.filter((item: any) => item.status === 'suggested').length}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-3">
                <span>Total:</span>
                <span className="text-green-600">${activeCart.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Members ({activeCart.members.length})</h3>
            <div className="space-y-3">
              {activeCart.members.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{member.user.name}</div>
                    <div className="text-sm text-gray-600">{member.user.email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.role === 'manager' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {activeCart.activity && activeCart.activity.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeCart.activity.slice(0, 10).map((activity: any) => (
                  <div key={activity._id} className="text-sm">
                    <div className="font-medium">{activity.user?.name}</div>
                    <div className="text-gray-600">{activity.description}</div>
                    <div className="text-gray-500 text-xs">
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Add Member</h3>
              <form onSubmit={handleAddMember}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter member's email"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setNewMemberEmail('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Cart Settings</h3>
              <form onSubmit={handleUpdateSettings}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Approval
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.requireApproval}
                      onChange={(e) => setSettings({...settings, requireApproval: e.target.checked})}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Allow Member Removal
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.allowMemberRemoval}
                      onChange={(e) => setSettings({...settings, allowMemberRemoval: e.target.checked})}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Voting
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.requireVoting}
                      onChange={(e) => setSettings({...settings, requireVoting: e.target.checked})}
                      className="rounded"
                    />
                  </div>
                  {settings.requireVoting && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Votes
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={settings.minimumVotes}
                        onChange={(e) => setSettings({...settings, minimumVotes: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Add Note</h3>
              <form onSubmit={(e) => handleAddNote(e, showNoteModal)}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your note"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteModal(null);
                      setNewNote('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Note
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
