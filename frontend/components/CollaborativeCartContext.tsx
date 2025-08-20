'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface CartItem {
  _id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId: string;
  restaurantName?: string;
  specialInstructions?: string;
  addedBy: User;
  addedAt: Date;
  status: 'suggested' | 'approved' | 'rejected';
  notes: Array<{
    _id: string;
    user: User;
    text: string;
    createdAt: Date;
  }>;
  votes: Array<{
    _id: string;
    user: User;
    type: 'approve' | 'reject';
    createdAt: Date;
  }>;
}

interface CartMember {
  _id: string;
  user: User;
  role: 'manager' | 'member';
  joinedAt: Date;
}

interface CartActivity {
  _id: string;
  type: string;
  user: User;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface CollaborativeCart {
  _id: string;
  name: string;
  description?: string;
  creator: User;
  manager: User;
  members: CartMember[];
  items: CartItem[];
  status: 'active' | 'locked' | 'completed' | 'cancelled';
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: User;
  country: 'India' | 'America';
  totalAmount: number;
  settings: {
    requireApproval: boolean;
    allowMemberRemoval: boolean;
    requireVoting: boolean;
    minimumVotes: number;
  };
  activity: CartActivity[];
  createdAt: Date;
  updatedAt: Date;
}

interface CollaborativeCartState {
  carts: CollaborativeCart[];
  activeCart: CollaborativeCart | null;
  loading: boolean;
  error: string | null;
}

type CollaborativeCartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CARTS'; payload: CollaborativeCart[] }
  | { type: 'SET_ACTIVE_CART'; payload: CollaborativeCart | null }
  | { type: 'ADD_CART'; payload: CollaborativeCart }
  | { type: 'UPDATE_CART'; payload: CollaborativeCart }
  | { type: 'REMOVE_CART'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { cartId: string; item: CartItem } }
  | { type: 'ADD_ITEM'; payload: { cartId: string; item: CartItem } }
  | { type: 'REMOVE_ITEM'; payload: { cartId: string; itemId: string } }
  | { type: 'ADD_MEMBER'; payload: { cartId: string; member: CartMember } }
  | { type: 'ADD_NOTE'; payload: { cartId: string; itemId: string; note: any } }
  | { type: 'ADD_ACTIVITY'; payload: { cartId: string; activity: CartActivity } };

const initialState: CollaborativeCartState = {
  carts: [],
  activeCart: null,
  loading: false,
  error: null,
};

function collaborativeCartReducer(state: CollaborativeCartState, action: CollaborativeCartAction): CollaborativeCartState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CARTS':
      return { ...state, carts: action.payload };
    case 'SET_ACTIVE_CART':
      return { ...state, activeCart: action.payload };
    case 'ADD_CART':
      return { ...state, carts: [action.payload, ...state.carts] };
    case 'UPDATE_CART':
      return {
        ...state,
        carts: state.carts.map(cart => 
          cart._id === action.payload._id ? action.payload : cart
        ),
        activeCart: state.activeCart?._id === action.payload._id ? action.payload : state.activeCart
      };
    case 'REMOVE_CART':
      return {
        ...state,
        carts: state.carts.filter(cart => cart._id !== action.payload),
        activeCart: state.activeCart?._id === action.payload ? null : state.activeCart
      };
    case 'ADD_ITEM':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? { ...cart, items: [...cart.items, action.payload.item] }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? { ...state.activeCart, items: [...state.activeCart.items, action.payload.item] }
          : state.activeCart
      };
    case 'UPDATE_ITEM':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? {
                ...cart,
                items: cart.items.map(item =>
                  item._id === action.payload.item._id ? action.payload.item : item
                )
              }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? {
              ...state.activeCart,
              items: state.activeCart.items.map(item =>
                item._id === action.payload.item._id ? action.payload.item : item
              )
            }
          : state.activeCart
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? { ...cart, items: cart.items.filter(item => item._id !== action.payload.itemId) }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? { ...state.activeCart, items: state.activeCart.items.filter(item => item._id !== action.payload.itemId) }
          : state.activeCart
      };
    case 'ADD_MEMBER':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? { ...cart, members: [...cart.members, action.payload.member] }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? { ...state.activeCart, members: [...state.activeCart.members, action.payload.member] }
          : state.activeCart
      };
    case 'ADD_NOTE':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? {
                ...cart,
                items: cart.items.map(item =>
                  item._id === action.payload.itemId
                    ? { ...item, notes: [...item.notes, action.payload.note] }
                    : item
                )
              }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? {
              ...state.activeCart,
              items: state.activeCart.items.map(item =>
                item._id === action.payload.itemId
                  ? { ...item, notes: [...item.notes, action.payload.note] }
                  : item
              )
            }
          : state.activeCart
      };
    case 'ADD_ACTIVITY':
      return {
        ...state,
        carts: state.carts.map(cart =>
          cart._id === action.payload.cartId
            ? { ...cart, activity: [action.payload.activity, ...cart.activity] }
            : cart
        ),
        activeCart: state.activeCart?._id === action.payload.cartId
          ? { ...state.activeCart, activity: [action.payload.activity, ...state.activeCart.activity] }
          : state.activeCart
      };
    default:
      return state;
  }
}

interface CollaborativeCartContextType extends CollaborativeCartState {
  // Cart Management
  createCart: (name: string, description: string, country: string) => Promise<CollaborativeCart | null>;
  fetchUserCarts: () => Promise<void>;
  fetchCartDetails: (cartId: string) => Promise<void>;
  setActiveCart: (cart: CollaborativeCart | null) => void;
  deleteCart: (cartId: string) => Promise<boolean>;
  discardCart: (cartId: string) => Promise<boolean>;
  
  // Item Management
  addItemToCart: (cartId: string, item: any) => Promise<boolean>;
  updateItemStatus: (cartId: string, itemId: string, status: 'approved' | 'rejected') => Promise<boolean>;
  removeItemFromCart: (cartId: string, itemId: string) => Promise<boolean>;
  voteOnItem: (cartId: string, itemId: string, voteType: 'approve' | 'reject') => Promise<boolean>;
  
  // Notes and Communication
  addNoteToItem: (cartId: string, itemId: string, text: string) => Promise<boolean>;
  
  // Member Management
  addMemberToCart: (cartId: string, userEmail: string, role: 'member' | 'manager') => Promise<boolean>;
  
  // Cart Control
  toggleCartLock: (cartId: string) => Promise<boolean>;
  updateCartSettings: (cartId: string, settings: Partial<CollaborativeCart['settings']>) => Promise<boolean>;
}

const CollaborativeCartContext = createContext<CollaborativeCartContextType | undefined>(undefined);

export function CollaborativeCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(collaborativeCartReducer, initialState);

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    
    // Check if token exists and is not expired
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
          // Token is expired, remove it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        
        return token;
      } catch (error) {
        // Invalid token format, remove it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    }
    
    return null;
  };

  // Helper function to make authenticated requests
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid or expired - log out
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        throw new Error('Session expired. Please login again.');
      }
      
      const error = await response.json().catch(() => ({ 
        message: response.status === 403 ? 'Access denied' : 'API call failed' 
      }));
      throw new Error(error.message || (response.status === 403 ? 'Access denied' : 'API call failed'));
    }

    return response.json();
  };

  // Create a new collaborative cart
  const createCart = async (name: string, description: string, country: string): Promise<CollaborativeCart | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await apiCall('/collaborative-carts/create', {
        method: 'POST',
        body: JSON.stringify({ name, description, country }),
      });

      if (response.success) {
        dispatch({ type: 'ADD_CART', payload: response.data });
        toast.success(`Collaborative cart "${name}" created successfully!`);
        return response.data;
      }
      throw new Error(response.message);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error(error.message);
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fetch user's collaborative carts
  const fetchUserCarts = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await apiCall('/collaborative-carts/my-carts');
      
      if (response.success) {
        dispatch({ type: 'SET_CARTS', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      toast.error('Failed to fetch collaborative carts');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fetch specific cart details
  const fetchCartDetails = async (cartId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await apiCall(`/collaborative-carts/${cartId}`);
      
      if (response.success) {
        dispatch({ type: 'UPDATE_CART', payload: response.data });
        dispatch({ type: 'SET_ACTIVE_CART', payload: response.data });
      }
    } catch (error: any) {
      // If cart is not found (possibly completed and removed), refresh the cart list
      if (error.response?.status === 404) {
        await fetchUserCarts();
        toast.error('Cart not found. It may have been completed and removed from your active carts.');
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        toast.error('Failed to fetch cart details');
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Set active cart
  const setActiveCart = (cart: CollaborativeCart | null) => {
    dispatch({ type: 'SET_ACTIVE_CART', payload: cart });
  };

  // Delete cart
  const deleteCart = async (cartId: string): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        dispatch({ type: 'REMOVE_CART', payload: cartId });
        toast.success('Cart deleted successfully!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Discard completed cart
  const discardCart = async (cartId: string): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/discard`, {
        method: 'POST',
      });

      if (response.success) {
        dispatch({ type: 'REMOVE_CART', payload: cartId });
        toast.success('Cart discarded successfully!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Add item to collaborative cart
  const addItemToCart = async (cartId: string, item: any): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/items`, {
        method: 'POST',
        body: JSON.stringify(item),
      });

      if (response.success) {
        dispatch({ type: 'ADD_ITEM', payload: { cartId, item: response.data } });
        toast.success('Item added to collaborative cart!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Update item status (approve/reject)
  const updateItemStatus = async (cartId: string, itemId: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/items/${itemId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (response.success) {
        dispatch({ type: 'UPDATE_ITEM', payload: { cartId, item: response.data } });
        toast.success(`Item ${status}!`);
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Remove item from cart
  const removeItemFromCart = async (cartId: string, itemId: string): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        dispatch({ type: 'REMOVE_ITEM', payload: { cartId, itemId } });
        toast.success('Item removed from cart!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Vote on item
  const voteOnItem = async (cartId: string, itemId: string, voteType: 'approve' | 'reject'): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/items/${itemId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ type: voteType }),
      });

      if (response.success) {
        dispatch({ type: 'UPDATE_ITEM', payload: { cartId, item: response.data } });
        toast.success(`Vote cast: ${voteType}`);
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Add note to item
  const addNoteToItem = async (cartId: string, itemId: string, text: string): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/items/${itemId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      if (response.success) {
        dispatch({ type: 'ADD_NOTE', payload: { cartId, itemId, note: response.data } });
        toast.success('Note added!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Add member to cart
  const addMemberToCart = async (cartId: string, userEmail: string, role: 'member' | 'manager' = 'member'): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userEmail, role }),
      });

      if (response.success) {
        dispatch({ type: 'ADD_MEMBER', payload: { cartId, member: response.data } });
        toast.success(`Member added successfully!`);
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Toggle cart lock
  const toggleCartLock = async (cartId: string): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/lock`, {
        method: 'PATCH',
      });

      if (response.success) {
        // Fetch updated cart details
        fetchCartDetails(cartId);
        toast.success(`Cart ${response.data.isLocked ? 'locked' : 'unlocked'}!`);
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Update cart settings
  const updateCartSettings = async (cartId: string, settings: Partial<CollaborativeCart['settings']>): Promise<boolean> => {
    try {
      const response = await apiCall(`/collaborative-carts/${cartId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });

      if (response.success) {
        // Fetch updated cart details
        fetchCartDetails(cartId);
        toast.success('Cart settings updated!');
        return true;
      }
      throw new Error(response.message);
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  // Place order from collaborative cart
  // Load user carts on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchUserCarts();
    }
  }, []);

  const contextValue: CollaborativeCartContextType = {
    ...state,
    createCart,
    fetchUserCarts,
    fetchCartDetails,
    setActiveCart,
    deleteCart,
    discardCart,
    addItemToCart,
    updateItemStatus,
    removeItemFromCart,
    voteOnItem,
    addNoteToItem,
    addMemberToCart,
    toggleCartLock,
    updateCartSettings,
  };

  return (
    <CollaborativeCartContext.Provider value={contextValue}>
      {children}
    </CollaborativeCartContext.Provider>
  );
}

export function useCollaborativeCart() {
  const context = useContext(CollaborativeCartContext);
  if (context === undefined) {
    throw new Error('useCollaborativeCart must be used within a CollaborativeCartProvider');
  }
  return context;
}
