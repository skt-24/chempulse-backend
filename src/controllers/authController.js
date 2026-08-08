const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

const signup = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.signup(
      req.body,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, 201, { user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, 200, { user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.refreshAccessToken(
      req.body.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    sendSuccess(res, 200, { accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, 200, { message: 'Successfully logged out' });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, 200, { message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    sendSuccess(res, 200, { message: 'Password has been successfully reset' });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  sendSuccess(res, 200, { user: req.user });
};

module.exports = {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me
};