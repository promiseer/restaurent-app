// Simple auth helper functions
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

export const getUserFromToken = () => {
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
      role: payload.role
    }
  } catch (error) {
    // Invalid token format, clean up
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  }
}

export const isLoggedIn = () => {
  return !!getUserFromToken() // This will check both token existence and validity
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/auth/login'
}
