const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const RevokedToken = require("../models/revokedToken.model");
const AppError = require("../utils/AppError");
const { jwtSecret, jwtExpiresIn, jwtAlgorithm, saltRounds } = require("../config/auth");

const INVALID_CREDENTIALS = "Invalid email or password";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", saltRounds);

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, jwtSecret, {
    algorithm: jwtAlgorithm,
    expiresIn: jwtExpiresIn,
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

const signIn = async ({ email, password }) => {
  const user = await User.findOne({ email, isDeleted: false }).select("+password");

  const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  return { user, token: signToken(user) };
};

const verifyToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: [jwtAlgorithm] });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Token has expired", 401);
    }
    throw new AppError("Invalid token", 401);
  }

  if (!payload.jti || !payload.exp) {
    throw new AppError("Invalid token", 401);
  }

  const [user, isRevoked] = await Promise.all([
    User.findOne({ _id: payload.sub, isDeleted: false }),
    RevokedToken.exists({ jti: payload.jti }),
  ]);

  if (isRevoked) {
    throw new AppError("Token has been revoked", 401);
  }

  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
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
