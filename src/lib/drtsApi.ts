import type { CSSProperties } from "react";
import { ApiClient } from "@drts/api-client";
import type { IdentityContext, TenantBootstrapSession as IssuedTenantBootstrapSession } from "@drts/contracts";
import type { PartnerChannelEntryRecord, PartnerEligibilityMode } from "@drts/contracts";

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
  import.meta.env.VITE_BOOTSTRAP_EMAIL ?? "admin@acme.example";
export const DEMO_INVITED_EMAILS = [
  "admin@acme.example",
  "ops@acme.example",
  "finance@acme.example",
  "viewer@acme.example",
] as const;

export const PARTNER_SUPPORT_COPY =
  "若需調整乘車資訊或確認資格審核，請聯絡合作方案服務窗口或貴單位承辦人員。";

export function roleCodeToLabel(roleCode: string): string {
  switch (roleCode) {
    case "tenant_admin":
      return "租戶管理員";
    case "tenant_ops_admin":
      return "租戶營運管理員";
    case "tenant_finance_admin":
      return "租戶財務管理員";
    case "tenant_viewer":
      return "租戶檢視者";
    default:
      return roleCode;
  }
}

export function eligibilityModeToLabel(mode: PartnerEligibilityMode): string {
  switch (mode) {
    case "none":
      return "免資格驗證";
    case "bank_card_inline":
      return "卡號末四碼驗證";
    case "reference_required":
      return "合作方案代碼驗證";
    default:
      return mode;
  }
}

export function partnerRoute(entrySlug: string, path = "/bookings/new"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/partner/${entrySlug}${normalizedPath}`;
}

export function buildPartnerBranding(
  entry: PartnerChannelEntryRecord | null,
): Array<{ label: string; value: string }> {
  if (!entry) {
    return [];
  }

  return [
    { label: "合作代碼", value: entry.partnerCode },
    ...(entry.bankCode ? [{ label: "銀行代碼", value: entry.bankCode }] : []),
    { label: "方案代碼", value: entry.programId },
    { label: "資格規則", value: eligibilityModeToLabel(entry.eligibilityMode) },
  ];
}

export function partnerAccentStyle(
  entry: PartnerChannelEntryRecord | null,
): CSSProperties | undefined {
  if (!entry?.themeAccent) {
    return undefined;
  }

  return {
    borderColor: entry.themeAccent,
    boxShadow: `0 0 0 1px ${entry.themeAccent}20`,
  };
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
