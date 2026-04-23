import { useEffect, useState } from "react";
import { Building2, Loader2, Mail, Shield, User } from "lucide-react";
import type { TenantRoleCatalogRecord } from "@drts/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_BOOTSTRAP_EMAIL,
  DEFAULT_BOOTSTRAP_NAME,
  createPublicClient,
  roleCodeToLabel,
} from "@/lib/drtsApi";
import { toast } from "sonner";

const FALLBACK_ROLES: TenantRoleCatalogRecord[] = [
  {
    roleCode: "tenant_admin",
    displayName: "Tenant Admin",
    description: "Full tenant administration access.",
    assignable: true,
  },
  {
    roleCode: "tenant_ops_admin",
    displayName: "Tenant Ops Admin",
    description: "Booking and operational access.",
    assignable: true,
  },
  {
    roleCode: "tenant_finance_admin",
    displayName: "Tenant Finance Admin",
    description: "Billing and reporting access.",
    assignable: true,
  },
  {
    roleCode: "tenant_viewer",
    displayName: "Tenant Viewer",
    description: "Read-only access.",
    assignable: true,
  },
];

const Login = () => {
  const { signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roleCatalog, setRoleCatalog] =
    useState<TenantRoleCatalogRecord[]>(FALLBACK_ROLES);
  const [roleCatalogError, setRoleCatalogError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: DEFAULT_BOOTSTRAP_NAME,
    email: DEFAULT_BOOTSTRAP_EMAIL,
    roleCode: "tenant_admin",
  });

  useEffect(() => {
    if (user) {
      return;
    }

    createPublicClient()
      .listTenantRoles()
      .then((roles) => {
        if (roles.length > 0) {
          setRoleCatalog(roles);
          setForm((current) => ({
            ...current,
            roleCode: roles[0]?.roleCode ?? current.roleCode,
          }));
        }
      })
      .catch((error) => {
        setRoleCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load tenant role catalog.",
        );
      });
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error, session } = await signIn({
      email: form.email,
      fullName: form.fullName,
      roleCode: form.roleCode,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        `Signed in as ${roleCodeToLabel(
          session?.profile.role_code ?? form.roleCode,
        )}.`,
      );
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-glow mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">租戶入口</h1>
          <p className="text-muted-foreground">BFF consumer mode</p>
        </div>

        <Card className="shadow-lg border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Bootstrap Access</CardTitle>
            <CardDescription>
              此入口不再使用 Supabase auth。登入會向 `drts-fleet-platform`
              申請 server-issued bearer session，所有資料與 authority 都走
              tenant BFF。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4" />
              <AlertTitle>Authority boundary</AlertTitle>
              <AlertDescription>
                角色選單由 public `GET /api/tenant/roles` 載入；送出登入後，
                actor / role / tenant context 由 backend 簽回，而不是由前端本地拼接。
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">顯示名稱</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full-name"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-code">角色</Label>
                <Select
                  value={form.roleCode}
                  onValueChange={(roleCode) =>
                    setForm((current) => ({ ...current, roleCode }))
                  }
                >
                  <SelectTrigger id="role-code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleCatalog.map((role) => (
                      <SelectItem key={role.roleCode} value={role.roleCode}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roleCatalogError && (
                  <p className="text-xs text-amber-600">
                    Role catalog fallback in use: {roleCatalogError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                進入 Tenant Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
