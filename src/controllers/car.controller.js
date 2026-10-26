const carService = require("../services/car.service");
const catchAsync = require("../utils/catchAsync");

const getAll = catchAsync(async (req, res) => {
  const cars = await carService.getAll();
  res.status(200).json({
    message: "Successfully retrieved all cars",
    data: cars,
  });
});

const getByVin = catchAsync(async (req, res) => {
  const { vin } = req.params;
  const car = await carService.getByVin(vin);
  res.status(200).json({
    message: "Successfully retrieved car by VIN",
    data: car,
  });
});

const update = catchAsync(async (req, res) => {
  const { vin } = req.params;
  const updatedCar = await carService.update(vin, req.body);
  res.status(200).json({
    message: "Car successfully updated",
    data: updatedCar,
  });
});

const deleteByVin = catchAsync(async (req, res) => {
  const { vin } = req.params;

  await carService.deleteByVin(vin);
  res.sendStatus(204);
});

const getInUseLowFuel = catchAsync(async (req, res) => {
  const cars = await carService.getInUseLowFuel();
  res.status(200).json({
    message: "Successfully retrieved cars in use with low fuel",
    data: cars,
  });
});

const getReservedByCardAuth = catchAsync(async (req, res) => {
  const authorized = req.query.authorized === "true";
  const cars = await carService.getReservedByCardAuth(authorized);
  res.status(200).json({
    message: `Successfully retrieved reserved cars with ${authorized ? "authorized" : "unauthorized"} cards`,
    data: cars,
  });
});

const create = catchAsync(async (req, res) => {
  const newCar = await carService.create(req.body);
  res.status(201).json({
    message: "Car successfully added",
    data: newCar,
  });
});

const serviceOldOrWorn = catchAsync(async (req, res) => {
  const result = await carService.serviceOldOrWorn();
  res.status(200).json({
    message: "Successfully updated cars to in_service",
    data: result,
  });
});

const relocateFrequentlyBooked = catchAsync(async (req, res) => {
  const result = await carService.relocateFrequentlyBooked();
  res.status(200).json({
    message: "Successfully updated location for frequently booked cars",
    data: result,
  });
});

module.exports = {
  getAll,
  getByVin,
  create,
  update,
  deleteByVin,
  getInUseLowFuel,
  getReservedByCardAuth,
  serviceOldOrWorn,
  relocateFrequentlyBooked,
};
