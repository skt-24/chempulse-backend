const env = require('../config/env');

const LocalStorageStrategy = require('./LocalStorageStrategy');
const cloudinaryStorage = require('./cloudinaryStorage');

let storageStrategy;

switch (env.STORAGE_PROVIDER) {
  case 'cloudinary':
    console.log('[Storage] Using Cloudinary storage');
    storageStrategy = cloudinaryStorage;
    break;

  case 'local':
    console.log('[Storage] Using local storage');
    storageStrategy = new LocalStorageStrategy();
    break;

  default:
    throw new Error(
      `[Storage] Unsupported storage provider: ${env.STORAGE_PROVIDER}`
    );
}

module.exports = storageStrategy;