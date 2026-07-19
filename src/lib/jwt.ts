/**
 * REGIX Auth System — JWT Utility (JSON Storage)
 * ================================================
 * Provides JWT generation and verification using guild-specific configs
 * stored in JSON files.
 */

import jwt from "jsonwebtoken";
import { loadJwtConfigs } from "./jsonDb";

export interface JwtPayload {
  sub: string;
  guildId: string;
  permissions: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface JwtResult {
  success: boolean;
  token?: string;
  payload?: JwtPayload;
  error?: string;
}

/**
 * Generate a JWT for a given guild and user
 */
export async function generateToken(
  guildId: string,
  userId: string,
  permissions: string = "read",
): Promise<JwtResult> {
  try {
    const configs = await loadJwtConfigs();
    const config = configs.find((c) => c.guildId === guildId);

    if (!config || !config.isActive) {
      return {
        success: false,
        error: "JWT configuration not found or inactive",
      };
    }

    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      sub: userId,
      guildId,
      permissions,
    };

    const signOptions: jwt.SignOptions = {
      expiresIn: config.expiresIn as any,
      issuer: config.issuer,
    };

    if (config.audience) {
      signOptions.audience = config.audience;
    }

    const token = jwt.sign(payload, config.secret, signOptions);

    return { success: true, token };
  } catch (error) {
    console.error("[JWT] Generation error:", error);
    return { success: false, error: "Failed to generate token" };
  }
}

/**
 * Verify a JWT and return the decoded payload
 */
export async function verifyToken(
  token: string,
  guildId: string,
): Promise<JwtResult> {
  try {
    const configs = await loadJwtConfigs();
    const config = configs.find((c) => c.guildId === guildId);

    if (!config || !config.isActive) {
      return {
        success: false,
        error: "JWT configuration not found or inactive",
      };
    }

    const decoded = jwt.verify(token, config.secret, {
      issuer: config.issuer,
      audience: config.audience ?? undefined,
    }) as JwtPayload;

    return { success: true, payload: decoded };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: "Token has expired" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: "Invalid token" };
    }
    console.error("[JWT] Verification error:", error);
    return { success: false, error: "Failed to verify token" };
  }
}

/**
 * Decode a JWT without verification
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    return decoded;
  } catch {
    return null;
  }
}
