const express = require("express");

const {
  getTournamentGroups,
  generateGroups
} = require("../controllers/groupController");

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
  getTournamentGroups
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/tournament/:id/generate",
  requireAuth,
  requireAdmin,
  generateGroups
);

module.exports = router;