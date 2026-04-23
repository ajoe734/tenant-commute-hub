import { useAuth } from "@/contexts/AuthContext";

export type AppRole =
  | "tenant_admin"
  | "tenant_ops_admin"
  | "tenant_finance_admin"
  | "tenant_viewer";

export function useUserRole() {
  const { profile, loading } = useAuth();
  const role = (profile?.role_code as AppRole | undefined) ?? null;
  const roles = role ? [role] : [];

  const hasRole = (candidate: AppRole): boolean => roles.includes(candidate);

  const isAdmin = hasRole("tenant_admin");
  const isManager =
    isAdmin || hasRole("tenant_ops_admin") || hasRole("tenant_finance_admin");
  const canManageBookings = isAdmin || hasRole("tenant_ops_admin");
  const canManagePassengers = isAdmin || hasRole("tenant_ops_admin");

  return {
    roles,
    loading,
    role,
    hasRole,
    isAdmin,
    isManager,
    canManageBookings,
    canManagePassengers,
  };
}
