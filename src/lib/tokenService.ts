/**
 * REGIX Auth System — Token Management Service
 * ==============================================
 * High-level service for managing API keys and JWT configs.
 * Provides CRUD operations, rate limiting, and IP whitelist management.
 */

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  validateApiKey,
} from "./apiKey";
import { generateToken, verifyToken } from "./jwt";
import prisma from "./prisma";

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
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;
    if (data.rateLimitWindow !== undefined)
      updateData.rateLimitWindow = data.rateLimitWindow;
    if (data.ipWhitelist !== undefined)
      updateData.ipWhitelist = data.ipWhitelist;
    if (data.permissions !== undefined)
      updateData.permissions = data.permissions;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: updateData,
    });

    return { success: true, apiKey: updated };
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
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!apiKey) return { success: false, error: "API key not found" };

    const currentIps = apiKey.ipWhitelist
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (currentIps.includes(ip)) {
      return { success: false, error: "IP already whitelisted" };
    }

    currentIps.push(ip);
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { ipWhitelist: currentIps.join(",") },
    });

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
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!apiKey) return { success: false, error: "API key not found" };

    const currentIps = apiKey.ipWhitelist
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const filtered = currentIps.filter((existingIp) => existingIp !== ip);

    if (filtered.length === currentIps.length) {
      return { success: false, error: "IP not found in whitelist" };
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { ipWhitelist: filtered.join(",") },
    });

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
    const config = await prisma.jwtConfig.upsert({
      where: { guildId },
      update: {
        secret: data.secret,
        ...(data.expiresIn !== undefined && { expiresIn: data.expiresIn }),
        ...(data.issuer !== undefined && { issuer: data.issuer }),
        ...(data.audience !== undefined && { audience: data.audience }),
        ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
        ...(data.rateLimitWindow !== undefined && {
          rateLimitWindow: data.rateLimitWindow,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      create: {
        guildId,
        secret: data.secret,
        expiresIn: data.expiresIn ?? "24h",
        issuer: data.issuer ?? "regix-auth",
        audience: data.audience ?? null,
        rateLimit: data.rateLimit ?? 100,
        rateLimitWindow: data.rateLimitWindow ?? 60000,
        isActive: data.isActive ?? true,
      },
    });

    return { success: true, config };
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
    const config = await prisma.jwtConfig.findUnique({
      where: { guildId },
    });
    return config;
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
    await prisma.rateLimitLog.create({
      data: {
        keyId: params.keyId ?? null,
        ip: params.ip,
        endpoint: params.endpoint,
      },
    });
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
    const since = new Date(Date.now() - windowMs);

    const count = await prisma.rateLimitLog.count({
      where: {
        keyId: params.keyId,
        timestamp: { gte: since },
      },
    });

    const remaining = Math.max(0, maxRequests - count);

    if (remaining === 0) {
      await logRateLimit(params);
    }

    return { allowed: remaining > 0, remaining };
  } catch (error) {
    console.error("[TokenService] Rate limit check error:", error);
    return { allowed: true, remaining: maxRequests }; // Fail open
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
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        targetId: params.targetId ?? null,
        details: params.details ?? null,
        ip: params.ip ?? null,
      },
    });
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
    const where: Record<string, unknown> = {};
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error) {
    console.error("[TokenService] Get audit logs error:", error);
    return { logs: [], total: 0 };
  }
}
