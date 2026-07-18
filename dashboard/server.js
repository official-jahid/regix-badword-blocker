/**
 * 🔥 REGIX GOD MODE — Dashboard Server
 * ===================================
 * Starts the Express server for local development and Render.
 */

import { createApp } from "./express-app.js";

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════╗
║     🔥 REGIX GOD MODE DASHBOARD v3.0    ║
╠══════════════════════════════════════════╣
║  🌐 http://0.0.0.0:${PORT}              ║
║  👤 admin / 🔑 Regix@2024              ║
║  📡 API endpoints ready                  ║
║  🔐 JWT auth active                      ║
║  📋 Activity logging enabled             ║
╚══════════════════════════════════════════╝
`);
});