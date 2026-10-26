const express = require("express");
const carRoutes = require("./car.routes");

const driverRoutes = require("./driver.routes");
const bookingRoutes = require("./booking.routes");

const router = express.Router();

router.use("/cars", carRoutes);
router.use("/drivers", driverRoutes);
router.use("/bookings", bookingRoutes);

module.exports = router;
