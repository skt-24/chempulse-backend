const vintageService = require('../services/vintageService');
const { sendSuccess } = require('../utils/apiResponse');

// ======================================================
// PUBLIC
// ======================================================

const getVintageItems = async (req, res, next) => {
  try {
    const items = await vintageService.getVintageItems(
      req.query
    );

    sendSuccess(res, 200, {
      items
    });
  } catch (err) {
    next(err);
  }
};

const getVintageBySlug = async (req, res, next) => {
  try {
    const item =
      await vintageService.getVintageBySlug(
        req.params.slug
      );

    sendSuccess(res, 200, {
      item
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// ADMIN
// ======================================================

const createVintage = async (req, res, next) => {
  try {
    const item =
      await vintageService.createVintage(
        req.body
      );

    sendSuccess(res, 201, {
      item
    });
  } catch (err) {
    next(err);
  }
};

const updateVintage = async (req, res, next) => {
  try {
    const item =
      await vintageService.updateVintage(
        req.params.id,
        req.body
      );

    sendSuccess(res, 200, {
      item
    });
  } catch (err) {
    next(err);
  }
};

const deleteVintage = async (req, res, next) => {
  try {
    await vintageService.deleteVintage(
      req.params.id
    );

    sendSuccess(res, 200, {
      message: 'Vintage entry permanently deleted'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVintageItems,
  getVintageBySlug,
  createVintage,
  updateVintage,
  deleteVintage
};