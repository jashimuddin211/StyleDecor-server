const jwt = require('jsonwebtoken');
const { getUsersCollection } = require('../config/db');

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access: Missing authorization header' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026', (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Forbidden access: Invalid or expired token' });
    }
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  try {
    const email = req.decoded?.email;
    if (!email) {
      return res.status(403).send({ error: true, message: 'Forbidden access: No credentials found' });
    }
    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'Forbidden access: Admin privilege required' });
    }
    next();
  } catch (err) {
    res.status(500).send({ error: true, message: 'Internal server error during authorization check' });
  }
};

const verifyDecorator = async (req, res, next) => {
  try {
    const email = req.decoded?.email;
    if (!email) {
      return res.status(403).send({ error: true, message: 'Forbidden access: No credentials found' });
    }
    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (user?.role !== 'decorator') {
      return res.status(403).send({ error: true, message: 'Forbidden access: Decorator privilege required' });
    }
    next();
  } catch (err) {
    res.status(500).send({ error: true, message: 'Internal server error during authorization check' });
  }
};

module.exports = {
  verifyJWT,
  verifyAdmin,
  verifyDecorator
};
