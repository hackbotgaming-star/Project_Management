const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const Document = require('../models/Document');
const Department = require('../models/Department');
const Cohort = require('../models/Cohort');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');

// Complete list of SRM Easwari Engineering College (Ramapuram) Departments & Specializations
const ALL_ENGINEERING_DEPARTMENTS = [
  {
    name: 'Computer Science & Engineering',
    code: 'CSE',
    head: 'Dr. Katherine Vance',
    description: 'Autonomous Systems, Quantum ML, AI & Distributed Software Architecture',
  },
  {
    name: 'Artificial Intelligence & Data Science',
    code: 'AI&DS',
    head: 'Dr. S. K. Bhuvaneshwari',
    description: 'Big Data Analytics, Statistical Inference, Deep Learning & Predictive Modeling',
  },
  {
    name: 'Artificial Intelligence & Machine Learning',
    code: 'AI&ML',
    head: 'Dr. V. Deepa',
    description: 'Computer Vision, Natural Language Processing, Neural Computing & Intelligent Systems',
  },
  {
    name: 'Computer Science & Engineering (Cyber Security)',
    code: 'CSE-CS',
    head: 'Dr. G. S. Anandha Mala',
    description: 'Network Defense, Ethical Hacking, Digital Forensics, Cryptography & Zero-Trust Architecture',
  },
  {
    name: 'Computer Science & Design',
    code: 'CSD',
    head: 'Dr. R. Senthamil Selvi',
    description: 'UI/UX Design Systems, Human-Computer Interaction, Interactive Media & Computing',
  },
  {
    name: 'Information Technology',
    code: 'IT',
    head: 'Dr. M. Deva Priya',
    description: 'Cloud Infrastructure, Web Technologies, Software Engineering & Enterprise Solutions',
  },
  {
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    head: 'Dr. R. S. Sabeenian',
    description: 'Wireless Communications, VLSI Design, Embedded Signal Processing & IoT Networks',
  },
  {
    name: 'Electrical & Electronics Engineering',
    code: 'EEE',
    head: 'Dr. E. Kaliappan',
    description: 'Renewable Power Systems, Smart Grids, Electric Vehicle Drives & Power Electronics',
  },
  {
    name: 'Mechanical Engineering',
    code: 'MECH',
    head: 'Dr. Robert Sterling',
    description: 'Thermodynamics, CAD/CAM, Robotics, Finite Element Analysis & Additive Manufacturing',
  },
  {
    name: 'Automobile Engineering',
    code: 'AUTO',
    head: 'Dr. K. Ashok',
    description: 'Autonomous Vehicles, EV Powertrains, Aerodynamics, Vehicle Telematics & Crash Safety',
  },
  {
    name: 'Robotics & Automation Engineering',
    code: 'ROB',
    head: 'Dr. Liam O’Connor',
    description: 'Autonomous Mobile Manipulation, Industrial Cobots, Haptics & Cyber-Physical Systems',
  },
  {
    name: 'Biomedical Engineering',
    code: 'BME',
    head: 'Dr. Sarah Lin',
    description: 'Neural Interfaces, Medical Imaging, Biosensors & Rehabilitation Engineering',
  },
  {
    name: 'Civil Engineering',
    code: 'CIVIL',
    head: 'Dr. Elena Vasquez',
    description: 'Structural Analysis, Smart Cities, Geotechnical & Sustainable Infrastructure',
  },
];

async function ensureAllEngineeringDepartments() {
  const REMOVED_CODES = ['EIE', 'BIOTECH', 'MSE', 'AERO', 'CHEME', 'ISE'];
  const REMOVED_NAMES = [
    'Electronics & Instrumentation Engineering',
    'Biotechnology',
    'Materials Science & Engineering',
    'Aerospace Engineering',
    'Chemical & Biomolecular Engineering',
    'Industrial & Systems Engineering'
  ];

  try {
    // Purge removed departments from database
    await Department.deleteMany({
      $or: [
        { code: { $in: REMOVED_CODES } },
        { name: { $in: REMOVED_NAMES } },
      ]
    });

    // Reassign any users/projects that belonged to deleted departments
    await User.updateMany(
      { department: { $in: [...REMOVED_NAMES, ...REMOVED_CODES] } },
      { department: 'Computer Science & Engineering' }
    );
    await Project.updateMany(
      { department: { $in: [...REMOVED_NAMES, ...REMOVED_CODES] } },
      { department: 'Computer Science & Engineering' }
    );
  } catch (err) {
    console.warn('Error purging deprecated departments:', err.message);
  }

  for (const dept of ALL_ENGINEERING_DEPARTMENTS) {
    try {
      const existing = await Department.findOne({
        $or: [{ code: dept.code }, { name: dept.name }]
      });
      if (!existing) {
        await Department.create(dept);
      }
    } catch (e) {
      console.warn(`Could not sync department ${dept.code}:`, e.message);
    }
  }
}

async function seedDatabase() {
  await ensureAllEngineeringDepartments();

  // Create or verify default Cohort
  let defaultCohort = await Cohort.findOne({ code: 'CS492-SP25' });
  if (!defaultCohort) {
    defaultCohort = await Cohort.create({
      name: 'CS-492 Capstone Cohort 2025',
      code: 'CS492-SP25',
      term: 'Spring',
      year: 2025,
      department: 'Computer Science & Engineering',
      status: 'ACTIVE',
    });
  }

  // Ensure default demo accounts exist without deleting new projects created by users
  const studentPw = await User.hashPassword('student123');
  const facultyPw = await User.hashPassword('faculty123');
  const adminPw = await User.hashPassword('admin123');

  // Student
  let studentUser = await User.findOne({ email: 'student@university.edu' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Alex Chen',
      email: 'student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      cohort: 'CS-492 Capstone Cohort 2025',
      studentId: 'STU-2025-084',
      title: 'Senior Capstone Student',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Undergraduate Engineering Capstone Student.',
    });
  }

  // Faculty
  let facultyUser = await User.findOne({ email: 'faculty@university.edu' });
  if (!facultyUser) {
    facultyUser = await User.create({
      name: 'Dr. Aris Thorne',
      email: 'faculty@university.edu',
      password: facultyPw,
      role: 'FACULTY',
      department: 'Computer Science & Engineering',
      cohort: 'CS-492 Capstone Cohort 2025',
      facultyId: 'FAC-8041',
      title: 'Associate Professor & Advisor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'Faculty Capstone Advisor & Reviewer.',
    });
  }

  // Admin
  let adminUser = await User.findOne({ email: 'admin@university.edu' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Dean Eleanor Vance',
      email: 'admin@university.edu',
      password: adminPw,
      role: 'ADMIN',
      department: 'Office of Academic Affairs',
      title: 'Dean of Engineering & ABET Program Coordinator',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      bio: 'Institutional oversight, capstone committee chair, and accreditation administrator.',
    });
  }

  // Record clean audit trail
  await AuditTrail.deleteMany({});
  await AuditTrail.create({
    user: adminUser._id,
    userName: adminUser.name,
    role: 'ADMIN',
    action: 'CLEAN_DATABASE_INITIALIZATION',
    targetType: 'SYSTEM',
    details: 'Database cleaned: All demo projects, tasks, milestones, and documents removed. Only official credentials active.',
    ipAddress: '127.0.0.1',
  });

  console.log('✅ Database cleaned: All demo projects, tasks, milestones & documents removed.');
  console.log('Active Credentials:');
  console.log(' - Student: student@university.edu / student123');
  console.log(' - Faculty: faculty@university.edu / faculty123');
  console.log(' - Admin:   admin@university.edu   / admin123');
}

module.exports = { seedDatabase };
