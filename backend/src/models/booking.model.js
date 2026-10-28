const mongoose = require("mongoose");

const { Schema } = mongoose;

const BookingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: [true, "Car is required"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      default: null,
    },

    startFuelLevel: {
      type: Number,
      required: [true, "Start fuel level is required"],
      min: [0, "Fuel level cannot be negative"],
      max: [100, "Fuel level cannot exceed 100"],
    },

    startMileage: {
      type: Number,
      required: [true, "Start mileage is required"],
      min: [0, "Mileage cannot be negative"],
    },

    finishFuelLevel: {
      type: Number,
      min: [0, "Fuel level cannot be negative"],
      max: [100, "Fuel level cannot exceed 100"],
      default: null,
    },

    finishMileage: {
      type: Number,
      min: [0, "Mileage cannot be negative"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model("Booking", BookingSchema);

module.exports = Booking;
