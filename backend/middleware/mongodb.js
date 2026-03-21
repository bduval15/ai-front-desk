const { MongoClient } = require('mongodb');

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not defined');

const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 10,
});

let db;

async function connectDB() {
  if (db) return db;
  
  await client.connect();
  db = client.db();
  console.log('Connected to MongoDB');
  return db;
}

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = { connectDB, client };