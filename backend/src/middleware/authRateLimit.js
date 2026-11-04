const { rateLimit } = require("express-rate-limit");

const AppError = require("../utils/AppError");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

// Limits failed sign-in / sign-up attempts per IP (password guessing, e-mail probing).
// Successful requests are not counted, so normal use is never blocked. The counter is kept
// in memory: it resets on restart and is per process. Behind a reverse proxy set Express
// `trust proxy`, or every client shares the proxy's IP.
const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new AppError("Too many failed attempts. Please try again in 15 minutes", 429)),
});

module.exports = authRateLimit;
