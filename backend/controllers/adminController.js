const User = require('../models/User');
const Project = require('../models/Project');
const Department = require('../models/Department');
const Cohort = require('../models/Cohort');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { role, department } = req.query;
    let filter = {};
    if (role) filter.role = role.toUpperCase();
    if (department) filter.department = department;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};

// POST /api/admin/users (Create student / faculty)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, cohort, title, studentId, facultyId } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role.toUpperCase(),
      department: department || 'Computer Science & Engineering',
      cohort: cohort || 'CS-492 Capstone Cohort 2025',
      title: title || (role.toUpperCase() === 'HOD' ? 'Head of Department' : role.toUpperCase() === 'FACULTY' ? 'Assistant Professor' : 'Capstone Student'),
      studentId: studentId || (role.toUpperCase() === 'STUDENT' ? `STU-${Date.now().toString().slice(-4)}` : null),
      facultyId: facultyId || (role.toUpperCase() === 'FACULTY' || role.toUpperCase() === 'HOD' ? `FAC-${Date.now().toString().slice(-4)}` : null),
    });

    if (role.toUpperCase() === 'HOD' && department) {
      try {
        await Department.findOneAndUpdate(
          { name: department },
          { head: name }
        );
      } catch (deptErr) {
        console.error('Auto-sync department head error:', deptErr);
      }
    }

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'ADMIN',
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: user._id.toString(),
      details: `Created new user ${user.name} (${user.email}) with role ${user.role}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
};

// DELETE /api/admin/users/:id (Delete user account with cascade cleanup)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrator account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the only remaining administrator account.' });
      }
    }

    // Remove user from any project teams
    await Project.updateMany(
      { teamMembers: user._id },
      { $pull: { teamMembers: user._id } }
    );

    // Unassign user if they were a faculty mentor
    await Project.updateMany(
      { facultyMentor: user._id },
      { $set: { facultyMentor: null } }
    );

    // Delete user's notifications
    await Notification.deleteMany({ user: user._id });

    // Delete the user
    await User.findByIdAndDelete(id);

    // Record audit trail
    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'ADMIN',
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: id,
      details: `Permanently deleted user account "${user.name}" (${user.email}, ${user.role}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `User "${user.name}" (${user.email}) deleted successfully.` });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user: ' + err.message });
  }
};

// PUT /api/admin/projects/:id/faculty (Assign or Change Faculty Mentor)
exports.assignFacultyMentor = async (req, res) => {
  try {
    const { facultyId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    let facultyName = 'Unassigned';
    if (facultyId) {
      const faculty = await User.findById(facultyId);
      if (!faculty || faculty.role !== 'FACULTY') {
        return res.status(400).json({ success: false, message: 'Specified user is not a valid Faculty advisor.' });
      }
      project.facultyMentor = faculty._id;
      facultyName = faculty.name;

      // Notify the faculty member
      await Notification.create({
        user: faculty._id,
        title: 'Assigned as Capstone Advisor',
        message: `Administration assigned you to advise project: ${project.title} (${project.code}).`,
        type: 'INFO',
        link: '/faculty/dashboard',
      });
    } else {
      project.facultyMentor = null;
    }

    await project.save();

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'ADMIN',
      action: 'CHANGE_FACULTY_MENTOR',
      targetType: 'PROJECT',
      targetId: project._id.toString(),
      details: `Assigned advisor "${facultyName}" to project "${project.title}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Advisor successfully updated to ${facultyName}.`, project });
  } catch (err) {
    console.error('assignFacultyMentor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update faculty mentor.' });
  }
};

// PUT /api/admin/projects/:id/status (Manage Project Status & Health)
exports.updateProjectStatus = async (req, res) => {
  try {
    const { status, health, defenseDate } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (status) project.status = status;
    if (health) project.health = health;
    if (defenseDate !== undefined) project.defenseDate = defenseDate ? new Date(defenseDate) : null;

    await project.save();

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'ADMIN',
      action: 'UPDATE_PROJECT_STATUS',
      targetType: 'PROJECT',
      targetId: project._id.toString(),
      details: `Updated project "${project.title}" to status=${project.status}, health=${project.health}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Project status and health updated.', project });
  } catch (err) {
    console.error('updateProjectStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update project status.' });
  }
};

// GET /api/admin/departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    return res.json({ success: true, departments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

// GET /api/admin/departments/:id
exports.getDepartmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let department = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      department = await Department.findById(id);
    }
    if (!department) {
      department = await Department.findOne({
        $or: [
          { code: new RegExp(`^${id}$`, 'i') },
          { name: new RegExp(`^${id}$`, 'i') }
        ]
      });
    }

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    // Find students belonging to this department
    const students = await User.find({
      role: 'STUDENT',
      $or: [{ department: department.name }, { department: department.code }]
    }).select('name email avatar studentId cohort title status createdAt');

    // Find faculty belonging to this department
    const faculty = await User.find({
      role: 'FACULTY',
      $or: [{ department: department.name }, { department: department.code }]
    }).select('name email avatar facultyId title status bio createdAt');

    // Find projects under this department
    const projects = await Project.find({
      $or: [{ department: department.name }, { department: department.code }]
    })
      .populate('facultyMentor', 'name email title avatar')
      .populate('teamMembers', 'name email avatar studentId');

    return res.json({
      success: true,
      department,
      stats: {
        studentCount: students.length,
        facultyCount: faculty.length,
        projectCount: projects.length,
      },
      students,
      faculty,
      projects,
    });
  } catch (err) {
    console.error('getDepartmentDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch department details.' });
  }
};

// POST /api/admin/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, head, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required.' });
    }

    const dept = await Department.create({ name, code, head, description });
    return res.status(201).json({ success: true, department: dept });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
};

// PUT /api/admin/departments/:id
// Admin can update department head (HOD) and other details
exports.updateDepartment = async (req, res) => {
  try {
    const { head, name, code, description } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (head !== undefined) dept.head = head.trim();
    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description;

    await dept.save();

    await AuditTrail.create({
      user: req.user._id,
      userName: req.user.name,
      role: 'ADMIN',
      action: 'UPDATE_DEPARTMENT',
      targetType: 'DEPARTMENT',
      targetId: dept._id.toString(),
      details: `Department "${dept.name}" (${dept.code}) updated. Head of Department set to: "${dept.head}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Department head updated successfully to ${dept.head}`, department: dept });
  } catch (err) {
    console.error('updateDepartment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update department: ' + err.message });
  }
};

// GET /api/admin/cohorts
exports.getCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find().sort({ year: -1 });
    return res.json({ success: true, cohorts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch cohorts.' });
  }
};

// POST /api/admin/cohorts
exports.createCohort = async (req, res) => {
  try {
    const { name, code, term, year, department } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required.' });
    }

    const cohort = await Cohort.create({ name, code, term, year, department });
    return res.status(201).json({ success: true, cohort });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create cohort.' });
  }
};

// GET /api/admin/audit-trail
exports.getAuditTrail = async (req, res) => {
  try {
    const trail = await AuditTrail.find().sort({ timestamp: -1 }).limit(100);
    return res.json({ success: true, count: trail.length, auditTrail: trail });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit trail.' });
  }
};
