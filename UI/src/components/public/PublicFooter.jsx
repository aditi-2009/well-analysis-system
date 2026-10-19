// src/components/public/PublicFooter.jsx
import { Link } from "react-router-dom";
import { ORG_NAME } from "../../utils/constants";

function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer-grid">
        <div>
          <h3 className="public-footer-heading">Important Links</h3>
          <ul className="public-footer-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/login">Login / Register</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="public-footer-heading">Organization</h3>
          <p className="public-footer-org">
            {ORG_NAME}
            <br />
            Nagpur, Maharashtra, India
          </p>
        </div>

        <div>
          <h3 className="public-footer-heading">Policies</h3>
          <ul className="public-footer-list">
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/accessibility">Accessibility</Link></li>
            <li><Link to="/disclaimer">Disclaimer</Link></li>
          </ul>
        </div>
      </div>

      <div className="public-footer-bottom">
        <p>© {year} {ORG_NAME}. All Rights Reserved.</p>
      </div>
    </footer>
  );
}

export default PublicFooter;
