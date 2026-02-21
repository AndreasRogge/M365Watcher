import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { config } from "../config.js";
import { requestContext, RequestAuthContext } from "./requestContext.js";

/**
 * JWKS clients for fetching Microsoft Entra ID signing keys.
 *
 * ID tokens may be v1.0 or v2.0 format depending on the app registration's
 * accessTokenAcceptedVersion. We maintain two JWKS clients and select based
 * on the token's issuer claim (sts.windows.net → v1.0, login.microsoftonline.com → v2.0).
 */
const jwksClientV2 = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

const jwksClientV1 = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${config.azure.tenantId}/discovery/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

/**
 * Resolve the RSA public key for a given JWT header's key ID (kid).
 * Selects the appropriate JWKS endpoint (v1.0 or v2.0) based on the token's issuer.
 */
function getSigningKey(header: jwt.JwtHeader, issuer: string): Promise<string> {
  const client = issuer.includes("sts.windows.net") ? jwksClientV1 : jwksClientV2;
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error("Token header is missing the 'kid' claim."));
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        return reject(err ?? new Error("Signing key not found for the provided kid."));
      }
      resolve(key.getPublicKey());
    });
  });
}

/** Accepted issuer formats for Microsoft Entra ID tokens. */
const TRUSTED_ISSUERS: [string, ...string[]] = [
  `https://login.microsoftonline.com/${config.azure.tenantId}/v2.0`,
  `https://sts.windows.net/${config.azure.tenantId}/`,
];

/**
 * Validate a bearer token's cryptographic signature and claims.
 *
 * Uses Microsoft's JWKS endpoint to fetch the signing key and jwt.verify()
 * to validate the RS256 signature, issuer, audience, and expiry. The tenant
 * ID is also checked as a defense-in-depth measure (the issuer check already
 * scopes to the correct tenant).
 */
async function validateBearerToken(token: string): Promise<jwt.JwtPayload> {
  // Step 1: Decode header only to extract the key ID (kid).
  // No trust is granted at this stage — we only need the kid to fetch the
  // correct signing key from Microsoft's JWKS endpoint.
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.payload === "string" || !decoded.header) {
    throw new Error("The provided token is not a valid JWT.");
  }

  const tokenIssuer = (decoded.payload as jwt.JwtPayload).iss || "";

  // Step 2: Fetch the RSA public key matching the token's kid.
  // Use the issuer to select the correct JWKS endpoint (v1.0 vs v2.0).
  const signingKey = await getSigningKey(decoded.header, tokenIssuer);

  // Step 3: Verify the cryptographic signature and validate claims.
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      issuer: TRUSTED_ISSUERS,
      audience: config.azure.clientId,
    }) as jwt.JwtPayload;
  } catch (err) {
    throw new Error("The provided token is invalid or has expired.");
  }

  // Step 4: Defense-in-depth tenant check (issuer already covers this).
  const tid = payload.tid as string | undefined;
  if (!tid || tid !== config.azure.tenantId) {
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

    validateBearerToken(token)
      .then((claims) => {
        const ctx: RequestAuthContext = {
          mode: "user",
          userToken: token,
          userClaims: claims as Record<string, unknown>,
        };
        requestContext.run(ctx, () => next());
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "The provided token is invalid or has expired.";
        res.status(401).json({
          error: { code: "TokenValidationFailed", message },
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
