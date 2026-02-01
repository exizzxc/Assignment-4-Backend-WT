module.exports = function errorHandler(err, req, res, next) {
  console.error("ERROR:", err);

  const status = err.statusCode || 500;
  return res.status(status).json({
    message: err.message || "Server error"
  });
};