const { getDecoratorsCollection } = require('../config/db');
const { ObjectId } = require('mongodb');

const getTopDecorators = async (req, res, next) => {
  try {
    const decoratorsCollection = getDecoratorsCollection();
    const limit = parseInt(req.query.limit) || 6;

    const result = await decoratorsCollection
      .find({ isApproved: { $ne: false } })
      .sort({ rating: -1, totalProjects: -1 })
      .limit(limit)
      .toArray();

    res.send(result);
  } catch (err) {
    next(err);
  }
};

const getAllDecorators = async (req, res, next) => {
  try {
    const decoratorsCollection = getDecoratorsCollection();
    const result = await decoratorsCollection.find().toArray();
    res.send(result);
  } catch (err) {
    next(err);
  }
};

const createDecorator = async (req, res, next) => {
  try {
    const decorator = req.body;
    const decoratorsCollection = getDecoratorsCollection();
    decorator.rating = parseFloat(decorator.rating || 5);
    decorator.experienceYears = parseInt(decorator.experienceYears || 0);
    decorator.available = decorator.available !== false;
    decorator.assignedJobs = [];
    if (decorator.isApproved === undefined) {
      decorator.isApproved = true;
    }
    const result = await decoratorsCollection.insertOne(decorator);
    res.send({ success: true, insertedId: result.insertedId });
  } catch (err) {
    next(err);
  }
};

const updateDecorator = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    delete updates._id;
    if (updates.rating) updates.rating = parseFloat(updates.rating);
    if (updates.experienceYears) updates.experienceYears = parseInt(updates.experienceYears);

    const decoratorsCollection = getDecoratorsCollection();
    const result = await decoratorsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    res.send({ success: true, result });
  } catch (err) {
    next(err);
  }
};

const deleteDecorator = async (req, res, next) => {
  try {
    const id = req.params.id;
    const decoratorsCollection = getDecoratorsCollection();
    const result = await decoratorsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTopDecorators,
  getAllDecorators,
  createDecorator,
  updateDecorator,
  deleteDecorator
};
