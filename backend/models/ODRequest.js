const mongoose = require('mongoose');

const ODRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Event Details
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    organizingInstitute: {
      type: String,
      required: true,
      trim: true,
    },
    // Supporting Document / Invitation Letter
    supportingDocumentUrl: {
      type: String,
      default: '',
    },
    supportingDocumentName: {
      type: String,
      default: '',
    },
    // Workflow State
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'FACULTY_REVIEW',
        'ADMIN_REVIEW',
        'HOD_REVIEW',
        'APPROVED',
        'REJECTED',
        'CHANGES_REQUESTED',
        'WITHDRAWN',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    currentStage: {
      type: String,
      enum: ['FACULTY', 'ADMIN', 'HOD', 'COMPLETED'],
      default: 'FACULTY',
      index: true,
    },
    // Reviewers
    facultyReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hodReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // HOD Availability & Admin Bypass
    hodAvailable: {
      type: Boolean,
      default: true,
    },
    hodBypassReason: {
      type: String,
      default: '',
    },
    // Final Decision Summary
    finalDecision: {
      status: {
        type: String,
        enum: ['APPROVED', 'REJECTED', null],
        default: null,
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      decisionDate: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: '',
      },
    },
    // Approval History Audit Log
    approvalHistory: [
      {
        action: {
          type: String,
          required: true,
        },
        stage: {
          type: String,
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        performerName: {
          type: String,
          default: '',
        },
        performerRole: {
          type: String,
          default: '',
        },
        comments: {
          type: String,
          default: '',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ODRequest', ODRequestSchema);
