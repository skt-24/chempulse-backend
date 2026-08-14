const express = require('express');
const vintageController = require('../controllers/vintageController');

const router = express.Router();

router.get('/', vintageController.getVintageItems);

router.get(
  '/:slug',
  vintageController.getVintageBySlug
);

module.exports = router;