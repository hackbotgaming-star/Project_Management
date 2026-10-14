const ODRequest = require('../models/ODRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadBuffer } = require('../config/cloudinary');

// Safe notification dispatch helper
async function notifyUser(userId, title, message, type = 'INFO', link = '') {
  try {
    if (!userId) return;
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// Generate human-readable unique Request ID (OD-YYYY-XXXX)
async function generateRequestId() {
  const year = new Date().getFullYear();
  const count = await ODRequest.countDocuments();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `OD-${year}-${String(count + 1).padStart(3, '0')}${randomSuffix}`;
}

// ==========================================
// 1. STUDENT CONTROLLERS
// ==========================================

// GET /api/od/faculty-list
// Return list of active faculty members for student OD faculty selection
exports.getFacultyList = async (req, res) => {
  try {
    const faculty = await User.find({ role: 'FACULTY', status: 'ACTIVE' })
      .select('name email department title avatar')
      .sort({ name: 1 });
    return res.json({ success: true, count: faculty.length, faculty });
  } catch (err) {
    console.error('getFacultyList error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve faculty list.' });
  }
};

// POST /api/od
// Student submits a new On-Duty Request
exports.submitODRequest = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ success: false, message: 'Only students can submit OD requests.' });
    }

    const { eventName, purpose, startDate, endDate, venue, organizingInstitute, facultyId } = req.body;
    let customDocUrl = req.body.supportingDocumentUrl || '';
    let docName = req.body.supportingDocumentName || '';

    if (!eventName || !purpose || !startDate || !endDate || !venue || !organizingInstitute) {
      return res.status(400).json({
        success: false,
        message: 'All event details (name, purpose, start date, end date, venue, organizing institute) are required.',
      });
    }

    // Process file attachment if uploaded
    if (req.file) {
      docName = req.file.originalname;
      try {
        const uploadResult = await uploadBuffer(req.file.buffer, {
          folder: 'projecthub_od_documents',
          resource_type: 'auto',
        });
        customDocUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
        // Fallback: save filename and mark local/placeholder
        customDocUrl = customDocUrl || `/uploads/od/${req.file.originalname}`;
      }
    }

    const requestId = await generateRequestId();

    const newOD = new ODRequest({
      requestId,
      student: req.user._id,
      facultyReviewer: facultyId || undefined,
      eventName: eventName.trim(),
      purpose: purpose.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      venue: venue.trim(),
      organizingInstitute: organizingInstitute.trim(),
      supportingDocumentUrl: customDocUrl,
      supportingDocumentName: docName,
      status: 'SUBMITTED',
      currentStage: 'FACULTY',
      approvalHistory: [
        {
          action: 'SUBMITTED',
          stage: 'FACULTY',
          performedBy: req.user._id,
          performerName: req.user.name,
          performerRole: req.user.role,
          comments: facultyId
            ? 'OD Request submitted by student and assigned to selected faculty reviewer.'
            : 'OD Request submitted by student.',
          timestamp: new Date(),
        },
      ],
    });

    await newOD.save();

    // Notify the student
    await notifyUser(
      req.user._id,
      'OD Request Submitted',
      `Your On-Duty request (${requestId}) for "${eventName}" has been submitted for Faculty review.`,
      'INFO',
      '/student/dashboard'
    );

    // Notify chosen faculty reviewer or student's mentor or departmental faculty
    let facultyToNotify = [];
    if (facultyId) {
      facultyToNotify.push(facultyId);
    } else if (req.user.mentor) {
      facultyToNotify.push(req.user.mentor);
    } else {
      const deptFaculty = await User.find({
        role: 'FACULTY',
        department: req.user.department || 'Artificial Intelligence & Machine Learning',
      }).select('_id');
      facultyToNotify = deptFaculty.map((f) => f._id);
    }

    for (const facId of facultyToNotify) {
      await notifyUser(
        facId,
        'New OD Request Awaiting Review',
        `Student ${req.user.name} (${req.user.studentId || 'Reg No N/A'}) submitted OD Request ${requestId} for "${eventName}".`,
        'INFO',
        '/faculty/dashboard'
      );
    }

    const populatedOD = await ODRequest.findById(newOD._id)
      .populate('student', 'name email studentId department academicYear section avatar')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title');

    return res.status(201).json({
      success: true,
      message: 'OD Request submitted successfully.',
      odRequest: populatedOD,
    });
  } catch (err) {
    console.error('submitODRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit OD request: ' + err.message });
  }
};

// GET /api/od/my
// Get current authenticated student's OD requests
exports.getMyODRequests = async (req, res) => {
  try {
    const requests = await ODRequest.find({ student: req.user._id })
      .populate('student', 'name email studentId department academicYear section avatar')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title')
      .populate('finalDecision.decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('getMyODRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve OD requests.' });
  }
};

// PATCH /api/od/:id/resubmit
// Student resubmits request after CHANGES_REQUESTED
exports.resubmitODRequest = async (req, res) => {
  try {
    const od = await ODRequest.findById(req.params.id);
    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    if (od.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to resubmit this request.' });
    }

    if (od.status !== 'CHANGES_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: `Cannot resubmit request currently in status '${od.status}'. Only requests with 'CHANGES_REQUESTED' can be resubmitted.`,
      });
    }

    const { eventName, purpose, startDate, endDate, venue, organizingInstitute, comments } = req.body;
    if (eventName) od.eventName = eventName.trim();
    if (purpose) od.purpose = purpose.trim();
    if (startDate) od.startDate = new Date(startDate);
    if (endDate) od.endDate = new Date(endDate);
    if (venue) od.venue = venue.trim();
    if (organizingInstitute) od.organizingInstitute = organizingInstitute.trim();

    if (req.file) {
      od.supportingDocumentName = req.file.originalname;
      try {
        const uploadResult = await uploadBuffer(req.file.buffer, {
          folder: 'projecthub_od_documents',
          resource_type: 'auto',
        });
        od.supportingDocumentUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        od.supportingDocumentUrl = `/uploads/od/${req.file.originalname}`;
      }
    } else if (req.body.supportingDocumentUrl) {
      od.supportingDocumentUrl = req.body.supportingDocumentUrl;
    }

    od.status = 'FACULTY_REVIEW';
    od.currentStage = 'FACULTY';
    od.comments = comments || 'Student resubmitted with requested modifications.';

    od.approvalHistory.push({
      action: 'RESUBMITTED',
      stage: 'FACULTY',
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      comments: comments || 'Student resubmitted with requested updates.',
      timestamp: new Date(),
    });

    await od.save();

    // Notify Faculty reviewer or mentor
    const targetFacultyId = od.facultyReviewer || req.user.mentor;
    if (targetFacultyId) {
      await notifyUser(
        targetFacultyId,
        'OD Request Resubmitted',
        `Student ${req.user.name} resubmitted OD Request ${od.requestId} with updates.`,
        'INFO',
        '/faculty/dashboard'
      );
    }

    return res.json({
      success: true,
      message: 'OD Request resubmitted successfully for review.',
      odRequest: od,
    });
  } catch (err) {
    console.error('resubmitODRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resubmit OD request.' });
  }
};

// PATCH /api/od/:id/withdraw
// Student withdraws pending request
exports.withdrawODRequest = async (req, res) => {
  try {
    const od = await ODRequest.findById(req.params.id);
    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    if (od.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to withdraw this request.' });
    }

    if (od.status === 'APPROVED' || od.status === 'REJECTED' || od.status === 'WITHDRAWN') {
      return res.status(400).json({ success: false, message: `Cannot withdraw request that is already ${od.status}.` });
    }

    od.status = 'WITHDRAWN';
    od.currentStage = 'COMPLETED';
    od.approvalHistory.push({
      action: 'WITHDRAWN',
      stage: od.currentStage,
      performedBy: req.user._id,
      performerName: req.user.name,
      performerRole: req.user.role,
      comments: req.body.reason || 'Withdrawn by student.',
      timestamp: new Date(),
    });

    await od.save();

    return res.json({ success: true, message: 'OD Request successfully withdrawn.', odRequest: od });
  } catch (err) {
    console.error('withdrawODRequest error:', err);
    return res.status(500).json({ success: false, message: 'Failed to withdraw OD request.' });
  }
};

// ==========================================
// 2. FACULTY CONTROLLERS
// ==========================================

// GET /api/od/faculty/pending
// Faculty gets OD requests pending their review or reviewed by them
exports.getFacultyODRequests = async (req, res) => {
  try {
    // Show requests assigned to this faculty, unassigned requests awaiting faculty review, or any request reviewed by them
    const requests = await ODRequest.find({
      $or: [
        { facultyReviewer: req.user._id },
        { facultyReviewer: null },
        { facultyReviewer: { $exists: false } },
        { status: { $in: ['SUBMITTED', 'FACULTY_REVIEW'] } },
        { 'approvalHistory.performedBy': req.user._id },
      ],
    })
      .populate('student', 'name email studentId department academicYear section avatar mentor')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title')
      .populate('finalDecision.decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('getFacultyODRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve faculty OD requests.' });
  }
};

// PATCH /api/od/faculty/:id/action
// Faculty action: APPROVE_FORWARD, REQUEST_CHANGES, REJECT
exports.facultyAction = async (req, res) => {
  try {
    const { action, comments, reason } = req.body;
    const od = await ODRequest.findById(req.params.id).populate('student', 'name email');
    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    if (od.status !== 'SUBMITTED' && od.status !== 'FACULTY_REVIEW') {
      return res.status(400).json({
        success: false,
        message: `Request is currently in '${od.status}' stage and cannot be acted upon by Faculty.`,
      });
    }

    const actionComment = (comments || reason || '').trim();
    od.facultyReviewer = req.user._id;

    if (action === 'APPROVE_FORWARD') {
      od.status = 'ADMIN_REVIEW';
      od.currentStage = 'ADMIN';
      od.comments = actionComment || 'Approved and forwarded to Admin by Faculty.';

      od.approvalHistory.push({
        action: 'FACULTY_APPROVED',
        stage: 'ADMIN',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'FACULTY',
        comments: od.comments,
        timestamp: new Date(),
      });

      await od.save();

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request Approved by Faculty',
        `Your OD Request ${od.requestId} has been verified and forwarded to Administration for review.`,
        'SUCCESS',
        '/student/dashboard'
      );

      // Notify Admin accounts
      const admins = await User.find({ role: 'ADMIN' }).select('_id');
      for (const adm of admins) {
        await notifyUser(
          adm._id,
          'OD Request Awaiting Admin Review',
          `Faculty ${req.user.name} approved & forwarded OD Request ${od.requestId} (${od.student.name}).`,
          'INFO',
          '/admin/dashboard'
        );
      }

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} approved and forwarded to Admin.`,
        odRequest: od,
      });
    } else if (action === 'REQUEST_CHANGES') {
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Please provide comments detailing the changes requested.' });
      }

      od.status = 'CHANGES_REQUESTED';
      od.comments = actionComment;

      od.approvalHistory.push({
        action: 'FACULTY_CHANGES_REQUESTED',
        stage: 'FACULTY',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'FACULTY',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      await notifyUser(
        od.student._id,
        'Changes Requested on OD Request',
        `Faculty ${req.user.name} requested changes on OD Request ${od.requestId}: "${actionComment}".`,
        'WARNING',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `Changes requested for OD Request ${od.requestId}.`,
        odRequest: od,
      });
    } else if (action === 'REJECT') {
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
      }

      od.status = 'REJECTED';
      od.currentStage = 'COMPLETED';
      od.comments = actionComment;
      od.finalDecision = {
        status: 'REJECTED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: actionComment,
      };

      od.approvalHistory.push({
        action: 'FACULTY_REJECTED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'FACULTY',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      await notifyUser(
        od.student._id,
        'OD Request Rejected by Faculty',
        `Your OD Request ${od.requestId} was rejected: "${actionComment}".`,
        'ALERT',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} rejected.`,
        odRequest: od,
      });
    } else {
      return res.status(400).json({ success: false, message: `Invalid faculty action '${action}'.` });
    }
  } catch (err) {
    console.error('facultyAction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process faculty action: ' + err.message });
  }
};

// ==========================================
// 3. ADMIN CONTROLLERS
// ==========================================

// GET /api/od/admin/all
// Admin views all OD requests with optional filtering
exports.getAdminODRequests = async (req, res) => {
  try {
    const { status, stage } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (stage) filter.currentStage = stage;

    const requests = await ODRequest.find(filter)
      .populate('student', 'name email studentId department academicYear section avatar')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title')
      .populate('finalDecision.decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('getAdminODRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin OD requests.' });
  }
};

// PATCH /api/od/admin/:id/action
// Admin action: FORWARD_TO_HOD, BYPASS_APPROVE, BYPASS_REJECT, REQUEST_CHANGES, REJECT
exports.adminAction = async (req, res) => {
  try {
    const { action, comments, reason, hodAvailable, bypassReason } = req.body;
    const od = await ODRequest.findById(req.params.id)
      .populate('student', 'name email')
      .populate('facultyReviewer', 'name email');

    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    if (od.status !== 'ADMIN_REVIEW') {
      return res.status(400).json({
        success: false,
        message: `Request is currently in status '${od.status}'. Admin can only act on requests in 'ADMIN_REVIEW'.`,
      });
    }

    const actionComment = (comments || reason || '').trim();
    od.adminReviewer = req.user._id;

    // SCENARIO 1: FORWARD TO HOD (Normal Workflow)
    if (action === 'FORWARD_TO_HOD') {
      od.status = 'HOD_REVIEW';
      od.currentStage = 'HOD';
      od.hodAvailable = true;
      od.comments = actionComment || 'Admin forwarded request for HOD final review.';

      od.approvalHistory.push({
        action: 'ADMIN_FORWARDED_TO_HOD',
        stage: 'HOD',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'ADMIN',
        comments: od.comments,
        timestamp: new Date(),
      });

      await od.save();

      // Notify HOD accounts
      const hods = await User.find({ role: 'HOD' }).select('_id');
      for (const hod of hods) {
        await notifyUser(
          hod._id,
          'OD Request Awaiting HOD Decision',
          `Admin forwarded OD Request ${od.requestId} for student ${od.student.name} for final decision.`,
          'INFO',
          '/hod/dashboard'
        );
      }

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request Forwarded to HOD',
        `Your OD Request ${od.requestId} has been verified by Administration and forwarded to the Head of Department.`,
        'INFO',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} successfully forwarded to HOD.`,
        odRequest: od,
      });
    }

    // SCENARIO 2: ADMIN BYPASS APPROVE (When HOD is Unavailable)
    else if (action === 'BYPASS_APPROVE') {
      if (!bypassReason || !bypassReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory bypass reason is required when approving with HOD unavailable.',
        });
      }

      od.status = 'APPROVED';
      od.currentStage = 'COMPLETED';
      od.hodAvailable = false;
      od.hodBypassReason = bypassReason.trim();
      od.comments = actionComment || `Approved by Admin (HOD Unavailable). Reason: ${bypassReason.trim()}`;
      od.finalDecision = {
        status: 'APPROVED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: `Admin Bypass Decision: ${bypassReason.trim()}`,
      };

      od.approvalHistory.push({
        action: 'ADMIN_BYPASS_APPROVED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'ADMIN',
        comments: `[HOD UNAVAILABLE - BYPASS APPROVAL] Reason: ${bypassReason.trim()}${actionComment ? ' | ' + actionComment : ''}`,
        timestamp: new Date(),
      });

      await od.save();

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request APPROVED (Admin Bypass)',
        `Congratulations! Your OD Request ${od.requestId} for "${od.eventName}" has been APPROVED by Administration (HOD Unavailable bypass).`,
        'SUCCESS',
        '/student/dashboard'
      );

      // Notify Faculty Reviewer if exists
      if (od.facultyReviewer) {
        await notifyUser(
          od.facultyReviewer._id,
          'OD Request Approved (Admin Bypass)',
          `OD Request ${od.requestId} for student ${od.student.name} was approved by Admin under HOD bypass.`,
          'INFO',
          '/faculty/dashboard'
        );
      }

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} approved under HOD bypass.`,
        odRequest: od,
      });
    }

    // SCENARIO 3: ADMIN BYPASS REJECT (When HOD is Unavailable)
    else if (action === 'BYPASS_REJECT') {
      if (!bypassReason || !bypassReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory bypass reason is required when rejecting with HOD unavailable.',
        });
      }
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
      }

      od.status = 'REJECTED';
      od.currentStage = 'COMPLETED';
      od.hodAvailable = false;
      od.hodBypassReason = bypassReason.trim();
      od.comments = actionComment;
      od.finalDecision = {
        status: 'REJECTED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: `Admin Bypass Decision: ${bypassReason.trim()} | Reason: ${actionComment}`,
      };

      od.approvalHistory.push({
        action: 'ADMIN_BYPASS_REJECTED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'ADMIN',
        comments: `[HOD UNAVAILABLE - BYPASS REJECTION] Reason: ${bypassReason.trim()} | Comment: ${actionComment}`,
        timestamp: new Date(),
      });

      await od.save();

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request Rejected by Admin',
        `Your OD Request ${od.requestId} was rejected by Administration: "${actionComment}".`,
        'ALERT',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} rejected under Admin bypass.`,
        odRequest: od,
      });
    }

    // SCENARIO 4: ADMIN REQUEST CHANGES
    else if (action === 'REQUEST_CHANGES') {
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Please provide comments detailing the changes required.' });
      }

      od.status = 'CHANGES_REQUESTED';
      od.comments = actionComment;

      od.approvalHistory.push({
        action: 'ADMIN_CHANGES_REQUESTED',
        stage: 'ADMIN',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'ADMIN',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      await notifyUser(
        od.student._id,
        'Admin Requested Changes on OD Request',
        `Admin requested changes on OD Request ${od.requestId}: "${actionComment}".`,
        'WARNING',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `Changes requested for OD Request ${od.requestId}.`,
        odRequest: od,
      });
    }

    // SCENARIO 5: ADMIN REJECT DIRECTLY
    else if (action === 'REJECT') {
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
      }

      od.status = 'REJECTED';
      od.currentStage = 'COMPLETED';
      od.comments = actionComment;
      od.finalDecision = {
        status: 'REJECTED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: actionComment,
      };

      od.approvalHistory.push({
        action: 'ADMIN_REJECTED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'ADMIN',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      await notifyUser(
        od.student._id,
        'OD Request Rejected by Admin',
        `Your OD Request ${od.requestId} was rejected by Administration: "${actionComment}".`,
        'ALERT',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} rejected.`,
        odRequest: od,
      });
    } else {
      return res.status(400).json({ success: false, message: `Invalid admin action '${action}'.` });
    }
  } catch (err) {
    console.error('adminAction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process admin action: ' + err.message });
  }
};

// ==========================================
// 4. HOD CONTROLLERS
// ==========================================

// GET /api/od/hod/pending
// HOD views requests awaiting HOD decision or all requests for academic oversight
exports.getHODODRequests = async (req, res) => {
  try {
    const requests = await ODRequest.find({})
      .populate('student', 'name email studentId department academicYear section avatar')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title')
      .populate('finalDecision.decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('getHODODRequests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve HOD OD requests.' });
  }
};

// PATCH /api/od/hod/:id/action
// HOD action: APPROVE, REJECT, REQUEST_CHANGES
exports.hodAction = async (req, res) => {
  try {
    const { action, comments, reason } = req.body;
    const od = await ODRequest.findById(req.params.id)
      .populate('student', 'name email')
      .populate('facultyReviewer', 'name email')
      .populate('adminReviewer', 'name email');

    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    if (od.status !== 'HOD_REVIEW') {
      return res.status(400).json({
        success: false,
        message: `OD Request is in '${od.status}' stage. HOD can only act on requests in 'HOD_REVIEW'.`,
      });
    }

    const actionComment = (comments || reason || '').trim();
    od.hodReviewer = req.user._id;

    if (action === 'APPROVE') {
      od.status = 'APPROVED';
      od.currentStage = 'COMPLETED';
      od.comments = actionComment || 'Approved by Head of Department.';
      od.finalDecision = {
        status: 'APPROVED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: od.comments,
      };

      od.approvalHistory.push({
        action: 'HOD_APPROVED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'HOD',
        comments: od.comments,
        timestamp: new Date(),
      });

      await od.save();

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request APPROVED by HOD',
        `Congratulations! Your On-Duty Request ${od.requestId} for "${od.eventName}" has been officially APPROVED by the Head of Department.`,
        'SUCCESS',
        '/student/dashboard'
      );

      // Notify Faculty Reviewer
      if (od.facultyReviewer) {
        await notifyUser(
          od.facultyReviewer._id,
          'OD Request Approved by HOD',
          `OD Request ${od.requestId} for student ${od.student.name} was approved by HOD.`,
          'INFO',
          '/faculty/dashboard'
        );
      }

      // Notify Admin Reviewer
      if (od.adminReviewer) {
        await notifyUser(
          od.adminReviewer._id,
          'OD Request Final Approval (HOD)',
          `HOD completed final approval for OD Request ${od.requestId} (${od.student.name}).`,
          'INFO',
          '/admin/dashboard'
        );
      }

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} has been approved by HOD.`,
        odRequest: od,
      });
    } else if (action === 'REJECT') {
      if (!actionComment) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory rejection reason is required for HOD rejection.',
        });
      }

      od.status = 'REJECTED';
      od.currentStage = 'COMPLETED';
      od.comments = actionComment;
      od.finalDecision = {
        status: 'REJECTED',
        decidedBy: req.user._id,
        decisionDate: new Date(),
        reason: actionComment,
      };

      od.approvalHistory.push({
        action: 'HOD_REJECTED',
        stage: 'COMPLETED',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'HOD',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      // Notify Student
      await notifyUser(
        od.student._id,
        'OD Request REJECTED by HOD',
        `Your OD Request ${od.requestId} was rejected by the Head of Department. Reason: "${actionComment}".`,
        'ALERT',
        '/student/dashboard'
      );

      // Notify Faculty & Admin
      if (od.facultyReviewer) {
        await notifyUser(
          od.facultyReviewer._id,
          'OD Request Rejected by HOD',
          `OD Request ${od.requestId} for student ${od.student.name} was rejected by HOD: ${actionComment}.`,
          'INFO',
          '/faculty/dashboard'
        );
      }
      if (od.adminReviewer) {
        await notifyUser(
          od.adminReviewer._id,
          'OD Request Rejected by HOD',
          `HOD rejected OD Request ${od.requestId} (${od.student.name}): ${actionComment}.`,
          'INFO',
          '/admin/dashboard'
        );
      }

      return res.json({
        success: true,
        message: `OD Request ${od.requestId} has been rejected by HOD.`,
        odRequest: od,
      });
    } else if (action === 'REQUEST_CHANGES') {
      if (!actionComment) {
        return res.status(400).json({ success: false, message: 'Please provide comments detailing the changes requested.' });
      }

      od.status = 'CHANGES_REQUESTED';
      od.comments = actionComment;

      od.approvalHistory.push({
        action: 'HOD_CHANGES_REQUESTED',
        stage: 'HOD',
        performedBy: req.user._id,
        performerName: req.user.name,
        performerRole: 'HOD',
        comments: actionComment,
        timestamp: new Date(),
      });

      await od.save();

      await notifyUser(
        od.student._id,
        'HOD Requested Changes on OD Request',
        `Head of Department requested modifications on OD Request ${od.requestId}: "${actionComment}".`,
        'WARNING',
        '/student/dashboard'
      );

      return res.json({
        success: true,
        message: `Changes requested for OD Request ${od.requestId}.`,
        odRequest: od,
      });
    } else {
      return res.status(400).json({ success: false, message: `Invalid HOD action '${action}'.` });
    }
  } catch (err) {
    console.error('hodAction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process HOD action: ' + err.message });
  }
};

// ==========================================
// 5. SHARED DETAIL & TIMELINE CONTROLLER
// ==========================================

// GET /api/od/:id
// Get single OD request details & timeline
exports.getODRequestById = async (req, res) => {
  try {
    const od = await ODRequest.findById(req.params.id)
      .populate('student', 'name email studentId department academicYear section avatar mentor')
      .populate('facultyReviewer', 'name email title')
      .populate('adminReviewer', 'name email title')
      .populate('hodReviewer', 'name email title')
      .populate('finalDecision.decidedBy', 'name email role')
      .populate('approvalHistory.performedBy', 'name email role');

    if (!od) {
      return res.status(404).json({ success: false, message: 'OD Request not found.' });
    }

    // Role-based view authorization
    if (req.user.role === 'STUDENT' && od.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this OD request.' });
    }

    return res.json({ success: true, request: od });
  } catch (err) {
    console.error('getODRequestById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve OD request details.' });
  }
};
