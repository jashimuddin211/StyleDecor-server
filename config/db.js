const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = "mongodb+srv://styledecor:iAQmvhWPWnEIXy3h@cluster0.4h16s8h.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

let db = null;

async function seedDemoUsers(database) {
  try {
    const usersCollection = database.collection("user");
    const decoratorsCollection = database.collection("decorators");
    
    const demoUsers = [
      { name: "System Admin", email: "admin@styledecor.com", role: "admin" },
      { name: "Jane Customer", email: "customer@styledecor.com", role: "user" },
      { name: "John Decorator", email: "decorator@styledecor.com", role: "decorator" }
    ];
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);
    
    for (const demo of demoUsers) {
      const existing = await usersCollection.findOne({ email: demo.email });
      if (!existing) {
        const newUser = {
          ...demo,
          password: hashedPassword,
          photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
          createdAt: new Date()
        };
        await usersCollection.insertOne(newUser);
        console.log(`Seeded demo user: ${demo.email}`);
        
        if (demo.role === "decorator") {
          const decExisting = await decoratorsCollection.findOne({ email: demo.email });
          if (!decExisting) {
            await decoratorsCollection.insertOne({
              name: demo.name,
              email: demo.email,
              role: "decorator",
              phone: "+8801712345678",
              image: newUser.photoURL,
              specialty: "Luxury Weddings",
              experienceYears: 5,
              rating: 4.9,
              available: true,
              assignedJobs: [],
              isApproved: true
            });
            console.log(`Seeded demo decorator: ${demo.email}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    console.log("MongoDB Connected");
    db = client.db("styledecor");
    
    // Seed demo accounts
    await seedDemoUsers(db);
    
    return db;
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

const getCollection = (name) => {
  if (!db) {
    throw new Error(`Database not connected. Cannot access collection ${name}`);
  }
  return db.collection(name);
};

module.exports = {
  connectDB,
  client,
  getServicesCollection: () => getCollection("services"),
  getDecoratorsCollection: () => getCollection("decorators"),
  getBookingsCollection: () => getCollection("bookings"),
  getUsersCollection: () => getCollection("user"),
  getTransactionsCollection: () => getCollection("transactions"),
  getContactsCollection: () => getCollection("contacts")
};
