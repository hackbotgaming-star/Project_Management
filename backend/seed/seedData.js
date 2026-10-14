const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const Document = require('../models/Document');
const Department = require('../models/Department');
const Cohort = require('../models/Cohort');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');
const SuperDream = require('../models/SuperDream');
const SuperDreamMessage = require('../models/SuperDreamMessage');

// Single Dedicated Department: Artificial Intelligence & Machine Learning
const AIML_DEPARTMENT = {
  name: 'Artificial Intelligence & Machine Learning',
  code: 'AI&ML',
  head: 'Dr. V. Deepa',
  description: 'Deep Learning, Neural Networks, Computer Vision, Natural Language Processing & Intelligent Systems',
};

// 4 Academic Years, each with Section A and Section B
const AIML_COHORTS = [
  { name: 'AI&ML - 1st Year (Section A)', code: 'AIML-1A', year: 1, term: 'A' },
  { name: 'AI&ML - 1st Year (Section B)', code: 'AIML-1B', year: 1, term: 'B' },
  { name: 'AI&ML - 2nd Year (Section A)', code: 'AIML-2A', year: 2, term: 'A' },
  { name: 'AI&ML - 2nd Year (Section B)', code: 'AIML-2B', year: 2, term: 'B' },
  { name: 'AI&ML - 3rd Year (Section A)', code: 'AIML-3A', year: 3, term: 'A' },
  { name: 'AI&ML - 3rd Year (Section B)', code: 'AIML-3B', year: 3, term: 'B' },
  { name: 'AI&ML - 4th Year (Section A)', code: 'AIML-4A', year: 4, term: 'A' },
  { name: 'AI&ML - 4th Year (Section B)', code: 'AIML-4B', year: 4, term: 'B' },
];

async function ensureAIMLDepartmentAndCohorts() {
  try {
    // Purge any old/other departments so AI&ML is the ONLY active academic department
    await Department.deleteMany({
      name: { $ne: AIML_DEPARTMENT.name },
    });

    // Ensure AI&ML department exists and is updated
    let dept = await Department.findOne({
      $or: [{ code: AIML_DEPARTMENT.code }, { name: AIML_DEPARTMENT.name }],
    });
    if (!dept) {
      dept = await Department.create(AIML_DEPARTMENT);
    } else {
      dept.name = AIML_DEPARTMENT.name;
      dept.code = AIML_DEPARTMENT.code;
      dept.head = AIML_DEPARTMENT.head;
      dept.description = AIML_DEPARTMENT.description;
      await dept.save();
    }

    // Ensure all users and projects belong to AI&ML department (or Office of Academic Affairs for admin)
    await User.updateMany(
      { role: { $ne: 'ADMIN' }, department: { $ne: AIML_DEPARTMENT.name } },
      { department: AIML_DEPARTMENT.name }
    );
    await Project.updateMany(
      { department: { $ne: AIML_DEPARTMENT.name } },
      { department: AIML_DEPARTMENT.name }
    );

    // Ensure all 8 cohorts exist for 4 years x 2 sections
    for (const c of AIML_COHORTS) {
      const existing = await Cohort.findOne({ code: c.code });
      if (!existing) {
        await Cohort.create({
          name: c.name,
          code: c.code,
          term: c.term,
          year: c.year,
          department: AIML_DEPARTMENT.name,
          status: 'ACTIVE',
        });
      }
    }
  } catch (err) {
    console.warn('Error syncing AI&ML Department & Cohorts:', err.message);
  }
}

async function seedDatabase() {
  await ensureAIMLDepartmentAndCohorts();

  const studentPw = await User.hashPassword('student123');
  const facultyPw = await User.hashPassword('faculty123');
  const adminPw = await User.hashPassword('admin123');

  // 1. Institutional Admin
  let adminUser = await User.findOne({ email: 'admin@university.edu' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Dean Eleanor Vance',
      email: 'admin@university.edu',
      password: adminPw,
      role: 'ADMIN',
      department: 'Office of Academic Affairs',
      title: 'Dean of Engineering & Institutional Oversight',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      bio: 'Institutional oversight, capstone committee chair, and accreditation administrator.',
    });
  }

  // 2. Head of Department (AI&ML)
  let hodUser = await User.findOne({ email: 'hod.aiml@university.edu' });
  if (!hodUser) {
    hodUser = await User.create({
      name: 'Dr. V. Deepa',
      email: 'hod.aiml@university.edu',
      password: facultyPw,
      role: 'HOD',
      department: AIML_DEPARTMENT.name,
      cohort: 'AI&ML Academic Leadership',
      facultyId: 'FAC-HOD-AIML',
      title: 'Professor & Head of Department (AI&ML)',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      bio: 'Head of Department of Artificial Intelligence & Machine Learning.',
    });
  }

  // 3. Faculty Mentors (AI&ML)
  let facultyUser1 = await User.findOne({ email: 'faculty@university.edu' });
  if (!facultyUser1) {
    facultyUser1 = await User.create({
      name: 'Dr. Aris Thorne',
      email: 'faculty@university.edu',
      password: facultyPw,
      role: 'FACULTY',
      department: AIML_DEPARTMENT.name,
      facultyId: 'FAC-8041',
      title: 'Associate Professor & AI Research Lead',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'Lead Mentor for AI/Deep Learning, Marquee and Super Dream Tracks.',
    });
  } else {
    facultyUser1.department = AIML_DEPARTMENT.name;
    await facultyUser1.save();
  }

  let facultyUser2 = await User.findOne({ email: 'faculty2@university.edu' });
  if (!facultyUser2) {
    facultyUser2 = await User.create({
      name: 'Dr. Sarah Lin',
      email: 'faculty2@university.edu',
      password: facultyPw,
      role: 'FACULTY',
      department: AIML_DEPARTMENT.name,
      facultyId: 'FAC-8042',
      title: 'Associate Professor & Industry Liaison',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      bio: 'Mentor for 3rd Year Dream Track & Enterprise AI Solutions.',
    });
  }

  // 4. Student Demo Accounts in 3rd Year (Section A & Section B)
  // Student 1: Super Dream Scholar (3rd Year - Sec A)
  let studentUser = await User.findOne({ email: 'student@university.edu' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Alex Chen',
      email: 'student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '3rd Year',
      section: 'A',
      cohort: 'AI&ML - 3rd Year (Section A)',
      studentCategory: 'SUPER_DREAM',
      studentId: 'STU-AIML-301',
      title: 'Super Dream Scholar (AI&ML)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: '3rd Year AI&ML student focused on Computer Vision and Transformer Architectures.',
    });
  } else {
    studentUser.department = AIML_DEPARTMENT.name;
    studentUser.academicYear = '3rd Year';
    studentUser.section = 'A';
    studentUser.cohort = 'AI&ML - 3rd Year (Section A)';
    studentUser.studentCategory = 'SUPER_DREAM';
    await studentUser.save();
  }

  // Student 2: Marquee Scholar (3rd Year - Sec A)
  let marqueeStudent = await User.findOne({ email: 'marquee.student@university.edu' });
  if (!marqueeStudent) {
    marqueeStudent = await User.create({
      name: 'Kavya Sharma',
      email: 'marquee.student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '3rd Year',
      section: 'A',
      cohort: 'AI&ML - 3rd Year (Section A)',
      studentCategory: 'MARQUEE',
      studentId: 'STU-AIML-302',
      title: 'Marquee Scholar (AI&ML)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: '3rd Year AI&ML student specializing in Reinforcement Learning and High-Performance ML.',
    });
  }

  // Student 3: Dream Scholar (3rd Year - Sec B)
  let dreamStudent = await User.findOne({ email: 'dream.student@university.edu' });
  if (!dreamStudent) {
    dreamStudent = await User.create({
      name: 'Rohan Verma',
      email: 'dream.student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '3rd Year',
      section: 'B',
      cohort: 'AI&ML - 3rd Year (Section B)',
      studentCategory: 'DREAM',
      studentId: 'STU-AIML-303',
      title: 'Dream Scholar (AI&ML)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: '3rd Year AI&ML student working on Natural Language Processing & Full-Stack AI Services.',
    });
  }

  // Students in 1st, 2nd, and 4th years for full coverage
  let stu1stYear = await User.findOne({ email: 'year1.student@university.edu' });
  if (!stu1stYear) {
    stu1stYear = await User.create({
      name: 'Priya Sundaram',
      email: 'year1.student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '1st Year',
      section: 'A',
      cohort: 'AI&ML - 1st Year (Section A)',
      studentCategory: 'REGULAR',
      studentId: 'STU-AIML-101',
      title: '1st Year AI Foundation Scholar',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    });
  }

  let stu2ndYear = await User.findOne({ email: 'year2.student@university.edu' });
  if (!stu2ndYear) {
    stu2ndYear = await User.create({
      name: 'Aditya Nair',
      email: 'year2.student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '2nd Year',
      section: 'B',
      cohort: 'AI&ML - 2nd Year (Section B)',
      studentCategory: 'REGULAR',
      studentId: 'STU-AIML-201',
      title: '2nd Year Core AI Scholar',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    });
  }

  let stu4thYear = await User.findOne({ email: 'year4.student@university.edu' });
  if (!stu4thYear) {
    stu4thYear = await User.create({
      name: 'Deepak Rajan',
      email: 'year4.student@university.edu',
      password: studentPw,
      role: 'STUDENT',
      department: AIML_DEPARTMENT.name,
      academicYear: '4th Year',
      section: 'A',
      cohort: 'AI&ML - 4th Year (Section A)',
      studentCategory: 'SUPER_DREAM',
      studentId: 'STU-AIML-401',
      title: '4th Year Senior Capstone Scholar',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    });
  }

  // 5. Seed 3rd Year Mentorship Working Tracks: Marquee, Super Dream, and Dream
  // (a) Marquee Track (3rd Year)
  let marqueeTrack = await SuperDream.findOne({ category: 'MARQUEE' });
  if (!marqueeTrack && facultyUser1 && marqueeStudent) {
    marqueeTrack = await SuperDream.create({
      title: '🌟 3rd Year Marquee Track - Elite Research & Tier-1 Incubator',
      description: 'Exclusive mentorship track for top 3rd-year AI&ML students targeting 20+ LPA corporate incubation and published AI research.',
      mentor: facultyUser1._id,
      mentees: [marqueeStudent._id],
      category: 'MARQUEE',
      academicYear: '3rd Year',
      cohort: 'Marquee Track (3rd Year)',
      createdBy: adminUser._id,
      status: 'ACTIVE',
    });

    await SuperDreamMessage.create({
      superDream: marqueeTrack._id,
      sender: facultyUser1._id,
      senderRole: 'FACULTY',
      title: '🌟 Welcome to 3rd Year Marquee AI Track!',
      content: 'Welcome to the Marquee Track! Our objective is tier-1 placement prep, high-impact model research, and patent/paper submissions. We meet weekly for one-on-one reviews and sprint checkpoints.',
      type: 'ANNOUNCEMENT',
      links: [
        { title: 'NeurIPS & CVPR Paper Repository', url: 'https://arxiv.org' },
        { title: 'Marquee Placement Coding Roadmap', url: 'https://leetcode.com' },
      ],
      comments: [
        {
          sender: marqueeStudent._id,
          text: 'Thank you Dr. Thorne! Looking forward to diving into the Transformer optimization milestones.',
          createdAt: new Date(),
        },
      ],
    });
  }

  // (b) Super Dream Track (3rd Year)
  let superDreamTrack = await SuperDream.findOne({ category: 'SUPER_DREAM' });
  if (!superDreamTrack && facultyUser1 && studentUser) {
    superDreamTrack = await SuperDream.create({
      title: '⭐ 3rd Year Super Dream Track - Core AI & Tier-1 Placement',
      description: 'Intensive 3rd-year mentorship program focusing on deep learning system design, algorithmic problem solving, and tier-1 product roles.',
      mentor: facultyUser1._id,
      mentees: [studentUser._id],
      category: 'SUPER_DREAM',
      academicYear: '3rd Year',
      cohort: 'Super Dream Track (3rd Year)',
      createdBy: adminUser._id,
      status: 'ACTIVE',
    });

    await SuperDreamMessage.create({
      superDream: superDreamTrack._id,
      sender: facultyUser1._id,
      senderRole: 'FACULTY',
      title: '🚀 Super Dream Sprint Checkpoint & Bi-Weekly Review',
      content: 'Hello Mentees! Please update your sprint progress on the model deployment pipeline. If you encounter CUDA or inference latency roadblocks, leave a comment below.',
      type: 'ANNOUNCEMENT',
      links: [
        { title: 'Super Dream Roadmap & Milestone Tracker', url: 'https://university.edu/super-dream' },
      ],
      comments: [
        {
          sender: studentUser._id,
          text: 'Understood Professor! Training metrics are stabilized at 94.2% accuracy. Submitting the benchmark report today.',
          createdAt: new Date(),
        },
      ],
    });
  }

  // (c) Dream Track (3rd Year)
  let dreamTrack = await SuperDream.findOne({ category: 'DREAM' });
  if (!dreamTrack && facultyUser2 && dreamStudent) {
    dreamTrack = await SuperDream.create({
      title: '🚀 3rd Year Dream Track - Applied AI & Industry Solutions',
      description: 'Dedicated 3rd-year mentorship track for enterprise AI engineering, microservices deployment, and top tier-2 placements.',
      mentor: facultyUser2._id,
      mentees: [dreamStudent._id],
      category: 'DREAM',
      academicYear: '3rd Year',
      cohort: 'Dream Track (3rd Year)',
      createdBy: adminUser._id,
      status: 'ACTIVE',
    });

    await SuperDreamMessage.create({
      superDream: dreamTrack._id,
      sender: facultyUser2._id,
      senderRole: 'FACULTY',
      title: '🎯 Dream Track Milestone 1: REST API & Model Serving',
      content: 'Welcome to the Dream Track! For our first milestone, each mentee must wrap their ML model into a FastAPI service container. Post your repo links below.',
      type: 'TASK',
      links: [
        { title: 'FastAPI + ONNX Deployment Guide', url: 'https://fastapi.tiangolo.com' },
      ],
      comments: [
        {
          sender: dreamStudent._id,
          text: 'Docker containerized service is ready, pushing repo link to our task submission.',
          createdAt: new Date(),
        },
      ],
    });
  }

  // Clean Audit Trail
  await AuditTrail.deleteMany({});
  await AuditTrail.create({
    user: adminUser._id,
    userName: adminUser.name,
    role: 'ADMIN',
    action: 'INITIALIZE_AIML_WORKSPACE',
    targetType: 'SYSTEM',
    details: 'AI&ML Workspace initialized: 4 Academic Years (1st-4th), Sections A & B.',
    ipAddress: '127.0.0.1',
  });

  console.log('✅ AI&ML Department with 4 Years (Sec A & B) initialized successfully.');
}

module.exports = { seedDatabase };
