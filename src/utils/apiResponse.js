const sendSuccess = (res, statusCode = 200, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

module.exports = { sendSuccess };