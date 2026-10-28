const mongoose = require('mongoose');

const connectDB = async () => {
  const {DATABASE_URI} = process.env

  if (!DATABASE_URI) {
    throw new Error('DATABASE_URI is not defined');
  }
  
  try {
    await mongoose.connect(DATABASE_URI);
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
