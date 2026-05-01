const prisma = require('../prisma');

// Send or accept a connection
const sendConnection = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const me = req.user.id;
    if (me === targetUserId) return res.status(400).json({ error: 'Cannot connect with yourself' });

    // Check if connection already exists in either direction
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { userAId: me, userBId: targetUserId },
          { userAId: targetUserId, userBId: me }
        ]
      }
    });

    const { io } = require('../server');

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ error: 'Already connected' });
      // If pending and the other side is requesting, accept it
      if (existing.userBId === me) {
        const updated = await prisma.connection.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED' }
        });
        // Emit connection_accepted event to both users
        io.emit('connection_accepted', {
          connectionId: updated.id,
          userAId: updated.userAId,
          userBId: updated.userBId,
          status: updated.status
        });
        return res.status(200).json({ message: 'Connection accepted!', connection: updated });
      }
      return res.status(400).json({ error: 'Connection request already sent' });
    }

    try {
      const connection = await prisma.connection.create({
        data: { userAId: me, userBId: targetUserId, status: 'PENDING' }
      });

      // Emit connection_requested event to the recipient
      io.emit('connection_requested', {
        connectionId: connection.id,
        userAId: connection.userAId,
        userBId: connection.userBId,
        status: connection.status
      });

      res.status(201).json({ message: 'Connection request sent', connection });
    } catch (createErr) {
      // Handle race condition where connection was created between check and create
      if (createErr.code === 'P2002') {
        // Unique constraint violated, fetch the newly created connection
        const raceConnection = await prisma.connection.findFirst({
          where: {
            OR: [
              { userAId: me, userBId: targetUserId },
              { userAId: targetUserId, userBId: me }
            ]
          }
        });
        return res.status(400).json({ error: 'Connection already exists', connection: raceConnection });
      }
      throw createErr;
    }
  } catch (error) {
    console.error('Send Connection Error:', error);
    res.status(500).json({ error: 'Failed to send connection' });
  }
};

// Get all my connections (accepted) and pending requests
const getMyConnections = async (req, res) => {
  try {
    const me = req.user.id;
    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ userAId: me }, { userBId: me }]
      },
      include: {
        userA: { select: { id: true, username: true, nickname: true, subject: true } },
        userB: { select: { id: true, username: true, nickname: true, subject: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich with online status
    const onlineUsers = global.onlineUsers || new Map();
    const enrichedConnections = connections.map(conn => ({
      ...conn,
      userAOnline: onlineUsers.has(conn.userAId),
      userBOnline: onlineUsers.has(conn.userBId)
    }));

    res.status(200).json(enrichedConnections);
  } catch (error) {
    console.error('Get Connections Error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
};

// Remove a connection
const removeConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user.id;
    const conn = await prisma.connection.findUnique({ where: { id } });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.userAId !== me && conn.userBId !== me) return res.status(403).json({ error: 'Not your connection' });

    await prisma.connection.delete({ where: { id } });

    const { io } = require('../server');
    // Emit connection_removed event to both users
    io.emit('connection_removed', {
      connectionId: id,
      userAId: conn.userAId,
      userBId: conn.userBId
    });

    res.status(200).json({ message: 'Connection removed' });
  } catch (error) {
    console.error('Remove Connection Error:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
};

module.exports = { sendConnection, getMyConnections, removeConnection };
