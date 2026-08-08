const express = require('express');
const moleculeController = require('../controllers/moleculeController');
const { validateGetMolecules } = require('../validators/moleculeValidator');
const { optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/today', optionalProtect, moleculeController.getMoleculeOfTheDay);
router.get('/', validateGetMolecules, moleculeController.getMolecules);
router.get('/:slug', optionalProtect, moleculeController.getMoleculeBySlug);
router.get('/:slug/related', moleculeController.getRelatedMolecules);

module.exports = router;