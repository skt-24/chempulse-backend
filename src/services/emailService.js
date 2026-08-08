const env = require('../config/env');

const sendResetPasswordEmail = async ({ to, resetToken }) => {
  const resetUrl = `chempulse://reset-password?token=${resetToken}`;
  
  if (env.NODE_ENV !== 'production') {
    console.log(`[Email Service Mock] Password Reset sent to: ${to}`);
    console.log(`[Email Service Mock] Reset URL: ${resetUrl}`);
    return true;
  }

  // Production provider connection goes here (SendGrid / AWS SES / Nodemailer)
  return true;
};

module.exports = { sendResetPasswordEmail };