const express = require('express');
const bookmarkController = require('../controllers/bookmarkController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Require authentication for all bookmark operations
router.use(protect);

router.get('/', bookmarkController.getBookmarks);

router.post('/articles/:articleId', bookmarkController.addArticleBookmark);
router.delete('/articles/:articleId', bookmarkController.removeArticleBookmark);

router.post('/molecules/:moleculeId', bookmarkController.addMoleculeBookmark);
router.delete('/molecules/:moleculeId', bookmarkController.removeMoleculeBookmark);

module.exports = router;