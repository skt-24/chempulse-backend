const mediaService = require('../services/mediaService');
const { sendSuccess } = require('../utils/apiResponse');

const uploadFile = async (req, res, next) => {
  try {
    const folder = req.body.folder || 'general';

    const media = await mediaService.uploadMedia(
      req.file,
      folder,
      req.user._id
    );

    sendSuccess(res, 201, { media });
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    await mediaService.deleteMedia(
      req.params.id,
      req.user._id,
      req.user.roles
    );

    sendSuccess(res, 200, {
      message: 'Media asset deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  deleteFile
};