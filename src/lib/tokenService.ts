/**
 * REGIX Auth System — Token Management Service (JSON Storage)
 * ============================================================
 * High-level service for managing API keys and JWT configs.
 * Provides CRUD operations, rate limiting, and IP whitelist management.
 */

import { randomBytes } from "crypto";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  validateApiKey,
} from "./apiKey";
import {
  loadApiKeys,
  loadAuditLogs,
  loadJwtConfigs,
  loadRateLimitLogs,
  saveApiKeys,
  saveAuditLogs,
  saveJwtConfigs,
  saveRateLimitLogs,
  type StoredAuditLog,
  type StoredJwtConfig,
  type StoredRateLimitLog,
} from "./jsonDb";
import { generateToken, verifyToken } from "./jwt";

// ─── API Key Management ──────────────────────────────────────────────────

export { createApiKey, listApiKeys, revokeApiKey, validateApiKey };

/**
 * Update an API key's configuration
 */
export async function updateApiKey(
  keyId: string,
  data: {
    name?: string;
    description?: string;
    rateLimit?: number;
    rateLimitWindow?: number;
    ipWhitelist?: string;
    permissions?: string;
    isActive?: boolean;
    expiresAt?: Date | null;
  },
) {
  try {
    const keys = await loadApiKeys();
    const key = keys.find((k) => k.id === keyId);
    if (!key) return { success: false, error: "API key not found" };

    if (data.name !== undefined) key.name = data.name;
    if (data.description !== undefined) key.description = data.description;
    if (data.rateLimit !== undefined) key.rateLimit = data.rateLimit;
    if (data.rateLimitWindow !== undefined)
      key.rateLimitWindow = data.rateLimitWindow;
    if (data.ipWhitelist !== undefined) key.ipWhitelist = data.ipWhitelist;
    if (data.permissions !== undefined) key.permissions = data.permissions;
    if (data.isActive !== undefined) key.isActive = data.isActive;
    if (data.expiresAt !== undefined)
      key.expiresAt = data.expiresAt?.toISOString() ?? null;

    key.updatedAt = new Date().toISOString();
    await saveApiKeys(keys);

    return { success: true, apiKey: key };
  } catch (error) {
    console.error("[TokenService] Update API key error:", error);
    return { success: false, error: "Failed to update API key" };
  }
}

/**
 * Add an IP to the API key's whitelist
 */
export async function addIpToWhitelist(
  keyId: string,
  ip: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const keys = await loadApiKeys();
    const apiKey = keys.find((k) => k.id === keyId);
    if (!apiKey) return { success: false, error: "API key not found" };

    const currentIps = apiKey.ipWhitelist
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (currentIps.includes(ip)) {
      return { success: false, error: "IP already whitelisted" };
    }

    currentIps.push(ip);
    apiKey.ipWhitelist = currentIps.join(",");
    apiKey.updatedAt = new Date().toISOString();
    await saveApiKeys(keys);

    return { success: true };
  } catch (error) {
    console.error("[TokenService] Add IP error:", error);
    return { success: false, error: "Failed to add IP to whitelist" };
  }
}

/**
 * Remove an IP from the API key's whitelist
 */
export async function removeIpFromWhitelist(
  keyId: string,
  ip: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const keys = await loadApiKeys();
    const apiKey = keys.find((k) => k.id === keyId);
    if (!apiKey) return { success: false, error: "API key not found" };

    const currentIps = apiKey.ipWhitelist
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const filtered = currentIps.filter((existingIp) => existingIp !== ip);

    if (filtered.length === currentIps.length) {
      return { success: false, error: "IP not found in whitelist" };
    }

    apiKey.ipWhitelist = filtered.join(",");
    apiKey.updatedAt = new Date().toISOString();
    await saveApiKeys(keys);

    return { success: true };
  } catch (error) {
    console.error("[TokenService] Remove IP error:", error);
    return { success: false, error: "Failed to remove IP from whitelist" };
  }
}

// ─── JWT Config Management ───────────────────────────────────────────────

export { generateToken, verifyToken };

/**
 * Create or update JWT configuration for a guild
 */
export async function upsertJwtConfig(
  guildId: string,
  data: {
    secret: string;
    expiresIn?: string;
    issuer?: string;
    audience?: string;
    rateLimit?: number;
    rateLimitWindow?: number;
    isActive?: boolean;
  },
) {
  try {
    const configs = await loadJwtConfigs();
    const existingIndex = configs.findIndex((c) => c.guildId === guildId);

    if (existingIndex >= 0) {
      const config = configs[existingIndex];
      config.secret = data.secret;
      if (data.expiresIn !== undefined) config.expiresIn = data.expiresIn;
      if (data.issuer !== undefined) config.issuer = data.issuer;
      if (data.audience !== undefined) config.audience = data.audience;
      if (data.rateLimit !== undefined) config.rateLimit = data.rateLimit;
      if (data.rateLimitWindow !== undefined)
        config.rateLimitWindow = data.rateLimitWindow;
      if (data.isActive !== undefined) config.isActive = data.isActive;
      config.updatedAt = new Date().toISOString();
      configs[existingIndex] = config;
    } else {
      const newConfig: StoredJwtConfig = {
        id: `jwt_${Date.now()}_${randomBytes(4).toString("hex")}`,
        guildId,
        secret: data.secret,
        expiresIn: data.expiresIn ?? "24h",
        issuer: data.issuer ?? "regix-auth",
        audience: data.audience ?? null,
        rateLimit: data.rateLimit ?? 100,
        rateLimitWindow: data.rateLimitWindow ?? 60000,
        isActive: data.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      configs.push(newConfig);
    }

    await saveJwtConfigs(configs);
    return {
      success: true,
      config: configs[existingIndex >= 0 ? existingIndex : configs.length - 1],
    };
  } catch (error) {
    console.error("[TokenService] Upsert JWT config error:", error);
    return { success: false, error: "Failed to configure JWT" };
  }
}

/**
 * Get JWT configuration for a guild
 */
export async function getJwtConfig(guildId: string) {
  try {
    const configs = await loadJwtConfigs();
    const config = configs.find((c) => c.guildId === guildId);
    if (!config) return null;
    return {
      ...config,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt),
    };
  } catch (error) {
    console.error("[TokenService] Get JWT config error:", error);
    return null;
  }
}

// ─── Rate Limit Logging ─────────────────────────────────────────────────

/**
 * Log a rate limit hit
 */
export async function logRateLimit(params: {
  keyId?: string;
  ip: string;
  endpoint: string;
}) {
  try {
    const logs = await loadRateLimitLogs();
    const log: StoredRateLimitLog = {
      id: `rl_${Date.now()}_${randomBytes(4).toString("hex")}`,
      keyId: params.keyId ?? null,
      ip: params.ip,
      endpoint: params.endpoint,
      timestamp: new Date().toISOString(),
    };
    logs.push(log);
    // Keep only last 1000 logs to prevent file bloat
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    await saveRateLimitLogs(logs);
  } catch (error) {
    console.error("[TokenService] Rate limit log error:", error);
  }
}

/**
 * Check if a key has exceeded its rate limit
 */
export async function checkRateLimit(
  params: {
    keyId: string;
    ip: string;
    endpoint: string;
  },
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const logs = await loadRateLimitLogs();
    const since = Date.now() - windowMs;
    const count = logs.filter(
      (l) =>
        l.keyId === params.keyId && new Date(l.timestamp).getTime() > since,
    ).length;

    const remaining = Math.max(0, maxRequests - count);

    if (remaining === 0) {
      await logRateLimit(params);
    }

    return { allowed: remaining > 0, remaining };
  } catch (error) {
    console.error("[TokenService] Rate limit check error:", error);
    return { allowed: true, remaining: maxRequests };
  }
}

// ─── Audit Logging ──────────────────────────────────────────────────────

/**
 * Log an audit event
 */
export async function logAudit(params: {
  action: string;
  actorId: string;
  targetId?: string;
  details?: string;
  ip?: string;
}) {
  try {
    const logs = await loadAuditLogs();
    const log: StoredAuditLog = {
      id: `audit_${Date.now()}_${randomBytes(4).toString("hex")}`,
      action: params.action,
      actorId: params.actorId,
      targetId: params.targetId ?? null,
      details: params.details ?? null,
      ip: params.ip ?? null,
      timestamp: new Date().toISOString(),
    };
    logs.push(log);
    // Keep only last 500 audit logs
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    await saveAuditLogs(logs);
  } catch (error) {
    console.error("[TokenService] Audit log error:", error);
  }
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(params: {
  actorId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let logs = await loadAuditLogs();

    if (params.actorId) {
      logs = logs.filter((l) => l.actorId === params.actorId);
    }
    if (params.action) {
      logs = logs.filter((l) => l.action === params.action);
    }

    // Sort by timestamp descending
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const total = logs.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const paginated = logs.slice(offset, offset + limit);

    return { logs: paginated, total };
  } catch (error) {
    console.error("[TokenService] Get audit logs error:", error);
    return { logs: [], total: 0 };
  }
}
