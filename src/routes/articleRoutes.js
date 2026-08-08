const express = require('express');
const articleController = require('../controllers/articleController');
const { validateGetArticles } = require('../validators/articleValidator');
const { optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/', validateGetArticles, articleController.getArticles);
router.get('/featured', articleController.getFeaturedArticles);
router.get('/:slug', optionalProtect, articleController.getArticleBySlug);

module.exports = router;