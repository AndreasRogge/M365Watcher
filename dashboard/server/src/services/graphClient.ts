import { ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../config.js";
import { ApiError } from "../middleware/errorHandler.js";
import { getRequestAuth } from "../middleware/requestContext.js";

// MSAL client credentials app - only initialized when app mode is available and secret is set
let msalClient: ConfidentialClientApplication | null = null;
if (config.authMode !== "user" && config.azure.clientSecret) {
  msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: config.azure.clientId,
      authority: `https://login.microsoftonline.com/${config.azure.tenantId}`,
      clientSecret: config.azure.clientSecret,
    },
  });
}

async function getAccessToken(): Promise<string> {
  // Check if a user token is available via request context
  const auth = getRequestAuth();
  if (auth.mode === "user" && auth.userToken) {
    return auth.userToken;
  }

  // Fall back to client credentials
  if (!msalClient) {
    throw new ApiError(500, "ConfigError", "Client credentials not configured. Set AZURE_CLIENT_SECRET or use user authentication.");
  }
  const result = await msalClient.acquireTokenByClientCredential({
    scopes: config.graph.scopes,
  });
  if (!result?.accessToken) {
    throw new ApiError(401, "AuthenticationFailed", "Failed to acquire access token from Azure AD");
  }
  return result.accessToken;
}

interface GraphRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  maxRetries?: number;
  noPagination?: boolean;
}

interface GraphErrorBody {
  error?: {
    code?: string;
    message?: string;
    innerError?: {
      "request-id"?: string;
      date?: string;
    };
  };
}

/**
 * Core Graph API client - faithful port of Invoke-UTCMGraphRequest from UTCM-Management.ps1.
 * Provides:
 * - MSAL client credentials authentication with automatic token caching
 * - Exponential backoff retry for 429/503/504 with Retry-After header support
 * - Automatic @odata.nextLink pagination for GET requests
 * - Structured error extraction from Graph API error responses
 */
export async function graphRequest<T = unknown>(
  uri: string,
  options: GraphRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, maxRetries = 3, noPagination = false } = options;

  // Build full URL if relative path given
  const fullUrl = uri.startsWith("http")
    ? uri
    : `${config.graph.baseUrl}${uri}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = await getAccessToken();

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ConsistencyLevel: "eventual",
        },
      };

      if (body && (method === "POST" || method === "PATCH")) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(fullUrl, fetchOptions);

      // Handle retryable errors: 429, 503, 504
      if ([429, 503, 504].includes(response.status)) {
        const retryAfter = response.headers.get("Retry-After");
        const waitSeconds = retryAfter
          ? parseInt(retryAfter, 10)
          : Math.pow(2, attempt);

        console.warn(
          `[GraphClient] HTTP ${response.status} on ${method} ${uri} - Retry ${attempt + 1}/${maxRetries} after ${waitSeconds}s`
        );

        if (attempt < maxRetries) {
          await sleep(waitSeconds * 1000);
          continue;
        }
      }

      // Handle error responses
      if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        throw new ApiError(
          response.status,
          errorBody.code || `HTTP${response.status}`,
          errorBody.message || `Graph API returned ${response.status}`,
          errorBody.requestId
        );
      }

      // Handle 204 No Content (DELETE responses)
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      // Handle automatic pagination for GET requests
      if (method === "GET" && !noPagination && data["@odata.nextLink"]) {
        const allItems = [...(data.value || [])];
        let nextLink: string | undefined = data["@odata.nextLink"];

        while (nextLink) {
          const pageResponse = await fetch(nextLink, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${await getAccessToken()}`,
              "Content-Type": "application/json",
              ConsistencyLevel: "eventual",
            },
          });

          if (!pageResponse.ok) {
            break;
          }

          const pageData = await pageResponse.json();
          allItems.push(...(pageData.value || []));
          nextLink = pageData["@odata.nextLink"];
        }

        return { ...data, value: allItems, "@odata.nextLink": undefined } as T;
      }

      return data as T;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      lastError = err as Error;
      if (attempt < maxRetries) {
        const waitSeconds = Math.pow(2, attempt);
        console.warn(
          `[GraphClient] Network error on ${method} ${uri} - Retry ${attempt + 1}/${maxRetries} after ${waitSeconds}s: ${(err as Error).message}`
        );
        await sleep(waitSeconds * 1000);
      }
    }
  }

  throw lastError || new ApiError(500, "MaxRetriesExceeded", "Max retries exceeded for Graph API request");
}

async function parseErrorBody(response: Response): Promise<{
  code?: string;
  message?: string;
  requestId?: string;
}> {
  try {
    const body: GraphErrorBody = await response.json();
    return {
      code: body.error?.code,
      message: body.error?.message,
      requestId: body.error?.innerError?.["request-id"],
    };
  } catch {
    return {
      message: `HTTP ${response.status} ${response.statusText}`,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convenience helpers for UTCM endpoints
const UTCM_BASE = config.graph.utcmBasePath;

export const utcm = {
  get: <T = unknown>(path: string) =>
    graphRequest<T>(`${UTCM_BASE}${path}`),

  getOne: <T = unknown>(path: string) =>
    graphRequest<T>(`${UTCM_BASE}${path}`, { noPagination: true }),

  post: <T = unknown>(path: string, body: unknown) =>
    graphRequest<T>(`${UTCM_BASE}${path}`, { method: "POST", body }),

  patch: <T = unknown>(path: string, body: unknown) =>
    graphRequest<T>(`${UTCM_BASE}${path}`, { method: "PATCH", body }),

  delete: (path: string) =>
    graphRequest<void>(`${UTCM_BASE}${path}`, { method: "DELETE" }),
};
