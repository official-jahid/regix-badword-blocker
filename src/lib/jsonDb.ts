/**
 * REGIX Auth System — JSON File Database
 * =======================================
 * Simple JSON file-based storage for auth data.
 * Replaces Prisma/Neon PostgreSQL dependency.
 */

const DATA_DIR = `${process.cwd()}/data`;

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const path = `${DATA_DIR}/${filename}`;
  try {
    const file = Bun.file(path);
    const raw = await file.text();
    return JSON.parse(raw) as T;
  } catch {
    await writeJson(filename, fallback);
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const path = `${DATA_DIR}/${filename}`;
  await Bun.write(path, JSON.stringify(data, null, 2));
}

// ─── API Keys ──────────────────────────────────────────────────────────────

export interface StoredApiKey {
  id: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  description: string | null;
  ownerId: string;
  guildId: string | null;
  rateLimit: number;
  rateLimitWindow: number;
  ipWhitelist: string;
  permissions: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function loadApiKeys(): Promise<StoredApiKey[]> {
  return readJson<StoredApiKey[]>("auth-keys.json", []);
}

export async function saveApiKeys(keys: StoredApiKey[]): Promise<void> {
  await writeJson("auth-keys.json", keys);
}

// ─── JWT Configs ──────────────────────────────────────────────────────────

export interface StoredJwtConfig {
  id: string;
  guildId: string;
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string | null;
  rateLimit: number;
  rateLimitWindow: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function loadJwtConfigs(): Promise<StoredJwtConfig[]> {
  return readJson<StoredJwtConfig[]>("jwt-configs.json", []);
}

export async function saveJwtConfigs(
  configs: StoredJwtConfig[],
): Promise<void> {
  await writeJson("jwt-configs.json", configs);
}

// ─── Rate Limit Logs ──────────────────────────────────────────────────────

export interface StoredRateLimitLog {
  id: string;
  keyId: string | null;
  ip: string;
  endpoint: string;
  timestamp: string;
}

export async function loadRateLimitLogs(): Promise<StoredRateLimitLog[]> {
  return readJson<StoredRateLimitLog[]>("rate-limit-logs.json", []);
}

export async function saveRateLimitLogs(
  logs: StoredRateLimitLog[],
): Promise<void> {
  await writeJson("rate-limit-logs.json", logs);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────

export interface StoredAuditLog {
  id: string;
  action: string;
  actorId: string;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  timestamp: string;
}

export async function loadAuditLogs(): Promise<StoredAuditLog[]> {
  return readJson<StoredAuditLog[]>("audit-logs.json", []);
}

export async function saveAuditLogs(logs: StoredAuditLog[]): Promise<void> {
  await writeJson("audit-logs.json", logs);
}

// ─── Init ─────────────────────────────────────────────────────────────────

export async function initJsonDb(): Promise<void> {
  // Ensure data directory exists
  await Promise.all([
    loadApiKeys(),
    loadJwtConfigs(),
    loadRateLimitLogs(),
    loadAuditLogs(),
  ]);
  console.log("[JsonDB] Auth data store ready");
}
