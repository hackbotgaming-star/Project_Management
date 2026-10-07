const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'Specification',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileType: {
      type: String,
      default: 'PDF',
    },
    fileSize: {
      type: String,
      default: '1.2 MB',
    },
    version: {
      type: String,
      default: 'v1.0',
    },
    cloudinaryId: {
      type: String,
      default: null,
    },
    format: {
      type: String,
      default: '',
    },
    originalFilename: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);
