/**
 * REGIX Auth System — API Key Utility (JSON Storage)
 * ===================================================
 * Provides API key generation, hashing (SHA-256), and verification.
 * Keys are prefixed with "rgx_" for easy identification.
 * Uses Bun's built-in crypto for hashing — no argon2 dependency needed.
 */

import { randomBytes } from "crypto";
import { loadApiKeys, saveApiKeys, type StoredApiKey } from "./jsonDb";

const KEY_PREFIX = "rgx_";
const KEY_BYTES = 32;
const KEY_PREFIX_LENGTH = 8;

export interface ApiKeyResult {
  success: boolean;
  key?: string;
  keyPrefix?: string;
  error?: string;
}

/**
 * Generate a cryptographically secure API key
 */
export function generateApiKey(): { fullKey: string; prefix: string } {
  const random = randomBytes(KEY_BYTES).toString("hex");
  const fullKey = `${KEY_PREFIX}${random}`;
  const prefix = fullKey.slice(0, KEY_PREFIX_LENGTH);
  return { fullKey, prefix };
}

/**
 * Hash an API key using SHA-256 via Bun's built-in crypto
 */
export async function hashApiKey(key: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify an API key against its stored hash
 */
export async function verifyApiKey(
  key: string,
  hash: string,
): Promise<boolean> {
  const computedHash = await hashApiKey(key);
  return computedHash === hash;
}

/**
 * Create a new API key
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
    const keys = await loadApiKeys();

    const newKey: StoredApiKey = {
      id: `key_${Date.now()}_${randomBytes(4).toString("hex")}`,
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
      isActive: true,
      lastUsedAt: null,
      expiresAt: params.expiresAt?.toISOString() ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    keys.push(newKey);
    await saveApiKeys(keys);

    return { success: true, key: fullKey, keyPrefix: prefix };
  } catch (error) {
    console.error("[APIKey] Creation error:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

/**
 * Validate an API key
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
    const prefix = key.slice(0, KEY_PREFIX_LENGTH);
    const keys = await loadApiKeys();
    const apiKey = keys.find((k) => k.keyPrefix === prefix && k.isActive);

    if (!apiKey) {
      return { valid: false, error: "API key not found" };
    }

    // Check expiry
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Verify hash
    const isValid = await verifyApiKey(key, apiKey.keyHash);
    if (!isValid) {
      return { valid: false, error: "Invalid API key" };
    }

    // Check IP whitelist
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
    apiKey.lastUsedAt = new Date().toISOString();
    apiKey.updatedAt = new Date().toISOString();
    await saveApiKeys(keys);

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
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  try {
    const keys = await loadApiKeys();
    const key = keys.find((k) => k.id === keyId);
    if (!key) return false;
    key.isActive = false;
    key.updatedAt = new Date().toISOString();
    await saveApiKeys(keys);
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
    const keys = await loadApiKeys();
    return keys
      .filter((k) => k.ownerId === ownerId)
      .map((k) => ({
        id: k.id,
        keyPrefix: k.keyPrefix,
        name: k.name,
        description: k.description,
        ownerId: k.ownerId,
        guildId: k.guildId,
        rateLimit: k.rateLimit,
        rateLimitWindow: k.rateLimitWindow,
        ipWhitelist: k.ipWhitelist,
        permissions: k.permissions,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
        expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
        createdAt: new Date(k.createdAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("[APIKey] List error:", error);
    return [];
  }
}
