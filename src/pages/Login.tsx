import { useState } from "react";
import { Building2, Loader2, Mail, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEMO_INVITED_EMAILS,
  DEFAULT_BOOTSTRAP_EMAIL,
  roleCodeToLabel,
} from "@/lib/drtsApi";
import { toast } from "sonner";

const Login = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(DEFAULT_BOOTSTRAP_EMAIL);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error, session } = await signIn({
      email,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        `Signed in as ${roleCodeToLabel(
          session?.profile.role_code ?? "tenant_admin",
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
              此入口不再使用 Supabase auth，也不再由前端挑選角色。登入會向
              `drts-fleet-platform` 申請 server-issued bearer session，
              backend 會依 invited tenant user record 決定 actor / role / scope。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4" />
              <AlertTitle>Authority boundary</AlertTitle>
              <AlertDescription>
                Session 只保留在目前瀏覽器記憶體，不寫入 local storage。
                重新整理頁面後需要重新登入，避免前端殘留第二套 authority state。
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo invited users:
                  {" "}
                  {DEMO_INVITED_EMAILS.join(" / ")}
                </p>
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
