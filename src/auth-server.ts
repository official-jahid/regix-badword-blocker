/**
 * REGIX Auth System — Central Auth Validation Server
 * ====================================================
 * Standalone Express server for validating Bearer tokens.
 * Supports both JWT and API Key authentication.
 * Implements rate limiting per key and IP.
 */

import type { NextFunction, Request, Response } from "express";
import express from "express";
import { validateApiKey } from "./lib/apiKey";
import { initJsonDb, loadApiKeys } from "./lib/jsonDb";
import { verifyToken } from "./lib/jwt";
import { checkRateLimit, logAudit } from "./lib/tokenService";

const app = express();
const PORT = parseInt(process.env.AUTH_SERVER_PORT ?? "4000", 10);

// ─── Middleware ───────────────────────────────────────────────────────────

app.use(express.json());

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[AuthServer] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// ─── Health Check ────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "regix-auth-server",
    version: "4.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Documentation ───────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "REGIX Auth Validation Server",
    version: "4.0.0",
    endpoints: {
      "GET /health": "Health check",
      "GET /": "This documentation",
      "POST /validate": "Validate a Bearer token (JWT or API key)",
      "GET /keys/:prefix": "Get API key info by prefix (requires admin key)",
    },
    authentication: {
      description:
        "Send a Bearer token in the Authorization header to /validate",
      examples: {
        jwt: {
          header: "Authorization: Bearer <jwt_token>",
          body: { guildId: "your_discord_guild_id" },
        },
        apiKey: {
          header: "Authorization: Bearer <api_key>",
          body: { guildId: "optional_guild_id" },
        },
      },
    },
  });
});

// ─── Token Validation Endpoint ───────────────────────────────────────────

interface ValidateRequest {
  guildId?: string;
  endpoint?: string;
}

app.post("/validate", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const { guildId, endpoint } = req.body as ValidateRequest;
    const clientIp =
      (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        valid: false,
        error:
          "Missing or invalid Authorization header. Use: Authorization: Bearer <token>",
      });
      return;
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      res.status(401).json({
        valid: false,
        error: "Token is empty",
      });
      return;
    }

    // Try JWT validation first (requires guildId)
    if (guildId) {
      const jwtResult = await verifyToken(token, guildId);

      if (jwtResult.success && jwtResult.payload) {
        // Log successful validation
        await logAudit({
          action: "jwt.validated",
          actorId: jwtResult.payload.sub,
          targetId: guildId,
          details: JSON.stringify({
            permissions: jwtResult.payload.permissions,
            endpoint: endpoint || "/validate",
          }),
          ip: clientIp,
        });

        res.json({
          valid: true,
          type: "jwt",
          payload: {
            userId: jwtResult.payload.sub,
            guildId: jwtResult.payload.guildId,
            permissions: jwtResult.payload.permissions,
            issuedAt:
              jwtResult.payload.iat ?
                new Date(jwtResult.payload.iat * 1000).toISOString()
              : undefined,
            expiresAt:
              jwtResult.payload.exp ?
                new Date(jwtResult.payload.exp * 1000).toISOString()
              : undefined,
          },
        });
        return;
      }

      // If guildId was provided but JWT failed, return JWT error
      res.status(401).json({
        valid: false,
        type: "jwt",
        error: jwtResult.error || "JWT validation failed",
      });
      return;
    }

    // Try API Key validation (no guildId needed)
    const apiKeyResult = await validateApiKey(token, clientIp);

    if (apiKeyResult.valid && apiKeyResult.apiKey) {
      // Check rate limit
      const rateLimitResult = await checkRateLimit(
        {
          keyId: apiKeyResult.apiKey.id,
          ip: clientIp,
          endpoint: endpoint || "/validate",
        },
        apiKeyResult.apiKey.rateLimit,
        apiKeyResult.apiKey.rateLimitWindow,
      );

      if (!rateLimitResult.allowed) {
        await logAudit({
          action: "api_key.rate_limited",
          actorId: apiKeyResult.apiKey.ownerId,
          targetId: apiKeyResult.apiKey.id,
          details: JSON.stringify({ endpoint: endpoint || "/validate" }),
          ip: clientIp,
        });

        res.status(429).json({
          valid: false,
          type: "api_key",
          error: "Rate limit exceeded. Try again later.",
          retryAfter: Math.ceil(apiKeyResult.apiKey.rateLimitWindow / 1000),
        });
        return;
      }

      // Log successful validation
      await logAudit({
        action: "api_key.validated",
        actorId: apiKeyResult.apiKey.ownerId,
        targetId: apiKeyResult.apiKey.id,
        details: JSON.stringify({
          name: apiKeyResult.apiKey.name,
          permissions: apiKeyResult.apiKey.permissions,
          endpoint: endpoint || "/validate",
        }),
        ip: clientIp,
      });

      res.json({
        valid: true,
        type: "api_key",
        payload: {
          keyId: apiKeyResult.apiKey.id,
          name: apiKeyResult.apiKey.name,
          ownerId: apiKeyResult.apiKey.ownerId,
          guildId: apiKeyResult.apiKey.guildId,
          permissions: apiKeyResult.apiKey.permissions,
        },
        rateLimit: {
          remaining: rateLimitResult.remaining,
          limit: apiKeyResult.apiKey.rateLimit,
          windowMs: apiKeyResult.apiKey.rateLimitWindow,
        },
      });
      return;
    }

    // Both validation methods failed
    res.status(401).json({
      valid: false,
      error: apiKeyResult.error || "Invalid token",
    });
  } catch (error) {
    console.error("[AuthServer] Validation error:", error);
    res.status(500).json({
      valid: false,
      error: "Internal server error",
    });
  }
});

// ─── Admin: Get API Key Info by Prefix ───────────────────────────────────

app.get("/keys/:prefix", async (req: Request, res: Response) => {
  try {
    const prefix = req.params.prefix as string;
    const authHeader = req.headers.authorization;

    // Require admin-level authentication to access key info
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const adminToken = authHeader.slice(7).trim();
    const adminValidation = await validateApiKey(adminToken);

    if (
      !adminValidation.valid ||
      adminValidation.apiKey?.permissions !== "admin"
    ) {
      res.status(403).json({ error: "Admin-level API key required" });
      return;
    }

    const keys = await loadApiKeys();
    const apiKey = keys.find((k) => k.keyPrefix === prefix);

    if (!apiKey) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    // Remove sensitive fields
    const { keyHash, ...safeKey } = apiKey;

    await logAudit({
      action: "api_key.info_viewed",
      actorId: adminValidation.apiKey.ownerId,
      targetId: apiKey.id,
      ip: (req.headers["x-forwarded-for"] as string) || req.ip || "unknown",
    });

    res.json({ key: safeKey });
  } catch (error) {
    console.error("[AuthServer] Get key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Global Rate Limit Middleware (per IP) ───────────────────────────────

const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for health check
  if (req.path === "/health") {
    next();
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requests per minute per IP

  let record = ipRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    ipRateLimitMap.set(ip, record);
  }

  record.count++;

  if (record.count > maxRequests) {
    res.status(429).json({
      error: "Too many requests. Rate limit exceeded.",
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
    return;
  }

  next();
});

// ─── Start Server ────────────────────────────────────────────────────────

async function startServer() {
  try {
    // Initialize JSON database
    await initJsonDb();
    console.log("[AuthServer] Auth data store ready");

    app.listen(PORT, () => {
      console.log(`🔐 REGIX Auth Validation Server running on port ${PORT}`);
      console.log(`   Endpoints:`);
      console.log(`   • Health:  http://localhost:${PORT}/health`);
      console.log(`   • Docs:    http://localhost:${PORT}/`);
      console.log(`   • Validate: POST http://localhost:${PORT}/validate`);
      console.log(`   • Key Info: GET  http://localhost:${PORT}/keys/:prefix`);
    });
  } catch (error) {
    console.error("[AuthServer] Failed to start:", error);
    process.exit(1);
  }
}

startServer();

export default app;
