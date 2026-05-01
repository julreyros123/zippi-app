const prisma = require('../prisma');

// Get channels the current user belongs to
const getAllChannels = async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        members: { some: { userId: req.user.id } }
      },
      include: {
        _count: { select: { members: true, messages: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(channels);
  } catch (error) {
    console.error('Get Channels Error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

// Search PUBLIC channels by name/tags
const searchPublicChannels = async (req, res) => {
  try {
    const { q } = req.query;
    const channels = await prisma.channel.findMany({
      where: {
        isPrivate: false,
        OR: [
          { name: { contains: q || '', mode: 'insensitive' } },
          { description: { contains: q || '', mode: 'insensitive' } },
          { tags: { contains: q || '', mode: 'insensitive' } }
        ]
      },
      include: {
        _count: { select: { members: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit results to 50 channels max
    });
    res.status(200).json(channels);
  } catch (error) {
    console.error('Search Channels Error:', error);
    res.status(500).json({ error: 'Failed to search channels' });
  }
};

// Get single channel info with members
const getChannelInfo = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, nickname: true } } },
          orderBy: { joinedAt: 'asc' }
        },
        _count: { select: { messages: true } }
      }
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    
    // Check if requester is a member
    const isMember = channel.members.some(m => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    res.status(200).json(channel);
  } catch (error) {
    console.error('Get Channel Info Error:', error);
    res.status(500).json({ error: 'Failed to fetch channel info' });
  }
};

// Create a channel
const createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Channel name is required' });

    const normalizedName = name.trim().toLowerCase();
    
    // Enforce unique channel names
    const existing = await prisma.channel.findFirst({ where: { name: normalizedName } });
    if (existing) {
      return res.status(400).json({ error: 'A channel with this name already exists' });
    }

    const channel = await prisma.channel.create({
      data: {
        name: normalizedName,
        description,
        isPrivate: isPrivate !== undefined ? isPrivate : true,
        tags: tags || null,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN'
          }
        }
      }
    });
    res.status(201).json(channel);
  } catch (error) {
    console.error('Create Channel Error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

// Delete channel — admin only
const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete this channel' });
    }

    // Delete in order: reactions → messages → members → channel
    await prisma.reaction.deleteMany({ where: { message: { channelId } } });
    await prisma.message.deleteMany({ where: { channelId } });
    await prisma.channelMember.deleteMany({ where: { channelId } });
    await prisma.channel.delete({ where: { id: channelId } });

    res.status(200).json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Delete Channel Error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};

// Toggle mute for current user in a channel
const toggleMute = async (req, res) => {
  try {
    const { channelId } = req.params;
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (!membership) return res.status(404).json({ error: 'Not a member of this channel' });

    const updated = await prisma.channelMember.update({
      where: { userId_channelId: { userId: req.user.id, channelId } },
      data: { isMuted: !membership.isMuted }
    });
    res.status(200).json({ isMuted: updated.isMuted });
  } catch (error) {
    console.error('Toggle Mute Error:', error);
    res.status(500).json({ error: 'Failed to toggle mute' });
  }
};

// Invite a member
const inviteMember = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { username } = req.body;

    const isAdmin = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (!isAdmin || isAdmin.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can invite members' });
    }

    const userToInvite = await prisma.user.findUnique({ where: { username } });
    if (!userToInvite) return res.status(404).json({ error: 'User not found' });

    const newMember = await prisma.channelMember.create({
      data: { userId: userToInvite.id, channelId, role: 'MEMBER' }
    });
    res.status(200).json({ message: 'User invited successfully', member: newMember });
  } catch (error) {
    console.error('Invite Member Error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'User is already in this channel' });
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

// Join a public channel
const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.isPrivate) return res.status(403).json({ error: 'Cannot join a private channel' });

    const existing = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (existing) return res.status(400).json({ error: 'Already a member' });

    await prisma.channelMember.create({ data: { userId: req.user.id, channelId, role: 'MEMBER' } });
    res.status(200).json({ message: 'Joined channel successfully' });
  } catch (error) {
    console.error('Join Channel Error:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

// Get channel notebook
const getNotebook = async (req, res) => {
  try {
    const { channelId } = req.params;
    // Check if member
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { notebook: true } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.status(200).json({ notebook: channel.notebook || '' });
  } catch (error) {
    console.error('Get Notebook Error:', error);
    res.status(500).json({ error: 'Failed to fetch notebook' });
  }
};

// Update channel notebook
const updateNotebook = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { notebook } = req.body;
    // Check if member
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId: req.user.id, channelId } }
    });
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: { notebook }
    });
    res.status(200).json({ notebook: channel.notebook });
  } catch (error) {
    console.error('Update Notebook Error:', error);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
};

module.exports = {
  getAllChannels,
  searchPublicChannels,
  getChannelInfo,
  createChannel,
  deleteChannel,
  toggleMute,
  inviteMember,
  joinChannel,
  getNotebook,
  updateNotebook
};
