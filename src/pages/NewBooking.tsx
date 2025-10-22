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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, MapPin, Clock, User, Car, HelpCircle, Info } from 'lucide-react';
import MapPicker from '@/components/MapPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const bookingSchema = z.object({
  passenger_id: z.string().min(1, '請選擇乘客'),
  trip_type: z.enum(['one_way', 'round_trip']),
  preferred_vehicle_type: z.enum(['human_driver', 'autonomous', 'no_preference']).default('no_preference'),
  pickup_address: z.string().min(1, '上車地址為必填'),
  pickup_address_id: z.string().optional(),
  pickup_latitude: z.number(),
  pickup_longitude: z.number(),
  dropoff_address: z.string().min(1, '下車地址為必填'),
  dropoff_address_id: z.string().optional(),
  dropoff_latitude: z.number(),
  dropoff_longitude: z.number(),
  scheduled_time: z.string().min(1, '預約時間為必填'),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrence_end_date: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface Address {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PriceEstimate {
  distance_km: number;
  estimated_cost: number;
  estimated_duration_minutes: number;
}

export default function NewBooking() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      trip_type: 'one_way',
      is_recurring: false,
      pickup_latitude: 25.0330,
      pickup_longitude: 121.5654,
      dropoff_latitude: 25.0330,
      dropoff_longitude: 121.5654,
    },
  });

  const isRecurring = form.watch('is_recurring');
  const pickupLat = form.watch('pickup_latitude');
  const pickupLng = form.watch('pickup_longitude');
  const dropoffLat = form.watch('dropoff_latitude');
  const dropoffLng = form.watch('dropoff_longitude');
  const tripType = form.watch('trip_type');
  const preferredVehicleType = form.watch('preferred_vehicle_type');

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      
      // Fetch passengers
      const { data: passengersData, error: passengersError } = await supabase
        .from('passengers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (passengersError) {
        console.error('Error fetching passengers:', passengersError);
      } else {
        setPassengers(passengersData || []);
      }

      // Fetch addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from('addresses')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      if (addressesError) {
        console.error('Error fetching addresses:', addressesError);
      } else {
        setAddresses(addressesData || []);
      }
    };

    fetchData();
  }, [profile]);

  // Auto-calculate price when coordinates or trip type change
  useEffect(() => {
    const calculatePrice = async () => {
      if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !tripType) return;
      
      setIsCalculatingPrice(true);
      try {
        const { data, error } = await supabase.functions.invoke('calculate-price', {
          body: {
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
            dropoff_lat: dropoffLat,
            dropoff_lng: dropoffLng,
            trip_type: tripType,
            preferred_vehicle_type: preferredVehicleType,
          },
        });

        if (error) throw error;
        if (data?.success) {
          setPriceEstimate({
            distance_km: data.distance_km,
            estimated_cost: data.estimated_cost,
            estimated_duration_minutes: data.estimated_duration_minutes,
          });
        }
      } catch (error) {
        console.error('Error calculating price:', error);
        setPriceEstimate(null);
      } finally {
        setIsCalculatingPrice(false);
      }
    };

    const debounce = setTimeout(calculatePrice, 500);
    return () => clearTimeout(debounce);
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, tripType, preferredVehicleType]);

  const handleSelectAddress = (type: 'pickup' | 'dropoff', address: Address) => {
    if (type === 'pickup') {
      form.setValue('pickup_address', address.address);
      form.setValue('pickup_address_id', address.id);
      form.setValue('pickup_latitude', address.latitude);
      form.setValue('pickup_longitude', address.longitude);
    } else {
      form.setValue('dropoff_address', address.address);
      form.setValue('dropoff_address_id', address.id);
      form.setValue('dropoff_latitude', address.latitude);
      form.setValue('dropoff_longitude', address.longitude);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!user || !profile) {
      toast({
        title: '錯誤',
        description: '請先登入',
        variant: 'destructive',
      });
      return;
    }

    // Autonomous vehicle confirmation
    if (data.preferred_vehicle_type === 'autonomous') {
      const confirmed = window.confirm(
        '您選擇了自駕車服務。\n\n' +
        '請注意：若路線不適合自駕車（如山區、工地、特殊限制區域），' +
        '系統可能改派人類司機，但仍會保留優惠折扣。\n\n' +
        '確定要繼續預約嗎？'
      );
      
      if (!confirmed) return;
    }

    setIsSubmitting(true);

    try {
      const bookingNumber = `BK${Date.now()}`;

      const bookingData = {
        tenant_id: profile.tenant_id,
        booking_number: bookingNumber,
        passenger_id: data.passenger_id,
        trip_type: data.trip_type,
        preferred_vehicle_type: data.preferred_vehicle_type,
        pickup_address: data.pickup_address,
        pickup_address_id: data.pickup_address_id || null,
        pickup_latitude: data.pickup_latitude,
        pickup_longitude: data.pickup_longitude,
        dropoff_address: data.dropoff_address,
        dropoff_address_id: data.dropoff_address_id || null,
        dropoff_latitude: data.dropoff_latitude,
        dropoff_longitude: data.dropoff_longitude,
        scheduled_time: data.scheduled_time,
        estimated_cost: priceEstimate?.estimated_cost || null,
        estimated_duration_minutes: priceEstimate?.estimated_duration_minutes || null,
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
        title: '建立成功',
        description: `預約已成功建立${data.preferred_vehicle_type === 'autonomous' ? '（已選擇自駕車優惠）' : ''}`,
      });

      navigate('/bookings');
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: '建立失敗',
        description: error.message || '無法建立預約',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>新增預約</CardTitle>
          <CardDescription>建立新的用車預約</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="passenger_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>乘客 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="選擇乘客" />
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
                      <FormLabel>趟次類型 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one_way">單程</SelectItem>
                          <SelectItem value="round_trip">來回</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferred_vehicle_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>偏好用車類型 *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent transition-colors">
                          <RadioGroupItem value="human_driver" id="human_driver" />
                          <Label htmlFor="human_driver" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">人類司機</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              由專業司機服務，適合需要協助搬運或特殊需求
                            </p>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent transition-colors">
                          <RadioGroupItem value="autonomous" id="autonomous" />
                          <Label htmlFor="autonomous" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              <span className="font-medium">自駕車</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              智能自動駕駛車輛，環保且可能享有折扣優惠
                            </p>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-accent transition-colors">
                          <RadioGroupItem value="no_preference" id="no_preference" />
                          <Label htmlFor="no_preference" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              <span className="font-medium">無偏好</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              系統自動分配最佳車輛類型
                            </p>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    
                    {field.value === 'autonomous' && (
                      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-300">
                          自駕車服務可享 <strong>9折優惠</strong>。若您的路線不適合自駕車（如特殊地形、施工路段），系統可能改派人類司機。
                        </AlertDescription>
                      </Alert>
                    )}
                  </FormItem>
                )}
              />

              {/* Pickup Location */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    上車地點
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="manual">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="saved">從地址簿選擇</TabsTrigger>
                      <TabsTrigger value="manual">手動輸入</TabsTrigger>
                    </TabsList>
                    <TabsContent value="saved" className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {addresses.map((address) => (
                          <Button
                            key={address.id}
                            type="button"
                            variant="outline"
                            className="justify-start text-left h-auto py-2"
                            onClick={() => handleSelectAddress('pickup', address)}
                          >
                            <div>
                              <div className="font-semibold">{address.name}</div>
                              <div className="text-xs text-muted-foreground">{address.address}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="manual" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="pickup_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>地址 *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="輸入完整地址" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <FormLabel>地圖選點</FormLabel>
                        <MapPicker
                          onLocationSelect={(lat, lng, address) => {
                            form.setValue('pickup_latitude', lat);
                            form.setValue('pickup_longitude', lng);
                            form.setValue('pickup_address', address);
                          }}
                          initialLat={pickupLat}
                          initialLng={pickupLng}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Dropoff Location */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-destructive" />
                    下車地點
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="manual">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="saved">從地址簿選擇</TabsTrigger>
                      <TabsTrigger value="manual">手動輸入</TabsTrigger>
                    </TabsList>
                    <TabsContent value="saved" className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {addresses.map((address) => (
                          <Button
                            key={address.id}
                            type="button"
                            variant="outline"
                            className="justify-start text-left h-auto py-2"
                            onClick={() => handleSelectAddress('dropoff', address)}
                          >
                            <div>
                              <div className="font-semibold">{address.name}</div>
                              <div className="text-xs text-muted-foreground">{address.address}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="manual" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dropoff_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>地址 *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="輸入完整地址" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <FormLabel>地圖選點</FormLabel>
                        <MapPicker
                          onLocationSelect={(lat, lng, address) => {
                            form.setValue('dropoff_latitude', lat);
                            form.setValue('dropoff_longitude', lng);
                            form.setValue('dropoff_address', address);
                          }}
                          initialLat={dropoffLat}
                          initialLng={dropoffLng}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Price Estimate */}
              {priceEstimate && (
                <Card className="bg-gradient-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">距離</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {priceEstimate.distance_km} km
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">預估費用</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          NT$ {priceEstimate.estimated_cost}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">預估時間</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {priceEstimate.estimated_duration_minutes} 分鐘
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>預約時間 *</FormLabel>
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
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="其他需求或備註" />
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
                      <FormLabel>循環預約</FormLabel>
                      <FormDescription>設定定期重複的預約</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="recurrence_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>頻率 *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="選擇頻率" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">每日</SelectItem>
                            <SelectItem value="weekly">每週</SelectItem>
                            <SelectItem value="monthly">每月</SelectItem>
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
                        <FormLabel>結束日期 *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting || isCalculatingPrice} className="bg-gradient-primary">
                  {isSubmitting ? '建立中...' : '建立預約'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/bookings')}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
