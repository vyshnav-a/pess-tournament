import { Navigate, Outlet, useLocation } from "react-router-dom";

function AdminRoute() {
  const token = localStorage.getItem("pess_token");
  const userData = localStorage.getItem("pess_user");

  const location = useLocation();

  if (!token || !userData) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  try {
    const user = JSON.parse(userData);

    if (user.role !== "ADMIN") {
      return <Navigate to="/" replace />;
    }

    return <Outlet />;

  } catch (error) {
    localStorage.removeItem("pess_token");
    localStorage.removeItem("pess_user");

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }
}

export default AdminRoute;