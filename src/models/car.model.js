const mongoose = require("mongoose");
const { VEHICLE_STATUS, VEHICLE_STATUS_LIST } = require("../constants/vehicle");

const { Schema } = mongoose;

const CarSchema = new Schema(
  {
    productionInfo: {
      type: Schema.Types.ObjectId,
      ref: "ProductionInfo",
      required: [true, "Production info is required"],
    },

    vin: {
      type: String,
      required: [true, "VIN is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "VIN is too short"],
      maxlength: [17, "VIN cannot be longer than 17 characters"],
    },

    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "Registration number is too short"],
    },

    status: {
      type: String,
      enum: VEHICLE_STATUS_LIST,
      default: VEHICLE_STATUS.FREE,
    },

    fuelLevel: {
      type: Number,
      required: true,
      min: [0, "Fuel level cannot be negative"],
      max: [100, "Fuel level cannot exceed 100"],
      default: 100,
    },

    mileage: {
      type: Number,
      required: true,
      min: [0, "Mileage cannot be negative"],
      default: 0,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value) => value.length === 2,
          message: "Coordinates must contain longitude and latitude",
        },
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

CarSchema.index({ location: "2dsphere" });

const Car = mongoose.model("Car", CarSchema);

module.exports = Car;
