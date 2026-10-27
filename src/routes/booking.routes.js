const express = require("express");
const bookingController = require("../controllers/booking.controller");
const { requireUser, requireAdmin } = require("../middleware/requireRole");

const router = express.Router();

router.get("/my", requireUser, bookingController.getMy);
router.get("/", requireAdmin, bookingController.getAll);
router.get("/:id", requireAdmin, bookingController.getById);
router.post("/", requireUser, bookingController.create);
router.put("/:id", requireAdmin, bookingController.update);
router.delete("/:id", requireAdmin, bookingController.deleteById);

module.exports = router;
