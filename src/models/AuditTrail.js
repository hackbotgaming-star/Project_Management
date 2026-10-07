const mongoose = require('mongoose');

const AuditTrailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    role: {
      type: String,
      default: 'SYSTEM',
    },
    action: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      default: 'SYSTEM',
    },
    targetId: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = mongoose.model('AuditTrail', AuditTrailSchema);
