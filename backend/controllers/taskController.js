const Task = require('../models/Task');
const Project = require('../models/Project');
const Document = require('../models/Document');
const AuditTrail = require('../models/AuditTrail');

// GET /api/tasks
// Filtered by project scope according to authenticated user role
exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
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

    let filter = { project: { $in: allowedProjectIds } };

    if (projectId) {
      // Check if user is authorized for this specific projectId
      const isAllowed = allowedProjectIds.some((id) => id.toString() === projectId.toString());
      if (!isAllowed) {
        return res.status(403).json({ success: false, message: 'Not authorized to view tasks for this project.' });
      }
      filter.project = projectId;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email role')
      .populate('project', 'title code')
      .sort({ dueDate: 1 });

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('getTasks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tasks.' });
  }
};

// POST /api/tasks
// Create task for permitted project
exports.createTask = async (req, res) => {
  try {
    const { projectId, title, description, assignedTo, priority, dueDate } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ success: false, message: 'Project ID and title are required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Authorization
    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Cannot create task in unassigned project.' });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = project.facultyMentor && project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        return res.status(403).json({ success: false, message: 'Cannot create task in non-mentored project.' });
      }
    }

    const task = await Task.create({
      project: projectId,
      title,
      description: description || '',
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id,
      priority: priority || 'MEDIUM',
      status: 'TODO',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CREATE_TASK',
      targetType: 'TASK',
      targetId: task._id.toString(),
      details: `Created task "${task.title}" for project "${project.title}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({ success: true, message: 'Task created.', task });
  } catch (err) {
    console.error('createTask error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
};

// PATCH /api/tasks/:id/status
// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid task status.' });
    }

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Role check: Student can update task in their own project
    if (req.user.role === 'STUDENT') {
      const isMember = task.project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not belong to this project.' });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = task.project.facultyMentor && task.project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not mentor this project.' });
      }
    }

    task.status = status;
    await task.save();

    return res.json({ success: true, message: 'Task status updated.', task });
  } catch (err) {
    console.error('updateTaskStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update task status.' });
  }
};

// GET /api/tasks/:id
// Get comprehensive overall task information with project and uploaded documents
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'title code department cohort teamMembers facultyMentor status')
      .populate('assignedTo', 'name email avatar studentId role title department')
      .populate('createdBy', 'name email avatar role title');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Role-based authorization
    if (req.user.role === 'STUDENT') {
      const isMember = task.project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not belong to this project.' });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = task.project.facultyMentor && task.project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not the mentor for this project.' });
      }
    }

    // Retrieve documents linked specifically to this task or to its project
    const documents = await Document.find({
      $or: [
        { task: task._id },
        { project: task.project._id }
      ]
    })
      .populate('uploadedBy', 'name email avatar role')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      task,
      documents,
      currentUserRole: req.user.role,
      currentUserId: req.user._id,
    });
  } catch (err) {
    console.error('getTaskById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load task details.' });
  }
};

