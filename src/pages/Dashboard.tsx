import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, DollarSign, MapPin, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: "本月趟次",
      value: "124",
      change: "+12%",
      trend: "up",
      icon: Calendar,
      color: "primary"
    },
    {
      title: "總里程",
      value: "3,847 公里",
      change: "+8%",
      trend: "up",
      icon: MapPin,
      color: "accent"
    },
    {
      title: "本月費用",
      value: "$18,924",
      change: "-3%",
      trend: "down",
      icon: DollarSign,
      color: "success"
    },
    {
      title: "平均等待時間",
      value: "4.2 分鐘",
      change: "-15%",
      trend: "down",
      icon: Clock,
      color: "warning"
    }
  ];

  const recentBookings = [
    {
      id: "BK-2024-0847",
      passenger: "陳小明",
      date: "2024-10-15 14:30",
      route: "總部辦公室 → 機場第三航廈",
      status: "scheduled",
      eta: "14:20"
    },
    {
      id: "BK-2024-0846",
      passenger: "林小華",
      date: "2024-10-15 10:00",
      route: "會議中心 → 市中心飯店",
      status: "completed",
      eta: "-"
    },
    {
      id: "BK-2024-0845",
      passenger: "王大維",
      date: "2024-10-15 08:15",
      route: "住宅區 → 辦公園區",
      status: "in-progress",
      eta: "5 分鐘"
    },
    {
      id: "BK-2024-0844",
      passenger: "周小美",
      date: "2024-10-14 18:30",
      route: "辦公大樓 → 火車站",
      status: "completed",
      eta: "-"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      scheduled: { label: "已預約", className: "bg-primary/10 text-primary" },
      "in-progress": { label: "進行中", className: "bg-accent/10 text-accent" },
      completed: { label: "已完成", className: "bg-success/10 text-success" },
      cancelled: { label: "已取消", className: "bg-destructive/10 text-destructive" }
    };
    
    const variant = variants[status] || variants.scheduled;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variant.className}`}>
        {status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {variant.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">歡迎回來</h2>
          <p className="text-muted-foreground">今日車隊動態總覽</p>
        </div>
        <Button onClick={() => navigate("/bookings/new")} className="bg-gradient-primary shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" />
          快速預約
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="transition-all hover:shadow-md animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg bg-${stat.color}/10`}>
                  <Icon className={`h-4 w-4 text-${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className={`mr-1 h-3 w-3 ${stat.trend === 'up' ? 'text-success' : 'text-destructive rotate-180'}`} />
                  <span className={stat.trend === 'up' ? 'text-success' : 'text-destructive'}>{stat.change}</span>
                  <span className="ml-1">較上月</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近預約</CardTitle>
            <CardDescription>最新的行程請求及其狀態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-gradient-subtle hover:shadow-sm transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-foreground">{booking.passenger}</p>
                      <span className="text-xs text-muted-foreground">{booking.id}</span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {booking.route}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {booking.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {booking.eta !== "-" && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">預計到達</p>
                        <p className="font-medium text-foreground">{booking.eta}</p>
                      </div>
                    )}
                    {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-gradient-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            快速提示
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • 您可以為固定路線設定週期性預約以節省時間
          </p>
          <p className="text-sm text-muted-foreground">
            • 啟用 webhook 通知以整合您的內部系統
          </p>
          <p className="text-sm text-muted-foreground">
            • 下載月度報表以進行費用追蹤和分析
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
