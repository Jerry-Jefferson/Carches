const Driver = require("../models/driver.model");
const CreditCard = require("../models/creditCard.model");

const getAll = async () => {
  return await Driver.find({ isDeleted: false });
};

const getById = async (id) => {
  const driver = await Driver.findOne({ _id: id, isDeleted: false });
  if (!driver) {
    const error = new Error("Driver not found");
    error.statusCode = 404;
    throw error;
  }
  return driver;
};

const create = async (driverData) => {
  return await Driver.create(driverData);
};

const update = async (id, updateData) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: id, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  );
  if (!driver) {
    const error = new Error("Driver not found");
    error.statusCode = 404;
    throw error;
  }
  return driver;
};

const deleteById = async (id) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!driver) {
    const error = new Error("Driver not found");
    error.statusCode = 404;
    throw error;
  }

  await CreditCard.updateMany(
    { driverId: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() }
  );

  return driver;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteById,
};
