/**
 * 🔥 REGIX GOD MODE — Express App Module (Vercel-Compatible)
 * ===========================================================
 * Exports a createApp() function that builds the Express app.
 * Does NOT call app.listen() — that's for server.js (local dev).
 * JWT-only authentication (no sessions — serverless compatible).
 * File-based storage in /tmp/data/ for Vercel ephemeral filesystem.
 *
 * IMPORTANT: No top-level side effects! All initialization happens
 * inside createApp() to prevent FUNCTION_INVOCATION_FAILED on Vercel.
 */

import bcrypt from "bcryptjs";
import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import jwt from "jsonwebtoken";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Paths ──────────────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? "/tmp/data" : join(__dirname, "..", "data");
const DASH_DIR = __dirname;

const JWT_SECRET =
  process.env.JWT_SECRET || "regix-god-mode-jwt-secret-2024-v3";

// ─── Helpers ─────────────────────────────────────────────────────────────
function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(path, data) {
  try {
    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[REGIX] Failed to write ${path}:`, err);
  }
}

// ─── App Setup ────────────────────────────────────────────────────────────
export async function createApp() {
  const app = express();

  // ─── Initialize data directory (safe, wrapped in try/catch) ──────────
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[REGIX] Failed to create data directory:", err);
  }

  // ─── Data files ──────────────────────────────────────────────────────
  const DB = {
    users: join(DATA_DIR, "dashboard-users.json"),
    sessions: join(DATA_DIR, "dashboard-sessions.json"),
    logs: join(DATA_DIR, "dashboard-logs.json"),
    refreshTokens: join(DATA_DIR, "refresh-tokens.json"),
  };

  // Initialize data files safely
  try {
    [DB.users, DB.sessions, DB.logs, DB.refreshTokens].forEach((p) => {
      if (!existsSync(p)) writeJSON(p, []);
    });
  } catch (err) {
    console.error("[REGIX] Failed to initialize data files:", err);
  }

  // ─── Bot data cache ──────────────────────────────────────────────────
  const botDataPaths = {
    config: join(DATA_DIR, "config.json"),
    words: join(DATA_DIR, "words.json"),
    violations: join(DATA_DIR, "violations.json"),
    permissions: join(DATA_DIR, "permissions.json"),
  };

  let botData = {
    config: readJSON(botDataPaths.config) || {},
    words: readJSON(botDataPaths.words) || {
      badWords: [],
      whiteListWords: [],
    },
    violations: readJSON(botDataPaths.violations) || {},
    permissions: readJSON(botDataPaths.permissions) || {
      ignoredChannels: [],
      allowedUsers: [],
    },
  };

  function reloadBotData() {
    botData.config = readJSON(botDataPaths.config) || botData.config;
    botData.words = readJSON(botDataPaths.words) || botData.words;
    botData.violations =
      readJSON(botDataPaths.violations) || botData.violations;
    botData.permissions =
      readJSON(botDataPaths.permissions) || botData.permissions;
  }

  function saveBotData(type) {
    writeJSON(botDataPaths[type], botData[type]);
    try {
      addLog("system", `📝 Bot data updated: ${type}`, "system");
    } catch {}
  }

  // ─── Logging ─────────────────────────────────────────────────────────
  function addLog(action, details, user = "system", ip = "127.0.0.1") {
    try {
      const logs = readJSON(DB.logs) || [];
      logs.unshift({
        id: randomUUID().slice(0, 8),
        user,
        action,
        details,
        ip,
        timestamp: new Date().toISOString(),
      });
      if (logs.length > 2000) logs.length = 2000;
      writeJSON(DB.logs, logs);
    } catch (err) {
      console.error("[REGIX] Failed to write log:", err);
    }
  }

  // ─── JWT Helpers ─────────────────────────────────────────────────────
  function generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
  }

  function generateRefreshToken(user) {
    const token = randomUUID();
    const tokens = readJSON(DB.refreshTokens) || {};
    tokens[token] = { userId: user.id, createdAt: Date.now() };
    writeJSON(DB.refreshTokens, tokens);
    return token;
  }

  // ─── Seed admin user ─────────────────────────────────────────────────
  async function seedAdmin() {
    try {
      const users = readJSON(DB.users) || [];
      if (!users.find((u) => u.username === "admin")) {
        const hash = await bcrypt.hash("Regix@2024", 12);
        users.push({
          id: "admin-root-" + randomUUID().slice(0, 6),
          username: "admin",
          password: hash,
          role: "owner",
          created: new Date().toISOString(),
          lastLogin: null,
          avatar: "👑",
        });
        writeJSON(DB.users, users);
        console.log("✅ Default admin user seeded → 👤 admin / 🔑 Regix@2024");
      }
    } catch (err) {
      console.error("[REGIX] Failed to seed admin user:", err);
    }
  }

  // Seed admin user (fire-and-forget, errors are caught internally)
  seedAdmin().catch((err) => {
    console.error("[REGIX] seedAdmin error:", err);
  });

  // Log app initialization
  try {
    addLog("server_start", "🚀 Dashboard app initialized", "system");
  } catch {}

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Rate limiting (simple in-memory — resets on cold start in serverless)
  const rateLimitMap = new Map();
  function rateLimit(maxRequests = 60, windowMs = 60000) {
    return (req, res, next) => {
      try {
        const key = (
          req.headers["x-forwarded-for"] ||
          req.ip ||
          req.connection.remoteAddress ||
          "unknown"
        ).toString();
        const now = Date.now();
        const record = rateLimitMap.get(key) || {
          count: 0,
          resetAt: now + windowMs,
        };
        if (now > record.resetAt) {
          record.count = 0;
          record.resetAt = now + windowMs;
        }
        record.count++;
        rateLimitMap.set(key, record);
        if (record.count > maxRequests) {
          return res
            .status(429)
            .json({ error: "🚨 Too many requests. Slow down! ⏳" });
        }
        res.set("X-RateLimit-Remaining", String(maxRequests - record.count));
      } catch (err) {
        console.error("[REGIX] Rate limit error:", err);
      }
      next();
    };
  }

  // Security headers
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("X-XSS-Protection", "1; mode=block");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  // ─── Auth Middleware ─────────────────────────────────────────────────────
  function isAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readJSON(DB.users) || [];
        const user = users.find((u) => u.id === decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch {
        /* invalid token */
      }
    }
    res.status(401).json({ error: "🔐 Unauthorized — Please login first 👤" });
  }

  function isOwner(req, res, next) {
    if (req.user && req.user.role === "owner") return next();
    res.status(403).json({ error: "👑 Owner access required 🔐" });
  }

  function isAdminOrOwner(req, res, next) {
    if (req.user && (req.user.role === "owner" || req.user.role === "admin"))
      return next();
    res.status(403).json({ error: "🛡️ Admin or higher access required 🔐" });
  }

  // ─── AUTH ROUTES ─────────────────────────────────────────────────────────
  app.post("/api/login", rateLimit(10, 60000), async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "❌ Missing username or password 📝" });
      }

      const users = readJSON(DB.users) || [];
      const user = users.find((u) => u.username === username);
      if (!user) {
        return res.status(401).json({ error: "❌ Invalid credentials 🔐" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "❌ Invalid credentials 🔐" });
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      const idx = users.findIndex((u) => u.id === user.id);
      users[idx] = user;
      writeJSON(DB.users, users);

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      addLog("login", `👤 User logged in: ${username}`, username, req.ip);
      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      console.error("[REGIX] Login error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post("/api/refresh", (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return res.status(400).json({ error: "❌ Missing refresh token 🔄" });

      const tokens = readJSON(DB.refreshTokens) || {};
      const tokenData = tokens[refreshToken];
      if (!tokenData)
        return res.status(401).json({ error: "❌ Invalid refresh token 🔐" });

      if (Date.now() - tokenData.createdAt > 7 * 24 * 60 * 60 * 1000) {
        delete tokens[refreshToken];
        writeJSON(DB.refreshTokens, tokens);
        return res.status(401).json({ error: "❌ Refresh token expired ⏰" });
      }

      const users = readJSON(DB.users) || [];
      const user = users.find((u) => u.id === tokenData.userId);
      if (!user) return res.status(401).json({ error: "❌ User not found 🔍" });

      delete tokens[refreshToken];
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      console.error("[REGIX] Refresh error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post("/api/logout", isAuth, (req, res) => {
    try {
      addLog(
        "logout",
        `👋 User logged out: ${req.user.username}`,
        req.user.username,
        req.ip,
      );
      res.json({ success: true, message: "🚪 Logged out successfully 👋" });
    } catch (err) {
      console.error("[REGIX] Logout error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/me", isAuth, (req, res) => {
    try {
      const users = readJSON(DB.users) || [];
      const user = users.find((u) => u.id === req.user.id);
      res.json({
        user:
          user ?
            {
              id: user.id,
              username: user.username,
              role: user.role,
              avatar: user.avatar,
              created: user.created,
              lastLogin: user.lastLogin,
            }
          : null,
      });
    } catch (err) {
      console.error("[REGIX] /api/me error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.put("/api/me/password", isAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "❌ Missing password fields 📝" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "❌ New password must be at least 6 characters 🔤" });
      }

      const users = readJSON(DB.users) || [];
      const idx = users.findIndex((u) => u.id === req.user.id);
      if (idx === -1)
        return res.status(404).json({ error: "❌ User not found 🔍" });

      const match = await bcrypt.compare(currentPassword, users[idx].password);
      if (!match)
        return res
          .status(401)
          .json({ error: "❌ Current password is incorrect 🔐" });

      users[idx].password = await bcrypt.hash(newPassword, 12);
      writeJSON(DB.users, users);
      addLog(
        "password_change",
        `🔑 Password changed`,
        req.user.username,
        req.ip,
      );
      res.json({
        success: true,
        message: "✅ Password updated successfully 🔐",
      });
    } catch (err) {
      console.error("[REGIX] Password change error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  // ─── USER MANAGEMENT (owner only) ────────────────────────────────────────
  app.get("/api/users", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const users = readJSON(DB.users) || [];
      res.json(
        users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          avatar: u.avatar,
          created: u.created,
          lastLogin: u.lastLogin,
        })),
      );
    } catch (err) {
      console.error("[REGIX] GET /api/users error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/users/:id", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const users = readJSON(DB.users) || [];
      const user = users.find((u) => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: "❌ User not found 🔍" });
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        created: user.created,
        lastLogin: user.lastLogin,
      });
    } catch (err) {
      console.error("[REGIX] GET /api/users/:id error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post("/api/users", isAuth, isOwner, async (req, res) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "❌ Missing required fields 📝" });
      }
      if (username.length < 3) {
        return res
          .status(400)
          .json({ error: "❌ Username must be at least 3 characters 🔤" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "❌ Password must be at least 6 characters 🔤" });
      }

      const users = readJSON(DB.users) || [];
      if (users.find((u) => u.username === username)) {
        return res.status(409).json({ error: "❌ Username already exists 👥" });
      }

      const hash = await bcrypt.hash(password, 12);
      const newUser = {
        id: "usr-" + randomUUID().slice(0, 8),
        username,
        password: hash,
        role: role === "owner" ? "owner" : "admin",
        avatar: role === "owner" ? "👑" : "🛡️",
        created: new Date().toISOString(),
        lastLogin: null,
      };

      users.push(newUser);
      writeJSON(DB.users, users);
      addLog(
        "user_create",
        `👤 Created user: ${username} (${newUser.role}) ✨`,
        req.user.username,
        req.ip,
      );
      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          avatar: newUser.avatar,
          created: newUser.created,
        },
      });
    } catch (err) {
      console.error("[REGIX] POST /api/users error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.put("/api/users/:id", isAuth, isOwner, async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const users = readJSON(DB.users) || [];
      const idx = users.findIndex((u) => u.id === req.params.id);
      if (idx === -1)
        return res.status(404).json({ error: "❌ User not found 🔍" });
      if (
        users[idx].role === "owner" &&
        role !== "owner" &&
        users.filter((u) => u.role === "owner").length <= 1
      ) {
        return res
          .status(400)
          .json({ error: "❌ Cannot demote the last owner 👑" });
      }

      if (username) users[idx].username = username;
      if (password) users[idx].password = await bcrypt.hash(password, 12);
      if (role) users[idx].role = role;

      writeJSON(DB.users, users);
      addLog(
        "user_update",
        `👤 Updated user: ${users[idx].username}`,
        req.user.username,
        req.ip,
      );
      res.json({ success: true, message: "✅ User updated successfully ✨" });
    } catch (err) {
      console.error("[REGIX] PUT /api/users/:id error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.delete("/api/users/:id", isAuth, isOwner, (req, res) => {
    try {
      const users = readJSON(DB.users) || [];
      const idx = users.findIndex((u) => u.id === req.params.id);
      if (idx === -1)
        return res.status(404).json({ error: "❌ User not found 🔍" });

      if (
        users[idx].role === "owner" &&
        users.filter((u) => u.role === "owner").length <= 1
      ) {
        return res
          .status(400)
          .json({ error: "❌ Cannot delete the last owner 👑" });
      }

      const removed = users.splice(idx, 1)[0];
      writeJSON(DB.users, users);
      addLog(
        "user_delete",
        `🗑️ Deleted user: ${removed.username}`,
        req.user.username,
        req.ip,
      );
      res.json({ success: true, message: "✅ User deleted successfully 🗑️" });
    } catch (err) {
      console.error("[REGIX] DELETE /api/users/:id error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  // ─── BOT DATA ROUTES ─────────────────────────────────────────────────────
  app.get("/api/bot/data", isAuth, (req, res) => {
    try {
      reloadBotData();
      res.json(botData);
    } catch (err) {
      console.error("[REGIX] GET /api/bot/data error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/bot/config", isAuth, (req, res) => {
    try {
      reloadBotData();
      res.json(botData.config);
    } catch (err) {
      console.error("[REGIX] GET /api/bot/config error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.put("/api/bot/config", isAuth, isAdminOrOwner, (req, res) => {
    try {
      botData.config = { ...botData.config, ...req.body };
      saveBotData("config");
      addLog(
        "config_update",
        "⚙️ Bot configuration updated",
        req.user.username,
        req.ip,
      );
      res.json({ success: true, config: botData.config });
    } catch (err) {
      console.error("[REGIX] PUT /api/bot/config error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/bot/words", isAuth, (req, res) => {
    try {
      reloadBotData();
      res.json(botData.words);
    } catch (err) {
      console.error("[REGIX] GET /api/bot/words error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.put("/api/bot/words", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const { badWords, whiteListWords } = req.body;
      if (Array.isArray(badWords)) botData.words.badWords = badWords;
      if (Array.isArray(whiteListWords))
        botData.words.whiteListWords = whiteListWords;
      saveBotData("words");
      addLog(
        "words_update",
        `📝 Words list updated (bad: ${botData.words.badWords.length}, white: ${botData.words.whiteListWords.length})`,
        req.user.username,
        req.ip,
      );
      res.json({ success: true, words: botData.words });
    } catch (err) {
      console.error("[REGIX] PUT /api/bot/words error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post("/api/bot/words/bad", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const { word } = req.body;
      if (!word) return res.status(400).json({ error: "❌ Missing word 📝" });
      if (botData.words.badWords.includes(word)) {
        return res.status(409).json({ error: "❌ Word already exists 🚫" });
      }
      botData.words.badWords.push(word);
      saveBotData("words");
      addLog(
        "word_add",
        `🚫 Added bad word: "${word}"`,
        req.user.username,
        req.ip,
      );
      res.status(201).json({ success: true, word });
    } catch (err) {
      console.error("[REGIX] POST /api/bot/words/bad error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.delete("/api/bot/words/bad/:word", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const word = decodeURIComponent(req.params.word);
      const idx = botData.words.badWords.indexOf(word);
      if (idx === -1)
        return res.status(404).json({ error: "❌ Word not found 🔍" });
      botData.words.badWords.splice(idx, 1);
      saveBotData("words");
      addLog(
        "word_remove",
        `✨ Removed bad word: "${word}"`,
        req.user.username,
        req.ip,
      );
      res.json({ success: true, word });
    } catch (err) {
      console.error("[REGIX] DELETE /api/bot/words/bad/:word error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post("/api/bot/words/whitelist", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const { word } = req.body;
      if (!word) return res.status(400).json({ error: "❌ Missing word 📝" });
      if (botData.words.whiteListWords.includes(word)) {
        return res
          .status(409)
          .json({ error: "❌ Word already whitelisted ✅" });
      }
      botData.words.whiteListWords.push(word);
      saveBotData("words");
      addLog(
        "whitelist_add",
        `✅ Added whitelist word: "${word}"`,
        req.user.username,
        req.ip,
      );
      res.status(201).json({ success: true, word });
    } catch (err) {
      console.error("[REGIX] POST /api/bot/words/whitelist error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.delete(
    "/api/bot/words/whitelist/:word",
    isAuth,
    isAdminOrOwner,
    (req, res) => {
      try {
        const word = decodeURIComponent(req.params.word);
        const idx = botData.words.whiteListWords.indexOf(word);
        if (idx === -1)
          return res.status(404).json({ error: "❌ Word not found 🔍" });
        botData.words.whiteListWords.splice(idx, 1);
        saveBotData("words");
        addLog(
          "whitelist_remove",
          `⚪ Removed whitelist word: "${word}"`,
          req.user.username,
          req.ip,
        );
        res.json({ success: true, word });
      } catch (err) {
        console.error(
          "[REGIX] DELETE /api/bot/words/whitelist/:word error:",
          err,
        );
        res.status(500).json({ error: "🚨 Internal server error 💥" });
      }
    },
  );

  app.get("/api/bot/permissions", isAuth, (req, res) => {
    try {
      reloadBotData();
      res.json(botData.permissions);
    } catch (err) {
      console.error("[REGIX] GET /api/bot/permissions error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.put("/api/bot/permissions", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const { ignoredChannels, allowedUsers } = req.body;
      if (Array.isArray(ignoredChannels))
        botData.permissions.ignoredChannels = ignoredChannels;
      if (Array.isArray(allowedUsers))
        botData.permissions.allowedUsers = allowedUsers;
      saveBotData("permissions");
      addLog(
        "permissions_update",
        "🔐 Permissions updated",
        req.user.username,
        req.ip,
      );
      res.json({ success: true, permissions: botData.permissions });
    } catch (err) {
      console.error("[REGIX] PUT /api/bot/permissions error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post(
    "/api/bot/permissions/ignore-channel",
    isAuth,
    isAdminOrOwner,
    (req, res) => {
      try {
        const { channelId } = req.body;
        if (!channelId)
          return res.status(400).json({ error: "❌ Missing channelId 📝" });
        if (botData.permissions.ignoredChannels.includes(channelId)) {
          return res
            .status(409)
            .json({ error: "❌ Channel already ignored 🔇" });
        }
        botData.permissions.ignoredChannels.push(channelId);
        saveBotData("permissions");
        addLog(
          "ignore_add",
          `🔇 Added ignored channel: ${channelId}`,
          req.user.username,
          req.ip,
        );
        res.status(201).json({ success: true, channelId });
      } catch (err) {
        console.error(
          "[REGIX] POST /api/bot/permissions/ignore-channel error:",
          err,
        );
        res.status(500).json({ error: "🚨 Internal server error 💥" });
      }
    },
  );

  app.delete(
    "/api/bot/permissions/ignore-channel/:channelId",
    isAuth,
    isAdminOrOwner,
    (req, res) => {
      try {
        const channelId = req.params.channelId;
        botData.permissions.ignoredChannels =
          botData.permissions.ignoredChannels.filter((id) => id !== channelId);
        saveBotData("permissions");
        addLog(
          "ignore_remove",
          `🔊 Removed ignored channel: ${channelId}`,
          req.user.username,
          req.ip,
        );
        res.json({ success: true });
      } catch (err) {
        console.error(
          "[REGIX] DELETE /api/bot/permissions/ignore-channel/:channelId error:",
          err,
        );
        res.status(500).json({ error: "🚨 Internal server error 💥" });
      }
    },
  );

  app.get("/api/bot/violations", isAuth, (req, res) => {
    try {
      reloadBotData();
      res.json(botData.violations);
    } catch (err) {
      console.error("[REGIX] GET /api/bot/violations error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.delete("/api/bot/violations", isAuth, isAdminOrOwner, (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        const prev = botData.violations[userId] || 0;
        delete botData.violations[userId];
        saveBotData("violations");
        addLog(
          "violation_reset",
          `🔄 Reset violations for user ${userId} (was ${prev})`,
          req.user.username,
          req.ip,
        );
      } else {
        botData.violations = {};
        saveBotData("violations");
        addLog(
          "violation_reset_all",
          "🔄 Reset ALL violations",
          req.user.username,
          req.ip,
        );
      }
      res.json({ success: true, violations: botData.violations });
    } catch (err) {
      console.error("[REGIX] DELETE /api/bot/violations error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.post(
    "/api/bot/violations/:userId/reset",
    isAuth,
    isAdminOrOwner,
    (req, res) => {
      try {
        const { userId } = req.params;
        const prev = botData.violations[userId] || 0;
        delete botData.violations[userId];
        saveBotData("violations");
        addLog(
          "violation_reset",
          `🔄 Reset violations for ${userId} (was ${prev})`,
          req.user.username,
          req.ip,
        );
        res.json({ success: true, userId, previousStrikes: prev });
      } catch (err) {
        console.error(
          "[REGIX] POST /api/bot/violations/:userId/reset error:",
          err,
        );
        res.status(500).json({ error: "🚨 Internal server error 💥" });
      }
    },
  );

  // ─── BOT STATUS ──────────────────────────────────────────────────────────
  app.get("/api/bot/status", isAuth, (req, res) => {
    try {
      res.json({
        online: true,
        uptime: process.uptime(),
        version: "3.0.0",
        guilds: 1,
        commands: [
          {
            name: "help",
            icon: "❓",
            description: "Show all available bot commands 🤖",
          },
          {
            name: "strikes",
            icon: "🔨",
            description: "Check strike count for a user 🎯",
          },
          {
            name: "reset",
            icon: "🔄",
            description: "Reset strikes for a user ✨",
          },
          {
            name: "manage",
            icon: "⚙️",
            description: "Add/remove words & channels ⚙️",
          },
          {
            name: "settings",
            icon: "🔧",
            description: "View or update bot configuration ⚙️",
          },
        ],
        lastRestart: new Date(
          Date.now() - process.uptime() * 1000,
        ).toISOString(),
        memoryUsage: process.memoryUsage().heapUsed,
        nodeVersion: process.version,
      });
    } catch (err) {
      console.error("[REGIX] GET /api/bot/status error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  // ─── BOT COMMANDS (Web Control) ──────────────────────────────────────────
  app.post("/api/bot/commands/:command", isAuth, async (req, res) => {
    try {
      const { command } = req.params;
      const { action, userId, word, channelId } = req.body;

      switch (command) {
        case "help":
          addLog(
            "command_help",
            "❓ Help command viewed via web 🌐",
            req.user.username,
            req.ip,
          );
          return res.json({
            success: true,
            commands: [
              {
                name: "help",
                icon: "❓",
                desc: "Show available commands",
                access: "All roles",
              },
              {
                name: "strikes",
                icon: "🔨",
                desc: "Check strike count for a user",
                access: "Mod+",
              },
              {
                name: "reset",
                icon: "🔄",
                desc: "Reset strikes for a user",
                access: "Admin+",
              },
              {
                name: "manage",
                icon: "⚙️",
                desc: "Add/remove bad words or whitelist",
                access: "Admin+",
              },
              {
                name: "settings",
                icon: "🔧",
                desc: "View or update bot configuration",
                access: "Owner",
              },
            ],
          });

        case "strikes": {
          if (!userId)
            return res.status(400).json({ error: "❌ Missing userId 🔍" });
          const strikes = botData.violations[userId] || 0;
          const max = botData.config.maxStrikes || 3;
          addLog(
            "command_strikes",
            `🔨 Checked strikes for ${userId}: ${strikes}/${max}`,
            req.user.username,
            req.ip,
          );
          return res.json({ success: true, userId, strikes, maxStrikes: max });
        }

        case "reset": {
          if (!userId)
            return res.status(400).json({ error: "❌ Missing userId 🔍" });
          const prev = botData.violations[userId] || 0;
          delete botData.violations[userId];
          saveBotData("violations");
          addLog(
            "command_reset",
            `🔄 Reset strikes for ${userId} (was ${prev})`,
            req.user.username,
            req.ip,
          );
          return res.json({ success: true, userId, previousStrikes: prev });
        }

        case "manage": {
          if (!action)
            return res.status(400).json({ error: "❌ Missing action 📝" });

          if (action === "ignore_add" && channelId) {
            if (!botData.permissions.ignoredChannels.includes(channelId)) {
              botData.permissions.ignoredChannels.push(channelId);
              saveBotData("permissions");
              addLog(
                "command_ignore_add",
                `🔇 Ignored channel: ${channelId}`,
                req.user.username,
                req.ip,
              );
              return res.json({ success: true, channelId, action: "ignored" });
            }
            return res.json({
              success: true,
              message: "ℹ️ Channel already ignored",
            });
          }

          if (action === "ignore_remove" && channelId) {
            botData.permissions.ignoredChannels =
              botData.permissions.ignoredChannels.filter(
                (id) => id !== channelId,
              );
            saveBotData("permissions");
            addLog(
              "command_ignore_remove",
              `🔊 Unignored channel: ${channelId}`,
              req.user.username,
              req.ip,
            );
            return res.json({ success: true, channelId, action: "unignored" });
          }

          if (action === "blacklist_add" && word) {
            if (!botData.words.badWords.includes(word)) {
              botData.words.badWords.push(word);
              saveBotData("words");
              addLog(
                "command_blacklist_add",
                `🚫 Added word: "${word}"`,
                req.user.username,
                req.ip,
              );
              return res.json({ success: true, word, action: "blacklisted" });
            }
            return res.json({
              success: true,
              message: "ℹ️ Word already blacklisted",
            });
          }

          if (action === "blacklist_remove" && word) {
            const idx = botData.words.badWords.indexOf(word);
            if (idx > -1) botData.words.badWords.splice(idx, 1);
            saveBotData("words");
            addLog(
              "command_blacklist_remove",
              `✨ Removed word: "${word}"`,
              req.user.username,
              req.ip,
            );
            return res.json({ success: true, word, action: "unblacklisted" });
          }

          if (action === "whitelist_add" && word) {
            if (!botData.words.whiteListWords.includes(word)) {
              botData.words.whiteListWords.push(word);
              saveBotData("words");
              addLog(
                "command_whitelist_add",
                `✅ Whitelisted word: "${word}"`,
                req.user.username,
                req.ip,
              );
              return res.json({ success: true, word, action: "whitelisted" });
            }
            return res.json({
              success: true,
              message: "ℹ️ Word already whitelisted",
            });
          }

          if (action === "whitelist_remove" && word) {
            const idx = botData.words.whiteListWords.indexOf(word);
            if (idx > -1) botData.words.whiteListWords.splice(idx, 1);
            saveBotData("words");
            addLog(
              "command_whitelist_remove",
              `⚪ Removed whitelist: "${word}"`,
              req.user.username,
              req.ip,
            );
            return res.json({ success: true, word, action: "unwhitelisted" });
          }

          return res.status(400).json({ error: "❌ Invalid action 📝" });
        }

        default:
          return res.status(404).json({ error: "❌ Unknown command 🤷" });
      }
    } catch (err) {
      console.error("[REGIX] POST /api/bot/commands/:command error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  // ─── LOGS ROUTES ─────────────────────────────────────────────────────────
  app.get("/api/logs", isAuth, (req, res) => {
    try {
      const logs = readJSON(DB.logs) || [];
      const { limit, offset, action, user } = req.query;

      let filtered = [...logs];
      if (action) filtered = filtered.filter((l) => l.action.includes(action));
      if (user) filtered = filtered.filter((l) => l.user.includes(user));

      const total = filtered.length;
      const start = parseInt(offset) || 0;
      const end = start + (parseInt(limit) || 100);
      const page = filtered.slice(start, end);

      res.json({
        logs: page,
        total,
        limit: parseInt(limit) || 100,
        offset: start,
      });
    } catch (err) {
      console.error("[REGIX] GET /api/logs error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/logs/stats", isAuth, (req, res) => {
    try {
      const logs = readJSON(DB.logs) || [];
      const actions = {};
      logs.forEach((l) => {
        actions[l.action] = (actions[l.action] || 0) + 1;
      });
      const users = {};
      logs.forEach((l) => {
        if (l.user !== "system") users[l.user] = (users[l.user] || 0) + 1;
      });
      res.json({
        total: logs.length,
        actions,
        topUsers: Object.entries(users)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      });
    } catch (err) {
      console.error("[REGIX] GET /api/logs/stats error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.get("/api/logs/export", isAuth, (req, res) => {
    try {
      const logs = readJSON(DB.logs) || [];
      const format = req.query.format || "json";

      if (format === "csv") {
        const csv = ["id,user,action,details,timestamp,ip"];
        logs.forEach((l) =>
          csv.push(
            `"${l.id}","${l.user}","${l.action}","${l.details}","${l.timestamp}","${l.ip || ""}"`,
          ),
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=regix-logs.csv",
        );
        return res.send(csv.join("\n"));
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=regix-logs.json",
      );
      res.send(JSON.stringify(logs, null, 2));
    } catch (err) {
      console.error("[REGIX] GET /api/logs/export error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  app.delete("/api/logs", isAuth, isOwner, (req, res) => {
    try {
      writeJSON(DB.logs, []);
      addLog("logs_clear", "🗑️ All logs cleared", req.user.username, req.ip);
      res.json({ success: true, message: "✅ All logs cleared 🗑️" });
    } catch (err) {
      console.error("[REGIX] DELETE /api/logs error:", err);
      res.status(500).json({ error: "🚨 Internal server error 💥" });
    }
  });

  // ─── HEALTH CHECK ────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({
      status: "🔥 healthy",
      version: "3.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Serve static files ──────────────────────────────────────────────────
  app.use(express.static(DASH_DIR));
  app.use("/pages", express.static(join(DASH_DIR, "pages")));

  // ─── SPA fallback ────────────────────────────────────────────────────────
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(join(DASH_DIR, "index.html"));
  });

  // ─── 404 for API routes ──────────────────────────────────────────────────
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "❌ API endpoint not found 🔍" });
  });

  // ─── Global error handler ────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error("🚨 Server Error:", err);
    res.status(500).json({ error: "🚨 Internal server error 💥" });
  });

  return app;
}
