class BaseStorageStrategy {
  constructor() {
    if (new.target === BaseStorageStrategy) {
      throw new TypeError('Cannot instantiate abstract class BaseStorageStrategy directly.');
    }
  }

  /**
   * Uploads a file buffer to the storage provider.
   * @param {Object} fileObject - Multer file object with buffer, originalname, mimetype
   * @param {string} destinationFolder - Target folder (e.g., 'avatars', 'heroes', 'molecules')
   * @returns {Promise<{ key: string, url: string }>}
   */
  async upload(fileObject, destinationFolder) {
    throw new Error('Method upload() must be implemented by subclass.');
  }

  /**
   * Deletes a file from the storage provider.
   * @param {string} key - Storage key or relative file path
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    throw new Error('Method delete() must be implemented by subclass.');
  }
}

module.exports = BaseStorageStrategy;