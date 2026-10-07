const Project = require('../models/Project');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const Document = require('../models/Document');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');

// GET /api/projects/my-projects
// STRICT ROLE-BASED FILTERING IN DATABASE
exports.getMyProjects = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    let query = {};

    if (userRole === 'STUDENT') {
      // ONLY return projects where the authenticated student belongs to the team
      query = { teamMembers: userId };
    } else if (userRole === 'FACULTY') {
      // ONLY return projects where the authenticated faculty is the assigned mentor
      query = { facultyMentor: userId };
    } else if (userRole === 'ADMIN') {
      // Institution-wide scope
      query = {};
    } else {
      return res.status(403).json({ success: false, message: 'Invalid role.' });
    }

    const projects = await Project.find(query)
      .populate('teamMembers', 'name email avatar studentId title')
      .populate('facultyMentor', 'name email avatar title department')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      role: userRole,
      count: projects.length,
      projects,
    });
  } catch (err) {
    console.error('getMyProjects error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving projects.' });
  }
};

// GET /api/projects/:id
// Verifies ownership / assignment for Student & Faculty, returns complete details, members, mentor, tasks, milestones, docs, stats
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('teamMembers', 'name email avatar studentId title department cohort')
      .populate('facultyMentor', 'name email avatar title department');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Role-based authorization check
    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m._id.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to this project.',
        });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = project.facultyMentor && project.facultyMentor._id.toString() === req.user._id.toString();
      const sameDept = req.user.department && project.department === req.user.department;
      if (!isMentor && !sameDept) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not the assigned advisor or department faculty for this project.',
        });
      }
    }
    // ADMIN has full institutional access

    // Fetch all tasks for this specific project
    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'name email avatar studentId title')
      .populate('createdBy', 'name email role')
      .sort({ dueDate: 1 });

    // Fetch all milestones for this project
    const milestones = await Milestone.find({ project: project._id })
      .populate('submittedBy', 'name email')
      .populate('evaluatedBy', 'name email')
      .sort({ dueDate: 1 });

    // Fetch all documents for this project
    const documents = await Document.find({ project: project._id })
      .populate('uploadedBy', 'name email role')
      .populate('task', 'title')
      .sort({ createdAt: -1 });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const reviewTasks = tasks.filter((t) => t.status === 'REVIEW').length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progressPercentage || 0);

    return res.json({
      success: true,
      project,
      tasks,
      milestones,
      documents,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        reviewTasks,
        todoTasks,
        progress: calculatedProgress,
      },
      userRole: req.user.role,
      userId: req.user._id,
    });
  } catch (err) {
    console.error('getProjectById error:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving project.' });
  }
};

// PATCH /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const { status, health, repositoryUrl, documentationUrl, abstract, title } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    // Role check
    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ success: false, message: 'Not authorized.' });
      if (repositoryUrl !== undefined) project.repositoryUrl = repositoryUrl;
      if (documentationUrl !== undefined) project.documentationUrl = documentationUrl;
      if (abstract !== undefined) project.abstract = abstract;
    } else {
      if (status) project.status = status;
      if (health) project.health = health;
      if (repositoryUrl !== undefined) project.repositoryUrl = repositoryUrl;
      if (documentationUrl !== undefined) project.documentationUrl = documentationUrl;
      if (abstract !== undefined) project.abstract = abstract;
      if (title) project.title = title;
    }

    await project.save();
    return res.json({ success: true, message: 'Project updated successfully.', project });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
};

// DELETE /api/projects/:id/members/:memberId
exports.removeTeamMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    project.teamMembers = project.teamMembers.filter((m) => m.toString() !== req.params.memberId.toString());
    await project.save();

    return res.json({ success: true, message: 'Team member removed from project.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove team member.' });
  }
};

// POST /api/projects (Admin create, or Student proposed)
exports.createProject = async (req, res) => {
  try {
    const { title, code, abstract, department, cohort, teamMembers, facultyMentor, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const projectCode = code || `CAP-${Date.now().toString().slice(-4)}`;

    // If STUDENT creates, automatically add student to team, cannot self-assign mentor
    let assignedFaculty = facultyMentor;
    let members = teamMembers || [];

    if (req.user.role === 'STUDENT') {
      assignedFaculty = null; // Students CANNOT assign faculty
      if (!members.includes(req.user._id.toString())) {
        members.push(req.user._id);
      }
    }

    const project = await Project.create({
      title,
      code: projectCode,
      abstract: abstract || '',
      department: department || req.user.department || 'Computer Science & Engineering',
      cohort: cohort || req.user.cohort || 'CS-492 Capstone Cohort 2025',
      teamMembers: members,
      facultyMentor: assignedFaculty,
      tags: tags || [],
      status: req.user.role === 'STUDENT' ? 'PROPOSED' : 'IN_PROGRESS',
    });

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CREATE_PROJECT',
      targetType: 'PROJECT',
      targetId: project._id.toString(),
      details: `Project "${project.title}" created with code ${project.code}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const populatedProject = await Project.findById(project._id)
      .populate('teamMembers', 'name email avatar studentId title')
      .populate('facultyMentor', 'name email avatar title');

    return res.status(201).json({ success: true, message: 'Project created successfully.', project: populatedProject });
  } catch (err) {
    console.error('createProject error:', err);
    return res.status(500).json({ success: false, message: 'Error creating project.' });
  }
};

// GET /api/projects/students/available
// Returns active students list for team assembly
exports.getAvailableStudents = async (req, res) => {
  try {
    const User = require('../models/User');
    const students = await User.find({ role: 'STUDENT', status: 'ACTIVE' })
      .select('name email avatar studentId department cohort title')
      .sort({ name: 1 });
    return res.json({ success: true, count: students.length, students });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch students list.' });
  }
};

// POST /api/projects/:id/members
// Add fellow students to project team
exports.addTeamMembers = async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not a member of this project.' });
      }
    }

    studentIds.forEach((id) => {
      if (!project.teamMembers.map((m) => m.toString()).includes(id.toString())) {
        project.teamMembers.push(id);
      }
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('teamMembers', 'name email avatar studentId title')
      .populate('facultyMentor', 'name email avatar title');

    return res.json({ success: true, message: 'Team members added successfully.', project: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add team members.' });
  }
};

// DELETE /api/projects/:id
// Allows students to delete unwanted projects they belong to (or created), and Admins
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Role check: Students can delete projects where they are team members
    // Admin can delete any project
    // Faculty can delete if they are the assigned facultyMentor
    if (req.user.role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not authorized to delete this project.' });
      }
    } else if (req.user.role === 'FACULTY') {
      const isMentor = project.facultyMentor && project.facultyMentor.toString() === req.user._id.toString();
      if (!isMentor) {
        return res.status(403).json({ success: false, message: 'Faculty can only delete projects they mentor.' });
      }
    }

    // Clean up associated tasks, milestones, and documents
    const Task = require('../models/Task');
    const Milestone = require('../models/Milestone');
    const Document = require('../models/Document');

    await Promise.all([
      Task.deleteMany({ project: project._id }),
      Milestone.deleteMany({ project: project._id }),
      Document.deleteMany({ project: project._id }),
      Project.findByIdAndDelete(project._id),
    ]);

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'DELETE_PROJECT',
      targetType: 'PROJECT',
      targetId: project._id.toString(),
      details: `Project "${project.title}" (${project.code}) and associated records were deleted by ${req.user.name} (${req.user.role}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Project "${project.title}" deleted successfully.` });
  } catch (err) {
    console.error('deleteProject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete project: ' + err.message });
  }
};

