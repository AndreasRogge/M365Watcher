import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { config } from "../config.js";
import { requestContext, RequestAuthContext } from "./requestContext.js";

const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
});

function signingKeyProvider(
  header: jwt.JwtHeader,
  callback: (err: Error | null, key?: string) => void
): void {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key!.getPublicKey());
  });
}

function validateBearerToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      signingKeyProvider,
      {
        audience: [config.azure.clientId, `api://${config.azure.clientId}`],
        issuer: [
          `https://login.microsoftonline.com/${config.azure.tenantId}/v2.0`,
          `https://sts.windows.net/${config.azure.tenantId}/`,
        ],
        algorithms: ["RS256"],
      },
      (err, payload) => {
        if (err) {
          console.warn(`[Auth] Token validation failed: ${err.message}`);
          reject(new Error("The provided token is invalid or has expired."));
        } else {
          resolve(payload as jwt.JwtPayload);
        }
      }
    );
  });
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

    validateBearerToken(token)
      .then((claims) => {
        const ctx: RequestAuthContext = {
          mode: "user",
          userToken: token,
          userClaims: claims as Record<string, unknown>,
        };
        requestContext.run(ctx, () => next());
      })
      .catch(() => {
        res.status(401).json({
          error: { code: "TokenValidationFailed", message: "The provided token is invalid or has expired." },
        });
      });
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
