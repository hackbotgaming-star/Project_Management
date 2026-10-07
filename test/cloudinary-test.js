const { cloudinary, uploadBuffer } = require('../src/config/cloudinary');

async function testCloudinary() {
  console.log('Testing Cloudinary connection with provided credentials...');
  console.log('Cloud name:', cloudinary.config().cloud_name);
  console.log('API key:', cloudinary.config().api_key);

  const testBuffer = Buffer.from('ProjectHub Cloudinary Document Integration Test\nTimestamp: ' + new Date().toISOString(), 'utf-8');

  try {
    const result = await uploadBuffer(testBuffer, {
      public_id: 'test_doc_' + Date.now(),
      resource_type: 'raw',
    });
    console.log('Successfully uploaded test document to Cloudinary!');
    console.log('Secure URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    console.log('Bytes:', result.bytes);
    return true;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return false;
  }
}

testCloudinary().then(success => {
  process.exit(success ? 0 : 1);
});
