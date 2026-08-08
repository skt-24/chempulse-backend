const express = require('express');
const homeController = require('../controllers/homeController');
const { optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalProtect, homeController.getHomeFeed);

module.exports = router;