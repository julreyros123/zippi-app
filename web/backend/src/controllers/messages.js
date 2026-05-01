const prisma = require('../prisma');

const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = 50 } = req.query; // Add cursor/limit query params
    
    // Pagination logic
    const take = parseInt(limit, 10);
    const args = {
      where: { channelId },
      include: {
        user: { select: { id: true, username: true, nickname: true, bio: true, subject: true } }
      },
      take: take + 1, // Fetch one extra to determine if there's a next page
      orderBy: { createdAt: 'desc' } // Order by desc to get newest messages first, then reverse for chat UI
    };
    
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1; // Skip the cursor itself
    }

    const messages = await prisma.message.findMany(args);

    let nextCursor = null;
    if (messages.length > take) {
      nextCursor = messages.pop().id; // Remove the extra record and use its ID as the cursor
    }

    messages.reverse(); // Reverse back to chronological order (asc)

    // Format for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      fileUrl: msg.fileUrl,
      fileType: msg.fileType,
      createdAt: msg.createdAt,
      userId: msg.userId,
      channelId: msg.channelId,
      username: msg.user.username,
      user: msg.user
    }));

    res.status(200).json({
      messages: formattedMessages,
      nextCursor
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const createMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    let fileUrl = null;
    let fileType = null;

    if (req.file) {
      fileUrl = req.file.path; // Cloudinary returns the secure URL in path
      const mime = req.file.mimetype;
      fileType = mime.startsWith('image/') ? 'image' : 'file';
    }

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Message content or a file is required' });
    }

    // make sure channel exists
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const message = await prisma.message.create({
      data: {
        content: content || null,
        fileUrl,
        fileType,
        channelId,
        userId
      },
      include: {
        user: { select: { id: true, username: true, nickname: true, bio: true, subject: true } }
      }
    });

    const formattedMessage = {
      id: message.id,
      content: message.content,
      fileUrl: message.fileUrl,
      fileType: message.fileType,
      createdAt: message.createdAt,
      userId: message.userId,
      channelId: message.channelId,
      username: message.user.username,
      user: message.user
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Create Message Error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const existingMessage = await prisma.message.findUnique({ where: { id: messageId } });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        user: { select: { id: true, username: true, nickname: true, bio: true, subject: true } }
      }
    });

    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      fileUrl: updatedMessage.fileUrl,
      fileType: updatedMessage.fileType,
      createdAt: updatedMessage.createdAt,
      updatedAt: updatedMessage.updatedAt,
      userId: updatedMessage.userId,
      channelId: updatedMessage.channelId,
      username: updatedMessage.user.username,
      user: updatedMessage.user
    };

    // Emit message_edited event to all users in the channel
    const { io } = require('../server');
    io.to(updatedMessage.channelId).emit('message_edited', formattedMessage);

    res.status(200).json(formattedMessage);
  } catch (error) {
    console.error('Edit Message Error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const existingMessage = await prisma.message.findUnique({ where: { id: messageId } });

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete associated reactions first to avoid constraint issues if using real DBs (SQLite/Prisma usually cascade handles this if set, but manual is safer)
    await prisma.reaction.deleteMany({ where: { messageId } });
    await prisma.message.delete({ where: { id: messageId } });

    // Emit message_deleted event to all users in the channel
    const { io } = require('../server');
    io.to(existingMessage.channelId).emit('message_deleted', { messageId });

    res.status(200).json({ success: true, messageId });
  } catch (error) {
    console.error('Delete Message Error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  getChannelMessages,
  createMessage,
  editMessage,
  deleteMessage
};
