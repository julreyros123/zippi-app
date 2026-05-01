import React from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function ResourceFilters({ filters, filterOptions, onFilterChange, onClearFilters }) {
  if (!filterOptions) {
    return <div className="text-gray-400 text-sm">Loading filters...</div>;
  }

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Subject Filter */}
      <div>
        <label className="text-xs font-medium text-gray-300 block mb-2">Subject</label>
        <select
          value={filters.subject}
          onChange={(e) => onFilterChange('subject', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
        >
          <option value="">All Subjects</option>
          {filterOptions.subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <label className="text-xs font-medium text-gray-300 block mb-2">Category</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
        >
          <option value="">All Categories</option>
          {filterOptions.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Grade Filter */}
      <div>
        <label className="text-xs font-medium text-gray-300 block mb-2">Grade Level</label>
        <select
          value={filters.grade}
          onChange={(e) => onFilterChange('grade', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
        >
          <option value="">All Levels</option>
          {filterOptions.grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      {/* Source Filter */}
      <div>
        <label className="text-xs font-medium text-gray-300 block mb-2">Source</label>
        <select
          value={filters.source}
          onChange={(e) => onFilterChange('source', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
        >
          <option value="">All Sources</option>
          {filterOptions.sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
