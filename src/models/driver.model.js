const mongoose = require("mongoose");

const { Schema } = mongoose;

const DriverSchema = new Schema({
  licenseNumber: {
    type: String,
    required: [true, "License number is required"],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [6, "License number is too short"],
    maxlength: [20, "License number is too long"],
  },

  firstName: {
    type: String,
    required: [true, "First name is required"],
    trim: true,
    minlength: [2, "First name must be at least 2 characters long"],
    maxlength: [50, "First name cannot exceed 50 characters"],
  },

  lastName: {
    type: String,
    required: [true, "Last name is required"],
    trim: true,
    minlength: [2, "Last name must be at least 2 characters long"],
    maxlength: [50, "Last name cannot exceed 50 characters"],
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

const Driver = mongoose.model("Driver", DriverSchema);

module.exports = Driver;
