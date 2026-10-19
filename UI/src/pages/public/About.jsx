// src/pages/public/About.jsx
import { ORG_NAME } from "../../utils/constants";

function About() {
  return (
    <div className="public-container public-section static-page">
      <h1 className="static-page-heading">About Us</h1>

      <section className="static-page-block">
        <h2>About ICAR</h2>
        <p>
          The Indian Council of Agricultural Research (ICAR) is an
          autonomous organization responsible for coordinating agricultural
          research and education across India. It plays a central role in
          advancing agricultural science and technology in support of the
          country's farmers and agricultural sector.
        </p>
      </section>

      <section className="static-page-block">
        <h2>About NBSS &amp; LUP</h2>
        <p>
          The National Bureau of Soil Survey and Land Use Planning
          (NBSS&amp;LUP) is an ICAR institute focused on soil survey, soil
          resource assessment, land resource management, land use
          planning, and the application of remote sensing and GIS to
          agricultural resource management.
        </p>
      </section>

      <section className="static-page-block">
        <h2>{ORG_NAME} — Nagpur</h2>
        <p>
          The Nagpur-based unit of NBSS&amp;LUP is associated with soil
          survey, land resource studies, and the use of geospatial
          technologies in agricultural land-use planning for the region.
        </p>
      </section>
    </div>
  );
}

export default About;
