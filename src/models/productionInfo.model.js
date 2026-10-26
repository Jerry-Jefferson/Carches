const mongoose = require("mongoose");

const { Schema } = mongoose;

const ProductionInfoSchema = new Schema({
  brand: {
    type: String,
    required: [true, "Brand is required"],
    trim: true,
    minlength: [2, "Brand name must be at least 2 characters long"],
    maxlength: [50, "Brand name cannot exceed 50 characters"],
  },

  model: {
    type: String,
    required: [true, "Model is required"],
    trim: true,
    minlength: [1, "Model name cannot be empty"],
    maxlength: [50, "Model name cannot exceed 50 characters"],
  },

  year: {
    type: Number,
    required: [true, "Production year is required"],
    min: [1886, "Invalid production year"],
  },
}, {
  timestamps: true,
});

const ProductionInfo = mongoose.model("ProductionInfo", ProductionInfoSchema);

module.exports = ProductionInfo;
