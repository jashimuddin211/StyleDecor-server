const express = require('express');
const router = express.Router();
const { getStats, testDb, getHome, issueJwt } = require('../controllers/generalController');

router.get('/', getHome);
router.get('/stats', getStats);
router.get('/test-db', testDb);
router.post('/jwt', issueJwt);

module.exports = router;
