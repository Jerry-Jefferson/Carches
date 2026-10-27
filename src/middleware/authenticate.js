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

  const { user, payload } = await authService.verifyToken(token);

  req.user = user;
  req.auth = { jti: payload.jti, exp: payload.exp };
  next();
});

module.exports = authenticate;
