const express = require('express');
const router = express.Router();
const resourcesController = require('../controllers/resources');
const reviewsController = require('../controllers/reviews');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Resources routes
router.get('/', authenticate, resourcesController.getAllResources);
router.get('/search/filters', authenticate, resourcesController.getFilterOptions);
router.get('/search/suggestions', authenticate, resourcesController.getSearchSuggestions);
router.get('/download/history', authenticate, resourcesController.getDownloadHistory);
router.get('/:resourceId', authenticate, resourcesController.getResourceDetail);
router.post('/', authenticate, upload.single('file'), resourcesController.createResource);
router.post('/:resourceId/download', authenticate, resourcesController.trackDownload);
router.patch('/:resourceId', authenticate, resourcesController.updateResource);
router.delete('/:resourceId', authenticate, resourcesController.deleteResource);

// Reviews routes
router.get('/:resourceId/reviews', authenticate, reviewsController.getResourceReviews);
router.post('/:resourceId/reviews', authenticate, reviewsController.submitReview);
router.delete('/:resourceId/reviews/:reviewId', authenticate, reviewsController.deleteReview);

module.exports = router;
