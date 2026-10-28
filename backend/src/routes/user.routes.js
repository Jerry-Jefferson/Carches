const express = require("express");
const userController = require("../controllers/user.controller");
const { requireUser, requireAdmin } = require("../middleware/requireRole");

const router = express.Router();

router.get("/me", requireUser, userController.getMe);
router.get("/", requireAdmin, userController.getAll);
router.get("/:id", requireAdmin, userController.getById);
router.put("/:id", requireAdmin, userController.update);
router.delete("/:id", requireAdmin, userController.deleteById);

module.exports = router;
