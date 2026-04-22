import { ApiClient } from "@drts/api-client";

export interface TenantPortalSession {
  actorId: string;
  tenantId: string;
  email: string;
  fullName: string;
  roleCode: string;
}

export interface TenantPortalProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_code: string;
}

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export const DEFAULT_TENANT_ID =
  import.meta.env.VITE_TENANT_ID ?? "tenant-demo-001";
export const SESSION_STORAGE_KEY = "drts-tenant-portal-session";

const DEFAULT_BOOTSTRAP_EMAIL =
  import.meta.env.VITE_BOOTSTRAP_EMAIL ?? "tenant.admin@example.com";
const DEFAULT_BOOTSTRAP_NAME =
  import.meta.env.VITE_BOOTSTRAP_NAME ?? "Tenant Admin";

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

export function deriveRoleCode(
  email: string,
  requestedRoleCode?: string,
): string {
  if (requestedRoleCode) {
    return requestedRoleCode;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.startsWith("viewer")) {
    return "tenant_viewer";
  }
  if (normalizedEmail.startsWith("finance")) {
    return "tenant_finance_admin";
  }
  if (normalizedEmail.startsWith("ops")) {
    return "tenant_ops_admin";
  }
  return "tenant_admin";
}

export function createTenantPortalSession(input?: {
  actorId?: string;
  tenantId?: string;
  email?: string;
  fullName?: string;
  roleCode?: string;
}): TenantPortalSession {
  const email = input?.email?.trim() || DEFAULT_BOOTSTRAP_EMAIL;
  const fullName = input?.fullName?.trim() || DEFAULT_BOOTSTRAP_NAME;
  const roleCode = deriveRoleCode(email, input?.roleCode);
  const actorId =
    input?.actorId?.trim() ||
    email
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "tenant-portal-user";

  return {
    actorId,
    tenantId: input?.tenantId?.trim() || DEFAULT_TENANT_ID,
    email,
    fullName,
    roleCode,
  };
}

export function toTenantPortalProfile(
  session: TenantPortalSession,
): TenantPortalProfile {
  return {
    id: session.actorId,
    tenant_id: session.tenantId,
    full_name: session.fullName,
    email: session.email,
    role_code: session.roleCode,
  };
}

export function createTenantPortalClient(
  session: TenantPortalSession,
): ApiClient {
  return new ApiClient({
    baseUrl: API_URL,
    defaultHeaders: {
      "x-actor-type": "tenant_admin",
      "x-actor-id": session.actorId,
      "x-realm": "tenant",
      "x-tenant-id": session.tenantId,
      "x-roles": session.roleCode,
    },
  });
}

export function createBootstrapTenantClient(): ApiClient {
  return createTenantPortalClient(createTenantPortalSession());
}
