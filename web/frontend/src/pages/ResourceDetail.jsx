import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Star, MessageSquare, Loader, X } from 'lucide-react';
import resourceStore from '../store/resourceStore';

export default function ResourceDetail() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const { fetchResourceDetail, trackDownload, submitReview: submitReviewStore } = resourceStore();

  // Fetch resource detail
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchResourceDetail(resourceId);
        setResource(data.resource);
        setReviews(data.reviews);
        setAvgRating(data.avgRating);
        setUserReview(data.userReview);
        if (data.userReview) {
          setRating(data.userReview.rating);
          setComment(data.userReview.comment);
        }
      } catch (err) {
        setError(err.message || 'Failed to load resource');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resourceId, fetchResourceDetail]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const downloadUrl = await trackDownload(resourceId);
      // Open in new tab
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError('Failed to download resource');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setSubmittingReview(true);
      setError(null);
      const review = await submitReviewStore(resourceId, rating, comment);
      setUserReview(review);
      // Refresh reviews
      const data = await fetchResourceDetail(resourceId);
      setReviews(data.reviews);
      setAvgRating(data.avgRating);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-gray-400">Loading resource...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-gray-100 p-6">
        <button
          onClick={() => navigate('/resources')}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8"
        >
          <ArrowLeft size={18} />
          Back to Resources
        </button>
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Resource not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/resources')}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Resources
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{resource.title}</h1>
              <p className="text-gray-400">by {resource.author}</p>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 mb-6 flex items-start justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Resource Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
              <p className="text-gray-200 leading-relaxed">{resource.description}</p>
            </div>
            <div className="space-y-6">
              {/* Stats */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Statistics</h3>
                <div className="space-y-2">
                  {avgRating && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            fill={i < Math.round(avgRating) ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-gray-300">
                        {avgRating} ({reviews.length} reviews)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-gray-300">
                    <Download size={16} />
                    <span>{resource.downloadCount} downloads</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Details</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div><strong>Subject:</strong> {resource.subject}</div>
                  <div><strong>Category:</strong> {resource.category}</div>
                  <div><strong>Grade:</strong> {resource.grade.join(', ')}</div>
                  <div><strong>Source:</strong> {resource.source}</div>
                  <div><strong>License:</strong> {resource.license}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <span key={tag} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Reviews ({reviews.length})</h2>

          {/* Review Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {userReview ? 'Update Your Review' : 'Leave a Review'}
            </h3>
            <form onSubmit={handleSubmitReview}>
              {/* Rating */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-300 block mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      onMouseEnter={() => setHoveredRating(num)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={24}
                        fill={num <= (hoveredRating || rating) ? 'currentColor' : 'none'}
                        color={num <= (hoveredRating || rating) ? '#fbbf24' : '#6b7280'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 block mb-2">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this resource..."
                  rows="4"
                  maxLength="500"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{comment.length}/500</p>
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No reviews yet. Be the first to review this resource!
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{review.user.nickname || review.user.username}</p>
                      <div className="flex items-center gap-1 text-amber-400 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-gray-300">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
