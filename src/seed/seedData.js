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
      } else {
        existing.name = dept.name;
        existing.code = dept.code;
        existing.head = dept.head;
        existing.description = dept.description;
        await existing.save();
      }
    } catch (e) {
      console.warn(`Could not sync department ${dept.code}:`, e.message);
    }
  }
}

async function seedDatabase() {
  await ensureAllEngineeringDepartments();

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database already initialized with records.');
    return;
  }

  console.log('🌱 Seeding initial academic database records...');

  // Create Departments
  for (const dept of ALL_ENGINEERING_DEPARTMENTS) {
    const exists = await Department.findOne({ code: dept.code });
    if (!exists) await Department.create(dept);
  }

  // Create Cohorts
  const cohortSpring25 = await Cohort.create({
    name: 'CS-492 Capstone Cohort 2025',
    code: 'CS492-SP25',
    term: 'Spring',
    year: 2025,
    department: 'Computer Science & Engineering',
    status: 'ACTIVE',
  });

  const cohortFall25 = await Cohort.create({
    name: 'CS-491 Preparatory Capstone 2025',
    code: 'CS491-FA25',
    term: 'Fall',
    year: 2025,
    department: 'Computer Science & Engineering',
    status: 'UPCOMING',
  });

  // Hash passwords
  const studentPw = await User.hashPassword('student123');
  const facultyPw = await User.hashPassword('faculty123');
  const adminPw = await User.hashPassword('admin123');

  // 1. Create Students
  const student1 = await User.create({
    name: 'Alex Chen',
    email: 'student@university.edu',
    password: studentPw,
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    studentId: 'STU-2025-084',
    title: 'Senior Capstone Researcher',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Lead Architect on Autonomous Quadrotor swarm navigation.',
  });

  const student2 = await User.create({
    name: 'Elena Rostova',
    email: 'elena@university.edu',
    password: studentPw,
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    studentId: 'STU-2025-085',
    title: 'Perception Systems Specialist',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    bio: 'Focusing on real-time SLAM & LiDAR point cloud sensor fusion.',
  });

  const student3 = await User.create({
    name: 'Marcus Brody',
    email: 'marcus@university.edu',
    password: studentPw,
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    studentId: 'STU-2025-091',
    title: 'Hardware & Telemetry Engineer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Embedded firmware on STM32 microcontrollers and CAN-bus telemetry.',
  });

  // 2. Create Faculty
  const faculty1 = await User.create({
    name: 'Dr. Aris Thorne',
    email: 'faculty@university.edu',
    password: facultyPw,
    role: 'FACULTY',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    facultyId: 'FAC-8041',
    title: 'Associate Professor & Advisor',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    bio: 'Specializing in edge robotics, autonomous path planning, and embedded computer vision.',
  });

  const faculty2 = await User.create({
    name: 'Dr. Marcus Vance',
    email: 'mvance@university.edu',
    password: facultyPw,
    role: 'FACULTY',
    department: 'Computer Science & Engineering',
    facultyId: 'FAC-8042',
    title: 'Professor of Distributed Systems',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'Distributed consensus algorithms and fault-tolerant cloud backends.',
  });

  // 3. Create Admin
  const adminUser = await User.create({
    name: 'Dean Eleanor Vance',
    email: 'admin@university.edu',
    password: adminPw,
    role: 'ADMIN',
    department: 'Office of Academic Affairs',
    title: 'Dean of Engineering & ABET Program Coordinator',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    bio: 'Institutional oversight, capstone committee chair, and accreditation administrator.',
  });

  // Create Projects
  const project1 = await Project.create({
    title: 'Apex Lab: Autonomous Quadrotor SLAM & Swarm Navigation',
    code: 'CAP-2025-01',
    abstract: 'Development of an edge-accelerated simultaneous localization and mapping (SLAM) algorithm for GPS-denied indoor multi-agent quadrotor flight.',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    status: 'IN_PROGRESS',
    health: 'ON_TRACK',
    teamMembers: [student1._id, student2._id, student3._id],
    facultyMentor: faculty1._id,
    progressPercentage: 68,
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-05-20'),
    defenseDate: new Date('2025-05-18T10:00:00Z'),
    defenseLocation: 'Hall 304 / ABET Capstone Boardroom',
    tags: ['Robotics', 'SLAM', 'Embedded ROS2', 'Computer Vision'],
    repositoryUrl: 'https://github.com/apex-lab/quadrotor-slam',
    documentationUrl: 'https://docs.apexlab.edu',
  });

  const project2 = await Project.create({
    title: 'BioSensing Wearable: Real-Time Cardiac Arrhythmia Detection',
    code: 'CAP-2025-02',
    abstract: 'Ultra low-power wearable ECG telemetry with TinyML on-device inference for early ventricular fibrillation alerts.',
    department: 'Electrical & Computer Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    status: 'UNDER_REVIEW',
    health: 'AT_RISK',
    teamMembers: [student2._id],
    facultyMentor: faculty1._id,
    progressPercentage: 45,
    startDate: new Date('2025-01-20'),
    endDate: new Date('2025-05-25'),
    defenseDate: new Date('2025-05-22T14:00:00Z'),
    tags: ['TinyML', 'Wearables', 'Digital Signal Processing'],
  });

  const project3 = await Project.create({
    title: 'Quantum-Resistant Distributed Ledger for Academic Credentialing',
    code: 'CAP-2025-03',
    abstract: 'Lattice-based cryptographic protocol for verifiable university degree attestation and cross-institutional credit transfers.',
    department: 'Computer Science & Engineering',
    cohort: 'CS-492 Capstone Cohort 2025',
    status: 'APPROVED',
    health: 'ON_TRACK',
    teamMembers: [student3._id],
    facultyMentor: faculty2._id,
    progressPercentage: 92,
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-05-10'),
    defenseDate: new Date('2025-05-12T09:00:00Z'),
    tags: ['Cryptography', 'Blockchain', 'Security'],
  });

  // Create Tasks for Project 1
  await Task.create([
    {
      project: project1._id,
      title: 'Optimize LiDAR Odometry EKF Loop on Jetson Orin Nano',
      description: 'Profile execution time of the extended Kalman filter using NVIDIA Nsight Systems and reduce memory overhead to < 18ms latency.',
      assignedTo: student1._id,
      createdBy: student1._id,
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      project: project1._id,
      title: 'Calibrate RealSense D435i Stereo Depth Intrinsics',
      description: 'Run OpenCV checkerboard calibration script across 60 capture frames and write JSON camera matrix.',
      assignedTo: student2._id,
      createdBy: student1._id,
      priority: 'HIGH',
      status: 'DONE',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      project: project1._id,
      title: 'Assemble 3D Printed Carbon-Fiber Drone Frame Chassis',
      description: 'Mount flight controller, ESC distribution board, and vibration dampening pads.',
      assignedTo: student3._id,
      createdBy: student1._id,
      priority: 'MEDIUM',
      status: 'DONE',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      project: project1._id,
      title: 'Submit Midterm Progress Architecture Report to Dr. Thorne',
      description: 'Compile mathematical formulation of SLAM state estimation and upload final PDF to Review Center.',
      assignedTo: student1._id,
      createdBy: faculty1._id,
      priority: 'HIGH',
      status: 'REVIEW',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Create Milestones for Project 1
  await Milestone.create([
    {
      project: project1._id,
      title: 'Phase 1: System Requirements & Architecture Specification',
      description: 'Detailed subsystem hardware specifications, interface control document (ICD), and ROS2 topic graph.',
      dueDate: new Date('2025-02-15'),
      status: 'APPROVED',
      deliverableUrl: 'https://docs.apexlab.edu/phase1-spec.pdf',
      submittedDeliverable: 'Phase 1 System Specification Document v1.2',
      submissionNotes: 'All hardware pinouts and power budget analysis completed.',
      submittedAt: new Date('2025-02-14'),
      submittedBy: student1._id,
      facultyFeedback: 'Excellent rigorous mathematical modeling. Clear hardware breakdown.',
      grade: '98/100',
      evaluatedBy: faculty1._id,
      reviewedAt: new Date('2025-02-16'),
    },
    {
      project: project1._id,
      title: 'Phase 2: Mid-Term Defense & Simulation Benchmarks',
      description: 'Gazebo simulation validating multi-drone collision avoidance and real-time octomap reconstruction.',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: 'SUBMITTED',
      deliverableUrl: 'https://apexlab.edu/deliverables/midterm-benchmarks.zip',
      submittedDeliverable: 'Gazebo simulation recordings & Gazebo SITL test logs',
      submissionNotes: 'Simulation runs at 60fps with 3 quadrotors in dynamic obstacle course. Awaiting mentor sign-off.',
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      submittedBy: student1._id,
      facultyFeedback: '',
      evaluatedBy: null,
    },
    {
      project: project1._id,
      title: 'Phase 3: Hardware Field Flight Validation & Final Defense',
      description: 'Live physical autonomous flight test through GPS-denied obstacle corridor before faculty capstone committee.',
      dueDate: new Date('2025-05-18'),
      status: 'PENDING',
      deliverableUrl: '',
    },
  ]);

  // Create Documents
  await Document.create([
    {
      project: project1._id,
      title: 'System_Architecture_ICD_v2.4.pdf',
      category: 'Architecture',
      fileUrl: '/uploads/System_Architecture_ICD_v2.4.pdf',
      fileType: 'PDF',
      fileSize: '4.8 MB',
      version: 'v2.4',
      uploadedBy: student1._id,
    },
    {
      project: project1._id,
      title: 'ROS2_DDS_QoS_Profiles.yaml',
      category: 'Configuration',
      fileUrl: '/uploads/ROS2_DDS_QoS_Profiles.yaml',
      fileType: 'YAML',
      fileSize: '18 KB',
      version: 'v1.1',
      uploadedBy: student2._id,
    },
  ]);

  // Create Notifications
  await Notification.create([
    {
      user: student1._id,
      title: 'Milestone 2 Under Review',
      message: 'Your Mid-Term Defense & Simulation Benchmarks deliverable was queued for Dr. Thorne.',
      type: 'INFO',
      link: '/student/dashboard#milestones',
    },
    {
      user: faculty1._id,
      title: 'Review Required: Apex Lab Phase 2',
      message: 'Alex Chen submitted "Mid-Term Defense & Simulation Benchmarks" for project CAP-2025-01.',
      type: 'WARNING',
      link: '/faculty/dashboard#reviews',
    },
    {
      user: adminUser._id,
      title: 'ABET Review Cycle Active',
      message: 'All 3 Capstone teams are registered. Faculty workload balances updated.',
      type: 'SUCCESS',
      link: '/admin/dashboard',
    },
  ]);

  // Create Initial Audit Trail
  await AuditTrail.create([
    {
      user: adminUser._id,
      userName: adminUser.name,
      role: 'ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      targetType: 'SYSTEM',
      details: 'Initialized ProjectHub Academic workspace with roles STUDENT, FACULTY, and ADMIN.',
      ipAddress: '127.0.0.1',
    },
    {
      user: adminUser._id,
      userName: adminUser.name,
      role: 'ADMIN',
      action: 'ASSIGN_FACULTY_MENTOR',
      targetType: 'PROJECT',
      targetId: project1._id.toString(),
      details: `Assigned Dr. Aris Thorne as advisor to Apex Lab: Autonomous Quadrotor SLAM.`,
      ipAddress: '127.0.0.1',
    },
  ]);

  console.log(' Academic database seeded successfully!');
  console.log('Credentials:');
  console.log(' Student: student@university.edu / student123');
  console.log(' Faculty: faculty@university.edu / faculty123');
  console.log(' Admin:   admin@university.edu   / admin123');
}

module.exports = { seedDatabase };
