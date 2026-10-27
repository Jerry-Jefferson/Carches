const authService = require("../services/auth.service");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const authenticate = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    throw new AppError("Authorization header is missing", 401);
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Authorization header must be in the format: Bearer <token>", 401);
  }

  req.user = await authService.verifyToken(token);
  next();
});

module.exports = authenticate;
