const express = require("express");
const carController = require("../controllers/car.controller");
const { requireUser, requireAdmin } = require("../middleware/requireRole");

const router = express.Router();

router.get("/", requireUser, carController.getAll);
router.get("/in-use/low-fuel", requireAdmin, carController.getInUseLowFuel);
router.get("/reserved", requireAdmin, carController.getReservedByCardAuth);
router.get("/:id", requireUser, carController.getById);
router.post("/", requireAdmin, carController.create);
router.put("/service-old-or-high-mileage", requireAdmin, carController.serviceOldOrWorn);
router.put("/relocate-frequently-booked", requireAdmin, carController.relocateFrequentlyBooked);
router.put("/:vin", requireAdmin, carController.update);
router.delete("/:vin", requireAdmin, carController.deleteByVin);

module.exports = router;
