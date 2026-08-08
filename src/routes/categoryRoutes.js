const express = require('express');
const categoryController = require('../controllers/categoryController');
const { validateGetArticles } = require('../validators/articleValidator');

const router = express.Router();

router.get('/', categoryController.getCategories);
router.get('/:slug', categoryController.getCategoryBySlug);
router.get('/:slug/articles', validateGetArticles, categoryController.getCategoryArticles);
router.get('/:slug/hub', categoryController.getCategoryHub);

module.exports = router;