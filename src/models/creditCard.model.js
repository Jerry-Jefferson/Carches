const mongoose = require("mongoose");

const { Schema } = mongoose;

const CreditCardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User is required"],
  },

  number: {
    type: String,
    required: [true, "Card number is required"],
    trim: true,
    minlength: [13, "Card number is too short"],
    maxlength: [19, "Card number is too long"],
  },

  owner: {
    type: String,
    required: [true, "Card owner is required"],
    trim: true,
    uppercase: true,
    minlength: [2, 'Owner name is too short'],
    maxlength: [30, 'Owner name is too long'],
    match: [/^[A-Z\s'-]+$/, 'Owner name must contain only Latin letters'],
  },

  validThrough: {
    type: Date,
    required: [true, "Card expiration date is required"],
  },

  isAuthorized: {
    type: Boolean,
    default: false,
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const CreditCard = mongoose.model("CreditCard", CreditCardSchema);

module.exports = CreditCard;
