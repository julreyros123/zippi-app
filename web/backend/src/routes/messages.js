const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { messageLimiter } = require('../server');

router.get('/:channelId/messages', authenticate, messagesController.getChannelMessages);
router.post('/:channelId/messages', authenticate, messageLimiter, upload.single('file'), messagesController.createMessage);
router.put('/:channelId/messages/:messageId', authenticate, messageLimiter, messagesController.editMessage);
router.delete('/:channelId/messages/:messageId', authenticate, messageLimiter, messagesController.deleteMessage);

module.exports = router;
