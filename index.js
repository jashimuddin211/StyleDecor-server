const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

console.log("Stripe Key Loaded:", process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.slice(0, 15) + "..." : "None - using fallback");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51OwWnK2Mw3qFkL1wWvO1vU3v4v5v6v7v8v9v0vAB1C2D3E4F5G6H7I8J9K0L');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// MIDDLEWARE: VERIFY JWT TOKEN
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

// Validation helpers
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// GENERATE JWT TOKEN
app.post('/jwt', (req, res) => {
  const user = req.body;
  if (!user || !user.email || !validateEmail(user.email)) {
    return res.status(400).send({ error: true, message: "A valid email is required to issue a token." });
  }
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET || 'styledecor_secret_token_key_2026', { expiresIn: '1d' });
  res.send({ token });
});

app.get('/', (req, res) => {
  res.send("Server running");
});

const uri =
  "mongodb+srv://styledecor:iAQmvhWPWnEIXy3h@cluster0.4h16s8h.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

let servicesCollection;
let decoratorsCollection;
let bookingsCollection;
let usersCollection;
let transactionsCollection;
let contactsCollection;
let dbConnectionPromise = null;

async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected");

    const db = client.db("styledecor");
    servicesCollection = db.collection("services");
    decoratorsCollection = db.collection("decorators");
    bookingsCollection = db.collection("bookings");
    usersCollection = db.collection("user");
    transactionsCollection = db.collection("transactions");
    contactsCollection = db.collection("contacts");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

// Middleware to ensure DB connection is ready
app.use(async (req, res, next) => {
  const exemptPaths = ['/', '/test-db'];
  if (!exemptPaths.includes(req.path)) {
    try {
      if (dbConnectionPromise) {
        await dbConnectionPromise;
      }
      if (!servicesCollection) {
        return res.status(503).send({ 
          error: true, 
          message: 'Database connection failed to establish. Please check MongoDB access settings.' 
        });
      }
    } catch (err) {
      return res.status(503).send({ 
        error: true, 
        message: 'Database connection failed to establish: ' + err.message 
      });
    }
  }
  next();
});


    app.get('/test-db', async (req, res) => {
      const result = await client.db("admin").command({ ping: 1 });
      res.send(result);
    });

    

    // CREATE USER (REGISTER)
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        // Server-side validation
        if (!user || !user.name || typeof user.name !== 'string' || user.name.trim().length < 2) {
          return res.status(400).send({ error: true, message: "Name must be at least 2 characters long." });
        }
        if (!user || !user.email || !validateEmail(user.email)) {
          return res.status(400).send({ error: true, message: "A valid email address is required." });
        }
        if (user.photoURL && !validateUrl(user.photoURL)) {
          return res.status(400).send({ error: true, message: "Profile image URL is invalid." });
        }

        const existingUser = await usersCollection.findOne({
          email: { $regex: new RegExp(`^${user.email.trim()}$`, 'i') }
        });

        if (existingUser) {
          return res.status(400).send({
            error: true,
            message: "User already exists with this email address."
          });
        }

        const newUser = {
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          photoURL: user.photoURL ? user.photoURL.trim() : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
          role: "user",
          createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).send({
          success: true,
          insertedId: result.insertedId
        });

      } catch (err) {
        res.status(500).send({ error: true, message: err.message });
      }
    });

    app.get('/users', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // GET USER (ROLE CHECK FOR FRONTEND)
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
console.log(email)
      const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
console.log(user)
      res.send(user);
    });

    // MAKE ADMIN
    app.patch("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const result = await usersCollection.updateOne(
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        {
          $set: { role: "admin" }
        }
      );

      res.send({
        success: true,
        message: "User promoted to admin",
        result
      });
    });

    // MAKE DECORATOR
    app.patch("/users/decorator/:email", async (req, res) => {
      try {
        const email = req.params.email;
        
        // Fetch the user details
        const user = await usersCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) {
          return res.status(404).send({ success: false, message: "User not found" });
        }

        // Update user role in users collection
        const userUpdateResult = await usersCollection.updateOne(
          { email: { $regex: new RegExp(`^${email}$`, 'i') } },
          { $set: { role: "decorator" } }
        );

        // Check if decorator already exists in decorators collection
        const existingDecorator = await decoratorsCollection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        let decoratorResult = null;
        if (!existingDecorator) {
          // Create a new decorator document
          const newDecorator = {
            name: user.name || "New Decorator",
            email: user.email,
            role: "decorator",
            phone: user.phone || "",
            image: user.image || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
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
        res.status(500).send({ error: err.message });
      }
    });

    

    app.get('/services', async (req, res) => {
      try {
        const search = req.query.search || "";
        const category = req.query.category || "";

        const min = parseInt(req.query.min) || 0;
        const max = parseInt(req.query.max) || Number.MAX_VALUE;

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

        const result = await servicesCollection.find(query).toArray();
        res.send(result);

      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;

      const result = await servicesCollection.findOne({
        _id: new ObjectId(id)
      });

      res.send(result);
    });

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

    app.post('/services', async (req, res) => {
      try {
        const service = req.body;
        const errors = validateServiceData(service);
        if (errors.length > 0) {
          return res.status(400).send({ error: true, message: errors.join(" ") });
        }
        
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
        res.status(500).send({ error: true, message: err.message });
      }
    });

    app.patch('/services/:id', async (req, res) => {
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

        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: service }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: true, message: err.message });
      }
    });

    app.delete('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // POST CONTACT MESSAGE
    app.post('/contacts', async (req, res) => {
      try {
        const contact = req.body;
        
        if (!contact.name || typeof contact.name !== 'string' || contact.name.trim().length < 2) {
          return res.status(400).send({ error: true, message: "Name must be at least 2 characters." });
        }
        if (!contact.email || !validateEmail(contact.email)) {
          return res.status(400).send({ error: true, message: "A valid email address is required." });
        }
        if (!contact.subject || typeof contact.subject !== 'string' || contact.subject.trim().length < 4) {
          return res.status(400).send({ error: true, message: "Subject must be at least 4 characters." });
        }
        if (!contact.message || typeof contact.message !== 'string' || contact.message.trim().length < 10) {
          return res.status(400).send({ error: true, message: "Message must be at least 10 characters." });
        }
        
        const newContact = {
          name: contact.name.trim(),
          email: contact.email.trim().toLowerCase(),
          subject: contact.subject.trim(),
          message: contact.message.trim(),
          createdAt: new Date()
        };
        
        const result = await contactsCollection.insertOne(newContact);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        res.status(500).send({ error: true, message: err.message });
      }
    });

    // PATCH UPDATE USER PROFILE
    app.patch('/users/profile/:email', async (req, res) => {
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
        
        // Update users collection
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
        
        // Also update decorators collection if the user is a decorator
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
        res.status(500).send({ error: true, message: err.message });
      }
    });

    

    app.get('/decorators/top', async (req, res) => {
      const limit = parseInt(req.query.limit) || 6;

      const result = await decoratorsCollection
        .find({ isApproved: { $ne: false } })
        .sort({ rating: -1, totalProjects: -1 })
        .limit(limit)
        .toArray();

      res.send(result);
    });

    app.get('/decorators', async (req, res) => {
      const result = await decoratorsCollection.find().toArray();
      res.send(result);
    });

    app.get('/stats', async (req, res) => {
      try {
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
        res.status(500).send({ error: err.message });
      }
    });

    app.post('/decorators', async (req, res) => {
      try {
        const decorator = req.body;
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
        res.status(500).send({ error: err.message });
      }
    });

    app.patch('/decorators/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;
        delete updates._id;
        if (updates.rating) updates.rating = parseFloat(updates.rating);
        if (updates.experienceYears) updates.experienceYears = parseInt(updates.experienceYears);
        const result = await decoratorsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.delete('/decorators/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await decoratorsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    

    app.get('/bookings', verifyJWT, async (req, res) => {
      try {
        const email = req.query.email;
        const decoratorEmail = req.query.decoratorEmail;

        // Verify email authorization
        const decodedEmail = req.decoded.email;
        if (email && email.toLowerCase() !== decodedEmail.toLowerCase()) {
          return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
        }
        if (decoratorEmail && decoratorEmail.toLowerCase() !== decodedEmail.toLowerCase()) {
          return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
        }

        let query = {};
        if (email) {
          query.userEmail = { $regex: new RegExp(`^${email}$`, 'i') };
        }
        if (decoratorEmail) {
          query.decoratorEmail = { $regex: new RegExp(`^${decoratorEmail}$`, 'i') };
        }

        const result = await bookingsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);

      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.post('/bookings', verifyJWT, async (req, res) => {
      try {
        const booking = req.body;

        // Security check
        if (booking.userEmail?.toLowerCase() !== req.decoded.email?.toLowerCase()) {
          return res.status(403).send({ error: true, message: 'Forbidden access: Email mismatch' });
        }

        booking.status = "Assigned";
        booking.paymentStatus = "Unpaid";
        booking.createdAt = new Date();

        const result = await bookingsCollection.insertOne(booking);

        res.send({
          success: true,
          insertedId: result.insertedId
        });

      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.delete('/bookings/:id', verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;

        const result = await bookingsCollection.deleteOne({
          _id: new ObjectId(id)
        });

        res.send(result);

      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch('/bookings/assign/:id', verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const { decoratorId, decoratorName, decoratorEmail } = req.body;
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              decoratorId,
              decoratorName,
              decoratorEmail,
              status: "Assigned"
            }
          }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // UPDATE STATUS (STEP-BY-STEP) BY DECORATOR
    app.patch('/bookings/status/:id', verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    

    app.patch('/bookings/pay/:id', async (req, res) => {
      try {
        const id = req.params.id;

        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              paymentStatus: "Paid",
              paidAt: new Date(),
              transactionId: "TXN-" + Date.now()
            }
          }
        );

        res.send({
          success: true,
          message: "Payment Successful",
          result
        });

      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    

    app.post('/create-checkout-session', verifyJWT, async (req, res) => {
      try {
        const { bookingId, serviceName, price, userEmail } = req.body;
        
        if (!bookingId || !price) {
          return res.status(400).send({ error: "Missing required booking details" });
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'bdt',
                product_data: {
                  name: serviceName || "Decoration Service",
                },
                unit_amount: Math.round(price * 100), // in cents
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `http://localhost:5173/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
          cancel_url: `http://localhost:5173/dashboard/payment-history`,
          metadata: {
            bookingId,
            userEmail: userEmail || "",
            serviceName: serviceName || ""
          }
        });

        res.send({ url: session.url });
      } catch (err) {
        console.error("Stripe Session Error:", err);
        res.status(500).send({ error: err.message });
      }
    });

    app.post('/bookings/confirm-payment', verifyJWT, async (req, res) => {
      try {
        const { bookingId, sessionId } = req.body;

        if (!bookingId || !sessionId) {
          return res.status(400).send({ error: "Missing bookingId or sessionId" });
        }

        // Check if transaction is already confirmed
        const existingTxn = await transactionsCollection.findOne({ stripeSessionId: sessionId });
        if (existingTxn) {
          return res.send({ success: true, message: "Payment already confirmed", result: existingTxn });
        }

        // Retrieve stripe session details
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
          return res.status(400).send({ error: "Stripe session has not been paid yet" });
        }

        const transactionId = session.payment_intent || ("TXN-STRI-" + Date.now());

        // Update booking status & transaction fields in database
        const bookingUpdate = await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          {
            $set: {
              paymentStatus: "Paid",
              paidAt: new Date(),
              transactionId: transactionId,
              stripeSessionId: sessionId
            }
          }
        );

        // Store secure transaction receipt in server
        const transactionInfo = {
          bookingId,
          stripeSessionId: sessionId,
          transactionId,
          userEmail: session.metadata.userEmail || "",
          serviceName: session.metadata.serviceName || "",
          amount: session.amount_total / 100,
          currency: session.currency,
          paymentStatus: "Paid",
          paidAt: new Date(),
          paymentMethod: "Stripe Card"
        };

        const txnInsert = await transactionsCollection.insertOne(transactionInfo);

        res.send({
          success: true,
          message: "Payment confirmed and stored successfully",
          bookingUpdate,
          txnInsert,
          transactionInfo
        });

      } catch (err) {
        console.error("Confirmation Error:", err);
        res.status(500).send({ error: err.message });
      }
    });
// Start MongoDB connection immediately in the background and store the promise
dbConnectionPromise = connectDB();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;