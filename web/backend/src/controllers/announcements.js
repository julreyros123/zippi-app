const prisma = require('../prisma');

// List all announcements (newest first)
const listAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { author: { select: { id: true, username: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    // Parse fileUrls/fileTypes from JSON strings
    const parsed = announcements.map(a => ({
      ...a,
      fileUrls:  a.fileUrls  ? JSON.parse(a.fileUrls)  : [],
      fileTypes: a.fileTypes ? JSON.parse(a.fileTypes) : [],
    }));
    res.status(200).json(parsed);
  } catch (error) {
    console.error('List Announcements Error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// Create an announcement (with optional file attachments)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, badge, fileUrls, fileTypes } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    // Validate fileUrls and fileTypes match in length
    if (fileUrls || fileTypes) {
      const urlsArray = Array.isArray(fileUrls) ? fileUrls : [];
      const typesArray = Array.isArray(fileTypes) ? fileTypes : [];

      if (urlsArray.length !== typesArray.length) {
        return res.status(400).json({ error: 'fileUrls and fileTypes must have matching lengths' });
      }

      if (urlsArray.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 files allowed' });
      }
    }

    const ann = await prisma.announcement.create({
      data: {
        title:     title    || null,
        content,
        badge:     badge    || 'General',
        fileUrls:  fileUrls  && fileUrls.length  ? JSON.stringify(fileUrls)  : null,
        fileTypes: fileTypes && fileTypes.length ? JSON.stringify(fileTypes) : null,
        authorId:  req.user.id
      },
      include: { author: { select: { id: true, username: true, nickname: true } } }
    });

    res.status(201).json({
      ...ann,
      fileUrls:  ann.fileUrls  ? JSON.parse(ann.fileUrls)  : [],
      fileTypes: ann.fileTypes ? JSON.parse(ann.fileTypes) : [],
    });
  } catch (error) {
    console.error('Create Announcement Error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

// Delete an announcement (only the author)
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    if (ann.authorId !== req.user.id) return res.status(403).json({ error: 'Not your announcement' });
    await prisma.announcement.delete({ where: { id } });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete Announcement Error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
