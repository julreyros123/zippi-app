const prisma = require('../prisma');

// Get reviews for a resource with pagination
const getResourceReviews = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Determine sort order
    const orderBy = sort === 'helpful' ? { createdAt: 'desc' } : { createdAt: 'desc' };

    const reviews = await prisma.resourceReview.findMany({
      where: { resourceId },
      include: {
        user: { select: { id: true, username: true, nickname: true } }
      },
      orderBy,
      skip,
      take: pageSize
    });

    const total = await prisma.resourceReview.count({
      where: { resourceId }
    });

    res.status(200).json({
      reviews,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Create or update review (one per user per resource)
const submitReview = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { rating, comment } = req.body;

    // Validate inputs
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user already downloaded/viewed the resource (optional: enforce this)
    const download = await prisma.download.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.id,
          resourceId
        }
      }
    });

    // Create or update review
    const review = await prisma.resourceReview.upsert({
      where: {
        userId_resourceId: {
          userId: req.user.id,
          resourceId
        }
      },
      update: {
        rating: parseInt(rating),
        comment: comment.trim()
      },
      create: {
        userId: req.user.id,
        resourceId,
        rating: parseInt(rating),
        comment: comment.trim()
      },
      include: {
        user: { select: { id: true, username: true, nickname: true } }
      }
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error('Submit Review Error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// Delete own review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.resourceReview.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check authorization (only owner can delete)
    if (review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    await prisma.resourceReview.delete({
      where: { id: reviewId }
    });

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

module.exports = {
  getResourceReviews,
  submitReview,
  deleteReview
};
