import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Mail, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTestUser, setIsCreatingTestUser] = useState(false);
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || "登入失敗");
    } else {
      toast.success("登入成功！");
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(email, password, fullName, companyName);

    if (error) {
      toast.error(error.message || "註冊失敗");
    } else {
      toast.success("帳號建立成功！請登入。");
    }

    setIsLoading(false);
  };

  const handleCreateTestUser = async () => {
    setIsCreatingTestUser(true);
    
    try {
      // Call edge function to create/seed test user
      const { data, error } = await supabase.functions.invoke('seed-test-user');
      
      if (error) {
        console.error('Error creating test user:', error);
        toast.error('建立測試帳號失敗');
        return;
      }

      if (data?.ok) {
        toast.success('測試帳號已就緒，正在登入...');
        
        // Auto sign in with test credentials
        const { error: signInError } = await signIn(data.email, data.password);
        
        if (signInError) {
          toast.error('登入失敗：' + signInError.message);
        } else {
          toast.success('登入成功！');
        }
      } else {
        toast.error('建立測試帳號失敗');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('發生錯誤');
    } finally {
      setIsCreatingTestUser(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-glow mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">租戶入口</h1>
          <p className="text-muted-foreground">企業預約管理系統</p>
        </div>

        <Card className="shadow-lg border-border/50 backdrop-blur-sm">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">登入</TabsTrigger>
              <TabsTrigger value="signup">註冊</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader>
                <CardTitle>登入</CardTitle>
                <CardDescription>輸入您的登入資訊以存取租戶儀表板</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4 border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4" />
                  <AlertTitle>快速測試</AlertTitle>
                  <AlertDescription className="text-sm">
                    點擊下方按鈕即可建立並登入測試帳號，無需手動註冊
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">電子郵件</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">密碼</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-primary shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? "登入中..." : "登入"}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">或</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCreateTestUser}
                  disabled={isCreatingTestUser}
                >
                  {isCreatingTestUser ? "建立中..." : "一鍵建立並登入測試帳號"}
                </Button>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>註冊新帳號</CardTitle>
                <CardDescription>建立您的企業帳戶</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">姓名</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="輸入您的姓名"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-company">公司名稱（選填）</Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="輸入您的公司名稱"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">電子郵件</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="admin@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">密碼</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="至少 6 個字元"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-primary shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? "建立帳號中..." : "註冊"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    第一位使用者將自動成為管理員
                  </p>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
