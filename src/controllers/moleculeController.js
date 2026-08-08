const moleculeService = require('../services/moleculeService');
const { sendSuccess } = require('../utils/apiResponse');

const getMoleculeOfTheDay = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const result = await moleculeService.getMoleculeOfTheDay(userId);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getMoleculeBySlug = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const molecule = await moleculeService.getMoleculeBySlug(req.params.slug, userId);
    sendSuccess(res, 200, { molecule });
  } catch (err) {
    next(err);
  }
};

const getMolecules = async (req, res, next) => {
  try {
    const result = await moleculeService.getMolecules(req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getRelatedMolecules = async (req, res, next) => {
  try {
    const molecules = await moleculeService.getRelatedMolecules(req.params.slug, req.query.limit);
    sendSuccess(res, 200, { molecules });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMoleculeOfTheDay,
  getMoleculeBySlug,
  getMolecules,
  getRelatedMolecules
};