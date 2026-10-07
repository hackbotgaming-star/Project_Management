const mongoose = require('mongoose');

const CohortSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    term: {
      type: String,
      default: 'Spring',
    },
    year: {
      type: Number,
      default: 2025,
    },
    department: {
      type: String,
      default: 'Computer Science & Engineering',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UPCOMING', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cohort', CohortSchema);
