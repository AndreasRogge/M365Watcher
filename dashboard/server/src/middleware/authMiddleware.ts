import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { requestContext, RequestAuthContext } from "./requestContext.js";

/**
 * Decode and lightly validate a Microsoft Graph access token.
 *
 * Graph access tokens are intended for the Graph API, not for third-party
 * validation. Microsoft explicitly documents them as opaque — their format
 * can change and they may use nonce-based key derivation that prevents
 * standard JWKS signature verification.
 *
 * Since our backend passes the token through to Graph API (which performs
 * full validation), we only need to:
 *  1. Verify it's a well-formed JWT
 *  2. Check the tenant ID matches our expected tenant
 *  3. Check it hasn't expired (basic sanity check)
 */
function validateBearerToken(token: string): jwt.JwtPayload {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.payload === "string") {
    throw new Error("The provided token is not a valid JWT.");
  }

  const payload = decoded.payload;
  const tid = payload.tid as string | undefined;
  if (!tid || tid !== config.azure.tenantId) {
    console.warn(`[Auth] Token tenant mismatch: expected ${config.azure.tenantId}, got ${tid}`);
    throw new Error("The provided token is invalid or has expired.");
  }

  // Basic expiry check
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error("The provided token is invalid or has expired.");
  }

  return payload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const hasBearerToken = authHeader?.startsWith("Bearer ");

  if (hasBearerToken) {
    const token = authHeader!.substring(7);

    if (config.authMode === "app") {
      res.status(403).json({
        error: { code: "UserAuthDisabled", message: "User authentication is not enabled." },
      });
      return;
    }

    let claims: jwt.JwtPayload;
    try {
      claims = validateBearerToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The provided token is invalid or has expired.";
      res.status(401).json({
        error: { code: "TokenValidationFailed", message },
      });
      return;
    }

    const ctx: RequestAuthContext = {
      mode: "user",
      userToken: token,
      userClaims: claims as Record<string, unknown>,
    };
    requestContext.run(ctx, () => next());
    return;
  }

  // No bearer token — use app credentials
  if (config.authMode === "user") {
    res.status(401).json({
      error: { code: "AuthenticationRequired", message: "User authentication required." },
    });
    return;
  }

  const ctx: RequestAuthContext = { mode: "app" };
  requestContext.run(ctx, () => next());
}
