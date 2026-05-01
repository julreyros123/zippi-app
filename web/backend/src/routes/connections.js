const express = require('express');
const router = express.Router();
const { sendConnection, getMyConnections, removeConnection } = require('../controllers/connections');
const { authenticate } = require('../middleware/auth');
const { connectionLimiter } = require('../server');

router.get('/', authenticate, getMyConnections);
router.post('/', authenticate, connectionLimiter, sendConnection);
router.delete('/:id', authenticate, connectionLimiter, removeConnection);

module.exports = router;
