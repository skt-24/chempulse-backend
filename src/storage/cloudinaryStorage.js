const cloudinary = require('../config/cloudinary');

const upload = async (fileObject, folder = 'general') => {
  if (!fileObject || !fileObject.buffer) {
    throw new Error(
      'Cloudinary upload requires a file buffer'
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `chempulse/${folder}`,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          console.error(
            '[Cloudinary Upload Error]',
            error
          );

          return reject(error);
        }

        console.log('[Cloudinary] Upload successful:', {
          publicId: result.public_id,
          url: result.secure_url
        });

        resolve({
          // IMPORTANT:
          // This is Cloudinary's public_id.
          // We need it later when deleting the image.
          key: result.public_id,

          // Permanent HTTPS image URL
          url: result.secure_url
        });
      }
    );

    uploadStream.end(fileObject.buffer);
  });
};

const deleteFile = async (key) => {
  if (!key) {
    return;
  }

  const result = await cloudinary.uploader.destroy(key, {
    resource_type: 'image'
  });

  console.log('[Cloudinary] Delete result:', {
    publicId: key,
    result: result.result
  });

  return result;
};

module.exports = {
  upload,
  delete: deleteFile
};