const express = require("express");
const authController = require("../controllers/auth.controller");
const validateAuthBody = require("../middleware/validateAuthBody");
const authenticate = require("../middleware/authenticate");
const { requireUser } = require("../middleware/requireRole");

const router = express.Router();

router.post("/signup", validateAuthBody({ enforcePasswordPolicy: true, requireProfile: true }), authController.signUp);
router.post("/signin", validateAuthBody({ enforcePasswordPolicy: false }), authController.signIn);
router.post("/logout", authenticate, requireUser, authController.logout);

module.exports = router;
