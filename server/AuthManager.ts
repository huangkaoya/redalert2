/**
 * JWT-based token authentication for public server mode.
 */

import * as crypto from 'crypto';

export interface AuthPayload {
  userId: string;
  userName: string;
  iat: number;
  exp: number;
}

export class AuthManager {
  private secret: string;
  private tokenLifetime: number;

  constructor(secret: string, tokenLifetimeMs: number = 24 * 60 * 60 * 1000) {
    this.secret = secret;
    this.tokenLifetime = tokenLifetimeMs;
  }

  /** Generate a token for a user. */
  generateToken(userId: string, userName: string): string {
    const payload: AuthPayload = {
      userId,
      userName,
      iat: Date.now(),
      exp: Date.now() + this.tokenLifetime,
    };
    return this.sign(payload);
  }

  /** Verify and decode a token. Returns null if invalid. */
  verifyToken(token: string): AuthPayload | null {
    try {
      const payload = this.unsign(token);
      if (!payload) return null;
      if (payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  /** Simple HMAC-based token signing (not a full JWT, but secure enough). */
  private sign(payload: AuthPayload): string {
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.hmac(payloadStr);
    return `${payloadStr}.${sig}`;
  }

  private unsign(token: string): AuthPayload | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, sig] = parts;
    const expectedSig = this.hmac(payloadStr);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    return JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
  }

  private hmac(data: string): string {
    return crypto.createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
