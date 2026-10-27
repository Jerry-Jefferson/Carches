const express = require("express");
const authController = require("../controllers/auth.controller");
const validateAuthBody = require("../middleware/validateAuthBody");

const router = express.Router();

router.post("/signup", validateAuthBody({ enforcePasswordPolicy: true }), authController.signUp);
router.post("/signin", validateAuthBody({ enforcePasswordPolicy: false }), authController.signIn);

module.exports = router;
