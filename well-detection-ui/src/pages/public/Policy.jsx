import { Link, Navigate, useParams } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert } from "../../components/common/ui";
import { CONTACT, ORG_SHORT } from "../../config/constants";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Information we collect", "When you register we store your name, email address, optional mobile number and organization. We also store the images you upload and the detection results you create."],
      ["How it is used", "Your details are used only to operate your account and this system. Uploaded imagery and results are used to produce well maps and reports for agricultural research and planning."],
      ["Third-party services", "Maps are drawn with imagery from Esri and OpenStreetMap. Place search sends the text you type to OpenStreetMap Nominatim. Your browser also contacts Google Fonts for typefaces."],
      ["Storage in your browser", "Your sign-in token and your display preferences are kept in this browser only. Sign out on shared computers."],
      ["Contact", `Questions about your data: ${CONTACT.email}.`],
    ],
  },
  terms: {
    title: "Terms & Conditions",
    sections: [
      ["Acceptable use", `This system is provided by ${ORG_SHORT} for research and planning. Do not upload unlawful content or attempt to disrupt the service.`],
      ["Accounts", "Keep your password confidential. You are responsible for activity under your account."],
      ["Imagery and data", "You must hold the right to use any imagery you upload. Satellite imagery from commercial sources may carry licence limits on redistribution."],
      ["Changes", "These terms may be updated. Continued use means you accept the updated terms."],
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    sections: [
      ["AI-assisted results", "Wells are detected by a machine-learning model. Detections can be wrong (false alarms) or missing. The confidence score is the model's own estimate and is not a measured accuracy."],
      ["Verify before decisions", "Verify Medium and Low confidence wells on imagery or in the field before using them for groundwater assessment, legal, financial or safety decisions."],
      ["Coordinates", "Coordinates inherit the positional accuracy of the source imagery."],
    ],
  },
  accessibility: {
    title: "Accessibility Statement",
    sections: [
      ["Our aim", "We aim to make this portal usable by everyone, including people using assistive technology."],
      ["Features", "Adjustable text size, high-contrast and grayscale modes, keyboard-operable navigation and dialogs, labelled form fields and a sidebar that can be hidden (Ctrl+B)."],
      ["Maps", "Map interaction needs a pointer. Every well on the map is also listed in a table with its coordinates and can be copied or exported."],
      ["Feedback", `If you meet a barrier, tell us at ${CONTACT.email}.`],
    ],
  },
};

export default function Policy() {
  const { slug } = useParams();
  const doc = DOCS[slug];
  useDocumentTitle(doc?.title || "");
  if (!doc) return <Navigate to="/404" replace />;
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-8">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{doc.title}</h2>
      <Alert tone="warning">Template text: have the institute's legal / administration team review it before public release.</Alert>
      {doc.sections.map(([h, p]) => (
        <section key={h} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1.5 text-base font-bold text-slate-900">{h}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{p}</p>
        </section>
      ))}
      <div className="flex flex-wrap gap-3 text-xs font-semibold text-emerald-700">
        {Object.entries(DOCS).filter(([k]) => k !== slug).map(([k, d]) => <Link key={k} to={`/policies/${k}`} className="hover:underline">{d.title}</Link>)}
      </div>
    </div>
  );
}
