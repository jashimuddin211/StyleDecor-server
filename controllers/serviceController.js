const { getServicesCollection } = require('../config/db');
const { ObjectId } = require('mongodb');

const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const validateServiceData = (service) => {
  const errors = [];
  if (!service.service_name || typeof service.service_name !== 'string' || service.service_name.trim().length < 3) {
    errors.push("Service name must be at least 3 characters.");
  }
  const cost = parseInt(service.cost);
  if (isNaN(cost) || cost <= 0) {
    errors.push("Cost must be a positive integer.");
  }
  if (!service.unit || typeof service.unit !== 'string' || service.unit.trim().length < 2) {
    errors.push("Unit must be at least 2 characters.");
  }
  if (!service.service_category || typeof service.service_category !== 'string') {
    errors.push("Service category is required.");
  }
  if (!service.description || typeof service.description !== 'string' || service.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters.");
  }
  if (service.image && !validateUrl(service.image)) {
    errors.push("Image URL format is invalid.");
  }
  return errors;
};

const getServices = async (req, res, next) => {
  try {
    const servicesCollection = getServicesCollection();
    const search = req.query.search || "";
    const category = req.query.category || "";

    const min = parseInt(req.query.min) || 0;
    const max = parseInt(req.query.max) || Number.MAX_VALUE;

    const sort = req.query.sort || "";
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 8;

    let query = {
      cost: {
        $gte: min,
        $lte: max
      }
    };

    if (search) {
      query.service_name = {
        $regex: search,
        $options: "i"
      };
    }

    if (category) {
      query.service_category = category;
    }

    let sortOption = {};
    if (sort === "asc") {
      sortOption.cost = 1;
    } else if (sort === "desc") {
      sortOption.cost = -1;
    }

    if (!isNaN(page)) {
      const skip = (page - 1) * limit;
      const result = await servicesCollection
        .find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalItems = await servicesCollection.countDocuments(query);
      const totalPages = Math.ceil(totalItems / limit);

      res.send({
        services: result,
        totalItems,
        totalPages,
        currentPage: page
      });
    } else {
      const result = await servicesCollection
        .find(query)
        .sort(sortOption)
        .toArray();
      res.send(result);
    }
  } catch (err) {
    next(err);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const servicesCollection = getServicesCollection();
    const result = await servicesCollection.findOne({
      _id: new ObjectId(id)
    });
    if (!result) {
      return res.status(404).send({ error: true, message: "Service not found" });
    }
    res.send(result);
  } catch (err) {
    next(err);
  }
};

const createService = async (req, res, next) => {
  try {
    const service = req.body;
    const errors = validateServiceData(service);
    if (errors.length > 0) {
      return res.status(400).send({ error: true, message: errors.join(" ") });
    }

    const servicesCollection = getServicesCollection();
    const newService = {
      service_name: service.service_name.trim(),
      cost: parseInt(service.cost),
      unit: service.unit.trim(),
      service_category: service.service_category.trim(),
      description: service.description.trim(),
      image: service.image ? service.image.trim() : "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=60",
      createdByEmail: service.createdByEmail ? service.createdByEmail.trim().toLowerCase() : "admin@styledecor.com"
    };

    const result = await servicesCollection.insertOne(newService);
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const id = req.params.id;
    const service = req.body;
    delete service._id;

    const errors = [];
    if (service.service_name !== undefined && (typeof service.service_name !== 'string' || service.service_name.trim().length < 3)) {
      errors.push("Service name must be at least 3 characters.");
    }
    if (service.cost !== undefined) {
      const cost = parseInt(service.cost);
      if (isNaN(cost) || cost <= 0) {
        errors.push("Cost must be a positive integer.");
      }
    }
    if (service.unit !== undefined && (typeof service.unit !== 'string' || service.unit.trim().length < 2)) {
      errors.push("Unit must be at least 2 characters.");
    }
    if (service.description !== undefined && (typeof service.description !== 'string' || service.description.trim().length < 10)) {
      errors.push("Description must be at least 10 characters.");
    }
    if (service.image !== undefined && service.image && !validateUrl(service.image)) {
      errors.push("Image URL format is invalid.");
    }

    if (errors.length > 0) {
      return res.status(400).send({ error: true, message: errors.join(" ") });
    }

    if (service.cost !== undefined) {
      service.cost = parseInt(service.cost);
    }
    if (service.service_name) service.service_name = service.service_name.trim();
    if (service.unit) service.unit = service.unit.trim();
    if (service.description) service.description = service.description.trim();
    if (service.image) service.image = service.image.trim();
    if (service.createdByEmail) service.createdByEmail = service.createdByEmail.trim().toLowerCase();

    const servicesCollection = getServicesCollection();
    const result = await servicesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: service }
    );
    res.send({ success: true, result });
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const id = req.params.id;
    const servicesCollection = getServicesCollection();
    const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
