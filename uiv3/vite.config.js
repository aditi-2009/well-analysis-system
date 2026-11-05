import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Port 3000 matches the backend default ALLOWED_ORIGINS (http://localhost:3000),
// so CORS works without touching the backend .env.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, host: true },
  preview: { port: 3000 },
});
