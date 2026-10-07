const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ta1atd4t',
  api_key: process.env.CLOUDINARY_API_KEY || '578791246297692',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'NDeRvPZqrPG4fmBW-wt8TfBEQf0',
  secure: true,
});

/**
 * Upload a buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Custom Cloudinary options
 * @returns {Promise<Object>} Cloudinary upload result
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'projecthub_documents',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadBuffer,
};
