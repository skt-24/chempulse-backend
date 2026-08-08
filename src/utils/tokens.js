const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { generateRandomToken } = require('./crypto');

const generateAccessToken = (userId, roles = ['user']) => {
  return jwt.sign({ id: userId, roles }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION
  });
};

const generateRefreshTokenString = () => {
  return generateRandomToken(40);
};

module.exports = { generateAccessToken, generateRefreshTokenString };