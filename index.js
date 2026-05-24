const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

// root route
app.get('/', (req, res) => {
  res.send('this server is online');
});

// MongoDB URI
const uri =
  "mongodb+srv://styledecor:iAQmvhWPWnEIXy3h@cluster0.4h16s8h.mongodb.net/?appName=Cluster0";

// Mongo client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    // ===== Database & Collection =====
    const servicesCollection =
      client.db("styledecor").collection("services");


    // GET all services
    app.get('/services', async (req, res) => {
      try {
        const result =
          await servicesCollection.find().toArray();

        res.send(result);

      } catch (err) {
        res.status(500).send({
          success: false,
          error: err.message
        });
      }
    });


    // GET single service by id
    app.get('/services/:id', async (req, res) => {
      try {

        const id = req.params.id;

        const query = {
          _id: new ObjectId(id)
        };

        const result =
          await servicesCollection.findOne(query);

        res.send(result);

      } catch (err) {
        res.status(500).send({
          success: false,
          error: err.message
        });
      }
    });


    // test mongodb connection
    app.get('/test-db', async (req, res) => {
      const result =
        await client.db("admin").command({ ping: 1 });

      res.send({
        success: true,
        message: "MongoDB connected",
        result
      });
    });

  } catch (err) {
    console.error(err);
  }
}


// start server
app.listen(port, async () => {
  console.log(`Server running on ${port}`);
  await connectDB();
});