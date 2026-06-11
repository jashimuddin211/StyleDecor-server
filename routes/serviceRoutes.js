const express = require('express');
const router = express.Router();
const { getServices, getServiceById, createService, updateService, deleteService } = require('../controllers/serviceController');
const { verifyJWT, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', verifyJWT, verifyAdmin, createService);
router.patch('/:id', verifyJWT, verifyAdmin, updateService);
router.delete('/:id', verifyJWT, verifyAdmin, deleteService);

module.exports = router;
