const dns = require('dns');
const mongoose = require('mongoose');

let mongod = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  if (uri) {
    try {
      console.log('Connecting to MongoDB Atlas / configured URI...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(' Successfully connected to MongoDB Atlas / Remote Database.');
      return;
    } catch (err) {
      console.warn(' First attempt to connect to MONGODB_URI failed:', err.message);
      // If ISP DNS failed to resolve SRV record, retry with public DNS servers (8.8.8.8, 1.1.1.1)
      try {
        console.log('Retrying Atlas connection with public DNS resolvers (8.8.8.8, 1.1.1.1)...');
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000,
        });
        console.log(' Successfully connected to MongoDB Atlas / Remote Database via Public DNS!');
        return;
      } catch (dnsRetryErr) {
        console.warn(' Failed to connect via Public DNS:', dnsRetryErr.message);
        console.log('Falling back to In-Memory MongoDB Server for local execution...');
      }
    }
  }

  // Fallback to local persistent MongoDB Server (storageEngine: wiredTiger on disk)
  try {
    const fs = require('fs');
    const path = require('path');
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const dbPath = path.join(__dirname, '../../.local_db');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    mongod = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: 'wiredTiger',
        dbName: 'projectmanagerDB',
      },
    });

    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(` Local Persistent MongoDB active at: ${memUri}`);
    console.log(` Database data securely preserved on disk at: ${dbPath}`);
    console.log(' (Atlas note: Whitelist IP 182.76.27.87 on MongoDB Atlas dashboard to use cloud cluster)');
  } catch (err) {
    console.error('Critical database connection error:', err);
    throw err;
  }
}

module.exports = { connectDB };
