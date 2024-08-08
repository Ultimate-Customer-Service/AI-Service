require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// const databaseProduct = client.db("product")
let databaseProduct;

async function connectToMongo() {
  try {
    if (!client.isConnected()) {
      await client.connect();
    }
    databaseProduct = client.db("product"); // Replace with your database name
    return databaseProduct;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

module.exports = {databaseProduct, connectToMongo};