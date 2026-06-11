const errorHandler = (err, req, res, next) => {
  console.error("Centralized Error:", err.stack || err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).send({
    error: true,
    message: err.message || 'An unexpected error occurred on the server.'
  });
};

module.exports = {
  errorHandler
};
