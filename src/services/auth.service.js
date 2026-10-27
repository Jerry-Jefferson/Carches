const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const { jwtSecret, jwtExpiresIn, jwtAlgorithm, saltRounds } = require("../config/auth");

const INVALID_CREDENTIALS = "Invalid email or password";

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", saltRounds);

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, jwtSecret, {
    algorithm: jwtAlgorithm,
    expiresIn: jwtExpiresIn,
  });

const signUp = async ({ email, password }) => {
  const existing = await User.exists({ email });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  let user;
  try {
    user = await User.create({ email, password: hashedPassword });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A user with this email already exists", 409);
    }
    throw err;
  }

  return { user, token: signToken(user) };
};

const signIn = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

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

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError("User belonging to this token no longer exists", 401);
  }

  return user;
};

module.exports = {
  signUp,
  signIn,
  verifyToken,
};
