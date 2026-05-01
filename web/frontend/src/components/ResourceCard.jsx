import React from 'react';
import { Star, Download, MessageSquare, BookOpen } from 'lucide-react';

export default function ResourceCard({ resource, onCardClick }) {
  const categoryIcons = {
    Book: BookOpen,
    PDF: FileText,
    Notes: FileText,
    'Lecture Slides': PresentationIcon
  };

  const CategoryIcon = categoryIcons[resource.category] || BookOpen;
  const sourceColors = {
    OpenStax: 'bg-blue-100 text-blue-800',
    'Project Gutenberg': 'bg-purple-100 text-purple-800',
    'MIT OCW': 'bg-red-100 text-red-800',
    Community: 'bg-green-100 text-green-800'
  };

  return (
    <div
      onClick={() => onCardClick(resource.id)}
      className="group bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
            <CategoryIcon size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
              {resource.title}
            </h3>
            <p className="text-xs text-gray-500">{resource.author}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
        {resource.description}
      </p>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
          {resource.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{resource.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          {resource.avgRating && (
            <div className="flex items-center gap-1 text-amber-400">
              <Star size={12} fill="currentColor" />
              <span>{resource.avgRating}</span>
              <span className="text-gray-600">({resource.reviewCount})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Download size={12} />
          <span>{resource.downloadCount}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded font-medium ${sourceColors[resource.source] || sourceColors.Community}`}>
            {resource.source}
          </span>
          <span className="text-xs text-gray-500">{resource.subject}</span>
        </div>
      </div>
    </div>
  );
}

// Placeholder icons
function FileText(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PresentationIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
