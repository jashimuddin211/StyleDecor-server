const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const { verifyJWT } = require('./middleware/authMiddleware');
const { createCheckoutSession } = require('./controllers/bookingController');

// Routes
const generalRoutes = require('./routes/generalRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const decoratorRoutes = require('./routes/decoratorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app = express();
const port = process.env.PORT || 4000;

// Enable CORS and JSON Parsing
app.use(cors());
app.use(express.json());

// Initialize Database connection immediately
let dbConnectionPromise = connectDB();

// Middleware to ensure DB connection is ready on requests
app.use(async (req, res, next) => {
  const exemptPaths = ['/', '/test-db'];
  if (!exemptPaths.includes(req.path)) {
    try {
      await dbConnectionPromise;
    } catch (err) {
      return res.status(503).send({ 
        error: true, 
        message: 'Database connection failed to establish. Please check MongoDB settings.' 
      });
    }
  }
  next();
});

// Mount routes
app.use('/', generalRoutes);
app.use('/api/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/decorators', decoratorRoutes);
app.use('/bookings', bookingRoutes);
app.use('/contacts', contactRoutes);

// Stripe Checkout Session at root for backwards compatibility
app.post('/create-checkout-session', verifyJWT, createCheckoutSession);

// Centralized error handling middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;