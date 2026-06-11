const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getUsersCollection } = require('../config/db');

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, photoURL } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).send({ error: true, message: "Name must be at least 2 characters long." });
    }
    if (!email || !validateEmail(email)) {
      return res.status(400).send({ error: true, message: "A valid email address is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).send({ error: true, message: "Password must be at least 6 characters long." });
    }

    const usersCollection = getUsersCollection();
    const existingUser = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).send({ error: true, message: "User already exists with this email address." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      photoURL: photoURL ? photoURL.trim() : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
      role: "user",
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    const token = jwt.sign(
      { email: newUser.email, role: newUser.role },
      process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026',
      { expiresIn: '1d' }
    );

    res.status(201).send({
      success: true,
      token,
      user: {
        name: newUser.name,
        email: newUser.email,
        photoURL: newUser.photoURL,
        role: newUser.role
      }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ error: true, message: "Email and password are required." });
    }

    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (!user || !user.password) {
      return res.status(401).send({ error: true, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ error: true, message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role || 'user' },
      process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026',
      { expiresIn: '1d' }
    );

    res.send({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    next(err);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).send({ error: true, message: "Email is required." });
    }

    const usersCollection = getUsersCollection();
    let user = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (!user) {
      const newUser = {
        name: name ? name.trim() : "Google User",
        email: email.trim().toLowerCase(),
        photoURL: photoURL ? photoURL.trim() : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
        role: "user",
        createdAt: new Date()
      };
      await usersCollection.insertOne(newUser);
      user = newUser;
    }

    const token = jwt.sign(
      { email: user.email, role: user.role || 'user' },
      process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026',
      { expiresIn: '1d' }
    );

    res.send({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (req.decoded.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).send({ error: true, message: "Forbidden access: Cannot modify another user's profile." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).send({ error: true, message: "New password must be at least 6 characters long." });
    }

    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (!user) {
      return res.status(404).send({ error: true, message: "User not found." });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).send({ error: true, message: "Incorrect old password." });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await usersCollection.updateOne(
      { email: user.email },
      { $set: { password: hashedPassword } }
    );

    res.send({ success: true, message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  changePassword
};
