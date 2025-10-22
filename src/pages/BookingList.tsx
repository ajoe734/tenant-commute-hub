import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Database, User, Car, HelpCircle } from 'lucide-react';

type BookingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  booking_number: string;
  scheduled_time: string;
  status: BookingStatus;
  pickup_address: string;
  dropoff_address: string;
  trip_type: string;
  preferred_vehicle_type: 'human_driver' | 'autonomous' | 'no_preference';
  actual_vehicle_type?: 'human_driver' | 'autonomous' | 'no_preference';
  vehicle_type_notes?: string;
  passengers: { name: string };
}

export default function BookingList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [generatingDemo, setGeneratingDemo] = useState(false);

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, statusFilter]);

  const fetchBookings = async () => {
    if (!profile?.tenant_id) return;

    try {
      let query = supabase
        .from('bookings')
        .select('*, passengers(name)')
        .eq('tenant_id', profile.tenant_id)
        .order('scheduled_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as BookingStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const statusLabels: Record<BookingStatus, string> = {
      scheduled: '已排程',
      in_progress: '進行中',
      completed: '已完成',
      cancelled: '已取消',
    };

    const variants: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      in_progress: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };

    return <Badge variant={variants[status]}>{statusLabels[status]}</Badge>;
  };

  const getVehicleTypeIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'human_driver':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'autonomous':
        return <Car className="h-4 w-4 text-green-600" />;
      case 'no_preference':
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getVehicleTypeLabel = (vehicleType: string) => {
    const labels: Record<string, string> = {
      human_driver: '人類司機',
      autonomous: '自駕車',
      no_preference: '無偏好',
    };
    return labels[vehicleType] || '未指定';
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('確定要取消此預約嗎？')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: '成功',
        description: '預約已取消',
      });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: '錯誤',
        description: '取消預約失敗',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateDemoData = async () => {
    setGeneratingDemo(true);
    try {
      const { error } = await supabase.functions.invoke('seed-demo-data');

      if (error) throw error;

      toast({
        title: '成功',
        description: 'Demo 資料已建立',
      });

      fetchBookings();
    } catch (error: any) {
      console.error('Error generating demo data:', error);
      toast({
        title: '錯誤',
        description: error.message || '建立 Demo 資料失敗',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDemo(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>預約管理</CardTitle>
            <Button onClick={() => navigate('/bookings/new')}>
              <Plus className="mr-2 h-4 w-4" />
              新增預約
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="依狀態篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="scheduled">已排程</SelectItem>
                <SelectItem value="in_progress">進行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                尚無預約記錄
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/bookings/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  建立第一筆預約
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateDemoData}
                  disabled={generatingDemo}
                >
                  <Database className="mr-2 h-4 w-4" />
                  {generatingDemo ? '產生中...' : '產生 Demo 資料'}
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>預約編號</TableHead>
                  <TableHead>乘客</TableHead>
                  <TableHead>上車地點</TableHead>
                  <TableHead>下車地點</TableHead>
                  <TableHead>預約時間</TableHead>
                  <TableHead>趟次類型</TableHead>
                  <TableHead>車輛類型</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono">{booking.booking_number}</TableCell>
                    <TableCell>{booking.passengers?.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{booking.pickup_address}</TableCell>
                    <TableCell className="max-w-xs truncate">{booking.dropoff_address}</TableCell>
                    <TableCell>
                      {new Date(booking.scheduled_time).toLocaleString('zh-TW')}
                    </TableCell>
                    <TableCell>
                      {booking.trip_type === 'one_way' ? '單程' : '來回'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getVehicleTypeIcon(booking.preferred_vehicle_type)}
                        <span className="text-sm">
                          {getVehicleTypeLabel(booking.preferred_vehicle_type)}
                        </span>
                        {booking.actual_vehicle_type && 
                         booking.actual_vehicle_type !== booking.preferred_vehicle_type && (
                          <Badge variant="outline" className="text-xs">
                            改派: {getVehicleTypeLabel(booking.actual_vehicle_type)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      {booking.status === 'scheduled' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          取消
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
