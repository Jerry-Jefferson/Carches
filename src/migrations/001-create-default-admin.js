require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("../db/connection");
const User = require("../models/user.model");
const { USER_ROLES } = require("../constants/user");

const ADMIN_PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

const readAdminConfig = () => {
  const {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
    ADMIN_LICENSE_NUMBER,
    BCRYPT_SALT_ROUNDS = "12",
  } = process.env;

  const missing = Object.entries({
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
    ADMIN_LICENSE_NUMBER,
  })
    .filter(([, value]) => !value || !value.trim())
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (ADMIN_PASSWORD.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters long`);
  }

  if (Buffer.byteLength(ADMIN_PASSWORD, "utf8") > PASSWORD_MAX_BYTES) {
    throw new Error(`ADMIN_PASSWORD cannot exceed ${PASSWORD_MAX_BYTES} bytes`);
  }

  const saltRounds = Number.parseInt(BCRYPT_SALT_ROUNDS, 10);
  if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    throw new Error("BCRYPT_SALT_ROUNDS must be an integer between 10 and 15");
  }

  return {
    email: ADMIN_EMAIL.trim().toLowerCase(),
    password: ADMIN_PASSWORD,
    firstName: ADMIN_FIRST_NAME.trim(),
    lastName: ADMIN_LAST_NAME.trim(),
    licenseNumber: ADMIN_LICENSE_NUMBER.trim().toUpperCase(),
    saltRounds,
  };
};

const createDefaultAdmin = async ({
  email,
  password,
  firstName,
  lastName,
  licenseNumber,
  saltRounds,
}) => {
  await User.init();

  const existing = await User.findOne({ email }).select("role isDeleted").lean();
  if (existing) {
    if (existing.role !== USER_ROLES.ADMIN || existing.isDeleted) {
      console.warn(
        `A user with email ${email} already exists but is not an active admin. ` +
          "It was left unchanged; resolve this manually."
      );
    } else {
      console.log(`Admin ${email} already exists. Nothing to do.`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      licenseNumber,
      role: USER_ROLES.ADMIN,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue ?? {})[0];
      if (field === "email") {
        console.log(`Admin ${email} was created concurrently. Nothing to do.`);
        return;
      }
      throw new Error(`Cannot create admin: ${field} "${err.keyValue[field]}" is already in use`);
    }
    throw err;
  }

  console.log(`Admin ${email} created.`);
};

const run = async () => {
  let exitCode = 0;

  try {
    const config = readAdminConfig();
    await connectDB();
    await createDefaultAdmin(config);
  } catch (err) {
    console.error(`Migration failed: ${err.message}`);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }

  process.exit(exitCode);
};

run();
