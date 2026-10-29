import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "./ui";

/** Only signed-in users get through. Others go to /login and come back afterwards. */
export default function ProtectedRoute() {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <PageLoader label="Checking your session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
