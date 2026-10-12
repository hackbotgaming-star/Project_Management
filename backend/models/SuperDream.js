const mongoose = require('mongoose');

const SuperDreamSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mentees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    cohort: {
      type: String,
      default: 'Super Dream Track (3rd Year)',
    },
    academicYear: {
      type: String,
      default: '3rd Year',
    },
    category: {
      type: String,
      enum: ['MARQUEE', 'SUPER_DREAM', 'DREAM'],
      default: 'SUPER_DREAM',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SuperDream', SuperDreamSchema);
