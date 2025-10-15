import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const bookingSchema = z.object({
  passenger_id: z.string().min(1, 'Please select a passenger'),
  trip_type: z.enum(['one_way', 'round_trip']),
  pickup_address: z.string().min(1, 'Pickup address is required'),
  dropoff_address: z.string().min(1, 'Dropoff address is required'),
  scheduled_time: z.string().min(1, 'Scheduled time is required'),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrence_end_date: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function NewBooking() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      trip_type: 'one_way',
      is_recurring: false,
    },
  });

  const isRecurring = form.watch('is_recurring');

  useEffect(() => {
    const fetchPassengers = async () => {
      if (!profile?.tenant_id) return;
      
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching passengers:', error);
        toast({
          title: 'Error',
          description: 'Failed to load passengers',
          variant: 'destructive',
        });
      } else {
        setPassengers(data || []);
      }
    };

    fetchPassengers();
  }, [profile]);

  const onSubmit = async (data: BookingFormData) => {
    if (!user || !profile) return;

    setIsSubmitting(true);

    try {
      const bookingNumber = `BK${Date.now()}`;

      const bookingData = {
        tenant_id: profile.tenant_id,
        booking_number: bookingNumber,
        passenger_id: data.passenger_id,
        trip_type: data.trip_type,
        pickup_address: data.pickup_address,
        pickup_latitude: 0,
        pickup_longitude: 0,
        dropoff_address: data.dropoff_address,
        dropoff_latitude: 0,
        dropoff_longitude: 0,
        scheduled_time: data.scheduled_time,
        notes: data.notes,
        is_recurring: data.is_recurring,
        recurrence_frequency: data.is_recurring ? data.recurrence_frequency : null,
        recurrence_end_date: data.is_recurring ? data.recurrence_end_date : null,
        status: 'scheduled' as const,
        created_by: user.id,
      };

      const { error } = await supabase.from('bookings').insert([bookingData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      });

      navigate('/bookings');
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>New Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="passenger_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a passenger" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {passengers.map((passenger) => (
                          <SelectItem key={passenger.id} value={passenger.id}>
                            {passenger.name} - {passenger.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trip_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one_way">One Way</SelectItem>
                        <SelectItem value="round_trip">Round Trip</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickup_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter pickup address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dropoff_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dropoff Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter dropoff address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Recurring Booking</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <>
                  <FormField
                    control={form.control}
                    name="recurrence_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrence_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Booking'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/bookings')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
