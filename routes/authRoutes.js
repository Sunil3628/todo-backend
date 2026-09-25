const express = require("express");
const {
	register,
	login,
	googleLogin,
	googleStart,
	googleCallback,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/google/start", googleStart);
router.get("/google/callback", googleCallback);

module.exports = router;