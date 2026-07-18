/**
 * 🔥 REGIX GOD MODE — Vercel Serverless API Entry Point
 */

import { createApp } from "./express-app.js";

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      console.error("[REGIX] Failed to create Express app:", err);
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

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
    if (!res.headersSent) {
      res.status(500).json({
        error: "🚨 Internal server error 💥",
        message: "Server initialization failed. Please try again.",
      });
    }
  }
}