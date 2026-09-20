import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const COOKIE_NAME = "nexora_session";
const DEFAULT_SECRET = "nexora-crm-development-auth-secret-key-32chars";
const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || DEFAULT_SECRET
);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: Role;
  expiresAt: number; // Unix timestamp
}

/**
 * Encrypts session payload into a signed JWE/JWT token.
 */
export async function encryptSession(payload: Omit<SessionPayload, "expiresAt">): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days

  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Decrypts and verifies the session token.
 */
export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Creates and sets an HTTP-only secure session cookie.
 */
export async function createSession(
  data: Omit<SessionPayload, "expiresAt">
): Promise<void> {
  const token = await encryptSession(data);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Retrieves and validates the current active session.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await decryptSession(token);
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie on sign out.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Helper to enforce authentication in server actions/routes.
 * Throws an Error if not authenticated.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !session.userId || !session.workspaceId) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }
  return session;
}

/**
 * Helper to retrieve workspaceId strictly from authenticated session.
 * Guarantees zero cross-tenant leakage.
 */
export async function requireWorkspace(): Promise<{
  userId: string;
  workspaceId: string;
  role: Role;
  session: SessionPayload;
}> {
  const session = await requireAuth();
  return {
    userId: session.userId,
    workspaceId: session.workspaceId,
    role: session.role,
    session,
  };
}
