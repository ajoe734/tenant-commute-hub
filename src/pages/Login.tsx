import { useEffect, useState } from "react";
import { Building2, Loader2, Mail, Shield } from "lucide-react";
import { useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEMO_INVITED_EMAILS,
  DEFAULT_BOOTSTRAP_EMAIL,
  buildPartnerBranding,
  createPublicClient,
  eligibilityModeToLabel,
  PARTNER_SUPPORT_COPY,
  partnerAccentStyle,
  roleCodeToLabel,
} from "@/lib/drtsApi";
import { toast } from "sonner";

const Login = () => {
  const { entrySlug } = useParams();
  const { partnerEntry, setPartnerEntry, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [email, setEmail] = useState(DEFAULT_BOOTSTRAP_EMAIL);

  useEffect(() => {
    if (!entrySlug) {
      setPartnerEntry(null);
      setEntryError(null);
      setEntryLoading(false);
      return;
    }

    let active = true;
    setEntryLoading(true);

    void createPublicClient()
      .getPartnerEntry(entrySlug)
      .then((entry) => {
        if (!active) {
          return;
        }
        setPartnerEntry(entry);
        setEntryError(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setPartnerEntry(null);
        setEntryError(
          error instanceof Error
            ? error.message
            : "Unable to resolve partner entry.",
        );
      })
      .finally(() => {
        if (active) {
          setEntryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [entrySlug, setPartnerEntry]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error, session } = await signIn({
      email,
      tenantId: partnerEntry?.tenantId,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        `已登入為 ${roleCodeToLabel(
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
          <div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-glow mb-4"
            style={
              partnerEntry?.themeAccent
                ? { background: partnerEntry.themeAccent }
                : undefined
            }
          >
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {partnerEntry?.displayName ?? "租戶入口"}
          </h1>
          <p className="text-muted-foreground">
            {partnerEntry
              ? `${partnerEntry.partnerCode} 合作方案登入`
              : "使用租戶入口登入並建立後端核發的工作階段"}
          </p>
        </div>

        <Card
          className="shadow-lg border-border/50 backdrop-blur-sm"
          style={partnerAccentStyle(partnerEntry)}
        >
          <CardHeader>
            <CardTitle>{partnerEntry ? "合作方入口驗證" : "租戶入口驗證"}</CardTitle>
            <CardDescription>
              {partnerEntry
                ? "此入口會先帶入合作方案 context，再向 drts-fleet-platform 申請後端核發的 bearer session。實際 actor、role 與 scope 仍由後端依邀請紀錄決定。"
                : "此入口不再使用前端自管 auth，也不再由前端挑選角色。登入時會向 drts-fleet-platform 申請後端核發 session，並由後端依邀請租戶使用者紀錄決定權限。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entryLoading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>正在解析合作方入口</AlertTitle>
                <AlertDescription>
                  正在載入合作方入口設定。
                </AlertDescription>
              </Alert>
            )}

            {entryError && (
              <Alert variant="destructive">
                <AlertTitle>合作方入口無法使用</AlertTitle>
                <AlertDescription>{entryError}</AlertDescription>
              </Alert>
            )}

            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4" />
              <AlertTitle>權限邊界</AlertTitle>
              <AlertDescription>
                Session 只保留在目前瀏覽器記憶體，不寫入 local storage。
                重新整理頁面後需要重新登入，避免前端殘留第二套 authority state。
              </AlertDescription>
            </Alert>

            {partnerEntry && (
              <div
                className="rounded-xl border bg-muted/40 p-4 text-sm"
                style={partnerAccentStyle(partnerEntry)}
              >
                <div className="font-medium text-foreground">方案資訊</div>
                <div className="mt-2 grid gap-2 text-muted-foreground">
                  {buildPartnerBranding(partnerEntry).map((item) => (
                    <div key={item.label}>
                      {item.label}：{item.value}
                    </div>
                  ))}
                  <div>驗證模式：{eligibilityModeToLabel(partnerEntry.eligibilityMode)}</div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {PARTNER_SUPPORT_COPY}
                </p>
              </div>
            )}

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
                  測試邀請帳號：
                  {" "}
                  {DEMO_INVITED_EMAILS.join(" / ")}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary"
                disabled={loading || entryLoading || Boolean(entryError)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {partnerEntry ? "進入合作方預約入口" : "進入租戶入口"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
