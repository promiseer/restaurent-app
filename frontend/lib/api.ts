const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

// API client with authentication
export const apiClient = {
  async get(endpoint: string) {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  async post(endpoint: string, data: any) {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  async put(endpoint: string, data: any) {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  async delete(endpoint: string) {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },
}

// Authentication helpers
export const auth = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    
    const data = await response.json()
    
    if (response.ok) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    } else {
      throw new Error(data.message || 'Login failed')
    }
  },

  register: async (userData: any) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })
    
    const data = await response.json()
    
    if (response.ok) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    } else {
      throw new Error(data.message || 'Registration failed')
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getCurrentUser: () => {
    if (typeof window !== 'undefined') {
      const token = getToken()
      if (!token) return null
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        
        // Check if token is expired
        const currentTime = Date.now() / 1000
        if (payload.exp < currentTime) {
          // Token is expired, clean up
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          return null
        }
        
        return {
          _id: payload.userId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          country: payload.country
        }
      } catch (error) {
        // Invalid token format, clean up and try localStorage fallback
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            return JSON.parse(userStr)
          } catch {
            localStorage.removeItem('user')
          }
        }
        return null
      }
    }
    return null
  },

  isAuthenticated: () => {
    const token = getToken()
    if (!token) return false
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch (error) {
      return false
    }
  },
}

// Restaurant API
export const restaurantAPI = {
  getAll: () => apiClient.get('/restaurants'),
  getById: (id: string) => apiClient.get(`/restaurants/${id}`),
  getMenu: (id: string) => apiClient.get(`/restaurants/${id}/menu`),
  create: (data: any) => apiClient.post('/restaurants', data),
  update: (id: string, data: any) => apiClient.put(`/restaurants/${id}`, data),
}

// Order API
export const orderAPI = {
  getAll: () => apiClient.get('/orders'),
  getById: (id: string) => apiClient.get(`/orders/${id}`),
  create: (data: any) => apiClient.post('/orders', data),
  updateStatus: (id: string, status: string, notes?: string) => 
    apiClient.put(`/orders/${id}/status`, { status, notes }),
  cancel: (id: string, reason: string) => 
    apiClient.put(`/orders/${id}/cancel`, { reason }),
  getStats: () => apiClient.get('/orders/stats/summary'),
  getForManagement: (params?: {
    status?: string;
    restaurant?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return apiClient.get(`/orders/manage${queryString ? `?${queryString}` : ''}`);
  },
}

// Payment API
export const paymentAPI = {
  getMethods: () => apiClient.get('/payments/methods'),
  addMethod: (data: any) => apiClient.post('/payments/methods', data),
  updateMethod: (id: string, data: any) => 
    apiClient.put(`/payments/methods/${id}`, data),
  deleteMethod: (id: string) => apiClient.delete(`/payments/methods/${id}`),
  processPayment: (data: any) => apiClient.post('/payments/process', data),
  getHistory: () => apiClient.get('/payments/history'),
  
  // Global payment methods (admin-managed, country-specific)
  getGlobalMethods: () => apiClient.get('/payments/global-methods'),
  getAdminGlobalMethods: (country?: string) => 
    apiClient.get(`/payments/admin/global-methods${country ? `?country=${country}` : ''}`),
  addGlobalMethod: (data: any) => apiClient.post('/payments/admin/global-methods', data),
  updateGlobalMethod: (id: string, data: any) => 
    apiClient.put(`/payments/admin/global-methods/${id}`, data),
  deleteGlobalMethod: (id: string) => apiClient.delete(`/payments/admin/global-methods/${id}`),
}

// User API
export const userAPI = {
  getAll: () => apiClient.get('/users'),
  getById: (id: string) => apiClient.get(`/users/${id}`),
  update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
}
