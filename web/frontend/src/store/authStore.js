import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'https://zippi-uwwt.onrender.com';

const useAuthStore = create((set) => ({
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

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, token, isAuthenticated: true });
      } else {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      }
    } catch (err) {
      console.error('Auth verification failed', err);
    }
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
