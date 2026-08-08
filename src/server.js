const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

let server;

async function startServer() {
  try {
    // Connect to MongoDB Atlas first
    await connectDB();

    // 0.0.0.0 allows other devices on your LAN,
    // such as your Android phone, to reach the API.
    server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log('');
      console.log('========================================');
      console.log('        ChemPulse API STARTED');
      console.log('========================================');
      console.log(`Port:        ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Local:       http://localhost:${env.PORT}`);
      console.log(`Network:     http://<YOUR-PC-IP>:${env.PORT}`);
      console.log('Listening:   0.0.0.0');
      console.log('========================================');
      console.log('');
    });
  } catch (error) {
    console.error('[Startup Error]', error);
    process.exit(1);
  }
}

const gracefulShutdown = (signal) => {
  console.log(
    `\n[Shutdown] ${signal} received. Closing HTTP server and database...`
  );

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    console.log('[Shutdown] HTTP server closed.');

    try {
      await mongoose.connection.close();
      console.log('[Shutdown] MongoDB connection closed.');
      process.exit(0);
    } catch (error) {
      console.error(
        `[Shutdown Error] Could not close MongoDB: ${error.message}`
      );
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  process.exit(1);
});

startServer();