const express = require('express');
const router = express.Router();
const { getAllUsers, getUserByEmail, makeAdmin, makeDecorator, updateProfile } = require('../controllers/userController');
const { verifyJWT, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyJWT, verifyAdmin, getAllUsers);
router.get('/:email', getUserByEmail);
router.patch('/admin/:email', verifyJWT, verifyAdmin, makeAdmin);
router.patch('/decorator/:email', verifyJWT, verifyAdmin, makeDecorator);
router.patch('/profile/:email', verifyJWT, updateProfile);

module.exports = router;
