const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    abstract: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'Computer Science & Engineering',
    },
    cohort: {
      type: String,
      default: 'CS-492 Capstone Cohort 2025',
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'IN_PROGRESS', 'UNDER_REVIEW', 'DEFENSE_SCHEDULED', 'APPROVED', 'NEEDS_REVISION', 'COMPLETED'],
      default: 'IN_PROGRESS',
    },
    health: {
      type: String,
      enum: ['ON_TRACK', 'AT_RISK', 'DELAYED'],
      default: 'ON_TRACK',
    },
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    facultyMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    defenseDate: {
      type: Date,
      default: null,
    },
    defenseLocation: {
      type: String,
      default: 'Engineering Hall 304 / Zoom',
    },
    tags: [
      {
        type: String,
      },
    ],
    repositoryUrl: {
      type: String,
      default: '',
    },
    documentationUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', ProjectSchema);
