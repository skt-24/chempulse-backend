const express = require('express');
const vintageController = require('../controllers/vintageController');

const router = express.Router();

// ======================================================
// VINTAGE ARCHIVE - PUBLIC
// ======================================================

// GET /api/vintage
router.get('/', vintageController.getVintageItems);

// GET /api/vintage/:slug
router.get('/:slug', vintageController.getVintageBySlug);

module.exports = router;