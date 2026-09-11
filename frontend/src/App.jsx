import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Home from "./pages/Home";
import Tournament from "./pages/Tournament";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PlayerManagement from "./pages/PlayerManagement";
import Fixtures from "./pages/Fixtures";
import Tournaments from "./pages/Tournaments";

import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =========================================
            PUBLIC / VIEWER ROUTES
        ========================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route 
          path="/tournaments" 
          element={<Tournaments />}
        />

        <Route
          path="/tournament/:id"
          element={<Tournament />}
        />

        {/* =========================================
            AUTH
        ========================================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* =========================================
            ADMIN ROUTES
        ========================================= */}

        <Route element={<AdminRoute />}>

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/tournament/:id/players"
            element={<PlayerManagement />}
          />

          <Route
            path="/admin/tournament/:id/fixtures"
            element={<Fixtures />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;