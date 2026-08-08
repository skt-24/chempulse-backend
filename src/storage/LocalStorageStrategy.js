const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const BaseStorageStrategy = require('./BaseStorageStrategy');

class LocalStorageStrategy extends BaseStorageStrategy {
  constructor() {
    super();
    this.uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(fileObject, destinationFolder = 'general') {
    const folderPath = path.join(this.uploadDir, destinationFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const ext = path.extname(fileObject.originalname).toLowerCase() || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(folderPath, filename);

    await fs.promises.writeFile(filePath, fileObject.buffer);

    const relativeKey = `${destinationFolder}/${filename}`;
    const url = `/uploads/${relativeKey}`;

    return { key: relativeKey, url };
  }

  async delete(key) {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }
}

module.exports = LocalStorageStrategy;