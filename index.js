const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

// root route
app.get('/', (req, res) => {
  res.send('this server is online');
});

// MongoDB URI (IMPORTANT: replace username/password)
const uri = "mongodb+srv://styledecor:iAQmvhWPWnEIXy3h@cluster0.4h16s8h.mongodb.net/?appName=Cluster0";

// Mongo client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// connect DB once and reuse
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

// example route using DB
app.get('/test-db', async (req, res) => {
  try {
    const result = await client.db("admin").command({ ping: 1 });
    res.send({
      success: true,
      message: "MongoDB is connected",
      result
    });
  } catch (err) {
    res.status(500).send({ success: false, error: err.message });
  }
});

// start server
app.listen(port, async () => {
  console.log(`server started on port ${port}`);
  await connectDB();
});