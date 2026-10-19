// src/services/contactService.js

const MOCK_DELAY = 700;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock contact form submission.
 * Later replace this function body with:
 *   const res = await api.post("/contact", payload);
 *   return res.data;
 */
export async function submitContactForm(payload) {
  await delay(MOCK_DELAY);

  if (!payload.name || !payload.email || !payload.message) {
    throw new Error("Please fill in all required fields.");
  }

  return { received: true };
}
