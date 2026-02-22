import { Configuration, LogLevel } from "@azure/msal-browser";

/**
 * Build MSAL config for multi-tenant authentication.
 *
 * Uses the "organizations" authority so that:
 * 1. Users from the home tenant can sign in directly
 * 2. Users who are guests in other tenants can authenticate against those tenants
 *    by overriding the authority in loginRedirect/acquireTokenSilent calls
 *
 * The tenantId parameter is kept for backward compatibility but the authority
 * defaults to "organizations" to support multi-tenant scenarios.
 */
export function buildMsalConfig(clientId: string, _tenantId?: string): Configuration {
  return {
    auth: {
      clientId,
      authority: "https://login.microsoftonline.com/organizations",
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  };
}

// Delegated scopes for user-mode Graph API access
export const graphScopes = [
  "User.Read",
  "DeviceManagementConfiguration.Read.All",
  "DeviceManagementManagedDevices.Read.All",
];
