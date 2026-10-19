// src/pages/NotFound.jsx
// Rendered inside PublicLayout (via the catch-all route), so it still
// gets the header/footer around it.
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="public-container public-section static-page">
      <h1 className="static-page-heading">Page Not Found</h1>
      <p className="section-body">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="public-btn-secondary">
        Return to Home
      </Link>
    </div>
  );
}

export default NotFound;
