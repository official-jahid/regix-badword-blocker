/**
 * 🔥 REGIX GOD MODE — Vercel Serverless API Entry Point
 * ======================================================
 * This file is the entry point for Vercel's API handling.
 * It imports the Express app from dashboard/express-app.js and
 * exports a serverless-compatible handler.
 *
 * IMPORTANT: No persistent listeners (no app.listen()).
 * The Express app is created once and cached for subsequent invocations.
 * All errors are caught and logged to prevent FUNCTION_INVOCATION_FAILED.
 */

import { createApp } from "../dashboard/express-app.js";

// Cache the Express app instance across warm invocations
let appPromise = null;

/**
 * Get or create the Express app instance.
 * Uses a promise-based singleton pattern to handle async initialization.
 */
async function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      console.error("[REGIX] Failed to create Express app:", err);
      // Reset so next invocation retries
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

/**
 * Vercel serverless handler.
 * Receives the standard (req, res) Node.js HTTP request/response.
 * Delegates to the Express app for routing.
 */
export default async function handler(req, res) {
  try {
    const expressApp = await getApp();
    return new Promise((resolve, reject) => {
      expressApp(req, res);
      res.on("finish", () => resolve());
      res.on("error", (err) => {
        console.error("[REGIX] Response error:", err);
        reject(err);
      });
    });
  } catch (err) {
    console.error("[REGIX] Handler error:", err);
    // If we can't even get the app, return a 500 directly
    if (!res.headersSent) {
      res.status(500).json({
        error: "🚨 Internal server error 💥",
        message: "Server initialization failed. Please try again.",
      });
    }
  }
}
