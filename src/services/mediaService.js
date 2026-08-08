const Media = require('../models/Media');
const storageStrategy = require('../storage');
const ApiError = require('../utils/apiError');
const env = require('../config/env');

const uploadMedia = async (fileObject, folder, userId) => {
  const allowedFolders = ['avatars', 'heroes', 'molecules', 'categories', 'general'];
  const targetFolder = allowedFolders.includes(folder) ? folder : 'general';

  // Upload using active storage provider
  const { key, url } = await storageStrategy.upload(fileObject, targetFolder);

  const media = await Media.create({
    originalName: fileObject.originalname,
    filename: key.split('/').pop(),
    mimeType: fileObject.mimetype,
    sizeBytes: fileObject.size,
    url,
    storageKey: key,
    storageProvider: env.STORAGE_PROVIDER,
    folder: targetFolder,
    uploadedBy: userId
  });

  return media;
};

const deleteMedia = async (mediaId, userId, userRoles = []) => {
  const media = await Media.findById(mediaId);
  if (!media) {
    throw new ApiError(404, 'Media asset not found', 'MEDIA_NOT_FOUND');
  }

  // Ownership check: Only uploader or admin can delete
  const isOwner = media.uploadedBy.toString() === userId.toString();
  const isAdmin = userRoles.includes('admin');

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Permission denied to delete this media asset', 'FORBIDDEN');
  }

  await storageStrategy.delete(media.storageKey);
  await media.deleteOne();

  return true;
};

module.exports = {
  uploadMedia,
  deleteMedia
};