const { getServicesCollection, getDecoratorsCollection, getBookingsCollection, getUsersCollection, client } = require('../config/db');
const jwt = require('jsonwebtoken');

const getStats = async (req, res, next) => {
  try {
    const servicesCollection = getServicesCollection();
    const decoratorsCollection = getDecoratorsCollection();
    const bookingsCollection = getBookingsCollection();
    const usersCollection = getUsersCollection();

    const totalServices = await servicesCollection.estimatedDocumentCount();
    const totalDecorators = await decoratorsCollection.estimatedDocumentCount();
    const totalBookings = await bookingsCollection.estimatedDocumentCount();
    const totalUsers = await usersCollection.estimatedDocumentCount();

    res.send({
      totalServices: totalServices || 0,
      totalDecorators: totalDecorators || 0,
      totalBookings: totalBookings || 0,
      totalUsers: totalUsers || 0,
      satisfiedClients: (totalBookings || 0) + 128
    });
  } catch (err) {
    next(err);
  }
};

const testDb = async (req, res, next) => {
  try {
    const result = await client.db("admin").command({ ping: 1 });
    res.send(result);
  } catch (err) {
    next(err);
  }
};

const getHome = (req, res) => {
  res.send("Server running");
};

const issueJwt = (req, res) => {
  const user = req.body;
  if (!user || !user.email) {
    return res.status(400).send({ error: true, message: "A valid email is required to issue a token." });
  }
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026', { expiresIn: '1d' });
  res.send({ token });
};

module.exports = {
  getStats,
  testDb,
  getHome,
  issueJwt
};
