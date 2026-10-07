const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const AuditTrail = require('../models/AuditTrail');

// GET /api/milestones
// Role-scoped listing
exports.getMilestones = async (req, res) => {
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

    const milestones = await Milestone.find(filter)
      .populate('project', 'title code facultyMentor teamMembers')
      .populate('submittedBy', 'name email avatar')
      .populate('evaluatedBy', 'name email title')
      .sort({ dueDate: 1 });

    return res.json({ success: true, count: milestones.length, milestones });
  } catch (err) {
    console.error('getMilestones error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve milestones.' });
  }
};

// POST /api/milestones
// FACULTY or ADMIN creates official milestone (STUDENT CANNOT)
exports.createMilestone = async (req, res) => {
  try {
    if (req.user.role === 'STUDENT') {
      return res.status(403).json({ success: false, message: 'Permission denied: Students cannot create official milestones.' });
    }

    const { projectId, title, description, dueDate, deliverableUrl } = req.body;
    if (!projectId || !title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Project ID, title, and due date are required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (req.user.role === 'FACULTY' && project.facultyMentor && project.facultyMentor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied: You do not mentor this project.' });
    }

    const milestone = await Milestone.create({
      project: projectId,
      title,
      description: description || '',
      dueDate,
      deliverableUrl: deliverableUrl || '',
      status: 'PENDING',
    });

    // Notify students
    for (const memberId of project.teamMembers) {
      await Notification.create({
        user: memberId,
        title: 'New Milestone Created',
        message: `Faculty created milestone: "${milestone.title}" due ${new Date(dueDate).toLocaleDateString()}.`,
        type: 'INFO',
        link: '/student/dashboard#milestones',
      });
    }

    return res.status(201).json({ success: true, message: 'Milestone created.', milestone });
  } catch (err) {
    console.error('createMilestone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create milestone.' });
  }
};

// POST /api/milestones/:id/submit
// STUDENT submits deliverable & notes for faculty review
exports.submitMilestone = async (req, res) => {
  try {
    const { submissionNotes, deliverableUrl, submittedDeliverable } = req.body;

    const milestone = await Milestone.findById(req.params.id).populate('project');
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    // Role check: Only students assigned to this project can submit
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ success: false, message: 'Only assigned students can submit milestone deliverables.' });
    }

    const isMember = milestone.project.teamMembers.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this project team.' });
    }

    milestone.submissionNotes = submissionNotes || milestone.submissionNotes;
    milestone.deliverableUrl = deliverableUrl || milestone.deliverableUrl;
    milestone.submittedDeliverable = submittedDeliverable || 'Phase Deliverable Document';
    milestone.submittedAt = new Date();
    milestone.submittedBy = req.user._id;
    milestone.status = 'SUBMITTED';
    await milestone.save();

    // Notify faculty advisor
    if (milestone.project.facultyMentor) {
      await Notification.create({
        user: milestone.project.facultyMentor,
        title: `Submission Received: ${milestone.project.code}`,
        message: `${req.user.name} submitted "${milestone.title}" for your evaluation.`,
        type: 'WARNING',
        link: '/faculty/dashboard#reviews',
      });
    }

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'STUDENT',
      action: 'SUBMIT_MILESTONE',
      targetType: 'MILESTONE',
      targetId: milestone._id.toString(),
      details: `Student submitted milestone "${milestone.title}" for review.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Deliverable submitted for faculty review.', milestone });
  } catch (err) {
    console.error('submitMilestone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit milestone.' });
  }
};

// POST /api/milestones/:id/review
// FACULTY reviews submission: approve, request changes, provide feedback
// (STUDENT CANNOT CALL THIS - Strictly 403 Forbidden)
exports.reviewMilestone = async (req, res) => {
  try {
    if (req.user.role === 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Students cannot approve milestones or evaluate submissions.',
      });
    }

    const { status, facultyFeedback, grade } = req.body;
    if (!['APPROVED', 'CHANGES_REQUESTED', 'IN_REVIEW'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status. Must be APPROVED, CHANGES_REQUESTED, or IN_REVIEW.',
      });
    }

    const milestone = await Milestone.findById(req.params.id).populate('project');
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    // If Faculty, verify they are the assigned mentor or assign them if pending
    if (req.user.role === 'FACULTY') {
      const isMentor = milestone.project.facultyMentor && milestone.project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        if (!milestone.project.facultyMentor) {
          milestone.project.facultyMentor = req.user._id;
          await milestone.project.save();
        } else {
          return res.status(403).json({ success: false, message: 'You are not the assigned advisor for this project.' });
        }
      }
    }

    milestone.status = status;
    milestone.facultyFeedback = facultyFeedback || milestone.facultyFeedback;
    milestone.grade = grade || milestone.grade;
    milestone.evaluatedBy = req.user._id;
    milestone.reviewedAt = new Date();
    await milestone.save();

    // If approved, update project progress percentage
    if (status === 'APPROVED') {
      const allMilestones = await Milestone.find({ project: milestone.project._id });
      const approvedCount = allMilestones.filter((m) => m.status === 'APPROVED').length;
      const newProgress = Math.round((approvedCount / allMilestones.length) * 100);
      await Project.findByIdAndUpdate(milestone.project._id, { progressPercentage: newProgress });
    }

    // Notify team members
    for (const memberId of milestone.project.teamMembers) {
      await Notification.create({
        user: memberId,
        title: `Milestone ${status === 'APPROVED' ? 'Approved' : 'Feedback Provided'}`,
        message: `Advisor ${req.user.name}: "${milestone.title}" marked as ${status}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        link: '/student/dashboard#milestones',
      });
    }

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `REVIEW_MILESTONE_${status}`,
      targetType: 'MILESTONE',
      targetId: milestone._id.toString(),
      details: `${req.user.role} marked milestone "${milestone.title}" as ${status}. Feedback: ${facultyFeedback || 'None'}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Milestone status set to ${status}.`, milestone });
  } catch (err) {
    console.error('reviewMilestone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to review milestone.' });
  }
};
