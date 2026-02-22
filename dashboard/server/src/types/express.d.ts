declare namespace Express {
  interface Request {
    /** Azure AD tenant ID resolved by tenantMiddleware. */
    tenantId?: string;
  }
}
