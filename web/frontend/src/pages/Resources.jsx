import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import resourceStore from '../store/resourceStore';
import ResourceCard from '../components/ResourceCard';
import ResourceFilters from '../components/ResourceFilters';

export default function Resources() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    resources,
    filterOptions,
    filters,
    searchQuery,
    currentPage,
    totalPages,
    loading,
    error,
    setFilters,
    setSearchQuery,
    setCurrentPage,
    fetchResources,
    fetchFilterOptions,
    fetchSuggestions
  } = resourceStore();

  // Initialize
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch resources when filters, search, or page changes
  useEffect(() => {
    fetchResources();
  }, [filters, searchQuery, currentPage]);

  // Handle search input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length >= 2) {
        fetchSuggestions(searchInput).then(setSuggestions);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setSearchInput(query);
    setShowSuggestions(false);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({ [filterName]: value });
  };

  const handleClearFilters = () => {
    setFilters({ subject: '', category: '', grade: '', source: '' });
    setSearchQuery('');
    setSearchInput('');
  };

  const handleCardClick = (resourceId) => {
    navigate(`/resources/${resourceId}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">📚 Resources Hub</h1>
            <p className="text-gray-400">Discover free study materials from curated sources</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search books, PDFs, notes..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(e.target.value.length >= 2);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchInput);
                  }
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      handleSearch(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <Search size={14} className="inline mr-2 text-gray-500" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div>
            <ResourceFilters
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Resources Grid */}
          <div className="lg:col-span-3">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader size={32} className="animate-spin text-indigo-400 mx-auto mb-3" />
                  <p className="text-gray-400">Loading resources...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {!loading && resources.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg mb-4">No resources found</p>
                <button
                  onClick={handleClearFilters}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Clear filters and try again
                </button>
              </div>
            )}

            {!loading && resources.length > 0 && (
              <>
                {/* Results Info */}
                <div className="mb-6">
                  <p className="text-sm text-gray-400">
                    Found {resources.length} resource{resources.length !== 1 ? 's' : ''} on page {currentPage} of {totalPages}
                  </p>
                </div>

                {/* Resources Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {resources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-8 border-t border-gray-800">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg transition-colors ${
                              pageNum === currentPage
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
