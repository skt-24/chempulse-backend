const bookmarkService = require('../services/bookmarkService');
const { sendSuccess } = require('../utils/apiResponse');

const addArticleBookmark = async (req, res, next) => {
  try {
    const { bookmark, newlyCreated } = await bookmarkService.addBookmark(
      req.user._id,
      req.params.articleId,
      'Article'
    );
    sendSuccess(res, newlyCreated ? 201 : 200, { bookmark });
  } catch (err) {
    next(err);
  }
};

const removeArticleBookmark = async (req, res, next) => {
  try {
    await bookmarkService.removeBookmark(
      req.user._id,
      req.params.articleId,
      'Article'
    );
    sendSuccess(res, 200, { message: 'Article bookmark removed' });
  } catch (err) {
    next(err);
  }
};

const addMoleculeBookmark = async (req, res, next) => {
  try {
    const { bookmark, newlyCreated } = await bookmarkService.addBookmark(
      req.user._id,
      req.params.moleculeId,
      'Molecule'
    );
    sendSuccess(res, newlyCreated ? 201 : 200, { bookmark });
  } catch (err) {
    next(err);
  }
};

const removeMoleculeBookmark = async (req, res, next) => {
  try {
    await bookmarkService.removeBookmark(
      req.user._id,
      req.params.moleculeId,
      'Molecule'
    );
    sendSuccess(res, 200, { message: 'Molecule bookmark removed' });
  } catch (err) {
    next(err);
  }
};

const getBookmarks = async (req, res, next) => {
  try {
    const result = await bookmarkService.getUserBookmarks(req.user._id, req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addArticleBookmark,
  removeArticleBookmark,
  addMoleculeBookmark,
  removeMoleculeBookmark,
  getBookmarks
};