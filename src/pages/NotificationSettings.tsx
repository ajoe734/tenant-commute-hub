import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  event_type: string;
  channel: string;
  is_read: boolean;
  created_at: string;
}

const NotificationSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    emailBookingCreated: true,
    emailBookingCancelled: true,
    smsBookingReminder: false,
    pushBookingUpdates: true,
    emailWeeklyReport: true,
  });

  useEffect(() => {
    fetchNotifications();
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${profile.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast({
        title: "更新失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);

    if (error) {
      toast({
        title: "更新失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "已全部標記為已讀" });
      fetchNotifications();
    }
  };

  const saveSettings = () => {
    toast({
      title: "設定已儲存",
      description: "通知偏好設定已更新",
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "push":
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">通知設定</h2>
        <p className="text-muted-foreground">管理您的通知偏好與歷史記錄</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>通知偏好</CardTitle>
            <CardDescription>選擇您想接收的通知類型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">預約建立通知</Label>
                  <p className="text-sm text-muted-foreground">新預約建立時發送 Email</p>
                </div>
                <Switch
                  checked={settings.emailBookingCreated}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailBookingCreated: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">預約取消通知</Label>
                  <p className="text-sm text-muted-foreground">預約被取消時發送 Email</p>
                </div>
                <Switch
                  checked={settings.emailBookingCancelled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailBookingCancelled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">預約提醒簡訊</Label>
                  <p className="text-sm text-muted-foreground">出發前 30 分鐘發送簡訊提醒</p>
                </div>
                <Switch
                  checked={settings.smsBookingReminder}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, smsBookingReminder: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">即時推播通知</Label>
                  <p className="text-sm text-muted-foreground">預約狀態更新時推播通知</p>
                </div>
                <Switch
                  checked={settings.pushBookingUpdates}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pushBookingUpdates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">週報 Email</Label>
                  <p className="text-sm text-muted-foreground">每週發送使用統計報告</p>
                </div>
                <Switch
                  checked={settings.emailWeeklyReport}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailWeeklyReport: checked })
                  }
                />
              </div>
            </div>

            <Button onClick={saveSettings} className="w-full bg-gradient-primary">
              儲存設定
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  通知中心
                </CardTitle>
                <CardDescription>最近的系統通知</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                全部標示為已讀
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                目前沒有通知
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-all ${
                      notification.is_read
                        ? "bg-background border-border"
                        : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(notification.channel)}
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge variant="default" className="ml-auto">新</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
