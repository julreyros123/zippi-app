const prisma = require('../prisma');

// Get all resources with filters, pagination, and search
const getAllResources = async (req, res) => {
  try {
    const { page = 1, limit = 20, subject, category, grade, source, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    // Build where clause
    const where = {
      isActive: true,
      AND: []
    };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { tags: { some: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      });
    }

    if (subject) {
      where.AND.push({ subject: { equals: subject, mode: 'insensitive' } });
    }

    if (category) {
      where.AND.push({ category: { equals: category, mode: 'insensitive' } });
    }

    if (source) {
      where.AND.push({ source: { equals: source, mode: 'insensitive' } });
    }

    if (grade) {
      where.AND.push({ grade: { hasSome: [grade] } });
    }

    // If no AND conditions, remove the array
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Get total count
    const total = await prisma.resource.count({ where });

    // Fetch resources with pagination
    const resources = await prisma.resource.findMany({
      where,
      include: {
        tags: { select: { name: true } },
        _count: { select: { downloads: true, reviews: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    });

    // Calculate average rating for each resource
    const resourcesWithRatings = await Promise.all(
      resources.map(async (resource) => {
        const avgRating = await prisma.resourceReview.aggregate({
          where: { resourceId: resource.id },
          _avg: { rating: true }
        });
        return {
          ...resource,
          avgRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : null,
          reviewCount: resource._count.reviews,
          downloadCount: resource._count.downloads,
          tags: resource.tags.map(t => t.name)
        };
      })
    );

    res.status(200).json({
      resources: resourcesWithRatings,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get Resources Error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

// Get single resource with reviews and stats
const getResourceDetail = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        tags: { select: { name: true } },
        creator: { select: { id: true, username: true, nickname: true } },
        _count: { select: { downloads: true, reviews: true } }
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Get reviews
    const reviews = await prisma.resourceReview.findMany({
      where: { resourceId },
      include: {
        user: { select: { id: true, username: true, nickname: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get average rating
    const avgRating = await prisma.resourceReview.aggregate({
      where: { resourceId },
      _avg: { rating: true }
    });

    // Get user's own review if exists
    let userReview = null;
    if (req.user) {
      userReview = await prisma.resourceReview.findUnique({
        where: {
          userId_resourceId: {
            userId: req.user.id,
            resourceId
          }
        }
      });
    }

    res.status(200).json({
      resource: {
        ...resource,
        tags: resource.tags.map(t => t.name),
        downloadCount: resource._count.downloads,
        reviewCount: resource._count.reviews
      },
      reviews,
      avgRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : null,
      userReview
    });
  } catch (error) {
    console.error('Get Resource Detail Error:', error);
    res.status(500).json({ error: 'Failed to fetch resource details' });
  }
};

// Create a new resource (community upload, admin only for now)
const createResource = async (req, res) => {
  try {
    const { title, description, author, subject, category, grade, tags, license } = req.body;

    if (!title || !description || !author || !subject || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // For now, only admins can create resources (future: allow community with moderation)
    // TODO: Add role checking when admin roles are implemented

    const gradeArray = Array.isArray(grade) ? grade : (grade ? [grade] : ['College']);
    const tagsArray = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        author,
        subject,
        category,
        grade: gradeArray,
        license: license || 'CC BY 4.0',
        source: 'Community',
        fileUrl: req.file.path, // From Cloudinary
        fileType: req.file.mimetype,
        creatorId: req.user.id,
        tags: {
          create: tagsArray.map(tag => ({ name: tag }))
        }
      },
      include: {
        tags: { select: { name: true } }
      }
    });

    res.status(201).json({
      message: 'Resource created successfully',
      resource: {
        ...resource,
        tags: resource.tags.map(t => t.name)
      }
    });
  } catch (error) {
    console.error('Create Resource Error:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

// Update resource (creator/admin only)
const updateResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { title, description, tags, isActive } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check authorization (creator or admin)
    if (resource.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this resource' });
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        tags: { select: { name: true } },
        _count: { select: { downloads: true, reviews: true } }
      }
    });

    res.status(200).json({
      message: 'Resource updated successfully',
      resource: {
        ...updated,
        tags: updated.tags.map(t => t.name),
        downloadCount: updated._count.downloads,
        reviewCount: updated._count.reviews
      }
    });
  } catch (error) {
    console.error('Update Resource Error:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

// Delete resource (creator/admin only)
const deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check authorization (creator or admin)
    if (resource.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this resource' });
    }

    await prisma.resource.delete({
      where: { id: resourceId }
    });

    res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete Resource Error:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};

// Get search filter options
const getFilterOptions = async (req, res) => {
  try {
    const [subjects, categories, sources, grades] = await Promise.all([
      prisma.resource.findMany({
        where: { isActive: true },
        distinct: ['subject'],
        select: { subject: true }
      }),
      prisma.resource.findMany({
        where: { isActive: true },
        distinct: ['category'],
        select: { category: true }
      }),
      prisma.resource.findMany({
        where: { isActive: true },
        distinct: ['source'],
        select: { source: true }
      })
    ]);

    const gradeSet = new Set();
    const allResources = await prisma.resource.findMany({
      where: { isActive: true },
      select: { grade: true }
    });
    allResources.forEach(r => {
      r.grade.forEach(g => gradeSet.add(g));
    });

    res.status(200).json({
      subjects: subjects.map(s => s.subject).sort(),
      categories: categories.map(c => c.category).sort(),
      sources: sources.map(s => s.source).sort(),
      grades: Array.from(gradeSet).sort()
    });
  } catch (error) {
    console.error('Get Filter Options Error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const suggestions = await prisma.resource.findMany({
      where: {
        isActive: true,
        title: { contains: q, mode: 'insensitive' }
      },
      select: { title: true },
      distinct: ['title'],
      orderBy: { downloadCount: 'desc' },
      take: 10
    });

    res.status(200).json({
      suggestions: suggestions.map(s => s.title)
    });
  } catch (error) {
    console.error('Get Search Suggestions Error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

// Track download and increment counter
const trackDownload = async (req, res) => {
  try {
    const { resourceId } = req.params;

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Record download (upsert to prevent duplicates)
    await prisma.download.upsert({
      where: {
        userId_resourceId: {
          userId: req.user.id,
          resourceId
        }
      },
      update: {
        downloadedAt: new Date()
      },
      create: {
        userId: req.user.id,
        resourceId
      }
    });

    // Increment download count on resource
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    });

    res.status(200).json({
      message: 'Download tracked',
      downloadUrl: resource.fileUrl,
      fileName: resource.title
    });
  } catch (error) {
    console.error('Track Download Error:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
};

// Get user's download history
const getDownloadHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * pageSize;

    const downloads = await prisma.download.findMany({
      where: { userId: req.user.id },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            author: true,
            subject: true,
            category: true
          }
        }
      },
      orderBy: { downloadedAt: 'desc' },
      skip,
      take: pageSize
    });

    const total = await prisma.download.count({
      where: { userId: req.user.id }
    });

    res.status(200).json({
      downloads: downloads.map(d => ({
        ...d.resource,
        downloadedAt: d.downloadedAt
      })),
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get Download History Error:', error);
    res.status(500).json({ error: 'Failed to fetch download history' });
  }
};

module.exports = {
  getAllResources,
  getResourceDetail,
  createResource,
  updateResource,
  deleteResource,
  getFilterOptions,
  getSearchSuggestions,
  trackDownload,
  getDownloadHistory
};
