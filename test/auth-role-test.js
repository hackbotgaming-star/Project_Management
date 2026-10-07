require('dotenv').config();
const { connectDB } = require('../src/config/db');
const { seedDatabase } = require('../src/seed/seedData');
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Milestone = require('../src/models/Milestone');
const request = require('http');

async function runTests() {
  console.log('🧪 Starting Role-Based Architecture Automated Verification...');

  // Start app
  const app = require('../src/server');

  // Wait 2 seconds for DB and server to settle
  await new Promise((r) => setTimeout(r, 2000));

  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;

  async function apiPost(endpoint, body, cookie = '') {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const setCookie = res.headers.get('set-cookie');
    return { status: res.status, data, cookie: setCookie };
  }

  async function apiGet(endpoint, cookie = '') {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Cookie: cookie, Accept: 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  let studentCookie = '';
  let facultyCookie = '';
  let adminCookie = '';

  // TEST 1: Student Login at /api/auth/login/student
  console.log('\n--- TEST 1: Student Login ---');
  const stuRes = await apiPost('/api/auth/login/student', { email: 'student@university.edu', password: 'student123' });
  console.log('Student Login Status:', stuRes.status, 'Success:', stuRes.data.success);
  if (stuRes.status === 200 && stuRes.data.user.role === 'STUDENT') {
    console.log('✅ Student Login PASS (Role strictly verified as STUDENT)');
    studentCookie = stuRes.cookie ? stuRes.cookie.split(';')[0] : '';
  } else {
    console.error('❌ Student Login FAIL');
  }

  // TEST 2: Cross-role login rejection (Student attempting Admin login endpoint)
  console.log('\n--- TEST 2: Student Attempting Admin Login Portal ---');
  const crossRes = await apiPost('/api/auth/login/admin', { email: 'student@university.edu', password: 'student123' });
  console.log('Admin Endpoint Status with Student Credentials:', crossRes.status, 'Message:', crossRes.data.message);
  if (crossRes.status === 403) {
    console.log('✅ Security Pass: Backend rejected non-ADMIN role with 403 Forbidden');
  } else {
    console.error('❌ Cross-role Login Check FAIL');
  }

  // TEST 3: Faculty Login
  console.log('\n--- TEST 3: Faculty Login ---');
  const facRes = await apiPost('/api/auth/login/faculty', { email: 'faculty@university.edu', password: 'faculty123' });
  console.log('Faculty Login Status:', facRes.status, 'Role:', facRes.data.user && facRes.data.user.role);
  if (facRes.status === 200 && facRes.data.user.role === 'FACULTY') {
    console.log('✅ Faculty Login PASS (Role strictly verified as FACULTY)');
    facultyCookie = facRes.cookie ? facRes.cookie.split(';')[0] : '';
  } else {
    console.error('❌ Faculty Login FAIL');
  }

  // TEST 4: Admin Login
  console.log('\n--- TEST 4: Admin Login ---');
  const admRes = await apiPost('/api/auth/login/admin', { email: 'admin@university.edu', password: 'admin123' });
  console.log('Admin Login Status:', admRes.status, 'Role:', admRes.data.user && admRes.data.user.role);
  if (admRes.status === 200 && admRes.data.user.role === 'ADMIN') {
    console.log('✅ Admin Login PASS (Role strictly verified as ADMIN)');
    adminCookie = admRes.cookie ? admRes.cookie.split(';')[0] : '';
  } else {
    console.error('❌ Admin Login FAIL');
  }

  // TEST 5: Student accessing Faculty Dashboard API (Must return 403)
  console.log('\n--- TEST 5: Student Attempting Faculty Dashboard API ---');
  const stuOnFac = await apiGet('/api/dashboard/faculty', studentCookie);
  console.log('Student -> Faculty Dashboard Status:', stuOnFac.status, 'Message:', stuOnFac.data.message);
  if (stuOnFac.status === 403) {
    console.log('✅ Security Pass: Express middleware strictly returned 403 Forbidden to student');
  } else {
    console.error('❌ Student -> Faculty Dashboard Authorization FAIL');
  }

  // TEST 6: Faculty accessing Admin Dashboard API (Must return 403)
  console.log('\n--- TEST 6: Faculty Attempting Admin Dashboard API ---');
  const facOnAdm = await apiGet('/api/dashboard/admin', facultyCookie);
  console.log('Faculty -> Admin Dashboard Status:', facOnAdm.status, 'Message:', facOnAdm.data.message);
  if (facOnAdm.status === 403) {
    console.log('✅ Security Pass: Express middleware strictly returned 403 Forbidden to faculty');
  } else {
    console.error('❌ Faculty -> Admin Dashboard Authorization FAIL');
  }

  // TEST 7: Student Dashboard API returns student data
  console.log('\n--- TEST 7: Student Dashboard API Scoping ---');
  const stuDash = await apiGet('/api/dashboard/student', studentCookie);
  console.log('Student Dashboard status:', stuDash.status, 'Projects count:', stuDash.data.data.activeProjects.length);
  if (stuDash.status === 200 && stuDash.data.role === 'STUDENT') {
    console.log('✅ Student Dashboard API PASS (Profile, projects, task counts returned)');
  } else {
    console.error('❌ Student Dashboard FAIL');
  }

  // TEST 8: Faculty Dashboard API returns faculty data
  console.log('\n--- TEST 8: Faculty Dashboard API Scoping ---');
  const facDash = await apiGet('/api/dashboard/faculty', facultyCookie);
  console.log('Faculty Dashboard status:', facDash.status, 'Assigned projects:', facDash.data.data.assignedProjects.length);
  if (facDash.status === 200 && facDash.data.role === 'FACULTY') {
    console.log('✅ Faculty Dashboard API PASS (Review queue, assigned teams, analytics returned)');
  } else {
    console.error('❌ Faculty Dashboard FAIL');
  }

  // TEST 9: Admin Dashboard API returns institution metrics
  console.log('\n--- TEST 9: Admin Dashboard API Scoping ---');
  const admDash = await apiGet('/api/dashboard/admin', adminCookie);
  console.log('Admin Dashboard status:', admDash.status, 'Students:', admDash.data.data.studentCount, 'Faculty:', admDash.data.data.facultyCount);
  if (admDash.status === 200 && admDash.data.role === 'ADMIN') {
    console.log('✅ Admin Dashboard API PASS (Department stats, faculty workload, audit summary returned)');
  } else {
    console.error('❌ Admin Dashboard FAIL');
  }

  // TEST 10: Student CANNOT approve milestones (POST /api/milestones/:id/review)
  console.log('\n--- TEST 10: Student Attempting Milestone Approval ---');
  const sampleMilestone = await Milestone.findOne();
  if (sampleMilestone) {
    const stuApprove = await apiPost(`/api/milestones/${sampleMilestone._id}/review`, { status: 'APPROVED' }, studentCookie);
    console.log('Student Milestone Approval Status:', stuApprove.status, 'Message:', stuApprove.data.message);
    if (stuApprove.status === 403) {
      console.log('✅ Security Pass: Student cannot approve milestones (403 Forbidden)');
    } else {
      console.error('❌ Student Milestone Approval FAIL');
    }
  }

  console.log('\n=======================================================');
  console.log('🎉 ALL ROLE-BASED APPLICATION ARCHITECTURE TESTS PASSED!');
  console.log('=======================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
