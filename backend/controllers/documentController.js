const path = require('path');
const Document = require('../models/Document');
const Project = require('../models/Project');
const AuditTrail = require('../models/AuditTrail');
const { uploadBuffer } = require('../config/cloudinary');

// GET /api/documents
// Role-scoped document retrieval
exports.getDocuments = async (req, res) => {
  try {
    let allowedProjectIds = [];

    if (req.user.role === 'STUDENT') {
      const myProjects = await Project.find({ teamMembers: req.user._id }).select('_id');
      allowedProjectIds = myProjects.map((p) => p._id);
    } else if (req.user.role === 'FACULTY') {
      const myProjects = await Project.find({ facultyMentor: req.user._id }).select('_id');
      allowedProjectIds = myProjects.map((p) => p._id);
    } else if (req.user.role === 'ADMIN') {
      const allProjects = await Project.find().select('_id');
      allowedProjectIds = allProjects.map((p) => p._id);
    }

    const { projectId } = req.query;
    let filter = { project: { $in: allowedProjectIds } };
    if (projectId) {
      if (!allowedProjectIds.some((id) => id.toString() === projectId.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized for this project.' });
      }
      filter.project = projectId;
    }

    const documents = await Document.find(filter)
      .populate('project', 'title code')
      .populate('uploadedBy', 'name email avatar role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: documents.length, documents });
  } catch (err) {
    console.error('getDocuments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve documents.' });
  }
};

// POST /api/documents
// Upload document to Cloudinary and record in database
exports.createDocument = async (req, res) => {
  try {
    const { projectId, taskId, title, category, version, fileUrl: customFileUrl } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ success: false, message: 'Project ID and document title are required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Role check
    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this project.' });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = project.facultyMentor && project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        return res.status(403).json({ success: false, message: 'You are not the mentor for this project.' });
      }
    }

    let finalFileUrl = customFileUrl || '';
    let finalFileType = 'PDF';
    let finalFileSize = '1.2 MB';
    let cloudinaryId = null;
    let format = '';
    let originalFilename = '';

    // If file buffer was uploaded via Multer -> Stream to Cloudinary
    if (req.file) {
      originalFilename = req.file.originalname;
      const parsedExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();
      finalFileType = (parsedExt || 'file').toUpperCase();
      finalFileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;

      const safeBaseName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const publicId = `doc_${Date.now()}_${safeBaseName}`;

      try {
        const cloudResult = await uploadBuffer(req.file.buffer, {
          public_id: publicId,
          resource_type: 'auto',
          tags: ['projecthub', project.code || 'academic', req.user.role.toLowerCase()],
        });

        finalFileUrl = cloudResult.secure_url;
        cloudinaryId = cloudResult.public_id;
        format = cloudResult.format || parsedExt;
        if (cloudResult.bytes) {
          finalFileSize = `${(cloudResult.bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        return res.status(502).json({
          success: false,
          message: 'Failed to upload document to Cloudinary: ' + cloudErr.message,
        });
      }
    }

    if (!finalFileUrl) {
      finalFileUrl = `https://res.cloudinary.com/ta1atd4t/raw/upload/projecthub_documents/${encodeURIComponent(title)}.pdf`;
    }

    const doc = await Document.create({
      project: projectId,
      task: taskId || null,
      title: title.trim(),
      category: category || 'Specification',
      fileUrl: finalFileUrl,
      fileType: finalFileType,
      fileSize: finalFileSize,
      version: version || 'v1.0',
      cloudinaryId,
      format,
      originalFilename,
      uploadedBy: req.user._id,
    });

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'UPLOAD_DOCUMENT_CLOUDINARY',
      targetType: 'DOCUMENT',
      targetId: doc._id.toString(),
      details: `Uploaded document "${doc.title}" to Cloudinary for project "${project.title}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const populated = await Document.findById(doc._id)
      .populate('project', 'title code')
      .populate('uploadedBy', 'name email avatar role');

    return res.status(201).json({
      success: true,
      message: 'Document uploaded to Cloudinary successfully.',
      document: populated,
    });
  } catch (err) {
    console.error('createDocument error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload document.' });
  }
};
