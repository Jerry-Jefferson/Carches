const bookingService = require("../services/booking.service");
const catchAsync = require("../utils/catchAsync");
const { USER_ROLES } = require("../constants/user");

const getAll = catchAsync(async (req, res) => {
  const bookings = await bookingService.getAll();
  res.status(200).json({
    message: "Successfully retrieved all bookings",
    data: bookings,
  });
});

const getMy = catchAsync(async (req, res) => {
  const bookings = await bookingService.getByUserId(req.user._id);
  res.status(200).json({
    message: "Successfully retrieved your bookings",
    data: bookings,
  });
});

const getById = catchAsync(async (req, res) => {
  const booking = await bookingService.getById(req.params.id);
  res.status(200).json({
    message: "Successfully retrieved booking",
    data: booking,
  });
});

const create = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === USER_ROLES.ADMIN;
  const bookingData = isAdmin ? req.body : { ...req.body, userId: req.user._id };

  const newBooking = await bookingService.create(bookingData);
  res.status(201).json({
    message: "Booking successfully created",
    data: newBooking,
  });
});

const update = catchAsync(async (req, res) => {
  const updatedBooking = await bookingService.update(req.params.id, req.body);
  res.status(200).json({
    message: "Booking successfully updated",
    data: updatedBooking,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await bookingService.deleteById(req.params.id);
  res.sendStatus(204);
});

module.exports = {
  getAll,
  getMy,
  getById,
  create,
  update,
  deleteById,
};
