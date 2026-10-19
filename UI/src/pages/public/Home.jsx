// src/pages/public/Home.jsx
import { Link } from "react-router-dom";
import { APP_NAME, ORG_NAME } from "../../utils/constants";

function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="public-container">
          <p className="hero-eyebrow">{ORG_NAME} — Nagpur</p>
          <h1 className="hero-heading">{APP_NAME}</h1>
          <p className="hero-subheading">
            A geospatial platform for agricultural water well data
          </p>
          <p className="hero-body">
            This platform supports researchers and field staff in
            identifying, mapping, and managing agricultural water well
            records for {ORG_NAME}, Nagpur.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="hero-btn-primary">
              Login to Continue
            </Link>
            <Link to="/about" className="hero-btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-container org-strip">
          <div>
            <p className="section-eyebrow-green">About the Organization</p>
            <h2 className="section-heading">About {ORG_NAME}</h2>
            <p className="section-body">
              The National Bureau of Soil Survey and Land Use Planning
              (NBSS&amp;LUP) is an ICAR institute engaged in soil survey,
              land resource assessment, land use planning, and related
              geospatial applications in support of Indian agriculture.
            </p>
            <Link to="/about" className="public-btn-secondary">
              Read More
            </Link>
          </div>
          <div className="org-strip-panel">
            <h3 className="section-heading">At a glance</h3>
            <ul className="org-strip-list">
              <li>Soil survey &amp; land resource assessment</li>
              <li>Land use planning</li>
              <li>Remote sensing &amp; GIS applications</li>
              <li>Agricultural resource management</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section public-section-muted">
        <div className="public-container">
          <p className="section-eyebrow-green">Notice</p>
          <div className="notice-panel">
            <h3 className="section-heading">Important Information</h3>
            <p className="section-body">
              Access to well detection and reporting tools requires an
              account. Existing users can log in directly; new users can
              register for access below.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
