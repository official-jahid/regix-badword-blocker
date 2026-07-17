/**
 * 🔥 REGIX GOD MODE — Local Development Server
 * ==============================================
 * This file is only for local development. It imports the
 * Express app from app.js and starts listening on a port.
 * Vercel uses api/index.js instead (serverless function).
 */

import { createApp } from "./app.js";

const PORT = process.env.DASHBOARD_PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     🔥 REGIX GOD MODE DASHBOARD v3.0    ║
╠══════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}              ║
║  👤 admin / 🔑 Regix@2024              ║
║  📡 API endpoints ready                  ║
║  🔐 JWT auth active                      ║
║  📋 Activity logging enabled             ║
╚══════════════════════════════════════════╝
`);
});
