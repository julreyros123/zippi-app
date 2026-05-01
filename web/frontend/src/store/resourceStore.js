import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const resourceStore = create((set, get) => ({
  resources: [],
  filterOptions: null,
  filters: {
    subject: '',
    category: '',
    grade: '',
    source: ''
  },
  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
  totalPages: 1,
  loading: false,
  error: null,
  downloads: [],
  reviews: {},

  // Set filters
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters },
    currentPage: 1 // Reset to first page when filters change
  })),

  // Set search query
  setSearchQuery: (query) => set((state) => ({
    searchQuery: query,
    currentPage: 1
  })),

  // Set current page
  setCurrentPage: (page) => set({ currentPage: page }),

  // Fetch resources
  fetchResources: async () => {
    const { filters, searchQuery, currentPage, pageSize } = get();
    set({ loading: true, error: null });

    try {
      const params = {
        page: currentPage,
        limit: pageSize
      };

      if (searchQuery) params.search = searchQuery;
      if (filters.subject) params.subject = filters.subject;
      if (filters.category) params.category = filters.category;
      if (filters.grade) params.grade = filters.grade;
      if (filters.source) params.source = filters.source;

      const response = await axios.get(`${API_BASE}/resources`, { params });

      set({
        resources: response.data.resources,
        totalPages: response.data.pages,
        loading: false
      });
    } catch (err) {
      set({
        error: err.response?.data?.error || 'Failed to fetch resources',
        loading: false
      });
    }
  },

  // Fetch filter options
  fetchFilterOptions: async () => {
    try {
      const response = await axios.get(`${API_BASE}/resources/search/filters`);
      set({ filterOptions: response.data });
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  },

  // Fetch search suggestions
  fetchSuggestions: async (query) => {
    if (!query || query.length < 2) return [];

    try {
      const response = await axios.get(`${API_BASE}/resources/search/suggestions`, {
        params: { q: query }
      });
      return response.data.suggestions;
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      return [];
    }
  },

  // Track download
  trackDownload: async (resourceId) => {
    try {
      const response = await axios.post(`${API_BASE}/resources/${resourceId}/download`);
      set((state) => ({
        downloads: [...state.downloads, resourceId]
      }));
      return response.data.downloadUrl;
    } catch (err) {
      console.error('Failed to track download:', err);
      throw err;
    }
  },

  // Get download history
  getDownloadHistory: async () => {
    try {
      const response = await axios.get(`${API_BASE}/resources/download/history`);
      set({ downloads: response.data.downloads.map(d => d.id) });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch download history:', err);
    }
  },

  // Fetch resource detail
  fetchResourceDetail: async (resourceId) => {
    try {
      const response = await axios.get(`${API_BASE}/resources/${resourceId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch resource detail:', err);
      throw err;
    }
  },

  // Submit review
  submitReview: async (resourceId, rating, comment) => {
    try {
      const response = await axios.post(
        `${API_BASE}/resources/${resourceId}/reviews`,
        { rating, comment }
      );
      set((state) => ({
        reviews: {
          ...state.reviews,
          [resourceId]: response.data.review
        }
      }));
      return response.data.review;
    } catch (err) {
      console.error('Failed to submit review:', err);
      throw err;
    }
  },

  // Delete review
  deleteReview: async (resourceId, reviewId) => {
    try {
      await axios.delete(`${API_BASE}/resources/${resourceId}/reviews/${reviewId}`);
      set((state) => {
        const newReviews = { ...state.reviews };
        delete newReviews[resourceId];
        return { reviews: newReviews };
      });
    } catch (err) {
      console.error('Failed to delete review:', err);
      throw err;
    }
  },

  // Clear store
  clear: () => set({
    resources: [],
    filters: { subject: '', category: '', grade: '', source: '' },
    searchQuery: '',
    currentPage: 1,
    error: null
  })
}));

export default resourceStore;
