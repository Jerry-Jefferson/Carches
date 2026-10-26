const driverService = require("../services/driver.service");
const catchAsync = require("../utils/catchAsync");

const getAll = catchAsync(async (req, res) => {
  const drivers = await driverService.getAll();
  res.status(200).json({
    message: "Successfully retrieved all drivers",
    data: drivers,
  });
});

const getById = catchAsync(async (req, res) => {
  const driver = await driverService.getById(req.params.id);
  res.status(200).json({
    message: "Successfully retrieved driver",
    data: driver,
  });
});

const create = catchAsync(async (req, res) => {
  const newDriver = await driverService.create(req.body);
  res.status(201).json({
    message: "Driver successfully created",
    data: newDriver,
  });
});

const update = catchAsync(async (req, res) => {
  const updatedDriver = await driverService.update(req.params.id, req.body);
  res.status(200).json({
    message: "Driver successfully updated",
    data: updatedDriver,
  });
});

const deleteById = catchAsync(async (req, res) => {
  await driverService.deleteById(req.params.id);
  res.sendStatus(204);
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteById,
};
