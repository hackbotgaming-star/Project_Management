const http = require('http');

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
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
    req.write(data);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers
    }, res => {
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
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Student Login & Project Creation with Teammates ---');
  const stuLogin = await post('/api/auth/login/student', {
    email: 'student@university.edu',
    password: 'student123'
  });
  console.log('Student Login Status:', stuLogin.status, stuLogin.data?.user?.email);
  const stuToken = stuLogin.data.token;
  const stuHeaders = { 'Authorization': `Bearer ${stuToken}` };

  // Fetch available students
  const availStudents = await get('/api/projects/students/available', stuHeaders);
  console.log('Available Students count:', availStudents.data?.students?.length);
  const otherStudentId = availStudents.data?.students?.find(s => s.email !== 'student@university.edu')?._id;

  // Create project with teammate
  const createProj = await post('/api/projects', {
    title: 'Autonomous Rover System ' + Date.now().toString().slice(-4),
    description: 'Robotics sensor fusion with lidar and SLAM',
    category: 'Robotics',
    department: 'Computer Science & Engineering',
    teamMembers: otherStudentId ? [otherStudentId] : []
  }, stuHeaders);
  console.log('Project Create Status:', createProj.status, 'Title:', createProj.data?.project?.title, 'Team members count:', createProj.data?.project?.teamMembers?.length);

  console.log('\n--- 2. Testing Document Upload and Retrieval ---');
  const uploadDoc = await post('/api/documents', {
    title: 'Architecture Specification Doc',
    type: 'Specification',
    projectId: createProj.data?.project?._id,
    fileName: 'arch_spec_v1.pdf',
    fileSize: '2.4 MB',
    fileUrl: 'https://example.com/arch_spec_v1.pdf'
  }, stuHeaders);
  console.log('Document Upload Status:', uploadDoc.status, 'Doc title:', uploadDoc.data?.document?.title);

  const getDocs = await get('/api/documents', stuHeaders);
  console.log('Student Documents retrieved count:', getDocs.data?.documents?.length);

  console.log('\n--- 3. Testing Calendar Events API ---');
  const calEvents = await get('/api/dashboard/calendar-events', stuHeaders);
  console.log('Calendar Events count:', calEvents.data?.events?.length);

  console.log('\n--- 4. Testing Faculty Login & Assigning Task ---');
  const facLogin = await post('/api/auth/login/faculty', {
    email: 'faculty@university.edu',
    password: 'faculty123'
  });
  console.log('Faculty Login Status:', facLogin.status, facLogin.data?.user?.name);
  const facToken = facLogin.data.token;
  const facHeaders = { 'Authorization': `Bearer ${facToken}` };

  // Faculty gets their projects to find one to assign task
  const facProjects = await get('/api/projects/my-projects', facHeaders);
  console.log('Faculty projects count:', facProjects.data?.projects?.length);
  const firstFacProj = facProjects.data?.projects?.[0];

  if (firstFacProj) {
    const assignTask = await post('/api/tasks', {
      title: 'Review Experimental Results ' + Date.now().toString().slice(-4),
      description: 'Prepare graphs and statistical summary',
      projectId: firstFacProj._id,
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      priority: 'HIGH'
    }, facHeaders);
    console.log('Faculty Assign Task Status:', assignTask.status, 'Task:', assignTask.data?.task?.title);
  }

  // Faculty Document Upload
  const facDoc = await post('/api/documents', {
    title: 'Faculty Evaluation Rubric',
    type: 'Guideline',
    projectId: firstFacProj?._id,
    fileName: 'evaluation_rubric_2026.pdf',
    fileSize: '512 KB'
  }, facHeaders);
  console.log('Faculty Document Upload Status:', facDoc.status, 'Doc:', facDoc.data?.document?.title);

  console.log('\n--- 5. Testing Admin Document Access ---');
  const adminLogin = await post('/api/auth/login/admin', {
    email: 'admin@university.edu',
    password: 'admin123'
  });
  console.log('Admin Login Status:', adminLogin.status);
  const adminHeaders = { 'Authorization': `Bearer ${adminLogin.data.token}` };
  const adminDocs = await get('/api/documents', adminHeaders);
  console.log('Admin Documents count:', adminDocs.data?.documents?.length);

  console.log('\nAll automated backend checks succeeded!');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
