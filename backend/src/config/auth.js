const { JWT_SECRET, JWT_EXPIRES_IN = "1h", BCRYPT_SALT_ROUNDS = "12" } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be defined and at least 32 characters long");
}

const saltRounds = Number.parseInt(BCRYPT_SALT_ROUNDS, 10);

if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
  throw new Error("BCRYPT_SALT_ROUNDS must be an integer between 10 and 15");
}

module.exports = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN,
  jwtAlgorithm: "HS256",
  saltRounds,
};
