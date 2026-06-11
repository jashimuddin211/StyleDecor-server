const express = require('express');
const router = express.Router();
const { getBookings, createBooking, deleteBooking, assignDecorator, updateStatus, manualPay, createCheckoutSession, confirmPayment } = require('../controllers/bookingController');
const { verifyJWT, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyJWT, getBookings);
router.post('/', verifyJWT, createBooking);
router.delete('/:id', verifyJWT, deleteBooking);
router.patch('/assign/:id', verifyJWT, verifyAdmin, assignDecorator);
router.patch('/status/:id', verifyJWT, updateStatus);
router.patch('/pay/:id', verifyJWT, verifyAdmin, manualPay);
router.post('/create-checkout-session', verifyJWT, createCheckoutSession);
router.post('/confirm-payment', verifyJWT, confirmPayment);

module.exports = router;
