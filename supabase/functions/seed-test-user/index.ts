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
