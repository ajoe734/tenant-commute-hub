import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Create admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to get current user from JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user from JWT
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error('未授權：無法取得使用者資訊');
    }

    console.log('🔍 當前使用者:', user.email);

    // Get user's tenant_id from profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('無法取得使用者的租戶資訊');
    }

    const tenantId = profile.tenant_id;
    console.log('🏢 租戶 ID:', tenantId);

    // Check if demo data already exists
    const { data: existingBookings } = await adminClient
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      console.log('⚠️ Demo 資料已存在，跳過建立');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo 資料已存在',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 開始建立 Demo 資料...');

    // 1. Create Cost Centers
    const costCenters = [
      { code: 'CC-001', name: '業務部', description: '負責客戶開發與維護' },
      { code: 'CC-002', name: '研發部', description: '產品研發與技術創新' },
      { code: 'CC-003', name: '行政部', description: '行政庶務與總務管理' },
      { code: 'CC-004', name: '財務部', description: '財務規劃與會計管理' },
      { code: 'CC-005', name: '人資部', description: '人力資源與招募訓練' },
    ];

    console.log('💼 建立成本中心...');
    const { data: createdCostCenters, error: costCentersError } = await adminClient
      .from('cost_centers')
      .insert(
        costCenters.map(cc => ({
          ...cc,
          tenant_id: tenantId,
          is_active: true,
        }))
      )
      .select();

    if (costCentersError) throw costCentersError;
    console.log(`✅ 已建立 ${createdCostCenters.length} 個成本中心`);

    // 2. Create Passengers
    const passengers = [
      { name: '陳小明', phone: '0912-345-678', email: 'chen@demo.com', department: '業務部', cost_center_id: createdCostCenters[0].id },
      { name: '林小華', phone: '0923-456-789', email: 'lin@demo.com', department: '研發部', cost_center_id: createdCostCenters[1].id },
      { name: '王大維', phone: '0934-567-890', email: 'wang@demo.com', department: '行政部', cost_center_id: createdCostCenters[2].id },
      { name: '周小美', phone: '0945-678-901', email: 'zhou@demo.com', department: '財務部', cost_center_id: createdCostCenters[3].id },
      { name: '張志偉', phone: '0956-789-012', email: 'zhang@demo.com', department: '人資部', cost_center_id: createdCostCenters[4].id },
      { name: '劉佳玲', phone: '0967-890-123', email: 'liu@demo.com', department: '業務部', cost_center_id: createdCostCenters[0].id },
      { name: '黃建國', phone: '0978-901-234', email: 'huang@demo.com', department: '研發部', cost_center_id: createdCostCenters[1].id },
    ];

    console.log('👥 建立乘客資料...');
    const { data: createdPassengers, error: passengersError } = await adminClient
      .from('passengers')
      .insert(
        passengers.map(p => ({
          ...p,
          tenant_id: tenantId,
          is_active: true,
        }))
      )
      .select();

    if (passengersError) throw passengersError;
    console.log(`✅ 已建立 ${createdPassengers.length} 位乘客`);

    // 3. Create Addresses
    const addresses = [
      { name: '台北車站', address: '台北市中正區北平西路3號', latitude: 25.0478, longitude: 121.5170 },
      { name: '台北101', address: '台北市信義區信義路五段7號', latitude: 25.0330, longitude: 121.5654 },
      { name: '松山機場', address: '台北市松山區敦化北路340-9號', latitude: 25.0627, longitude: 121.5524 },
      { name: '桃園國際機場第一航廈', address: '桃園市大園區航站南路9號', latitude: 25.0797, longitude: 121.2342 },
      { name: '南港軟體園區', address: '台北市南港區三重路19-11號', latitude: 25.0571, longitude: 121.6154 },
      { name: '內湖科技園區', address: '台北市內湖區瑞光路', latitude: 25.0794, longitude: 121.5795 },
      { name: '信義威秀影城', address: '台北市信義區松壽路20號', latitude: 25.0364, longitude: 121.5668 },
      { name: '台北市政府', address: '台北市信義區市府路1號', latitude: 25.0378, longitude: 121.5645 },
      { name: '西門町商圈', address: '台北市萬華區成都路', latitude: 25.0421, longitude: 121.5069 },
      { name: '士林夜市', address: '台北市士林區基河路', latitude: 25.0879, longitude: 121.5242 },
    ];

    console.log('📍 建立地址資料...');
    const { data: createdAddresses, error: addressesError } = await adminClient
      .from('addresses')
      .insert(
        addresses.map(addr => ({
          ...addr,
          tenant_id: tenantId,
          created_by: user.id,
          tags: ['常用地點'],
          visible_to_roles: ['admin', 'manager', 'user'],
        }))
      )
      .select();

    if (addressesError) throw addressesError;
    console.log(`✅ 已建立 ${createdAddresses.length} 個地址`);

    // 4. Create Bookings
    const now = new Date();
    const bookings = [
      {
        passenger_id: createdPassengers[0].id,
        pickup_address_id: createdAddresses[0].id,
        pickup_address: createdAddresses[0].address,
        pickup_latitude: createdAddresses[0].latitude,
        pickup_longitude: createdAddresses[0].longitude,
        dropoff_address_id: createdAddresses[3].id,
        dropoff_address: createdAddresses[3].address,
        dropoff_latitude: createdAddresses[3].latitude,
        dropoff_longitude: createdAddresses[3].longitude,
        scheduled_time: new Date(now.getTime() + 86400000).toISOString(), // 明天
        trip_type: 'one_way',
        status: 'scheduled',
        estimated_cost: 1200,
        cost_center_id: createdCostCenters[0].id,
        booking_number: `BK${Date.now()}001`,
        preferred_vehicle_type: 'human_driver',
        actual_vehicle_type: 'human_driver',
      },
      {
        passenger_id: createdPassengers[1].id,
        pickup_address_id: createdAddresses[4].id,
        pickup_address: createdAddresses[4].address,
        pickup_latitude: createdAddresses[4].latitude,
        pickup_longitude: createdAddresses[4].longitude,
        dropoff_address_id: createdAddresses[1].id,
        dropoff_address: createdAddresses[1].address,
        dropoff_latitude: createdAddresses[1].latitude,
        dropoff_longitude: createdAddresses[1].longitude,
        scheduled_time: new Date(now.getTime() - 86400000).toISOString(), // 昨天
        trip_type: 'one_way',
        status: 'completed',
        estimated_cost: 350,
        actual_cost: 315, // 自駕車 10% 折扣
        cost_center_id: createdCostCenters[1].id,
        booking_number: `BK${Date.now()}002`,
        preferred_vehicle_type: 'autonomous',
        actual_vehicle_type: 'autonomous',
      },
      {
        passenger_id: createdPassengers[2].id,
        pickup_address_id: createdAddresses[5].id,
        pickup_address: createdAddresses[5].address,
        pickup_latitude: createdAddresses[5].latitude,
        pickup_longitude: createdAddresses[5].longitude,
        dropoff_address_id: createdAddresses[2].id,
        dropoff_address: createdAddresses[2].address,
        dropoff_latitude: createdAddresses[2].latitude,
        dropoff_longitude: createdAddresses[2].longitude,
        scheduled_time: now.toISOString(),
        trip_type: 'round_trip',
        status: 'in_progress',
        estimated_cost: 800,
        cost_center_id: createdCostCenters[2].id,
        booking_number: `BK${Date.now()}003`,
        preferred_vehicle_type: 'autonomous',
        actual_vehicle_type: 'human_driver',
        vehicle_type_notes: '因路線不適合自駕車，已改派人類司機（保留優惠折扣）',
      },
      {
        passenger_id: createdPassengers[3].id,
        pickup_address_id: createdAddresses[7].id,
        pickup_address: createdAddresses[7].address,
        pickup_latitude: createdAddresses[7].latitude,
        pickup_longitude: createdAddresses[7].longitude,
        dropoff_address_id: createdAddresses[0].id,
        dropoff_address: createdAddresses[0].address,
        dropoff_latitude: createdAddresses[0].latitude,
        dropoff_longitude: createdAddresses[0].longitude,
        scheduled_time: new Date(now.getTime() - 172800000).toISOString(), // 2天前
        trip_type: 'one_way',
        status: 'cancelled',
        estimated_cost: 300,
        cost_center_id: createdCostCenters[3].id,
        booking_number: `BK${Date.now()}004`,
        preferred_vehicle_type: 'no_preference',
      },
      {
        passenger_id: createdPassengers[4].id,
        pickup_address_id: createdAddresses[8].id,
        pickup_address: createdAddresses[8].address,
        pickup_latitude: createdAddresses[8].latitude,
        pickup_longitude: createdAddresses[8].longitude,
        dropoff_address_id: createdAddresses[9].id,
        dropoff_address: createdAddresses[9].address,
        dropoff_latitude: createdAddresses[9].latitude,
        dropoff_longitude: createdAddresses[9].longitude,
        scheduled_time: new Date(now.getTime() + 172800000).toISOString(), // 後天
        trip_type: 'round_trip',
        status: 'scheduled',
        estimated_cost: 450,
        cost_center_id: createdCostCenters[4].id,
        booking_number: `BK${Date.now()}005`,
        preferred_vehicle_type: 'no_preference',
        actual_vehicle_type: 'autonomous',
      },
    ];

    console.log('🚗 建立預約記錄...');
    const { error: bookingsError } = await adminClient
      .from('bookings')
      .insert(
        bookings.map(b => ({
          ...b,
          tenant_id: tenantId,
          created_by: user.id,
        }))
      );

    if (bookingsError) throw bookingsError;
    console.log(`✅ 已建立 ${bookings.length} 筆預約`);

    // 5. Create Invoices
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    const invoices = [
      {
        invoice_number: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-001`,
        period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        total_amount: 3500,
        tax_amount: 175,
        paid_at: null,
      },
      {
        invoice_number: `INV-${lastMonth.getFullYear()}${String(lastMonth.getMonth() + 1).padStart(2, '0')}-001`,
        period_start: lastMonth.toISOString().split('T')[0],
        period_end: lastMonthEnd.toISOString().split('T')[0],
        total_amount: 4200,
        tax_amount: 210,
        paid_at: new Date(now.getTime() - 604800000).toISOString(), // 1週前
      },
      {
        invoice_number: `INV-${twoMonthsAgo.getFullYear()}${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}-001`,
        period_start: twoMonthsAgo.toISOString().split('T')[0],
        period_end: twoMonthsAgoEnd.toISOString().split('T')[0],
        total_amount: 3800,
        tax_amount: 190,
        paid_at: new Date(now.getTime() - 2592000000).toISOString(), // 1個月前
      },
    ];

    console.log('💰 建立發票記錄...');
    const { error: invoicesError } = await adminClient
      .from('invoices')
      .insert(
        invoices.map(inv => ({
          ...inv,
          tenant_id: tenantId,
        }))
      );

    if (invoicesError) throw invoicesError;
    console.log(`✅ 已建立 ${invoices.length} 筆發票`);

    // 6. Create Notifications
    const notifications = [
      {
        title: '預約確認',
        message: '您的預約 BK001 已確認，預計明天 09:00 出發',
        event_type: 'booking_created',
        channel: 'in_app',
        is_read: false,
      },
      {
        title: '預約完成',
        message: '預約 BK002 已完成，費用 $350',
        event_type: 'booking_completed',
        channel: 'in_app',
        is_read: true,
        sent_at: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        title: '預約取消',
        message: '預約 BK004 已取消',
        event_type: 'booking_cancelled',
        channel: 'in_app',
        is_read: true,
        sent_at: new Date(now.getTime() - 172800000).toISOString(),
      },
      {
        title: '發票已產生',
        message: `本月發票 INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-001 已產生，總金額 $3,500`,
        event_type: 'invoice_generated',
        channel: 'email',
        is_read: false,
      },
      {
        title: '系統維護通知',
        message: '系統將於本週六凌晨 02:00-04:00 進行維護',
        event_type: 'system_notification',
        channel: 'in_app',
        is_read: false,
      },
    ];

    console.log('🔔 建立通知記錄...');
    const { error: notificationsError } = await adminClient
      .from('notifications')
      .insert(
        notifications.map(notif => ({
          ...notif,
          tenant_id: tenantId,
          user_id: user.id,
        }))
      );

    if (notificationsError) throw notificationsError;
    console.log(`✅ 已建立 ${notifications.length} 則通知`);

    // 7. Create Reports
    const reports = [
      {
        name: `月度營運報表 - ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        report_type: 'monthly_trips',
        format: 'pdf',
        last_run_at: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        name: `部門成本分析 - ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        report_type: 'department_cost',
        format: 'csv',
        last_run_at: new Date(now.getTime() - 172800000).toISOString(),
      },
    ];

    console.log('📊 建立報表記錄...');
    const { error: reportsError } = await adminClient
      .from('reports')
      .insert(
        reports.map(rep => ({
          ...rep,
          tenant_id: tenantId,
          created_by: user.id,
          is_active: true,
        }))
      );

    if (reportsError) throw reportsError;
    console.log(`✅ 已建立 ${reports.length} 筆報表`);

    console.log('🎉 Demo 資料建立完成！');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo 資料建立成功',
        data: {
          costCenters: createdCostCenters.length,
          passengers: createdPassengers.length,
          addresses: createdAddresses.length,
          bookings: bookings.length,
          invoices: invoices.length,
          notifications: notifications.length,
          reports: reports.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
