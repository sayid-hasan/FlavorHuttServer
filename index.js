const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.grteoyu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    //
    //   jwt authentication

    // database of foooditemsCollection
    const foodItemsCollection = client
      .db("flavorHuttDb")
      .collection("foodItems");
    //   collection of reviews
    const reviewsCollection = client.db("flavorHuttDb").collection("reviews");
    const sellsColection = client.db("flavorHuttDb").collection("sells");
    const feedbacksColection = client
      .db("flavorHuttDb")
      .collection("feedbacks");
    //   get top 6 based on purchaseCount to show in Home page
    app.get("/top-selling", async (req, res) => {
      // Fetch the top 6 selling food items based on purchaseCount
      const topSellingItems = await foodItemsCollection
        .find()
        .sort({ purchaseCount: -1 }) // Sort by purchaseCount in descending order
        .limit(6) // Limit to 6 results
        .toArray();

      res.send(topSellingItems);
    });

    app.post("/allFoods", async (req, res) => {
      const foodData = req?.body;
      // console.log("post api ", foodData);
      const result = await foodItemsCollection.insertOne(foodData);
      res.send(result);
    });

    // get data of single dish for foodItemDetails page
    app.get("/allFoods/:id", async (req, res) => {
      const { id } = req?.params;
      const foodItem = await foodItemsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(foodItem);
    });
    // get data of every single dish for allFood page
    app.get("/allFoods", async (req, res) => {
      const { query } = req?.query;
      console.log("all food api", query);
      let filter = {}; // Initialize filter as an empty object

      if (query && query !== "") {
        // Ensure query is not empty or undefined
        // Use the query parameter for the regex search on foodName
        filter = {
          foodName: { $regex: query, $options: "i" }, // case-insensitive search
        };
        console.log("all food api filter:", filter); // Log the filter object
      } else {
        filter = {}; // Log if no query is provided
      }
      console.log("all food api filter", filter);
      const foodItems = await foodItemsCollection.find(filter).toArray();
      res.send(foodItems);
    });

    // get purchase data and update food stock and purchaseCount accordingly
    app.post("/purchaseHistory", async (req, res) => {
      const { food, quantity, buyerEmail } = req?.body;
      // Update the purchase count and stock using MongoDB's `$inc` operator
      const result = await foodItemsCollection.updateOne(
        {
          foodName: food,
        },
        {
          $inc: { purchaseCount: quantity, stock: -quantity },
        }
      );

      // Check if the item exists and was updated
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .send({ success: false, message: "Item not found" });
      }
      // Insert purchase record into `sellsColection`
      await sellsColection.insertOne(req.body);
      res.send(result);
    });

    //   get top rated reviews
    app.get("/reviews", async (req, res) => {
      // Fetch the top 6 selling food items based on purchaseCount
      const topRatedReviews = await reviewsCollection
        .find({ starRating: { $gte: 4 } })
        .toArray();

      res.send(topRatedReviews);
    });
    //   Gallery page api ..get all feed backs
    app.get("/feedbacks", async (req, res) => {
      const feedbacks = await feedbacksColection.find().toArray();
      res.send(feedbacks);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("FlavorHutt is running ");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
