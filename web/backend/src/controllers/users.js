const prisma = require('../prisma');

// List all users (excluding self) for Classmates discovery
const listUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: q ? [
          { username: { contains: q, mode: 'insensitive' } },
          { nickname: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } }
        ] : undefined
      },
      select: { id: true, username: true, nickname: true, bio: true, subject: true, createdAt: true },
      orderBy: { username: 'asc' },
      take: 100 // Limit results to 100 users max
    });

    // Enrich with online status
    const onlineUsers = global.onlineUsers || new Map();
    const enrichedUsers = users.map(user => ({
      ...user,
      isOnline: onlineUsers.has(user.id)
    }));

    res.status(200).json(enrichedUsers);
  } catch (error) {
    console.error('List Users Error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
};

// Update current user profile (nickname, bio, subject)
const updateProfile = async (req, res) => {
  try {
    const { nickname, bio, subject } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { nickname, bio, subject },
      select: { id: true, username: true, nickname: true, email: true, bio: true, subject: true }
    });
    res.status(200).json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

module.exports = { listUsers, updateProfile };
