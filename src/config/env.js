const path = require('path');
const dotenv = require('dotenv');

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const requiredEnvVars = [
  'NODE_ENV',
  'MONGODB_URI',
  'CORS_ORIGIN',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[FATAL] Missing required environment variables: ${missing.join(', ')}.\n` +
      `Please ensure these are defined in your .env file or host environment.`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.CORS_ORIGIN === '*') {
      throw new Error(
        '[SECURITY FATAL] Wildcard CORS_ORIGIN ("*") is strictly prohibited in production!'
      );
    }

    if (
      process.env.JWT_SECRET.length < 32 ||
      process.env.JWT_REFRESH_SECRET.length < 32
    ) {
      throw new Error(
        '[SECURITY FATAL] JWT Secrets must be at least 32 characters in production!'
      );
    }
  }

  // Validate Cloudinary credentials only when Cloudinary is enabled
  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    const cloudinaryVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ];

    const missingCloudinary = cloudinaryVars.filter(
      (key) => !process.env[key]
    );

    if (missingCloudinary.length > 0) {
      throw new Error(
        `[FATAL] Missing Cloudinary environment variables: ${missingCloudinary.join(', ')}`
      );
    }
  }
}

validateEnv();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  PORT: parseInt(process.env.PORT, 10) || 5000,

  MONGODB_URI: process.env.MONGODB_URI,

  CORS_ORIGIN: process.env.CORS_ORIGIN,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,

  JWT_ACCESS_EXPIRATION:
    process.env.JWT_ACCESS_EXPIRATION || '15m',

  JWT_REFRESH_EXPIRATION:
    process.env.JWT_REFRESH_EXPIRATION || '7d',

  TRUST_PROXY:
    process.env.TRUST_PROXY || '1',

  STORAGE_PROVIDER:
    process.env.STORAGE_PROVIDER || 'local',

  CLOUDINARY_CLOUD_NAME:
    process.env.CLOUDINARY_CLOUD_NAME,

  CLOUDINARY_API_KEY:
    process.env.CLOUDINARY_API_KEY,

  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_API_SECRET
};