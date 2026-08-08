/**
 * Recursively strips keys starting with '$' or containing '.' from objects
 * to prevent NoSQL query operator injection attacks.
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Strip MongoDB operator keys
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
};

const mongoSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = { mongoSanitize };