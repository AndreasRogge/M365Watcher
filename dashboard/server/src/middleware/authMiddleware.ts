import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { config, isTenantAllowed } from "../config.js";
import { requestContext, RequestAuthContext } from "./requestContext.js";

/**
 * JWKS clients for fetching Microsoft Entra ID signing keys.
 *
 * Multi-tenant: we use the tenant-independent "common" JWKS endpoints so that
 * tokens issued by any trusted tenant can be verified from a single client.
 * ID tokens may be v1.0 or v2.0 format depending on the app registration's
 * accessTokenAcceptedVersion. We select based on the token's issuer claim.
 */
const jwksClientV2 = jwksRsa({
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

const jwksClientV1 = jwksRsa({
  jwksUri: "https://login.microsoftonline.com/common/discovery/keys",
  cache: true,
  cacheMaxEntries: 10,
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

/**
 * Validate a bearer token's cryptographic signature and claims.
 *
 * Multi-tenant validation: instead of matching against a static issuer list,
 * we extract the tenant ID from the token, verify it's in the allowlist,
 * then dynamically construct the accepted issuers for that tenant.
 */
async function validateBearerToken(token: string): Promise<jwt.JwtPayload> {
  // Step 1: Decode header only to extract the key ID (kid) and tenant ID.
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.payload === "string" || !decoded.header) {
    throw new Error("The provided token is not a valid JWT.");
  }

  const payload = decoded.payload as jwt.JwtPayload;
  const tokenIssuer = payload.iss || "";
  const tokenTid = payload.tid as string | undefined;

  // Step 2: Check tenant ID against allowlist BEFORE any cryptographic work.
  // This prevents fetching signing keys for tenants we would never accept.
  // The check is async because it queries the runtime tenant store in addition
  // to the static env-var allowlist.
  if (!tokenTid || !(await isTenantAllowed(tokenTid))) {
    throw new Error("The provided token is invalid or has expired.");
  }

  // Step 3: Fetch the RSA public key matching the token's kid.
  const signingKey = await getSigningKey(decoded.header, tokenIssuer);

  // Step 4: Build accepted issuers for this specific token's tenant.
  const acceptedIssuers: [string, ...string[]] = [
    `https://login.microsoftonline.com/${tokenTid}/v2.0`,
    `https://sts.windows.net/${tokenTid}/`,
  ];

  // Step 5: Verify the cryptographic signature and validate claims.
  let verifiedPayload: jwt.JwtPayload;
  try {
    verifiedPayload = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      issuer: acceptedIssuers,
      audience: config.azure.clientId,
    }) as jwt.JwtPayload;
  } catch (err) {
    throw new Error("The provided token is invalid or has expired.");
  }

  // Step 6: Defense-in-depth — re-confirm tid on the verified payload.
  const verifiedTid = verifiedPayload.tid as string | undefined;
  if (!verifiedTid || !(await isTenantAllowed(verifiedTid))) {
    throw new Error("The provided token is invalid or has expired.");
  }

  return verifiedPayload;
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
        // Always return an opaque message to avoid leaking internal validation details
        if (err instanceof Error && err.message !== "The provided token is invalid or has expired.") {
          console.warn(`[Auth] Token validation failed: ${err.message}`);
        }
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
