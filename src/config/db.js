const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // Force ChemPulse backend to use this database
      dbName: 'chempulse',

      maxPoolSize: 50,
      minPoolSize: 1,

      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,

      retryWrites: true,
      w: 'majority'
    });

    console.log('======================================');
    console.log('[MongoDB] Atlas Connected');
    console.log(`[MongoDB] Host:     ${conn.connection.host}`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
    console.log('======================================');
  } catch (error) {
    console.error('[MongoDB Fatal] Connection failed');
    console.error(`[MongoDB Fatal] ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection established.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Connection error: ${err.message}`);
});

module.exports = connectDB;