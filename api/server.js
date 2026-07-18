/**
 * 🔥 REGIX GOD MODE — Local Server
 */
import express from "express";
import { createApp } from "./express-app.js";

const app = await createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🔥 REGIX Dashboard running at http://localhost:${port}`);
});