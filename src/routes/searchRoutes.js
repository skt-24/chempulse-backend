const express = require('express');
const searchController = require('../controllers/searchController');
const { validateSearch } = require('../validators/searchValidator');

const router = express.Router();

router.get('/', validateSearch, searchController.search);

module.exports = router;