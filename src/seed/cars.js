const mongoose = require("mongoose");
const connectDB = require("../db/connection");
const Car = require("../models/car.model");
const ProductionInfo = require("../models/productionInfo.model");
const Driver = require("../models/driver.model");
const CreditCard = require("../models/creditCard.model");
const Booking = require("../models/booking.model");
const { VEHICLE_STATUS_LIST } = require("../constants/vehicle");
const { BRANDS_AND_MODELS, FULL_NAMES, LOCATION_BOUNDS } = require("../constants/seed");

require("dotenv").config();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min, max, decimals = 6) =>
  Number((Math.random() * (max - min) + min).toFixed(decimals));

const randomElement = (arr) => arr[randomInt(0, arr.length - 1)];

const generateVin = () => {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  return Array.from({ length: 17 }, () => randomElement(chars.split(""))).join("");
};

const generateRegistrationNumber = () => {
  const letters = "ABCEHIKMOPTX";
  const randomLetterPair = () =>
    randomElement(letters.split("")) + randomElement(letters.split(""));
  const digits = String(randomInt(1000, 9999));
  const region = randomInt(1, 7);
  return `${digits} ${randomLetterPair()}-${region}`;
};

const generateLocation = () => ({
  type: "Point",
  coordinates: [
    randomFloat(LOCATION_BOUNDS.lngMin, LOCATION_BOUNDS.lngMax),
    randomFloat(LOCATION_BOUNDS.latMin, LOCATION_BOUNDS.latMax),
  ],
});

const generateLicenseNumber = () => {
  const digits = String(randomInt(100000, 999999));
  const letters = "ABCDEFGHKLMNPRSTUVWXYZ";
  const suffix = Array.from({ length: 2 }, () => randomElement(letters.split(""))).join("");
  return `${digits}${suffix}`;
};

const generateCardNumber = () => {
  const groups = Array.from({ length: 4 }, () => String(randomInt(1000, 9999)));
  return groups.join(" ");
};

const generateFutureDate = () => {
  const now = new Date();
  const monthsAhead = randomInt(3, 48);
  return new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
};

const generatePastDate = () => {
  const now = new Date();
  const daysAgo = randomInt(1, 365);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
};

const CARS_TO_SEED = 5;
const DRIVERS_TO_SEED = 5;
const BOOKINGS_TO_SEED = 5;

const seed = async () => {
  await connectDB();

  await Booking.deleteMany({});
  await CreditCard.deleteMany({});
  await Driver.deleteMany({});
  await Car.deleteMany({});
  await ProductionInfo.deleteMany({});

  console.log("Cleared all collections.");

  const usedLicenses = new Set();
  const drivers = [];

  for (let i = 0; i < DRIVERS_TO_SEED; i++) {
    let licenseNumber;
    do {
      licenseNumber = generateLicenseNumber();
    } while (usedLicenses.has(licenseNumber));
    usedLicenses.add(licenseNumber);

    const { firstName, lastName } = randomElement(FULL_NAMES);

    drivers.push({
      licenseNumber,
      firstName,
      lastName,
    });
  }

  const insertedDrivers = await Driver.insertMany(drivers);
  console.log(`Seeded ${insertedDrivers.length} drivers.`);

  const creditCards = insertedDrivers.map((driver) => ({
    driverId: driver._id,
    number: generateCardNumber(),
    owner: `${driver.firstName} ${driver.lastName}`.toUpperCase(),
    validThrough: generateFutureDate(),
    isAuthorized: Math.random() > 0.5,
  }));

  const insertedCards = await CreditCard.insertMany(creditCards);
  console.log(`Seeded ${insertedCards.length} credit cards.`);

  const usedVins = new Set();
  const usedRegNumbers = new Set();
  const cars = [];

  for (let i = 0; i < CARS_TO_SEED; i++) {
    const brandEntry = randomElement(BRANDS_AND_MODELS);
    const productionInfo = await ProductionInfo.create({
      brand: brandEntry.brand,
      model: randomElement(brandEntry.models),
      year: randomInt(2015, 2026),
    });

    let vin;
    do {
      vin = generateVin();
    } while (usedVins.has(vin));
    usedVins.add(vin);

    let registrationNumber;
    do {
      registrationNumber = generateRegistrationNumber();
    } while (usedRegNumbers.has(registrationNumber));
    usedRegNumbers.add(registrationNumber);

    cars.push({
      productionInfo: productionInfo._id,
      vin,
      registrationNumber,
      status: randomElement(VEHICLE_STATUS_LIST),
      fuelLevel: randomInt(5, 100),
      mileage: randomInt(0, 200_000),
      location: generateLocation(),
    });
  }

  const insertedCars = await Car.insertMany(cars);
  console.log(`Seeded ${insertedCars.length} cars.`);

  const bookings = [];

  for (let i = 0; i < BOOKINGS_TO_SEED; i++) {
    const driver = randomElement(insertedDrivers);
    const car = randomElement(insertedCars);

    const startFuelLevel = randomInt(20, 100);
    const startMileage = randomInt(0, 150_000);
    const hasFinished = Math.random() > 0.4;

    bookings.push({
      driverId: driver._id,
      carId: car._id,
      startDate: generatePastDate(),
      startFuelLevel,
      startMileage,
      finishFuelLevel: hasFinished ? randomInt(5, startFuelLevel) : null,
      finishMileage: hasFinished ? startMileage + randomInt(10, 500) : null,
    });
  }

  const insertedBookings = await Booking.insertMany(bookings);
  console.log(`Seeded ${insertedBookings.length} bookings.`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
};

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
