import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { User } from "../models";
import { env } from "../config/env";
import { badRequest, conflict, unauthorized } from "../lib/errors";

const SALT_ROUNDS = 12;

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export async function signup(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await User.findOne({ where: { email: normalized } });
  if (existing) {
    throw conflict("Email already registered");
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email: normalized, passwordHash });
  return user;
}

export async function login(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalized } });
  if (!user) throw unauthorized("Invalid credentials");
  if (!user.passwordHash) {
    // User signed up via Google and has never set a password.
    throw unauthorized(
      "This account was created with Google. Please sign in with Google."
    );
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials");
  return user;
}

let _googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  if (!env.googleClientId) {
    throw badRequest(
      "Google sign-in is not configured (GOOGLE_CLIENT_ID is empty)"
    );
  }
  if (!_googleClient) _googleClient = new OAuth2Client(env.googleClientId);
  return _googleClient;
}

export type GoogleVerifyFn = (idToken: string) => Promise<TokenPayload>;

const defaultVerifyGoogleToken: GoogleVerifyFn = async (idToken) => {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload) throw unauthorized("Invalid Google token");
  return payload;
};

/**
 * Sign in or sign up with a Google ID token.
 *
 * Behavior:
 *   - If a user with this google_sub exists → log them in.
 *   - Else if a user with this email exists → link the Google account to it
 *     (so a password user can later sign in via Google with the same email).
 *   - Else → create a new user with no password.
 */
export async function loginOrSignupWithGoogle(
  idToken: string,
  verify: GoogleVerifyFn = defaultVerifyGoogleToken
) {
  const payload = await verify(idToken);
  const sub = payload.sub;
  const email = payload.email?.trim().toLowerCase();
  if (!sub || !email) {
    throw unauthorized("Google token is missing required fields");
  }
  if (payload.email_verified === false) {
    throw unauthorized("Google email is not verified");
  }

  const bySub = await User.findOne({ where: { googleSub: sub } });
  if (bySub) return bySub;

  const byEmail = await User.findOne({ where: { email } });
  if (byEmail) {
    byEmail.googleSub = sub;
    await byEmail.save();
    return byEmail;
  }

  return User.create({
    email,
    passwordHash: null,
    googleSub: sub,
  });
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}
