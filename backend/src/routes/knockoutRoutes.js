const express = require("express");

const {
  generateKnockout,
  getKnockoutBracket
} = require("../controllers/knockoutController");

const {
  requireAuth,
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();

// --------------------------------------------------
// PUBLIC / VIEWER
// --------------------------------------------------

router.get(
  "/tournament/:id",
  getKnockoutBracket
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/tournament/:id/generate",
  requireAuth,
  requireAdmin,
  generateKnockout
);

module.exports = router;