import { Outlet } from "react-router-dom";
import GovStrip from "./GovStrip";
import OrgHeader from "./OrgHeader";
import Footer from "./Footer";
import ScrollToTop from "../common/ScrollToTop";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <GovStrip />
      <OrgHeader />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
