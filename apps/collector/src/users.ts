import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export type UserRole = "admin" | "viewer";

export interface UserRecord {
  id: string;
  username: string;
  /** Format: scrypt$<saltHex>$<hashHex> */
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/i;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * A throwaway hash computed once per process. Verify against it when a username
 * is not found so a failed login costs the same time whether or not the user
 * exists (defends against username enumeration by timing).
 */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(24).toString("hex"));

/** True when removing this user would leave the instance with no admins. */
export function isLastAdmin(users: UserRecord[], id: string): boolean {
  const target = users.find((u) => u.id === id);
  if (!target || target.role !== "admin") return false;
  return users.filter((u) => u.role === "admin").length <= 1;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function publicUser(user: UserRecord): PublicUser {
  return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
}

export function createUser(input: unknown, existing: UserRecord[]): UserRecord {
  if (typeof input !== "object" || input === null) throw new Error("user must be an object");
  const record = input as Record<string, unknown>;
  const username = typeof record.username === "string" ? record.username.trim().toLowerCase() : "";
  const password = typeof record.password === "string" ? record.password : "";
  const role: UserRole = record.role === "viewer" ? "viewer" : "admin";

  if (!USERNAME_RE.test(username)) {
    throw new Error("username must be 3-32 chars (letters, numbers, . _ -)");
  }
  if (password.length < 8 || password.length > 256) {
    throw new Error("password must be at least 8 characters");
  }
  if (existing.some((u) => u.username === username)) {
    throw new Error("username already exists");
  }

  return {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
}
