// src/pages/public/Contact.jsx
import { useState } from "react";
import { ORG_NAME } from "../../utils/constants";
import { submitContactForm } from "../../services/contactService";

const initialForm = { name: "", email: "", subject: "", message: "" };

function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      await submitContactForm(form);
      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="public-container public-section static-page">
      <h1 className="static-page-heading">Contact Us</h1>

      <section className="static-page-block">
        <h2>Organization</h2>
        <p className="contact-info-list">
          {ORG_NAME}
          <br />
          Nagpur, Maharashtra, India
        </p>
      </section>

      <section className="static-page-block">
        <h2>Contact Information</h2>
        <p className="contact-info-list">
          Address: [Institute address placeholder]
          <br />
          Email: [contact email placeholder]
          <br />
          Telephone: [contact number placeholder]
          <br />
          Website: [official website placeholder]
        </p>
      </section>

      <section className="static-page-block">
        <h2>Send a Message</h2>

        {status === "success" && (
          <div className="auth-success-banner" role="status">
            Thank you. Your message has been submitted.
          </div>
        )}
        {status === "error" && (
          <div className="auth-error-banner" role="alert">
            {errorMsg}
          </div>
        )}

        <form className="contact-form-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input id="subject" name="subject" required value={form.subject} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              value={form.message}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={status === "sending"}>
            {status === "sending" ? "Submitting..." : "Submit"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Contact;
