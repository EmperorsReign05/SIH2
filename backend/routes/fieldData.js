const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Models
const FieldData = require('../models/FieldData');
const Project = require('../models/Project');

// Middleware
const { validateFieldData } = require('../middleware/validation');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

/**
 * @route POST /api/field-data
 * @desc Submit field data from mobile app
 * @access Private
 */
router.post('/', upload.array('photos', 10), async (req, res) => {
  try {
    const { ipfs } = req.app.locals;
    const userId = req.user.id;

    // Validate input data
    const { error } = validateFieldData(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      projectName,
      location,
      area,
      species,
      plantingDate,
      survivalRate,
      notes,
      gpsCoordinates,
    } = req.body;

    // Parse GPS coordinates
    const [latitude, longitude] = gpsCoordinates.split(',').map(coord => parseFloat(coord.trim()));

    // Process and upload photos to IPFS
    const photoHashes = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Resize and optimize image
          const optimizedImage = await sharp(file.buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

          // Upload to IPFS
          const result = await ipfs.add(optimizedImage);
          photoHashes.push({
            hash: result.path,
            filename: file.originalname,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error processing photo:', error);
          return res.status(500).json({ error: 'Failed to process photos' });
        }
      }
    }

    // Create field data record
    const fieldData = await FieldData.query().insert({
      userId,
      projectName,
      location,
      area: parseFloat(area),
      species,
      plantingDate,
      survivalRate: parseFloat(survivalRate),
      notes,
      latitude,
      longitude,
      photoHashes: JSON.stringify(photoHashes),
      deviceInfo: req.body.deviceInfo || {},
      status: 'pending_verification',
    });

    // Check if project exists, create if not
    let project = await Project.query()
      .where('name', projectName)
      .first();

    if (!project) {
      project = await Project.query().insert({
        name: projectName,
        location,
        totalArea: parseFloat(area),
        projectType: 'mangrove', // Default, can be updated
        status: 'active',
        createdBy: userId,
      });
    } else {
      // Update project area
      await Project.query()
        .where('id', project.id)
        .patch({
          totalArea: project.totalArea + parseFloat(area),
        });
    }

    // Associate field data with project
    await fieldData.$relatedQuery('project').relate(project.id);

    res.status(201).json({
      message: 'Field data submitted successfully',
      fieldDataId: fieldData.id,
      projectId: project.id,
      photoCount: photoHashes.length,
    });

  } catch (error) {
    console.error('Field data submission error:', error);
    res.status(500).json({ error: 'Failed to submit field data' });
  }
});

/**
 * @route GET /api/field-data
 * @desc Get field data for user
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = FieldData.query()
      .where('userId', userId)
      .withGraphFetched('[project, verifications]')
      .orderBy('createdAt', 'desc');

    if (status) {
      query.where('status', status);
    }

    const fieldData = await query
      .page(page - 1, limit);

    res.json({
      fieldData: fieldData.results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: fieldData.total,
        pages: Math.ceil(fieldData.total / limit),
      },
    });

  } catch (error) {
    console.error('Get field data error:', error);
    res.status(500).json({ error: 'Failed to fetch field data' });
  }
});

/**
 * @route GET /api/field-data/:id
 * @desc Get specific field data entry
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fieldData = await FieldData.query()
      .where('id', id)
      .where('userId', userId)
      .withGraphFetched('[project, verifications]')
      .first();

    if (!fieldData) {
      return res.status(404).json({ error: 'Field data not found' });
    }

    res.json(fieldData);

  } catch (error) {
    console.error('Get field data error:', error);
    res.status(500).json({ error: 'Failed to fetch field data' });
  }
});

/**
 * @route PUT /api/field-data/:id
 * @desc Update field data entry
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const fieldData = await FieldData.query()
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!fieldData) {
      return res.status(404).json({ error: 'Field data not found' });
    }

    // Only allow updates if status is pending
    if (fieldData.status !== 'pending_verification') {
      return res.status(400).json({ error: 'Cannot update verified field data' });
    }

    const updatedFieldData = await FieldData.query()
      .where('id', id)
      .patch(updateData);

    res.json({
      message: 'Field data updated successfully',
      fieldData: updatedFieldData,
    });

  } catch (error) {
    console.error('Update field data error:', error);
    res.status(500).json({ error: 'Failed to update field data' });
  }
});

/**
 * @route DELETE /api/field-data/:id
 * @desc Delete field data entry
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fieldData = await FieldData.query()
      .where('id', id)
      .where('userId', userId)
      .first();

    if (!fieldData) {
      return res.status(404).json({ error: 'Field data not found' });
    }

    // Only allow deletion if status is pending
    if (fieldData.status !== 'pending_verification') {
      return res.status(400).json({ error: 'Cannot delete verified field data' });
    }

    await FieldData.query().where('id', id).delete();

    res.json({ message: 'Field data deleted successfully' });

  } catch (error) {
    console.error('Delete field data error:', error);
    res.status(500).json({ error: 'Failed to delete field data' });
  }
});

/**
 * @route POST /api/field-data/sync-offline
 * @desc Sync offline field data
 * @access Private
 */
router.post('/sync-offline', async (req, res) => {
  try {
    const { offlineData } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(offlineData)) {
      return res.status(400).json({ error: 'Invalid offline data format' });
    }

    const syncResults = [];
    const errors = [];

    for (const data of offlineData) {
      try {
        // Process each offline entry
        const fieldData = await FieldData.query().insert({
          userId,
          projectName: data.projectName,
          location: data.location,
          area: parseFloat(data.area),
          species: data.species,
          plantingDate: data.plantingDate,
          survivalRate: parseFloat(data.survivalRate),
          notes: data.notes,
          latitude: parseFloat(data.gpsCoordinates.split(',')[0]),
          longitude: parseFloat(data.gpsCoordinates.split(',')[1]),
          photoHashes: JSON.stringify(data.photos || []),
          deviceInfo: data.deviceInfo || {},
          status: 'pending_verification',
          createdAt: data.timestamp,
        });

        syncResults.push({
          originalId: data.id,
          newId: fieldData.id,
          status: 'synced',
        });
      } catch (error) {
        errors.push({
          originalId: data.id,
          error: error.message,
        });
      }
    }

    res.json({
      message: 'Offline data sync completed',
      synced: syncResults.length,
      errors: errors.length,
      results: syncResults,
      errorDetails: errors,
    });

  } catch (error) {
    console.error('Sync offline data error:', error);
    res.status(500).json({ error: 'Failed to sync offline data' });
  }
});

/**
 * @route GET /api/field-data/stats
 * @desc Get field data statistics for user
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await FieldData.query()
      .where('userId', userId)
      .select(
        FieldData.raw('COUNT(*) as total'),
        FieldData.raw('COUNT(CASE WHEN status = \'verified\' THEN 1 END) as verified'),
        FieldData.raw('COUNT(CASE WHEN status = \'pending_verification\' THEN 1 END) as pending'),
        FieldData.raw('SUM(area) as totalArea'),
        FieldData.raw('AVG(survivalRate) as avgSurvivalRate')
      )
      .first();

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
