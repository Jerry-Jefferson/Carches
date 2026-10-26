const express = require("express");
const bookingController = require("../controllers/booking.controller");

const router = express.Router();

router.get("/", bookingController.getAll);
router.get("/:id", bookingController.getById);
router.post("/", bookingController.create);
router.put("/:id", bookingController.update);
router.delete("/:id", bookingController.deleteById);

module.exports = router;
