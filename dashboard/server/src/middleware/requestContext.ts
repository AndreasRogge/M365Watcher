import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestAuthContext {
  mode: "app" | "user";
  userToken?: string;
  userClaims?: Record<string, unknown>;
}

export const requestContext = new AsyncLocalStorage<RequestAuthContext>();

/** Returns the auth context for the current request. Throws if called outside a request context. */
export function getRequestAuth(): RequestAuthContext {
  const store = requestContext.getStore();
  if (!store) {
    throw new Error(
      "getRequestAuth() called outside of an active request context. " +
      "Ensure authMiddleware has run before calling this function."
    );
  }
  return store;
}
