const SuperDream = require('../models/SuperDream');
const SuperDreamMessage = require('../models/SuperDreamMessage');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ==========================================
// 1. ADMIN ACTIONS
// ==========================================

// Get all Super Dream groups + available faculty & students for admin dropdowns
exports.getAdminOverview = async (req, res) => {
  try {
    const groups = await SuperDream.find()
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort')
      .sort({ createdAt: -1 });

    const facultyList = await User.find({ role: { $in: ['FACULTY', 'HOD'] } })
      .select('name email department title avatar')
      .sort({ name: 1 });

    const studentList = await User.find({ role: 'STUDENT' })
      .select('name email studentId department avatar cohort')
      .sort({ name: 1 });

    // Map each mentee to their assigned mentor for instant allocation lookup
    const menteeToMentorMap = {};
    groups.forEach((g) => {
      if (g.mentor && Array.isArray(g.mentees)) {
        g.mentees.forEach((m) => {
          const mId = (m._id || m).toString();
          menteeToMentorMap[mId] = {
            groupId: g._id,
            groupTitle: g.title,
            mentorId: (g.mentor._id || g.mentor).toString(),
            mentorName: g.mentor.name || 'Faculty Mentor',
            mentorEmail: g.mentor.email || '',
            mentorDepartment: g.mentor.department || '',
          };
        });
      }
    });

    res.json({
      success: true,
      groups,
      facultyList,
      studentList,
      menteeToMentorMap,
    });
  } catch (err) {
    console.error('SuperDream getAdminOverview error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving Super Dream groups.' });
  }
};

// Admin creates a Super Dream mentorship allocation
exports.createGroup = async (req, res) => {
  try {
    const { title, description, mentorId, menteeIds, cohort, reassignMentees = true } = req.body;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: 'Faculty Mentor is required.' });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Specified mentor not found.' });
    }

    const validMentees = Array.isArray(menteeIds) ? menteeIds : [];
    const groupTitle = title && title.trim() ? title.trim() : `Super Dream Mentorship - ${mentor.name}`;

    // If reassignMentees is enabled, remove these students from any other existing Super Dream group
    // so each mentee has their own separate designated mentor
    if (reassignMentees && validMentees.length > 0) {
      await SuperDream.updateMany(
        { mentees: { $in: validMentees } },
        { $pull: { mentees: { $in: validMentees } } }
      );
    }

    const newGroup = await SuperDream.create({
      title: groupTitle,
      description: description || '',
      mentor: mentorId,
      mentees: validMentees,
      cohort: cohort || 'Super Dream Track 2025-2026',
      createdBy: req.user._id,
    });

    // Notify Mentor
    await Notification.create({
      user: mentorId,
      title: '🌟 Super Dream Mentor Assignment',
      message: `You have been designated as the Mentor for "${groupTitle}" with ${validMentees.length} mentee(s).`,
      type: 'INFO',
      link: '/faculty/dashboard',
    });

    // Notify Mentees
    if (validMentees.length > 0) {
      const notifications = validMentees.map((menteeId) => ({
        user: menteeId,
        title: '🌟 Super Dream Enrollment',
        message: `You have been assigned to Faculty Mentor ${mentor.name} in Super Dream (${groupTitle}).`,
        type: 'SUCCESS',
        link: '/student/dashboard',
      }));
      await Notification.insertMany(notifications);
    }

    const populated = await SuperDream.findById(newGroup._id)
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort');

    res.status(201).json({
      success: true,
      message: 'Super Dream mentorship group created successfully.',
      group: populated,
    });
  } catch (err) {
    console.error('SuperDream createGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error creating Super Dream group.' });
  }
};

// Admin updates a Super Dream group (e.g. adding/removing mentees or reallocating mentor)
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, mentorId, menteeIds, status, cohort, reassignMentees = true } = req.body;

    const group = await SuperDream.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Super Dream group not found.' });
    }

    if (title) group.title = title;
    if (description !== undefined) group.description = description;
    if (mentorId) group.mentor = mentorId;
    if (Array.isArray(menteeIds)) {
      if (reassignMentees && menteeIds.length > 0) {
        await SuperDream.updateMany(
          { _id: { $ne: id }, mentees: { $in: menteeIds } },
          { $pull: { mentees: { $in: menteeIds } } }
        );
      }
      group.mentees = menteeIds;
    }
    if (status) group.status = status;
    if (cohort) group.cohort = cohort;

    await group.save();

    const populated = await SuperDream.findById(group._id)
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort');

    res.json({
      success: true,
      message: 'Super Dream group updated successfully.',
      group: populated,
    });
  } catch (err) {
    console.error('SuperDream updateGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error updating Super Dream group.' });
  }
};

// Direct Quick Assignment: Assign a mentor for specific mentees
exports.assignMentorDirect = async (req, res) => {
  try {
    const { mentorId, menteeIds, reassignMentees = true, groupTitle, cohort } = req.body;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: 'Faculty Mentor is required.' });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Specified faculty mentor not found.' });
    }

    const targetMentees = Array.isArray(menteeIds) ? menteeIds : [menteeIds].filter(Boolean);
    if (targetMentees.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one student mentee must be selected.' });
    }

    // Reassign from other groups if requested so each mentee has their separate mentor
    if (reassignMentees) {
      await SuperDream.updateMany(
        { mentees: { $in: targetMentees } },
        { $pull: { mentees: { $in: targetMentees } } }
      );
    }

    // Find an existing active group for this mentor or create a new one
    let group = await SuperDream.findOne({ mentor: mentorId, status: 'ACTIVE' });
    if (!group) {
      group = await SuperDream.create({
        title: groupTitle || `Super Dream Mentorship - ${mentor.name}`,
        description: `Direct Super Dream mentorship supervised by ${mentor.name}.`,
        mentor: mentorId,
        mentees: targetMentees,
        cohort: cohort || 'Super Dream Track 2025-2026',
        createdBy: req.user._id,
      });
    } else {
      // Append mentees without duplicates
      const existingSet = new Set(group.mentees.map((m) => m.toString()));
      targetMentees.forEach((mId) => existingSet.add(mId.toString()));
      group.mentees = Array.from(existingSet);
      if (groupTitle) group.title = groupTitle;
      await group.save();
    }

    // Send notifications
    await Notification.create({
      user: mentorId,
      title: '🌟 Super Dream Mentee Allocation',
      message: `${targetMentees.length} student mentee(s) have been assigned to your Super Dream mentorship.`,
      type: 'INFO',
      link: '/faculty/dashboard',
    });

    const notifs = targetMentees.map((mId) => ({
      user: mId,
      title: '🌟 Super Dream Mentor Assigned',
      message: `You have been paired with Faculty Mentor ${mentor.name} in Super Dream.`,
      type: 'SUCCESS',
      link: '/student/dashboard',
    }));
    await Notification.insertMany(notifs);

    const populated = await SuperDream.findById(group._id)
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort');

    res.json({
      success: true,
      message: `Mentees allocated to ${mentor.name} successfully.`,
      group: populated,
    });
  } catch (err) {
    console.error('SuperDream assignMentorDirect error:', err);
    res.status(500).json({ success: false, message: 'Server error assigning mentor.' });
  }
};

// Admin deletes a Super Dream group
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await SuperDream.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Super Dream group not found.' });
    }

    await SuperDreamMessage.deleteMany({ superDream: id });
    await SuperDream.findByIdAndDelete(id);

    res.json({ success: true, message: 'Super Dream group and records deleted successfully.' });
  } catch (err) {
    console.error('SuperDream deleteGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting Super Dream group.' });
  }
};

// ==========================================
// 2. FACULTY & STUDENT DATA RETRIEVAL
// ==========================================

// Get Super Dream groups for the current Faculty member
exports.getFacultySuperDream = async (req, res) => {
  try {
    const groups = await SuperDream.find({ mentor: req.user._id })
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort')
      .sort({ createdAt: -1 });

    res.json({ success: true, groups });
  } catch (err) {
    console.error('SuperDream getFacultySuperDream error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mentor groups.' });
  }
};

// Get Super Dream groups for the current Student member
exports.getStudentSuperDream = async (req, res) => {
  try {
    const groups = await SuperDream.find({ mentees: req.user._id })
      .populate('mentor', 'name email department avatar title')
      .populate('mentees', 'name email studentId department avatar cohort')
      .sort({ createdAt: -1 });

    res.json({ success: true, groups });
  } catch (err) {
    console.error('SuperDream getStudentSuperDream error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving mentee groups.' });
  }
};

// ==========================================
// 3. INFORMATION STREAM & COMMUNICATION
// ==========================================

// Get all messages/updates for a Super Dream group
exports.getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await SuperDream.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Super Dream group not found.' });
    }

    // Verify membership: User must be Mentor, Mentee, or Admin
    const isMentor = group.mentor.toString() === req.user._id.toString();
    const isMentee = group.mentees.some((m) => m.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'ADMIN';

    if (!isMentor && !isMentee && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this Super Dream communication stream.' });
    }

    const messages = await SuperDreamMessage.find({ superDream: id })
      .populate('sender', 'name email role avatar title')
      .populate('comments.sender', 'name email role avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (err) {
    console.error('SuperDream getGroupMessages error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving messages.' });
  }
};

// Post an announcement, resource, guide, or message in a Super Dream group
exports.postMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, links } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const group = await SuperDream.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Super Dream group not found.' });
    }

    const isMentor = group.mentor.toString() === req.user._id.toString();
    const isMentee = group.mentees.some((m) => m.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'ADMIN';

    if (!isMentor && !isMentee && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to post in this Super Dream group.' });
    }

    const newMessage = await SuperDreamMessage.create({
      superDream: id,
      sender: req.user._id,
      senderRole: req.user.role,
      title: title ? title.trim() : '',
      content: content.trim(),
      type: type || (isMentor ? 'ANNOUNCEMENT' : 'MESSAGE'),
      links: Array.isArray(links) ? links : [],
      comments: [],
    });

    const populated = await SuperDreamMessage.findById(newMessage._id)
      .populate('sender', 'name email role avatar title')
      .populate('comments.sender', 'name email role avatar');

    // Send notifications to the counter-parties
    if (isMentor || isAdmin) {
      // Notify all mentees
      if (group.mentees.length > 0) {
        const notifs = group.mentees.map((menteeId) => ({
          user: menteeId,
          title: `📢 Super Dream: ${title ? title : 'New Update from Mentor'}`,
          message: `${req.user.name} shared new information in your Super Dream Track.`,
          type: 'INFO',
          link: '/student/dashboard',
        }));
        await Notification.insertMany(notifs);
      }
    } else if (isMentee) {
      // Notify mentor
      await Notification.create({
        user: group.mentor,
        title: `💬 Super Dream: Mentee Message from ${req.user.name}`,
        message: `${req.user.name} posted an update or query in ${group.title}.`,
        type: 'INFO',
        link: '/faculty/dashboard',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Information posted to Super Dream portal successfully.',
      post: populated,
    });
  } catch (err) {
    console.error('SuperDream postMessage error:', err);
    res.status(500).json({ success: false, message: 'Server error posting message.' });
  }
};

// Add a comment / response to a message
exports.addComment = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const message = await SuperDreamMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const group = await SuperDream.findById(message.superDream);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Super Dream group not found.' });
    }

    const isMentor = group.mentor.toString() === req.user._id.toString();
    const isMentee = group.mentees.some((m) => m.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'ADMIN';

    if (!isMentor && !isMentee && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    message.comments.push({
      sender: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await message.save();

    const populated = await SuperDreamMessage.findById(message._id)
      .populate('sender', 'name email role avatar title')
      .populate('comments.sender', 'name email role avatar');

    res.json({
      success: true,
      message: 'Comment added successfully.',
      post: populated,
    });
  } catch (err) {
    console.error('SuperDream addComment error:', err);
    res.status(500).json({ success: false, message: 'Server error adding comment.' });
  }
};
