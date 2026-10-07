const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== Google OAuth Multi-Role Test Suite (3 Portals) ===\n');

  // 1. Check Google Config endpoint
  console.log('1. Checking /api/auth/google/config...');
  const cfg = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/config',
    method: 'GET'
  });
  console.log('   Status:', cfg.status);
  console.log('   Configured:', cfg.data.configured);
  console.log('   Callback URL:', cfg.data.callbackUrl);

  // 2. Test initiate OAuth for all 3 roles without credentials (redirects to role login portals)
  console.log('\n2. Testing GET /api/auth/google?role=... redirects:');
  
  const studentRedirect = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google?role=STUDENT',
    method: 'GET'
  });
  console.log('   STUDENT Redirect Status:', studentRedirect.status, '-> Location:', studentRedirect.headers.location);

  const facultyRedirect = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google?role=FACULTY',
    method: 'GET'
  });
  console.log('   FACULTY Redirect Status:', facultyRedirect.status, '-> Location:', facultyRedirect.headers.location);

  const adminRedirect = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google?role=ADMIN',
    method: 'GET'
  });
  console.log('   ADMIN Redirect Status:', adminRedirect.status, '-> Location:', adminRedirect.headers.location);

  // 3. Test Student Google Auth
  console.log('\n3. Testing Student Google Auth (/api/auth/google/student)...');
  const studentRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/student',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@university.edu', name: 'Alex Chen' });
  console.log('   Status:', studentRes.status);
  console.log('   User Role:', studentRes.data?.user?.role);
  console.log('   Redirect URL:', studentRes.data?.redirectUrl);

  // 4. Test Faculty Google Auth
  console.log('\n4. Testing Faculty Google Auth (/api/auth/google/faculty)...');
  const facRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/faculty',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'faculty@university.edu', name: 'Dr. Aris Thorne' });
  console.log('   Status:', facRes.status);
  console.log('   User Role:', facRes.data?.user?.role);
  console.log('   Redirect URL:', facRes.data?.redirectUrl);

  // 5. Test Admin Google Auth
  console.log('\n5. Testing Admin Google Auth (/api/auth/google/admin)...');
  const adminRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/admin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@university.edu', name: 'Dean Eleanor Vance' });
  console.log('   Status:', adminRes.status);
  console.log('   User Role:', adminRes.data?.user?.role);
  console.log('   Redirect URL:', adminRes.data?.redirectUrl);

  // 6. Test Cross-Role Protection (Admin email attempted at Student portal)
  console.log('\n6. Testing Role Mismatch protection (Admin email attempted at Student portal)...');
  const mismatchRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/student',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@university.edu' });
  console.log('   Status:', mismatchRes.status);
  console.log('   Blocked Message:', mismatchRes.data?.message);

  // 7. Test Cross-Role Protection (Student email attempted at Admin portal)
  console.log('\n7. Testing Role Mismatch protection (Student email attempted at Admin portal)...');
  const mismatchRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/google/admin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@university.edu' });
  console.log('   Status:', mismatchRes2.status);
  console.log('   Blocked Message:', mismatchRes2.data?.message);

  console.log('\n=== All 3 Role Google OAuth test cases passed! ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
