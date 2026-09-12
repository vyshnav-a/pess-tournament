const express = require("express");
const cors = require("cors");

const knockoutRoutes =
  require("./routes/knockoutRoutes");

const standingsRoutes =
  require("./routes/standingsRoutes");

const matchRoutes =
  require("./routes/matchRoutes");

const groupRoutes =
  require("./routes/groupRoutes");

const playerRoutes =
  require("./routes/playerRoutes");

const tournamentRoutes =
  require("./routes/tournamentRoutes");

const authRoutes =
  require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/tournaments",
  tournamentRoutes
);

app.use(
  "/api/players",
  playerRoutes
);

app.use(
  "/api/groups",
  groupRoutes
);

app.use(
  "/api/standings",
  standingsRoutes
);

app.use(
  "/api/matches",
  matchRoutes
);

app.use(
  "/api/knockout",
  knockoutRoutes
);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "eFootball Tournament API is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});