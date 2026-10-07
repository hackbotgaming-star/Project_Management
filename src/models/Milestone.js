const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    deliverableUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'],
      default: 'PENDING',
    },
    submissionNotes: {
      type: String,
      default: '',
    },
    submittedDeliverable: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    facultyFeedback: {
      type: String,
      default: '',
    },
    grade: {
      type: String,
      default: '',
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Milestone', MilestoneSchema);
