const express = require("express");
const authenticate = require("../middleware/authenticate");

const authRoutes = require("./auth.routes");
const carRoutes = require("./car.routes");
const userRoutes = require("./user.routes");
const bookingRoutes = require("./booking.routes");

const AppError = require("../utils/AppError");

const router = express.Router();

router.use("/auth", authRoutes);

router.use("/cars", authenticate, carRoutes);
router.use("/users", authenticate, userRoutes);
router.use("/bookings", authenticate, bookingRoutes);

router.use((req, _res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
});

module.exports = router;
