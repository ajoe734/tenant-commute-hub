import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Key, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

const ApiKeyManagement = () => {
  const { profile } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);

  const [apiKeyForm, setApiKeyForm] = useState({
    name: "",
    scopes: ["read"],
  });

  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  useEffect(() => {
    if (isAdmin) {
      fetchApiKeys();
      fetchWebhooks();
    }
  }, [profile, isAdmin]);

  const fetchApiKeys = async () => {
    if (!profile?.tenant_id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error);
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    if (!profile?.tenant_id) return;
    
    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching webhooks:", error);
    } else {
      setWebhooks(data || []);
    }
  };

  const generateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    const randomKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setNewApiKey(randomKey);
    setShowNewKey(true);

    const { error } = await supabase.from("api_keys").insert([
      {
        tenant_id: profile.tenant_id,
        name: apiKeyForm.name,
        key_hash: randomKey,
        key_prefix: randomKey.substring(0, 10),
        scopes: apiKeyForm.scopes,
        created_by: profile.id,
      },
    ]);

    if (error) {
      toast({
        title: "產生失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "API Key 已產生" });
      fetchApiKeys();
      setApiKeyForm({ name: "", scopes: ["read"] });
    }
  };

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    const { error } = await supabase.from("webhooks").insert([
      {
        tenant_id: profile.tenant_id,
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
        created_by: profile.id,
      },
    ]);

    if (error) {
      toast({
        title: "建立失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Webhook 已建立" });
      fetchWebhooks();
      setWebhookForm({ name: "", url: "", events: [] });
      setIsWebhookDialogOpen(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("確定要刪除此 API Key 嗎？")) return;

    const { error } = await supabase.from("api_keys").delete().eq("id", id);

    if (error) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "API Key 已刪除" });
      fetchApiKeys();
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("確定要刪除此 Webhook 嗎？")) return;

    const { error } = await supabase.from("webhooks").delete().eq("id", id);

    if (error) {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Webhook 已刪除" });
      fetchWebhooks();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "已複製到剪貼簿" });
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">您沒有權限存取此功能</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">API & Webhook 管理</h2>
        <p className="text-muted-foreground">管理 API 金鑰與 Webhook 整合</p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  產生 API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>產生新的 API Key</DialogTitle>
                  <DialogDescription>建立一個新的 API 金鑰以存取系統 API</DialogDescription>
                </DialogHeader>
                {showNewKey ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label>您的 API Key（請妥善保管）</Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(newApiKey)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <code className="text-sm break-all">{newApiKey}</code>
                    </div>
                    <p className="text-sm text-destructive">
                      ⚠️ 此金鑰只會顯示一次，請立即複製保存
                    </p>
                    <Button
                      onClick={() => {
                        setShowNewKey(false);
                        setNewApiKey("");
                        setIsApiKeyDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      完成
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={generateApiKey} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-name">金鑰名稱</Label>
                      <Input
                        id="api-name"
                        value={apiKeyForm.name}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                        placeholder="例如：生產環境 API"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      產生金鑰
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>管理您的 API 存取金鑰</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無 API Key，點擊「產生 API Key」建立
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>金鑰前綴</TableHead>
                      <TableHead>權限</TableHead>
                      <TableHead>最後使用</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono">{key.key_prefix}...</TableCell>
                        <TableCell>
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="mr-1">
                              {scope}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {key.last_used_at
                            ? format(new Date(key.last_used_at), "yyyy-MM-dd HH:mm")
                            : "從未使用"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "啟用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  新增 Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>建立 Webhook</DialogTitle>
                  <DialogDescription>設定 Webhook 以接收系統事件通知</DialogDescription>
                </DialogHeader>
                <form onSubmit={createWebhook} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Webhook 名稱</Label>
                    <Input
                      id="webhook-name"
                      value={webhookForm.name}
                      onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                      placeholder="例如：Slack 通知"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      value={webhookForm.url}
                      onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                      placeholder="https://example.com/webhook"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    建立 Webhook
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>您的 Webhook 端點列表</CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無 Webhook，點擊「新增 Webhook」建立
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>事件</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {webhook.url}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.events.length} 事件</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "啟用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiKeyManagement;
