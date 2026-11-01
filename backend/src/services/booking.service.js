const Booking = require("../models/booking.model");
const Car = require("../models/car.model");
const { VEHICLE_STATUS } = require("../constants/vehicle");
const { LOCATION_BOUNDS } = require("../constants/seed");

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

const finish = async (id, userId) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.userId.toString() !== userId.toString()) {
    const error = new Error("You can only finish your own trips");
    error.statusCode = 403;
    throw error;
  }

  if (booking.endDate) {
    const error = new Error("This trip is already finished");
    error.statusCode = 400;
    throw error;
  }

  // Simulate reading vehicle telemetry with random values
  const drivenKm = Math.floor(Math.random() * 196) + 5; // 5–200 km
  const fuelUsed = Math.floor(Math.random() * 30) + 1; // 1–30 %

  const randomFloat = (min, max, decimals = 6) =>
    Number((Math.random() * (max - min) + min).toFixed(decimals));

  const newLocation = {
    type: "Point",
    coordinates: [
      randomFloat(LOCATION_BOUNDS.lngMin, LOCATION_BOUNDS.lngMax),
      randomFloat(LOCATION_BOUNDS.latMin, LOCATION_BOUNDS.latMax),
    ],
  };

  booking.endDate = new Date();
  booking.finishMileage = booking.startMileage + drivenKm;
  booking.finishFuelLevel = Math.max(0, booking.startFuelLevel - fuelUsed);

  await booking.save();

  // Update the car: set status to FREE and sync mileage / fuel level / location
  await Car.findByIdAndUpdate(booking.carId, {
    status: VEHICLE_STATUS.FREE,
    mileage: booking.finishMileage,
    fuelLevel: booking.finishFuelLevel,
    location: newLocation,
  });

  return await booking.populate("userId carId");
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
  finish,
  deleteById,
};
