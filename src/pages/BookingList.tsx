import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Calendar, MapPin, Clock, User, Edit, Trash2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BookingList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bookings = [
    {
      id: "BK-2024-0847",
      date: "2024-10-15",
      time: "14:30",
      passenger: "陳小明",
      department: "業務部",
      route: "總部辦公室 → 機場第三航廈",
      distance: "42 公里",
      status: "scheduled",
      vehicle: "轎車",
      cost: "$85",
      eta: "14:20"
    },
    {
      id: "BK-2024-0846",
      date: "2024-10-15",
      time: "10:00",
      passenger: "林小華",
      department: "行銷部",
      route: "會議中心 → 市中心飯店",
      distance: "8 公里",
      status: "completed",
      vehicle: "休旅車",
      cost: "$35",
      eta: "-"
    },
    {
      id: "BK-2024-0845",
      date: "2024-10-15",
      time: "08:15",
      passenger: "王大維",
      department: "工程部",
      route: "住宅區 → 辦公園區",
      distance: "15 公里",
      status: "in-progress",
      vehicle: "轎車",
      cost: "$42",
      eta: "5 分鐘"
    },
    {
      id: "BK-2024-0844",
      date: "2024-10-14",
      time: "18:30",
      passenger: "周小美",
      department: "人資部",
      route: "辦公大樓 → 火車站",
      distance: "12 公里",
      status: "completed",
      vehicle: "轎車",
      cost: "$38",
      eta: "-"
    },
    {
      id: "BK-2024-0843",
      date: "2024-10-14",
      time: "15:00",
      passenger: "劉大衛",
      department: "財務部",
      route: "客戶辦公室 → 公司總部",
      distance: "25 公里",
      status: "completed",
      vehicle: "休旅車",
      cost: "$68",
      eta: "-"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "已預約", variant: "default" },
      "in-progress": { label: "進行中", variant: "secondary" },
      completed: { label: "已完成", variant: "outline" },
      cancelled: { label: "已取消", variant: "destructive" }
    };
    
    const variant = variants[status] || variants.scheduled;
    return <Badge variant={variant.variant}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">預約管理</h2>
          <p className="text-muted-foreground">查看、編輯和追蹤所有預約</p>
        </div>
        <Button onClick={() => navigate("/bookings/new")} className="bg-gradient-primary shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" />
          建立預約
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>所有預約</CardTitle>
              <CardDescription>管理和追蹤您的運輸請求</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                篩選
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                匯出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋預約編號、乘客或路線..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有狀態</SelectItem>
                <SelectItem value="scheduled">已預約</SelectItem>
                <SelectItem value="in-progress">進行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>預約編號</TableHead>
                  <TableHead>日期時間</TableHead>
                  <TableHead>乘客</TableHead>
                  <TableHead>路線</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>預計到達</TableHead>
                  <TableHead>費用</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {booking.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {booking.time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {booking.passenger}
                        </span>
                        <span className="text-xs text-muted-foreground">{booking.department}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 text-sm max-w-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{booking.route}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{booking.distance}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      {booking.eta !== "-" ? (
                        <span className="text-sm font-medium text-primary">{booking.eta}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{booking.cost}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingList;
