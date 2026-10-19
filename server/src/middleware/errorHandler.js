/**
 * 404 Handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || res.statusCode || 500;
  if (statusCode < 400) statusCode = 500;

  let message = err.message || "An unexpected internal server error occurred.";
  let errors;
  if (err.name === "ZodError") {
    statusCode = 400;
    message = "Please check the submitted values.";
    errors = err.flatten().fieldErrors;
  }
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Please check the submitted values.";
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const fields = Object.keys(err.keyValue || {});
    message = `A record with this ${fields.join(", ") || "field"} already exists.`;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token signature.";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired.";
  }

  // Log server errors internally (never exposing sensitive payload)
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.path}: ${err.name || "Error"}`);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Unable to complete this request. Please try again." : message,
    ...(errors ? { errors } : {})
  });
};

export default { notFoundHandler, errorHandler };
