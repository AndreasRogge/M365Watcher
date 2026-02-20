import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file.`
    );
  }
  return value;
}

export type AuthMode = "app" | "user" | "dual";

const authMode = (process.env.AUTH_MODE || "dual") as AuthMode;
if (!["app", "user", "dual"].includes(authMode)) {
  throw new Error(`Invalid AUTH_MODE: ${authMode}. Must be "app", "user", or "dual".`);
}

// Client secret is only required when app credentials mode is available
const clientSecret: string | undefined = authMode === "user"
  ? process.env.AZURE_CLIENT_SECRET
  : requireEnv("AZURE_CLIENT_SECRET");

export const config = {
  authMode,
  azure: {
    tenantId: requireEnv("AZURE_TENANT_ID"),
    clientId: requireEnv("AZURE_CLIENT_ID"),
    clientSecret,
  },
  server: {
    port: parseInt(process.env.PORT || "3001", 10),
  },
  graph: {
    baseUrl: "https://graph.microsoft.com",
    utcmBasePath: "/beta/admin/configurationManagement",
    scopes: ["https://graph.microsoft.com/.default"],
  },
};
