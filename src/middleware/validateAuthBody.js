const AppError = require("../utils/AppError");
const { EMAIL_REGEX } = require("../models/user.model");

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const validateAuthBody =
  ({ enforcePasswordPolicy }) =>
  (req, _res, next) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return next(new AppError("Email and password are required and must be strings", 400));
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return next(new AppError("Email and password are required", 400));
    }

    if (enforcePasswordPolicy) {
      if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
        return next(new AppError("Email is invalid", 400));
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        return next(
          new AppError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`, 400)
        );
      }
    }

    if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
      return next(new AppError(`Password cannot exceed ${PASSWORD_MAX_BYTES} bytes`, 400));
    }

    req.body = { email: normalizedEmail, password };
    next();
  };

module.exports = validateAuthBody;
