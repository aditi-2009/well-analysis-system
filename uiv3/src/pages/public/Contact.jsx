import { useState } from "react";
import { Globe, Mail, MapPin, Phone, Send } from "lucide-react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Alert, btn, inputCls, labelCls } from "../../components/common/ui";
import { CONTACT } from "../../config/constants";

export default function Contact() {
  useDocumentTitle("Contact Us");
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  // The backend has no contact endpoint, so the form opens the visitor's email app.
  const submit = (e) => {
    e.preventDefault();
    const body = `${f.message}\n\n-- \n${f.name}\n${f.email}`;
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const info = [
    [MapPin, "Address", CONTACT.address],
    [Phone, "Telephone", CONTACT.phone],
    [Mail, "Email", CONTACT.email],
    [Globe, "Website", CONTACT.website],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Contact Us</h2>
      <p className="mt-2 text-sm text-slate-600">Questions about access, data or the detection results? Write to us.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Reach us</h3>
          <ul className="space-y-4 text-sm">
            {info.map(([Icon, l, v]) => (
              <li key={l} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-4 w-4" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="text-slate-800">{v}</p></div>
              </li>
            ))}
          </ul>
          <a className={`${btn.secondary} mt-6`} target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/search?query=ICAR%20National%20Bureau%20of%20Soil%20Survey%20Nagpur">
            <MapPin className="h-4 w-4" /> View on map
          </a>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Send a message</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelCls} htmlFor="c-name">Name</label><input id="c-name" required className={inputCls} value={f.name} onChange={set("name")} /></div>
              <div><label className={labelCls} htmlFor="c-email">Email</label><input id="c-email" type="email" required className={inputCls} value={f.email} onChange={set("email")} /></div>
            </div>
            <div><label className={labelCls} htmlFor="c-sub">Subject</label><input id="c-sub" required className={inputCls} value={f.subject} onChange={set("subject")} /></div>
            <div><label className={labelCls} htmlFor="c-msg">Message</label><textarea id="c-msg" required rows={5} className={inputCls} value={f.message} onChange={set("message")} /></div>
            <button className={`${btn.primary} w-full`}><Send className="h-4 w-4" /> Open in my email app</button>
            {sent && <Alert tone="success">Your email app should have opened with the message ready to send. If nothing happened, write directly to {CONTACT.email}.</Alert>}
          </form>
        </section>
      </div>
    </div>
  );
}
