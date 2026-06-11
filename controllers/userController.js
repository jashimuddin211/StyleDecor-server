const { getUsersCollection, getDecoratorsCollection } = require('../config/db');

const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const usersCollection = getUsersCollection();
    const result = await usersCollection.find().toArray();
    res.send(result);
  } catch (err) {
    next(err);
  }
};

const getUserByEmail = async (req, res, next) => {
  try {
    const email = req.params.email;
    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    res.send(user);
  } catch (err) {
    next(err);
  }
};

const makeAdmin = async (req, res, next) => {
  try {
    const email = req.params.email;
    const usersCollection = getUsersCollection();
    const result = await usersCollection.updateOne(
      { email: { $regex: new RegExp(`^${email}$`, 'i') } },
      { $set: { role: "admin" } }
    );
    res.send({ success: true, message: "User promoted to admin", result });
  } catch (err) {
    next(err);
  }
};

const makeDecorator = async (req, res, next) => {
  try {
    const email = req.params.email;
    const usersCollection = getUsersCollection();
    const decoratorsCollection = getDecoratorsCollection();

    const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const userUpdateResult = await usersCollection.updateOne(
      { email: { $regex: new RegExp(`^${email}$`, 'i') } },
      { $set: { role: "decorator" } }
    );

    const existingDecorator = await decoratorsCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    let decoratorResult = null;
    if (!existingDecorator) {
      const newDecorator = {
        name: user.name || "New Decorator",
        email: user.email,
        role: "decorator",
        phone: user.phone || "",
        image: user.photoURL || user.image || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
        specialty: "General Decoration",
        experienceYears: 1,
        rating: 5.0,
        available: true,
        assignedJobs: [],
        isApproved: true
      };
      decoratorResult = await decoratorsCollection.insertOne(newDecorator);
    }

    res.send({
      success: true,
      message: "User promoted to decorator",
      userUpdateResult,
      decoratorResult
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const email = req.params.email;
    const profile = req.body;

    if (!profile.name || typeof profile.name !== 'string' || profile.name.trim().length < 2) {
      return res.status(400).send({ error: true, message: "Name must be at least 2 characters." });
    }
    if (profile.photoURL && !validateUrl(profile.photoURL)) {
      return res.status(400).send({ error: true, message: "Profile photo URL format is invalid." });
    }
    if (!profile.phone || typeof profile.phone !== 'string' || profile.phone.trim().length < 5) {
      return res.status(400).send({ error: true, message: "A valid phone number is required." });
    }

    const usersCollection = getUsersCollection();
    const decoratorsCollection = getDecoratorsCollection();

    const userUpdate = await usersCollection.updateOne(
      { email: { $regex: new RegExp(`^${email}$`, 'i') } },
      {
        $set: {
          name: profile.name.trim(),
          photoURL: profile.photoURL ? profile.photoURL.trim() : "",
          phone: profile.phone.trim()
        }
      }
    );

    const decoratorUpdate = await decoratorsCollection.updateOne(
      { email: { $regex: new RegExp(`^${email}$`, 'i') } },
      {
        $set: {
          name: profile.name.trim(),
          image: profile.photoURL ? profile.photoURL.trim() : "",
          phone: profile.phone.trim()
        }
      }
    );

    res.send({ success: true, userUpdate, decoratorUpdate });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserByEmail,
  makeAdmin,
  makeDecorator,
  updateProfile
};
