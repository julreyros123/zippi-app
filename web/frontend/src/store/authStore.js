import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'https://zippi-uwwt.onrender.com';

// Helper to check if token is expired (JWT tokens are valid for 7 days)
const isTokenExpired = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const decoded = JSON.parse(atob(parts[1]));
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch {
    return true;
  }
};

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || sessionStorage.getItem('token') || null,
  isAuthenticated: !!(localStorage.getItem('token') || sessionStorage.getItem('token')),

  login: (user, token, rememberMe = true) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, token, isAuthenticated: true });
      } else if (res.status === 401) {
        // Token invalid, clear auth
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      }
    } catch (err) {
      console.error('Auth verification failed', err);
    }
  },

  // Check if token is about to expire (within 1 hour) and re-validate
  validateToken: async () => {
    const state = get();
    if (!state.token) return false;

    if (isTokenExpired(state.token)) {
      state.logout();
      return false;
    }

    return true;
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
