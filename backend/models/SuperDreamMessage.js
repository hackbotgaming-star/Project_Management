const mongoose = require('mongoose');

const SuperDreamMessageSchema = new mongoose.Schema(
  {
    superDream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperDream',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'ADMIN', 'HOD'],
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['ANNOUNCEMENT', 'RESOURCE', 'TASK', 'MESSAGE', 'MEETING'],
      default: 'MESSAGE',
    },
    links: [
      {
        title: { type: String, default: '' },
        url: { type: String, default: '' },
      },
    ],
    comments: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SuperDreamMessage', SuperDreamMessageSchema);
