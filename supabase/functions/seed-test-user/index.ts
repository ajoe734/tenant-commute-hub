import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestUserConfig {
  email: string
  password: string
  fullName: string
  companyName: string
}

const TEST_USER: TestUserConfig = {
  email: 'test@example.com',
  password: 'test1234',
  fullName: '測試帳號',
  companyName: 'Demo 公司',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('Creating/updating test user:', TEST_USER.email)

    // Try to get existing user first
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    let userId: string | null = null
    const existingUser = existingUsers?.users?.find((u) => u.email === TEST_USER.email)

    if (existingUser) {
      console.log('Test user already exists:', existingUser.id)
      userId = existingUser.id
    } else {
      // Create new user with email confirmation bypassed
      console.log('Creating new test user...')
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: {
          full_name: TEST_USER.fullName,
          company_name: TEST_USER.companyName,
        },
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }

      userId = newUser.user.id
      console.log('User created successfully:', userId)
    }

    if (!userId) {
      throw new Error('Failed to get user ID')
    }

    // Get or create tenant
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('email', TEST_USER.email)
      .maybeSingle()

    let tenantId: string

    if (existingTenant) {
      tenantId = existingTenant.id
      console.log('Using existing tenant:', tenantId)
    } else {
      const { data: newTenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          name: TEST_USER.companyName,
          email: TEST_USER.email,
        })
        .select('id')
        .single()

      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        throw tenantError
      }

      tenantId = newTenant.id
      console.log('Tenant created:', tenantId)
    }

    // Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          tenant_id: tenantId,
          full_name: TEST_USER.fullName,
          email: TEST_USER.email,
        },
        {
          onConflict: 'id',
        }
      )

    if (profileError) {
      console.error('Error upserting profile:', profileError)
      throw profileError
    }

    console.log('Profile upserted successfully')

    // Check if user already has admin role
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!existingRole) {
      // Insert admin role
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'admin',
      })

      if (roleError) {
        console.error('Error creating role:', roleError)
        throw roleError
      }

      console.log('Admin role assigned')
    } else {
      console.log('Admin role already exists')
    }

    // ========== 建立 Demo 資料 ==========
    console.log('Creating demo data...')

    // 1. 成本中心
    const costCenters = [
      { code: 'CC-001', name: '業務部', description: '負責客戶開發與維護' },
      { code: 'CC-002', name: '研發部', description: '產品研發與技術創新' },
      { code: 'CC-003', name: '行政部', description: '行政庶務與總務管理' },
      { code: 'CC-004', name: '財務部', description: '財務規劃與會計管理' },
      { code: 'CC-005', name: '人資部', description: '人力資源與招募訓練' },
    ]

    const insertedCostCenters = []
    for (const cc of costCenters) {
      const { data: existing } = await supabaseAdmin
        .from('cost_centers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', cc.code)
        .maybeSingle()

      if (!existing) {
        const { data, error } = await supabaseAdmin
          .from('cost_centers')
          .insert({ ...cc, tenant_id: tenantId })
          .select('id')
          .single()

        if (!error && data) {
          insertedCostCenters.push(data.id)
        }
      }
    }
    console.log('Cost centers created')

    // 2. 乘客
    const passengers = [
      { name: '陳小明', phone: '0912-345-678', email: 'chen@demo.com', department: '業務部' },
      { name: '林小華', phone: '0923-456-789', email: 'lin@demo.com', department: '研發部' },
      { name: '王大維', phone: '0934-567-890', email: 'wang@demo.com', department: '行政部' },
      { name: '周小美', phone: '0945-678-901', email: 'zhou@demo.com', department: '財務部' },
      { name: '張志偉', phone: '0956-789-012', email: 'zhang@demo.com', department: '人資部' },
      { name: '劉小芬', phone: '0967-890-123', email: 'liu@demo.com', department: '業務部' },
      { name: '黃建國', phone: '0978-901-234', email: 'huang@demo.com', department: '研發部' },
    ]

    const insertedPassengers = []
    for (const passenger of passengers) {
      const { data: existing } = await supabaseAdmin
        .from('passengers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', passenger.email)
        .maybeSingle()

      if (!existing) {
        const { data, error } = await supabaseAdmin
          .from('passengers')
          .insert({
            ...passenger,
            tenant_id: tenantId,
            cost_center_id: insertedCostCenters[Math.floor(Math.random() * insertedCostCenters.length)],
          })
          .select('id')
          .single()

        if (!error && data) {
          insertedPassengers.push(data.id)
        }
      }
    }
    console.log('Passengers created')

    // 3. 地址
    const addresses = [
      {
        name: '台北車站',
        address: '台北市中正區北平西路3號',
        latitude: 25.047908,
        longitude: 121.517315,
        tags: ['車站', '交通樞紐'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '台北101',
        address: '台北市信義區信義路五段7號',
        latitude: 25.033976,
        longitude: 121.564472,
        tags: ['地標', '商業'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '松山機場',
        address: '台北市松山區敦化北路340-9號',
        latitude: 25.062814,
        longitude: 121.551804,
        tags: ['機場', '交通'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '桃園國際機場第一航廈',
        address: '桃園市大園區航站南路9號',
        latitude: 25.077731,
        longitude: 121.232822,
        tags: ['機場', '國際'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '南港軟體園區',
        address: '台北市南港區三重路19-11號',
        latitude: 25.059611,
        longitude: 121.615556,
        tags: ['辦公', '科技園區'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '內湖科技園區',
        address: '台北市內湖區瑞光路',
        latitude: 25.079861,
        longitude: 121.579167,
        tags: ['辦公', '科技園區'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '信義威秀影城',
        address: '台北市信義區松壽路20號',
        latitude: 25.036944,
        longitude: 121.567778,
        tags: ['娛樂', '商業'],
        visible_to_roles: ['admin', 'manager', 'user'],
      },
      {
        name: '台北市政府',
        address: '台北市信義區市府路1號',
        latitude: 25.037778,
        longitude: 121.565,
        tags: ['政府', '公務'],
        visible_to_roles: ['admin', 'manager'],
      },
    ]

    const insertedAddresses = []
    for (const addr of addresses) {
      const { data: existing } = await supabaseAdmin
        .from('addresses')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', addr.name)
        .maybeSingle()

      if (!existing) {
        const { data, error } = await supabaseAdmin
          .from('addresses')
          .insert({
            ...addr,
            tenant_id: tenantId,
            created_by: userId,
          })
          .select('id')
          .single()

        if (!error && data) {
          insertedAddresses.push(data.id)
        }
      }
    }
    console.log('Addresses created')

    // 4. 預約記錄
    if (insertedPassengers.length > 0 && insertedAddresses.length > 1) {
      const bookings = [
        {
          booking_number: 'BK-2025-001',
          trip_type: 'one_way',
          scheduled_time: new Date(Date.now() + 86400000).toISOString(), // 明天
          status: 'scheduled',
          estimated_duration_minutes: 30,
          estimated_cost: 450,
          notes: 'VIP 客戶',
        },
        {
          booking_number: 'BK-2025-002',
          trip_type: 'round_trip',
          scheduled_time: new Date(Date.now() + 172800000).toISOString(), // 後天
          status: 'scheduled',
          estimated_duration_minutes: 45,
          estimated_cost: 850,
        },
        {
          booking_number: 'BK-2025-003',
          trip_type: 'one_way',
          scheduled_time: new Date(Date.now() - 86400000).toISOString(), // 昨天
          status: 'completed',
          estimated_duration_minutes: 35,
          estimated_cost: 500,
          actual_cost: 480,
        },
        {
          booking_number: 'BK-2025-004',
          trip_type: 'one_way',
          scheduled_time: new Date(Date.now() - 172800000).toISOString(), // 前天
          status: 'cancelled',
          estimated_duration_minutes: 25,
          estimated_cost: 400,
        },
        {
          booking_number: 'BK-2025-005',
          trip_type: 'round_trip',
          scheduled_time: new Date().toISOString(), // 今天
          status: 'in_progress',
          estimated_duration_minutes: 60,
          estimated_cost: 1200,
        },
      ]

      for (const booking of bookings) {
        const { data: existing } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_number', booking.booking_number)
          .maybeSingle()

        if (!existing) {
          const pickupIdx = Math.floor(Math.random() * insertedAddresses.length)
          let dropoffIdx = Math.floor(Math.random() * insertedAddresses.length)
          while (dropoffIdx === pickupIdx) {
            dropoffIdx = Math.floor(Math.random() * insertedAddresses.length)
          }

          await supabaseAdmin.from('bookings').insert({
            ...booking,
            tenant_id: tenantId,
            passenger_id: insertedPassengers[Math.floor(Math.random() * insertedPassengers.length)],
            pickup_address_id: insertedAddresses[pickupIdx],
            pickup_address: addresses[pickupIdx].address,
            pickup_latitude: addresses[pickupIdx].latitude,
            pickup_longitude: addresses[pickupIdx].longitude,
            dropoff_address_id: insertedAddresses[dropoffIdx],
            dropoff_address: addresses[dropoffIdx].address,
            dropoff_latitude: addresses[dropoffIdx].latitude,
            dropoff_longitude: addresses[dropoffIdx].longitude,
            cost_center_id: insertedCostCenters[Math.floor(Math.random() * insertedCostCenters.length)],
            created_by: userId,
          })
        }
      }
      console.log('Bookings created')
    }

    // 5. 發票記錄
    const invoices = [
      {
        invoice_number: 'INV-2024-12',
        period_start: '2024-12-01',
        period_end: '2024-12-31',
        total_amount: 15800,
        tax_amount: 790,
        paid_at: new Date('2025-01-05').toISOString(),
      },
      {
        invoice_number: 'INV-2025-01',
        period_start: '2025-01-01',
        period_end: '2025-01-31',
        total_amount: 18500,
        tax_amount: 925,
        paid_at: new Date('2025-02-03').toISOString(),
      },
      {
        invoice_number: 'INV-2025-02',
        period_start: '2025-02-01',
        period_end: '2025-02-28',
        total_amount: 16200,
        tax_amount: 810,
      },
    ]

    for (const invoice of invoices) {
      const { data: existing } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('invoice_number', invoice.invoice_number)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from('invoices').insert({
          ...invoice,
          tenant_id: tenantId,
        })
      }
    }
    console.log('Invoices created')

    // 6. 通知記錄
    const notifications = [
      {
        title: '預約已確認',
        message: '您的預約 BK-2025-001 已確認',
        event_type: 'booking_confirmed',
        channel: 'in_app',
        is_read: false,
        sent_at: new Date().toISOString(),
      },
      {
        title: '預約已完成',
        message: '您的預約 BK-2025-003 已順利完成',
        event_type: 'booking_completed',
        channel: 'in_app',
        is_read: true,
        sent_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        title: '預約已取消',
        message: '您的預約 BK-2025-004 已取消',
        event_type: 'booking_cancelled',
        channel: 'in_app',
        is_read: true,
        sent_at: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        title: '新發票產生',
        message: '您的 2025 年 2 月發票已產生',
        event_type: 'invoice_generated',
        channel: 'email',
        is_read: false,
        sent_at: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        title: '系統維護通知',
        message: '系統將於本週日凌晨 2-4 點進行維護',
        event_type: 'system_maintenance',
        channel: 'in_app',
        is_read: false,
        sent_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ]

    for (const notif of notifications) {
      await supabaseAdmin.from('notifications').insert({
        ...notif,
        tenant_id: tenantId,
        user_id: userId,
      })
    }
    console.log('Notifications created')

    // 7. 報表記錄
    const reports = [
      {
        name: '2025年1月營運報表',
        report_type: 'monthly_summary',
        format: 'pdf',
        parameters: { month: '2025-01' },
        last_run_at: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        name: '費用分析報表',
        report_type: 'cost_analysis',
        format: 'excel',
        parameters: { start_date: '2025-01-01', end_date: '2025-01-31' },
        last_run_at: new Date(Date.now() - 259200000).toISOString(),
      },
    ]

    for (const report of reports) {
      const { data: existing } = await supabaseAdmin
        .from('reports')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', report.name)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from('reports').insert({
          ...report,
          tenant_id: tenantId,
          created_by: userId,
        })
      }
    }
    console.log('Reports created')

    console.log('Demo data creation completed')

    return new Response(
      JSON.stringify({
        ok: true,
        email: TEST_USER.email,
        password: TEST_USER.password,
        message: '測試帳號已就緒',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in seed-test-user:', error)
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
