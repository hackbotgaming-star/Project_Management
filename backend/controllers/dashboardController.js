const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const Cohort = require('../models/Cohort');

// 1. STUDENT DASHBOARD API: GET /api/dashboard/student
// Enforces strictly STUDENT role and returns only student-authorized records
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Student profile
    const studentProfile = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      cohort: req.user.cohort,
      studentId: req.user.studentId,
      title: req.user.title,
      avatar: req.user.avatar,
      dateOfBirth: req.user.dateOfBirth,
      bio: req.user.bio,
    };

    // Active projects where authenticated student belongs to team
    const activeProjects = await Project.find({
      teamMembers: studentId,
    })
      .populate('facultyMentor', 'name email title avatar')
      .populate('teamMembers', 'name email avatar studentId title');

    const projectIds = activeProjects.map((p) => p._id);

    // Tasks for student's projects (or assigned to student)
    const allProjectTasks = await Task.find({
      $or: [{ assignedTo: studentId }, { project: { $in: projectIds } }],
    }).populate('assignedTo', 'name email avatar').populate('project', 'title code');

    const completedTasks = allProjectTasks.filter((t) => t.status === 'DONE');
    const tasksDue = allProjectTasks.filter((t) => t.status !== 'DONE');

    const taskCounts = {
      total: allProjectTasks.length,
      completed: completedTasks.length,
      inProgress: allProjectTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: allProjectTasks.filter((t) => t.status === 'REVIEW').length,
      todo: allProjectTasks.filter((t) => t.status === 'TODO').length,
    };

    // Milestones for student's projects
    const milestones = await Milestone.find({
      project: { $in: projectIds },
    }).populate('project', 'title code').sort({ dueDate: 1 });

    const upcomingMilestones = milestones.filter((m) => m.status !== 'APPROVED');

    // Deadlines combining tasks and milestones
    const deadlines = [];
    milestones.forEach((m) => {
      deadlines.push({
        type: 'MILESTONE',
        id: m._id,
        title: m.title,
        project: m.project ? m.project.title : 'Project',
        dueDate: m.dueDate,
        status: m.status,
      });
    });
    tasksDue.forEach((t) => {
      deadlines.push({
        type: 'TASK',
        id: t._id,
        title: t.title,
        project: t.project ? t.project.title : 'Project',
        dueDate: t.dueDate,
        status: t.status,
      });
    });
    deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Recent activity related to student's projects or student
    const recentActivity = await AuditTrail.find({
      $or: [{ user: studentId }, { targetId: { $in: projectIds.map((id) => id.toString()) } }],
    })
      .sort({ timestamp: -1 })
      .limit(10);

    // Notifications
    const notifications = await Notification.find({
      user: studentId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      role: 'STUDENT',
      data: {
        studentProfile,
        activeProjects,
        taskCounts,
        tasksDue,
        completedTasks,
        upcomingMilestones,
        deadlines,
        recentActivity,
        notifications,
      },
    });
  } catch (err) {
    console.error('getStudentDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve student dashboard data.' });
  }
};

// 2. FACULTY DASHBOARD API: GET /api/dashboard/faculty
// Enforces strictly FACULTY role and returns only faculty-assigned projects and reviews
exports.getFacultyDashboard = async (req, res) => {
  try {
    const facultyId = req.user._id;

    // Faculty profile
    const facultyProfile = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      facultyId: req.user.facultyId,
      title: req.user.title,
      avatar: req.user.avatar,
      dateOfBirth: req.user.dateOfBirth,
      bio: req.user.bio,
    };

    // Assigned projects where authenticated faculty is mentor
    const assignedProjects = await Project.find({
      facultyMentor: facultyId,
    })
      .populate('teamMembers', 'name email avatar studentId title')
      .populate('facultyMentor', 'name email title avatar');

    const projectIds = assignedProjects.map((p) => p._id);

    // Active teams overview
    const activeTeams = assignedProjects.map((proj) => ({
      projectId: proj._id,
      projectTitle: proj.title,
      projectCode: proj.code,
      department: proj.department,
      progress: proj.progressPercentage,
      health: proj.health,
      status: proj.status,
      teamMembers: proj.teamMembers,
    }));

    // Milestones awaiting review or submitted
    const milestones = await Milestone.find({
      project: { $in: projectIds },
    })
      .populate('project', 'title code')
      .populate('submittedBy', 'name email avatar')
      .sort({ updatedAt: -1 });

    const pendingReviews = milestones.filter((m) => m.status === 'SUBMITTED' || m.status === 'IN_REVIEW');

    const reviewQueue = pendingReviews.map((m) => ({
      milestoneId: m._id,
      projectId: m.project ? m.project._id : null,
      projectTitle: m.project ? m.project.title : 'Project',
      projectCode: m.project ? m.project.code : 'CAP',
      title: m.title,
      submittedBy: m.submittedBy ? m.submittedBy.name : 'Team Member',
      submittedDeliverable: m.submittedDeliverable,
      submissionNotes: m.submissionNotes,
      deliverableUrl: m.deliverableUrl,
      submittedAt: m.submittedAt,
      status: m.status,
    }));

    // Upcoming deadlines for assigned projects
    const upcomingDeadlines = milestones
      .filter((m) => new Date(m.dueDate) >= new Date() && m.status !== 'APPROVED')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 8);

    // At-risk projects
    const atRiskProjects = assignedProjects.filter((p) => p.health === 'AT_RISK' || p.health === 'DELAYED');

    // Recent submissions (last submitted milestones)
    const recentSubmissions = milestones.filter((m) => m.submittedAt !== null).slice(0, 6);

    // Defense schedule
    const defenseSchedule = assignedProjects
      .filter((p) => p.defenseDate !== null)
      .map((p) => ({
        projectId: p._id,
        projectTitle: p.title,
        code: p.code,
        defenseDate: p.defenseDate,
        location: p.defenseLocation,
        status: p.status,
        teamMembers: p.teamMembers,
      }))
      .sort((a, b) => new Date(a.defenseDate) - new Date(b.defenseDate));

    // Analytics summary
    const totalProjects = assignedProjects.length;
    const completedProjects = assignedProjects.filter((p) => p.status === 'COMPLETED' || p.status === 'APPROVED').length;
    const avgProgress = totalProjects > 0 ? Math.round(assignedProjects.reduce((sum, p) => sum + p.progressPercentage, 0) / totalProjects) : 0;

    const analyticsSummary = {
      totalAssignedProjects: totalProjects,
      completedProjects,
      inProgressProjects: totalProjects - completedProjects,
      atRiskCount: atRiskProjects.length,
      pendingReviewsCount: pendingReviews.length,
      averageCohortProgress: avgProgress,
      totalSupervisedStudents: assignedProjects.reduce((sum, p) => sum + p.teamMembers.length, 0),
    };

    // Notifications for faculty
    const notifications = await Notification.find({
      user: facultyId,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      role: 'FACULTY',
      data: {
        facultyProfile,
        assignedProjects,
        activeTeams,
        pendingReviews,
        upcomingDeadlines,
        atRiskProjects,
        recentSubmissions,
        reviewQueue,
        defenseSchedule,
        analyticsSummary,
        notifications,
      },
    });
  } catch (err) {
    console.error('getFacultyDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve faculty dashboard data.' });
  }
};

// 3. ADMIN DASHBOARD API: GET /api/dashboard/admin
// Enforces strictly ADMIN role and provides institution-wide analytics and governance
exports.getAdminDashboard = async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'STUDENT' });
    const facultyCount = await User.countDocuments({ role: 'FACULTY' });
    const allProjects = await Project.find()
      .populate('facultyMentor', 'name email title avatar')
      .populate('teamMembers', 'name email avatar studentId title');

    const activeProjects = allProjects.filter((p) => p.status !== 'COMPLETED');
    const completedProjects = allProjects.filter((p) => p.status === 'COMPLETED' || p.status === 'APPROVED');

    // Pending actions (unassigned projects, submissions waiting approval, etc.)
    const unassignedProjects = allProjects.filter((p) => !p.facultyMentor);
    const pendingMilestones = await Milestone.countDocuments({ status: { $in: ['SUBMITTED', 'IN_REVIEW'] } });

    const pendingActions = {
      unassignedProjectsCount: unassignedProjects.length,
      pendingMilestoneReviewsCount: pendingMilestones,
      atRiskProjectsCount: allProjects.filter((p) => p.health === 'AT_RISK').length,
    };

    // Department statistics
    const departments = await Department.find();
    const departmentStatistics = await Promise.all(
      departments.map(async (dept) => {
        const pCount = allProjects.filter((p) => p.department === dept.name).length;
        const sCount = await User.countDocuments({ role: 'STUDENT', department: dept.name });
        const fCount = await User.countDocuments({ role: 'FACULTY', department: dept.name });
        return {
          id: dept._id,
          name: dept.name,
          code: dept.code,
          head: dept.head,
          description: dept.description || '',
          projectsCount: pCount,
          studentsCount: sCount,
          facultyCount: fCount,
        };
      })
    );

    // Project statistics
    const projectStatistics = {
      total: allProjects.length,
      active: activeProjects.length,
      completed: completedProjects.length,
      atRisk: allProjects.filter((p) => p.health === 'AT_RISK').length,
      onTrack: allProjects.filter((p) => p.health === 'ON_TRACK').length,
      averageProgress:
        allProjects.length > 0 ? Math.round(allProjects.reduce((sum, p) => sum + p.progressPercentage, 0) / allProjects.length) : 0,
    };

    // Faculty workload (number of assigned projects per faculty member)
    const facultyUsers = await User.find({ role: 'FACULTY' }).select('name email title avatar department studentId status createdAt');
    const studentUsers = await User.find({ role: 'STUDENT' }).select('name email title avatar department studentId cohort status createdAt');

    const facultyWorkload = facultyUsers.map((fac) => {
      const assigned = allProjects.filter((p) => p.facultyMentor && p.facultyMentor._id.toString() === fac._id.toString());
      return {
        facultyId: fac._id,
        name: fac.name,
        email: fac.email,
        title: fac.title,
        department: fac.department,
        avatar: fac.avatar,
        status: fac.status || 'Active',
        assignedProjectsCount: assigned.length,
        projects: assigned.map((p) => ({ id: p._id, title: p.title, code: p.code, status: p.status, health: p.health })),
      };
    });

    // Cohort statistics
    const cohorts = await Cohort.find();
    const cohortStatistics = cohorts.map((c) => {
      const cohortProj = allProjects.filter((p) => p.cohort === c.name);
      return {
        id: c._id,
        name: c.name,
        code: c.code,
        term: c.term,
        year: c.year,
        department: c.department,
        status: c.status,
        projectCount: cohortProj.length,
      };
    });

    // Audit summary (last 15 actions)
    const auditSummary = await AuditTrail.find().sort({ timestamp: -1 }).limit(15);

    // Notifications for admin (system announcements / administrative alerts)
    const notifications = await Notification.find({
      $or: [{ user: req.user._id }, { user: null }]
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      role: 'ADMIN',
      data: {
        studentCount,
        facultyCount,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        pendingActions,
        departmentStatistics,
        projectStatistics,
        facultyWorkload,
        cohortStatistics,
        auditSummary,
        allProjects,
        notifications,
        studentUsers,
        facultyUsers,
      },
    });
  } catch (err) {
    console.error('getAdminDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin dashboard data.' });
  }
};

// 4. CALENDAR EVENTS API: GET /api/dashboard/calendar-events
// Role-scoped aggregation of milestones, tasks, and defenses
exports.getCalendarEvents = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    let projectFilter = {};
    if (userRole === 'STUDENT') {
      projectFilter = { teamMembers: userId };
    } else if (userRole === 'FACULTY') {
      projectFilter = { facultyMentor: userId };
    } // ADMIN gets all

    const projects = await Project.find(projectFilter).select('_id title code defenseDate defenseLocation');
    const projectIds = projects.map((p) => p._id);

    const milestones = await Milestone.find({ project: { $in: projectIds } })
      .populate('project', 'title code')
      .select('title dueDate status project');

    let taskFilter = { project: { $in: projectIds } };
    if (userRole === 'STUDENT') {
      taskFilter = { $or: [{ assignedTo: userId }, { project: { $in: projectIds } }] };
    }
    const tasks = await Task.find(taskFilter)
      .populate('project', 'title code')
      .select('title dueDate status priority project');

    const events = [];

    milestones.forEach((m) => {
      if (m.dueDate) {
        events.push({
          id: m._id,
          title: m.title,
          type: 'MILESTONE',
          date: m.dueDate,
          status: m.status,
          projectCode: m.project ? m.project.code : 'CAP',
          projectTitle: m.project ? m.project.title : 'Project',
        });
      }
    });

    tasks.forEach((t) => {
      if (t.dueDate) {
        events.push({
          id: t._id,
          title: t.title,
          type: 'TASK',
          date: t.dueDate,
          status: t.status,
          priority: t.priority,
          projectCode: t.project ? t.project.code : 'CAP',
          projectTitle: t.project ? t.project.title : 'Project',
        });
      }
    });

    projects.forEach((p) => {
      if (p.defenseDate) {
        events.push({
          id: p._id,
          title: `Oral Capstone Defense: ${p.title}`,
          type: 'DEFENSE',
          date: p.defenseDate,
          location: p.defenseLocation || 'Engineering Hall 304',
          projectCode: p.code,
          projectTitle: p.title,
        });
      }
    });

    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({ success: true, count: events.length, events });
  } catch (err) {
    console.error('getCalendarEvents error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve calendar events.' });
  }
};
