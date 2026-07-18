/**
 * 🔥 REGIX GOD MODE — Vercel Serverless API Entry Point
 * ======================================================
 * This file is the entry point for Vercel's API handling.
 * It imports the Express app from dashboard/app.js and
 * exports a serverless-compatible handler.
 */

import { createApp } from "../dashboard/express-app.js";

// Create the Express app once and cache it
let app;
function getApp() {
  if (!app) {
    app = createApp();
  }
  return app;
}

// Vercel serverless handler
export default async function handler(req, res) {
  const expressApp = getApp();
  return new Promise((resolve, reject) => {
    expressApp(req, res);
    res.on("finish", resolve);
    res.on("error", reject);
  });
}

// Also export the app for direct use
export { getApp };
