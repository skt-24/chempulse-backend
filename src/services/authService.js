const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/apiError');
const {
  generateAccessToken,
  generateRefreshTokenString
} = require('../utils/tokens');
const { hashToken } = require('../utils/crypto');
const { sendResetPasswordEmail } = require('./emailService');

// ======================================================
// CREATE REFRESH TOKEN
// ======================================================

const createRefreshToken = async (user, ipAddress, userAgent) => {
  const rawRefreshToken = generateRefreshTokenString();

  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    createdByIp: ipAddress || '',
    userAgent: userAgent || ''
  });

  return rawRefreshToken;
};

// ======================================================
// SIGN UP
// ======================================================

const signup = async (
  { name, email, password },
  ipAddress,
  userAgent
) => {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail
  });

  if (existingUser) {
    throw new ApiError(
      409,
      'An account with this email already exists',
      'EMAIL_IN_USE'
    );
  }

  const user = await User.create({
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash: password
  });

  const accessToken = generateAccessToken(
    user._id,
    user.roles
  );

  const refreshToken = await createRefreshToken(
    user,
    ipAddress,
    userAgent
  );

  return {
    user,
    accessToken,
    refreshToken
  };
};

// ======================================================
// LOGIN
// ======================================================

const login = async (
  { email, password },
  ipAddress,
  userAgent
) => {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !password) {
    throw new ApiError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  const user = await User.findOne({
    email: normalizedEmail
  }).select('+passwordHash');

  if (!user) {
    throw new ApiError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  const passwordMatches =
    await user.comparePassword(password);

  if (!passwordMatches) {
    throw new ApiError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  const accessToken = generateAccessToken(
    user._id,
    user.roles
  );

  const refreshToken = await createRefreshToken(
    user,
    ipAddress,
    userAgent
  );

  return {
    user,
    accessToken,
    refreshToken
  };
};

// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

const refreshAccessToken = async (
  rawRefreshToken,
  ipAddress,
  userAgent
) => {
  if (!rawRefreshToken) {
    throw new ApiError(
      401,
      'Refresh token is required',
      'INVALID_REFRESH_TOKEN'
    );
  }

  const incomingHash = hashToken(rawRefreshToken);

  const tokenDoc = await RefreshToken.findOne({
    tokenHash: incomingHash
  });

  if (!tokenDoc) {
    throw new ApiError(
      401,
      'Invalid refresh token',
      'INVALID_REFRESH_TOKEN'
    );
  }

  if (tokenDoc.revoked) {
    await RefreshToken.updateMany(
      { user: tokenDoc.user },
      { revoked: true }
    );

    throw new ApiError(
      401,
      'Revoked token reused. Security alert triggered.',
      'TOKEN_REUSE_DETECTED'
    );
  }

  if (new Date() > tokenDoc.expiresAt) {
    throw new ApiError(
      401,
      'Refresh token expired',
      'REFRESH_TOKEN_EXPIRED'
    );
  }

  const newRawRefreshToken =
    generateRefreshTokenString();

  const newHash = hashToken(newRawRefreshToken);

  const newExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  tokenDoc.revoked = true;
  tokenDoc.replacedByTokenHash = newHash;

  await tokenDoc.save();

  await RefreshToken.create({
    user: tokenDoc.user,
    tokenHash: newHash,
    expiresAt: newExpiresAt,
    createdByIp: ipAddress || '',
    userAgent: userAgent || ''
  });

  const user = await User.findById(tokenDoc.user);

  if (!user) {
    throw new ApiError(
      401,
      'Associated user not found',
      'USER_NOT_FOUND'
    );
  }

  const accessToken = generateAccessToken(
    user._id,
    user.roles
  );

  return {
    accessToken,
    refreshToken: newRawRefreshToken
  };
};

// ======================================================
// LOGOUT
// ======================================================

const logout = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    return;
  }

  const incomingHash = hashToken(rawRefreshToken);

  const tokenDoc = await RefreshToken.findOne({
    tokenHash: incomingHash
  });

  if (tokenDoc) {
    tokenDoc.revoked = true;
    await tokenDoc.save();
  }
};

// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (email) => {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail
  });

  if (!user) {
    return;
  }

  const resetToken =
    user.createPasswordResetToken();

  await user.save();

  await sendResetPasswordEmail({
    to: user.email,
    resetToken
  });
};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (
  token,
  newPassword
) => {
  const hashed = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }).select(
    '+resetPasswordToken +resetPasswordExpires'
  );

  if (!user) {
    throw new ApiError(
      400,
      'Password reset token is invalid or has expired',
      'INVALID_RESET_TOKEN'
    );
  }

  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  await RefreshToken.updateMany(
    { user: user._id },
    { revoked: true }
  );
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  signup,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword
};