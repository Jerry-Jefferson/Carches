const mongoose = require("mongoose");
const Car = require("../models/car.model");
const ProductionInfo = require("../models/productionInfo.model");
const Booking = require("../models/booking.model");
const { VEHICLE_STATUS } = require("../constants/vehicle");

const getAll = async () => {
  return await Car.find({ isDeleted: false }).populate("productionInfo");
};

const getById = async (id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    const error = new Error("Invalid car ID format");
    error.statusCode = 400;
    throw error;
  }

  const car = await Car.findOne({ _id: id, isDeleted: false }).populate("productionInfo");
  if (!car) {
    const error = new Error("Car not found");
    error.statusCode = 404;
    throw error;
  }
  return car;
};

const update = async (vin, updateData) => {
  const car = await Car.findOneAndUpdate(
    { vin: vin.toUpperCase(), isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  ).populate("productionInfo");
  
  if (!car) {
    const error = new Error("Car not found");
    error.statusCode = 404;
    throw error;
  }
  return car;
};

const create = async (carData) => {
  const { productionInfo, ...carFields } = carData;
  let productionInfoId;

  if (typeof productionInfo === "string") {
    productionInfoId = productionInfo;
  } else if (productionInfo && productionInfo._id) {
    productionInfoId = productionInfo._id;
  } else if (productionInfo && typeof productionInfo === "object") {
    const { brand, model, year } = productionInfo;

    if (!brand || !model || !year) {
      const error = new Error("brand, model and year are required for productionInfo");
      error.statusCode = 400;
      throw error;
    }

    let existingInfo = await ProductionInfo.findOne({ brand, model, year });

    if (!existingInfo) {
      existingInfo = await ProductionInfo.create(productionInfo);
    }
    productionInfoId = existingInfo._id;
  }

  const newCar = await Car.create({
    ...carFields,
    productionInfo: productionInfoId,
  });

  return newCar;
};

const deleteByVin = async (vin) => {
  const car = await Car.findOneAndUpdate(
    { vin: vin.toUpperCase(), isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!car) {
    const error = new Error("Car not found");
    error.statusCode = 404;
    throw error;
  }

  return car;
};

const getInUseLowFuel = async () => {
  return await Car.find({ status: VEHICLE_STATUS.IN_USE, fuelLevel: { $lt: 25 }, isDeleted: false }).populate(
    "productionInfo"
  );
};

const getReservedByCardAuth = async (authorized) => {
  const cars = await Car.aggregate([
    { $match: { status: VEHICLE_STATUS.RESERVED, isDeleted: false } },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "carId",
        as: "booking",
      },
    },
    { $unwind: "$booking" },
    {
      $lookup: {
        from: "creditcards",
        localField: "booking.userId",
        foreignField: "userId",
        as: "creditCard",
      },
    },
    { $unwind: "$creditCard" },
    { $match: { "creditCard.isAuthorized": authorized } },
    {
      $lookup: {
        from: "users",
        localField: "booking.userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        vin: 1,
        location: 1,
        userFirstName: "$user.firstName",
        userLastName: "$user.lastName",
        userLicenseNumber: "$user.licenseNumber",
      },
    },
  ]);

  return cars;
};

const serviceOldOrWorn = async () => {
  const oldProductionInfos = await ProductionInfo.find({ year: { $lt: 2017 } })
    .select("_id")
    .lean();
  const oldProductionInfoIds = oldProductionInfos.map((pi) => pi._id);

  const result = await Car.updateMany(
    {
      $or: [{ productionInfo: { $in: oldProductionInfoIds } }, { mileage: { $gt: 100000 } }],
    },
    { $set: { status: VEHICLE_STATUS.IN_SERVICE } }
  );

  return result;
};

const relocateFrequentlyBooked = async () => {
  const frequentlyBookedCars = await Booking.aggregate([
    { $group: { _id: "$carId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 2 } } },
  ]);

  const carIds = frequentlyBookedCars.map((item) => item._id);

  const result = await Car.updateMany(
    {
      _id: { $in: carIds },
      status: { $nin: [VEHICLE_STATUS.IN_USE, VEHICLE_STATUS.RESERVED] },
    },
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [27.5442615, 53.8882836],
        },
      },
    }
  );

  return result;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteByVin,
  getInUseLowFuel,
  getReservedByCardAuth,
  serviceOldOrWorn,
  relocateFrequentlyBooked,
};
