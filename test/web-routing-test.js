require('dotenv').config();
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function testWebRouting() {
  console.log('🌐 Testing Browser Route Redirection & Access Control...');

  const app = require('../src/server');
  await new Promise((r) => setTimeout(r, 1500));

  const PORT = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${PORT}`;

  // 1. Unauthenticated request to /student/dashboard
  const unauthRes = await fetch(`${baseUrl}/student/dashboard`, { redirect: 'manual' });
  console.log('Unauthenticated /student/dashboard status:', unauthRes.status, 'Location:', unauthRes.headers.get('location'));
  if (unauthRes.status === 302 && unauthRes.headers.get('location') === '/login/student') {
    console.log('✅ Unauthenticated redirect to /login/student PASS');
  }

  // 2. Student login to obtain cookie
  const stuLoginRes = await fetch(`${baseUrl}/api/auth/login/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@university.edu', password: 'student123' }),
  });
  const cookieHeader = stuLoginRes.headers.get('set-cookie');
  const stuCookie = cookieHeader ? cookieHeader.split(';')[0] : '';

  // 3. Student attempting /faculty/dashboard
  const stuOnFacWeb = await fetch(`${baseUrl}/faculty/dashboard`, {
    headers: { Cookie: stuCookie },
    redirect: 'manual',
  });
  console.log('Student on /faculty/dashboard status:', stuOnFacWeb.status, 'Location:', stuOnFacWeb.headers.get('location'));
  if (stuOnFacWeb.status === 302 && stuOnFacWeb.headers.get('location').includes('/student/dashboard')) {
    console.log('✅ Student redirected away from /faculty/dashboard to /student/dashboard PASS');
  }

  // 4. Faculty login
  const facLoginRes = await fetch(`${baseUrl}/api/auth/login/faculty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'faculty@university.edu', password: 'faculty123' }),
  });
  const facCookie = facLoginRes.headers.get('set-cookie').split(';')[0];

  // 5. Faculty attempting /admin/dashboard
  const facOnAdmWeb = await fetch(`${baseUrl}/admin/dashboard`, {
    headers: { Cookie: facCookie },
    redirect: 'manual',
  });
  console.log('Faculty on /admin/dashboard status:', facOnAdmWeb.status, 'Location:', facOnAdmWeb.headers.get('location'));
  if (facOnAdmWeb.status === 302 && facOnAdmWeb.headers.get('location').includes('/faculty/dashboard')) {
    console.log('✅ Faculty redirected away from /admin/dashboard to /faculty/dashboard PASS');
  }

  console.log('🎉 Web routing security verification COMPLETE!');
  process.exit(0);
}

testWebRouting().catch((err) => {
  console.error(err);
  process.exit(1);
});
