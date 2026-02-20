import { Configuration, LogLevel } from "@azure/msal-browser";

export function buildMsalConfig(clientId: string, tenantId: string): Configuration {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
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
