const express = require('express');
const router = express.Router();
const { register, login, googleLogin, changePassword } = require('../controllers/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.patch('/change-password', verifyJWT, changePassword);

module.exports = router;
