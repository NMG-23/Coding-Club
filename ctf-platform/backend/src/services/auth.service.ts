import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

import { UnauthorizedError, ConflictError, BannedError } from "../utils/errors";
import { config } from "../config";

// ─── Password Hashing (Bun native) ──────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// ─── JWT Generation ──────────────────────────────────────────────────────────

function parseExpiry(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1));
  switch (unit) {
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900; // 15min default
  }
}

export async function generateTokens(userId: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  const accessExpirySeconds = parseExpiry(config.jwtAccessExpiry);
  const refreshExpirySeconds = parseExpiry(config.jwtRefreshExpiry);

  // Using Bun's native JWT signing
  const accessPayload = {
    sub: userId,
    role,
    type: "access",
    iat: now,
    exp: now + accessExpirySeconds,
  };

  const refreshPayload = {
    sub: userId,
    type: "refresh",
    iat: now,
    exp: now + refreshExpirySeconds,
  };

  const encoder = new TextEncoder();
  const keyData = encoder.encode(config.jwtSecret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const accessToken = await signJwt(accessPayload, key);
  const refreshToken = await signJwt(refreshPayload, key);

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string): Promise<Record<string, any>> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(config.jwtSecret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const parts = token.split(".");
  if (parts.length !== 3) throw new UnauthorizedError("Invalid token format");

  const headerB64 = parts[0]!;
  const payloadB64 = parts[1]!;
  const signatureB64 = parts[2]!;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify("HMAC", key, signature as any, data);
  if (!valid) throw new UnauthorizedError("Invalid token signature");

  const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError("Token expired");
  }

  return payload;
}

// ─── JWT Helpers ─────────────────────────────────────────────────────────────

async function signJwt(payload: Record<string, any>, key: CryptoKey): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureB64 = base64UrlEncodeBuffer(signature);
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Token Blacklist (for logout) ────────────────────────────────────────────

const tokenBlacklist = new Map<string, number>();

export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
  tokenBlacklist.set(token, Date.now() + expiresIn * 1000);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const expiry = tokenBlacklist.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokenBlacklist.delete(token); // cleanup
    return false;
  }
  return true;
}

// ─── User Registration ──────────────────────────────────────────────────────

export async function registerUser(
  username: string,
  email: string,
  password: string
) {
  // Check for existing username/email
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username));

  if (existingUser) {
    throw new ConflictError("Username already taken");
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existingEmail) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email: email.toLowerCase(),
      passwordHash,
    })
    .returning({ id: users.id, username: users.username, role: users.role });

  return newUser;
}

// ─── User Login ──────────────────────────────────────────────────────────────

export async function loginUser(username: string, password: string) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      isBanned: users.isBanned,
      teamId: users.teamId,
    })
    .from(users)
    .where(eq(users.username, username));

  if (!user) {
    throw new UnauthorizedError("Invalid username or password");
  }

  if (user.isBanned) {
    throw new BannedError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError("Invalid username or password");
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
  };
}
