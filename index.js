const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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

async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected");

    /* ================= COLLECTIONS ================= */

    const servicesCollection =
      client.db("styledecor").collection("services");

    const decoratorsCollection =
      client.db("styledecor").collection("decorators");

    const bookingsCollection =
      client.db("styledecor").collection("bookings");

    const usersCollection =
      client.db("styledecor").collection("user");

    /* ================= TEST ================= */

    app.get('/test-db', async (req, res) => {
      const result = await client.db("admin").command({ ping: 1 });
      res.send(result);
    });

    /* ================= USERS SYSTEM ================= */

    // CREATE USER (REGISTER)
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        const existingUser = await usersCollection.findOne({
          email: user.email
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
      const user = await usersCollection.findOne({ email });
console.log(user)
      res.send(user);
    });

    // MAKE ADMIN
    app.patch("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const result = await usersCollection.updateOne(
        { email },
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

    /* ================= SERVICES ================= */

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

    /* ================= DECORATORS ================= */

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

    /* ================= BOOKINGS ================= */

    app.get('/bookings', async (req, res) => {
      try {
        const email = req.query.email;

        let query = {};
        if (email) {
          query.userEmail = email;
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

    app.post('/bookings', async (req, res) => {
      try {
        const booking = req.body;

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

    app.delete('/bookings/:id', async (req, res) => {
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

    app.patch('/bookings/assign/:id', async (req, res) => {
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

    /* ================= PAYMENT ================= */

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

  } catch (err) {
    console.log(err);
  }
}

app.listen(port, async () => {
  console.log(`Server running ${port}`);
  await connectDB();
});