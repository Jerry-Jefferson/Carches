const express = require("express");
const carController = require("../controllers/car.controller");

const router = express.Router();

router.get("/", carController.getAll);
router.get("/:vin", carController.getByVin);
router.get("/in-use/low-fuel", carController.getInUseLowFuel);
router.get("/reserved", carController.getReservedByCardAuth);
router.put("/:vin", carController.update);
router.put("/service-old-or-high-mileage", carController.serviceOldOrWorn);
router.put("/relocate-frequently-booked", carController.relocateFrequentlyBooked);
router.post("/", carController.create);
router.delete("/:vin", carController.deleteByVin);

module.exports = router;
