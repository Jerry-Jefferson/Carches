const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const RevokedToken = require("../models/revokedToken.model");
const AppError = require("../utils/AppError");
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRememberExpiresIn,
  jwtAlgorithm,
  saltRounds,
} = require("../config/auth");

const INVALID_CREDENTIALS = "Invalid email or password";
// One message for every rejected token: the reason (expired, revoked, deleted user) is not
// the caller's business, and the client only looks at the 401
const INVALID_TOKEN = "Invalid or expired token";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", saltRounds);

// "Remember me" sign-ins get a longer-lived token
const signToken = (user, { remember = false } = {}) =>
  jwt.sign({ sub: user._id.toString() }, jwtSecret, {
    algorithm: jwtAlgorithm,
    expiresIn: remember ? jwtRememberExpiresIn : jwtExpiresIn,
    jwtid: crypto.randomUUID(),
  });

const hashPassword = (password) => bcrypt.hash(password, saltRounds);

const signUp = async ({ email, password, licenseNumber, firstName, lastName }) => {
  const existing = await User.exists({ email });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await hashPassword(password);

  let user;
  try {
    user = await User.create({
      email,
      password: hashedPassword,
      licenseNumber,
      firstName,
      lastName,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field =
        Object.keys(err.keyValue ?? {})[0] === "licenseNumber" ? "license number" : "email";
      throw new AppError(`A user with this ${field} already exists`, 409);
    }
    throw err;
  }

  return { user, token: signToken(user) };
};

const signIn = async ({ email, password, remember = false }) => {
  const user = await User.findOne({ email, isDeleted: false }).select("+password");

  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  return { user, token: signToken(user, { remember }) };
};

const verifyToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: [jwtAlgorithm] });
  } catch {
    throw new AppError(INVALID_TOKEN, 401);
  }

  if (!payload.jti || !payload.exp) {
    throw new AppError(INVALID_TOKEN, 401);
  }

  const [user, isRevoked] = await Promise.all([
    User.findOne({ _id: payload.sub, isDeleted: false }),
    RevokedToken.exists({ jti: payload.jti }),
  ]);

  if (isRevoked || !user) {
    throw new AppError(INVALID_TOKEN, 401);
  }

  return { user, payload };
};

const logout = async ({ userId, jti, exp }) => {
  await RevokedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, userId, expiresAt: new Date(exp * 1000) } },
    { upsert: true }
  );
};

module.exports = {
  signUp,
  signIn,
  verifyToken,
  logout,
};
