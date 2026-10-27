const Booking = require("../models/booking.model");
const Car = require("../models/car.model");
const { VEHICLE_STATUS } = require("../constants/vehicle");

const getStatusFromBooking = (booking) => {
  if (booking.endDate) {
    return VEHICLE_STATUS.FREE;
  }

  const startDate = new Date(booking.startDate);
  const now = new Date();

  return startDate <= now ? VEHICLE_STATUS.IN_USE : VEHICLE_STATUS.RESERVED;
};

const getAll = async () => {
  return await Booking.find().populate("userId carId");
};

const getByUserId = async (userId) => {
  return await Booking.find({ userId }).sort({ startDate: -1 }).populate("carId");
};

const getById = async (id) => {
  const booking = await Booking.findById(id).populate("userId carId");
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  return booking;
};

const create = async (bookingData) => {
  const booking = await Booking.create(bookingData);

  const statusToSet = getStatusFromBooking(booking);
  await Car.findByIdAndUpdate(booking.carId, { status: statusToSet });

  return booking;
};

const update = async (id, updateData) => {
  const booking = await Booking.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("userId carId");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const statusToSet = getStatusFromBooking(booking);
  await Car.findByIdAndUpdate(booking.carId._id || booking.carId, { status: statusToSet });

  return booking;
};

const deleteById = async (id) => {
  const booking = await Booking.findByIdAndDelete(id);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  return booking;
};

module.exports = {
  getAll,
  getByUserId,
  getById,
  create,
  update,
  deleteById,
};
