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
import { Plus } from 'lucide-react';

type BookingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  booking_number: string;
  scheduled_time: string;
  status: BookingStatus;
  pickup_address: string;
  dropoff_address: string;
  trip_type: string;
  passengers: { name: string };
}

export default function BookingList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
    const variants: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      in_progress: 'secondary',
      completed: 'outline',
      cancelled: 'destructive',
    };

    return <Badge variant={variants[status]}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking cancelled successfully',
      });
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bookings</CardTitle>
            <Button onClick={() => navigate('/bookings/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bookings found. Create your first booking to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Dropoff</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.booking_number}</TableCell>
                    <TableCell>{booking.passengers?.name}</TableCell>
                    <TableCell>{booking.pickup_address}</TableCell>
                    <TableCell>{booking.dropoff_address}</TableCell>
                    <TableCell>
                      {new Date(booking.scheduled_time).toLocaleString()}
                    </TableCell>
                    <TableCell>{booking.trip_type.replace('_', ' ')}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      {booking.status === 'scheduled' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          Cancel
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
