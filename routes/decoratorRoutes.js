const express = require('express');
const router = express.Router();
const { getTopDecorators, getAllDecorators, createDecorator, updateDecorator, deleteDecorator } = require('../controllers/decoratorController');
const { verifyJWT, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/top', getTopDecorators);
router.get('/', getAllDecorators);
router.post('/', verifyJWT, verifyAdmin, createDecorator);
router.patch('/:id', verifyJWT, verifyAdmin, updateDecorator);
router.delete('/:id', verifyJWT, verifyAdmin, deleteDecorator);

module.exports = router;
