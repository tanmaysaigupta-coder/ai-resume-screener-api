class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: {
      message: err.message || 'Internal server error',
    },
  };
  if (err.details) payload.error.details = err.details;
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    payload.error.stack = err.stack;
  }
  res.status(statusCode).json(payload);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
