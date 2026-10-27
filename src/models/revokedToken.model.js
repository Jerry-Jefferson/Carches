const mongoose = require("mongoose");

const { Schema } = mongoose;

const RevokedTokenSchema = new Schema(
  {
    jti: {
      type: String,
      required: [true, "Token ID is required"],
      unique: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      expires: 0,
    },
  },
  {
    timestamps: true,
  }
);

const RevokedToken = mongoose.model("RevokedToken", RevokedTokenSchema);

module.exports = RevokedToken;
