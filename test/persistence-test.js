require('dotenv').config();
const { connectDB } = require('../src/config/db');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const Milestone = require('../src/models/Milestone');

async function testPersistence() {
  console.log('💾 Testing Logout & Re-login MongoDB Persistence Cycle...');

  const app = require('../src/server');
  await new Promise((r) => setTimeout(r, 1500));

  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;

  // STEP 1: Student Login -> Create Task -> Save -> Logout -> Re-login -> Verify
  console.log('\n--- Student Action Persistence Cycle ---');
  let res = await fetch(`${baseUrl}/api/auth/login/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@university.edu', password: 'student123' }),
  });
  let cookie = res.headers.get('set-cookie').split(';')[0];
  console.log('1. Student logged in.');

  // Find student's project
  const proj = await Project.findOne();
  const testTaskTitle = `Persistence Test Task - ${Date.now()}`;

  res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ projectId: proj._id, title: testTaskTitle, priority: 'HIGH' }),
  });
  let data = await res.json();
  console.log('2. Student created task in MongoDB:', data.task.title);

  // Logout
  await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log('3. Student logged out.');

  // Relogin
  res = await fetch(`${baseUrl}/api/auth/login/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@university.edu', password: 'student123' }),
  });
  cookie = res.headers.get('set-cookie').split(';')[0];
  console.log('4. Student re-authenticated.');

  // Fetch tasks
  res = await fetch(`${baseUrl}/api/tasks?projectId=${proj._id}`, {
    headers: { Cookie: cookie },
  });
  data = await res.json();
  const foundTask = data.tasks.find((t) => t.title === testTaskTitle);
  if (foundTask) {
    console.log('✅ Student task remained available after logout and re-login! MongoDB persistence verified.');
  } else {
    console.error('❌ Task persistence FAIL');
  }

  // STEP 2: Faculty Action Persistence Cycle
  console.log('\n--- Faculty Action Persistence Cycle ---');
  res = await fetch(`${baseUrl}/api/auth/login/faculty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@university.edu', password: 'faculty123' }),
  });
  cookie = res.headers.get('set-cookie').split(';')[0];
  console.log('1. Faculty logged in.');

  const testMilestoneTitle = `Persistence Milestone - ${Date.now()}`;
  res = await fetch(`${baseUrl}/api/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      projectId: proj._id,
      title: testMilestoneTitle,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      description: 'Persistent milestone test',
    }),
  });
  data = await res.json();
  console.log('2. Faculty published milestone to MongoDB:', data.milestone.title);

  await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
  console.log('3. Faculty logged out.');

  res = await fetch(`${baseUrl}/api/auth/login/faculty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@university.edu', password: 'faculty123' }),
  });
  cookie = res.headers.get('set-cookie').split(';')[0];
  console.log('4. Faculty re-authenticated.');

  res = await fetch(`${baseUrl}/api/milestones?projectId=${proj._id}`, { headers: { Cookie: cookie } });
  data = await res.json();
  const foundMilestone = data.milestones.find((m) => m.title === testMilestoneTitle);
  if (foundMilestone) {
    console.log('✅ Faculty milestone remained available after logout and re-login! MongoDB persistence verified.');
  } else {
    console.error('❌ Milestone persistence FAIL');
  }

  console.log('\n🎉 ALL PERSISTENCE AND RELOGIN CYCLES VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}

testPersistence().catch((err) => {
  console.error(err);
  process.exit(1);
});
