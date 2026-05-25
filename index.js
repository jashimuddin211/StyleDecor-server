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

// GENERATE JWT TOKEN
app.post('/jwt', (req, res) => {
  const user = req.body;
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
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

// Middleware to ensure DB connection is ready
app.use((req, res, next) => {
  const exemptPaths = ['/', '/test-db'];
  if (!exemptPaths.includes(req.path) && !servicesCollection) {
    return res.status(503).send({ 
      error: true, 
      message: 'Database connection is still establishing. Please try again in a few seconds.' 
    });
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

        const existingUser = await usersCollection.findOne({
          email: { $regex: new RegExp(`^${user.email}$`, 'i') }
        });

        if (existingUser) {
          return res.send({
            success: true,
            message: "User already exists"
          });
        }

        // default role
        user.role = "user";

        const result = await usersCollection.insertOne(user);

        res.send({
          success: true,
          insertedId: result.insertedId
        });

      } catch (err) {
        res.status(500).send({ error: err.message });
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

    app.post('/services', async (req, res) => {
      try {
        const service = req.body;
        if (service.cost) service.cost = parseInt(service.cost);
        const result = await servicesCollection.insertOne(service);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch('/services/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const service = req.body;
        delete service._id;
        if (service.cost) service.cost = parseInt(service.cost);
        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: service }
        );
        res.send({ success: true, result });
      } catch (err) {
        res.status(500).send({ error: err.message });
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
// Start MongoDB connection immediately in the background
connectDB();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;