/**
 * REGIX Auth System — API Key Utility
 * =====================================
 * Provides API key generation, hashing (argon2), and verification.
 * Keys are prefixed with "rgx_" for easy identification.
 */

import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import prisma from "./prisma";

const KEY_PREFIX = "rgx_";
const KEY_BYTES = 32; // 256-bit keys
const KEY_PREFIX_LENGTH = 8; // First 8 chars of the full key for identification

export interface ApiKeyResult {
  success: boolean;
  key?: string; // Full API key (only returned on creation)
  keyPrefix?: string; // First 8 chars for identification
  error?: string;
}

/**
 * Generate a cryptographically secure API key
 * Returns the full key (to show once) and the prefix (for storage)
 */
export function generateApiKey(): { fullKey: string; prefix: string } {
  const random = randomBytes(KEY_BYTES).toString("hex");
  const fullKey = `${KEY_PREFIX}${random}`;
  const prefix = fullKey.slice(0, KEY_PREFIX_LENGTH);
  return { fullKey, prefix };
}

/**
 * Hash an API key using argon2id
 */
export async function hashApiKey(key: string): Promise<string> {
  return argon2.hash(key, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify an API key against its stored hash
 */
export async function verifyApiKey(
  key: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, key);
  } catch {
    return false;
  }
}

/**
 * Create a new API key in the database
 * Returns the full key only once
 */
export async function createApiKey(params: {
  name: string;
  ownerId: string;
  guildId?: string;
  description?: string;
  rateLimit?: number;
  rateLimitWindow?: number;
  ipWhitelist?: string;
  permissions?: string;
  expiresAt?: Date;
}): Promise<ApiKeyResult> {
  try {
    const { fullKey, prefix } = generateApiKey();
    const keyHash = await hashApiKey(fullKey);

    await prisma.apiKey.create({
      data: {
        keyPrefix: prefix,
        keyHash,
        name: params.name,
        description: params.description ?? null,
        ownerId: params.ownerId,
        guildId: params.guildId ?? null,
        rateLimit: params.rateLimit ?? 60,
        rateLimitWindow: params.rateLimitWindow ?? 60000,
        ipWhitelist: params.ipWhitelist ?? "",
        permissions: params.permissions ?? "read",
        expiresAt: params.expiresAt ?? null,
      },
    });

    return {
      success: true,
      key: fullKey,
      keyPrefix: prefix,
    };
  } catch (error) {
    console.error("[APIKey] Creation error:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

/**
 * Validate an API key: check existence, active status, expiry, and hash match
 */
export async function validateApiKey(
  key: string,
  ip?: string,
): Promise<{
  valid: boolean;
  apiKey?: {
    id: string;
    name: string;
    ownerId: string;
    guildId: string | null;
    permissions: string;
    rateLimit: number;
    rateLimitWindow: number;
  };
  error?: string;
}> {
  try {
    // Extract prefix from key
    const prefix = key.slice(0, KEY_PREFIX_LENGTH);

    // Find by prefix
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyPrefix: prefix, isActive: true },
    });

    if (!apiKey) {
      return { valid: false, error: "API key not found" };
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Verify hash
    const isValid = await verifyApiKey(key, apiKey.keyHash);
    if (!isValid) {
      return { valid: false, error: "Invalid API key" };
    }

    // Check IP whitelist if configured
    if (apiKey.ipWhitelist && ip) {
      const whitelistedIps = apiKey.ipWhitelist
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (whitelistedIps.length > 0 && !whitelistedIps.includes(ip)) {
        return { valid: false, error: "IP not whitelisted" };
      }
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        ownerId: apiKey.ownerId,
        guildId: apiKey.guildId,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        rateLimitWindow: apiKey.rateLimitWindow,
      },
    };
  } catch (error) {
    console.error("[APIKey] Validation error:", error);
    return { valid: false, error: "Failed to validate API key" };
  }
}

/**
 * Revoke an API key by setting it inactive
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    return true;
  } catch (error) {
    console.error("[APIKey] Revocation error:", error);
    return false;
  }
}

/**
 * List all API keys for a given owner
 */
export async function listApiKeys(ownerId: string) {
  try {
    return await prisma.apiKey.findMany({
      where: { ownerId },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        description: true,
        ownerId: true,
        guildId: true,
        rateLimit: true,
        rateLimitWindow: true,
        ipWhitelist: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[APIKey] List error:", error);
    return [];
  }
}
