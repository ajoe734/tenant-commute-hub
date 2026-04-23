import { ApiClient } from "@drts/api-client";
import type { IdentityContext, TenantBootstrapSession as IssuedTenantBootstrapSession } from "@drts/contracts";

export interface TenantPortalProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_code: string;
}

export interface TenantPortalSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  profile: TenantPortalProfile;
  identity: IdentityContext;
}

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export const DEFAULT_TENANT_ID =
  import.meta.env.VITE_TENANT_ID ?? "tenant-demo-001";
export const DEFAULT_BOOTSTRAP_EMAIL =
  import.meta.env.VITE_BOOTSTRAP_EMAIL ?? "tenant.admin@example.com";
export const DEFAULT_BOOTSTRAP_NAME =
  import.meta.env.VITE_BOOTSTRAP_NAME ?? "Tenant Admin";
export const SESSION_STORAGE_KEY = "drts-tenant-portal-session";

export function roleCodeToLabel(roleCode: string): string {
  switch (roleCode) {
    case "tenant_admin":
      return "Tenant Admin";
    case "tenant_ops_admin":
      return "Tenant Ops Admin";
    case "tenant_finance_admin":
      return "Tenant Finance Admin";
    case "tenant_viewer":
      return "Tenant Viewer";
    default:
      return roleCode;
  }
}

export function normalizeTenantPortalSession(
  input: TenantPortalSession,
): TenantPortalSession {
  const accessToken = input.accessToken?.trim();
  const tokenType = input.tokenType?.trim() as "Bearer" | "";
  const expiresIn = input.expiresIn?.trim();
  const profile = input.profile;
  const identity = input.identity;

  if (!accessToken || !tokenType || !expiresIn || !profile || !identity) {
    throw new Error("Invalid tenant portal session payload.");
  }

  if (
    !profile.id?.trim() ||
    !profile.tenant_id?.trim() ||
    !profile.full_name?.trim() ||
    !profile.email?.trim() ||
    !profile.role_code?.trim()
  ) {
    throw new Error("Invalid tenant portal profile payload.");
  }

  return {
    accessToken,
    tokenType,
    expiresIn,
    profile: {
      id: profile.id.trim(),
      tenant_id: profile.tenant_id.trim(),
      full_name: profile.full_name.trim(),
      email: profile.email.trim().toLowerCase(),
      role_code: profile.role_code.trim(),
    },
    identity,
  };
}

export function toTenantPortalSession(
  session: IssuedTenantBootstrapSession,
): TenantPortalSession {
  return normalizeTenantPortalSession({
    accessToken: session.accessToken,
    tokenType: session.tokenType,
    expiresIn: session.expiresIn,
    profile: {
      id: session.profile.id,
      tenant_id: session.profile.tenantId,
      full_name: session.profile.fullName,
      email: session.profile.email,
      role_code: session.profile.roleCode,
    },
    identity: session.identity,
  });
}

export function createPublicClient(): ApiClient {
  return new ApiClient({
    baseUrl: API_URL,
  });
}

export function createTenantPortalClient(
  session: Pick<TenantPortalSession, "accessToken" | "profile">,
): ApiClient {
  return new ApiClient({
    baseUrl: API_URL,
    defaultHeaders: {
      Authorization: `Bearer ${session.accessToken}`,
      "x-tenant-id": session.profile.tenant_id,
    },
  });
}
