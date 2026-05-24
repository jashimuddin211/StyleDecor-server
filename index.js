const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
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

        // =========================
        // COLLECTIONS
        // =========================
        const servicesCollection =
            client.db("styledecor")
                .collection("services");

        const decoratorsCollection =
            client.db("styledecor")
                .collection("decorators");

        // =========================
        // TEST DB
        // =========================
        app.get('/test-db', async (req, res) => {
            const result =
                await client
                    .db("admin")
                    .command({ ping: 1 });

            res.send(result);
        });

        // =====================================================
        // SERVICES API
        // =====================================================

        /* ===========================
        GET ALL SERVICES + SEARCH + FILTER
        =========================== */

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

                // search by service name
                if (search) {
                    query.service_name = {
                        $regex: search,
                        $options: "i"
                    };
                }

                // filter by category
                if (category) {
                    query.service_category = category;
                }

                const result = await servicesCollection
                    .find(query)
                    .toArray();

                res.send(result);

            } catch (err) {
                res.status(500).send({
                    success: false,
                    error: err.message
                });
            }

        });

        /* ===========================
        GET SINGLE SERVICE
        =========================== */

        app.get('/services/:id', async (req, res) => {

            try {

                const id = req.params.id;

                const query = {
                    _id: new ObjectId(id)
                };

                const result = await servicesCollection.findOne(query);

                res.send(result);

            } catch (err) {
                res.status(500).send({
                    error: err.message
                });
            }

        });

        // =====================================================
        // DECORATORS API
        // =====================================================

        /* ===========================
        GET TOP DECORATORS
        =========================== */

        app.get('/decorators/top', async (req, res) => {

            try {

                const limit = parseInt(req.query.limit) || 6;

                // FIX: Use $ne: false so documents without isApproved field are also included
                const result = await decoratorsCollection
                    .find({ isApproved: { $ne: false } })
                    .sort({
                        rating: -1,
                        totalProjects: -1
                    })
                    .limit(limit)
                    .toArray();

                res.send(result);

            } catch (err) {
                res.status(500).send({
                    success: false,
                    error: err.message
                });
            }

        });

        /* ===========================
        GET ALL DECORATORS
        SEARCH + FILTER + SORT + PAGINATION
        =========================== */

        app.get('/decorators', async (req, res) => {

            try {

                const search = req.query.search || "";
                const specialty = req.query.specialty || "";
                const sort = req.query.sort || "";
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;

                // FIX: Use $ne: false so documents without isApproved field are also included
                let query = {
                    isApproved: { $ne: false }
                };

                // search by name
                if (search) {
                    query.name = {
                        $regex: search,
                        $options: "i"
                    };
                }

                // filter by specialty
                if (specialty) {
                    query.specialties = specialty;
                }

                let sortOption = {
                    createdAt: -1
                };

                if (sort === "rating") {
                    sortOption = { rating: -1 };
                }

                if (sort === "projects") {
                    sortOption = { totalProjects: -1 };
                }

                const skip = (page - 1) * limit;

                const result = await decoratorsCollection
                    .find(query)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                const total = await decoratorsCollection.countDocuments(query);

                res.send({
                    data: result,
                    pagination: {
                        total,
                        page,
                        pages: Math.ceil(total / limit)
                    }
                });

            } catch (err) {
                res.status(500).send({
                    success: false,
                    error: err.message
                });
            }

        });

        // =========================
        // END CONNECT DB FUNCTION
        // =========================

    } catch (err) {
        console.log(err);
    }

}

app.listen(port, async () => {
    console.log(`Server running ${port}`);
    await connectDB();
});