import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUserConfig {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

const TEST_USER: TestUserConfig = {
  email: 'test@example.com',
  password: 'test123456',
  fullName: '測試使用者',
  companyName: 'Demo 公司',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🔍 檢查測試帳號是否存在...');

    // Check if test user already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const testUser = existingUser?.users.find(u => u.email === TEST_USER.email);

    let userId: string;
    let tenantId: string;

    if (testUser) {
      console.log('✅ 測試帳號已存在');
      userId = testUser.id;
      
      // Get tenant_id from profile
      const { data: profile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();
      
      if (!profile) {
        throw new Error('無法取得測試帳號的租戶資訊');
      }
      
      tenantId = profile.tenant_id;
    } else {
      console.log('📝 建立新的測試帳號...');
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: {
          full_name: TEST_USER.fullName,
          company_name: TEST_USER.companyName,
        },
      });

      if (createError || !newUser.user) {
        console.error('❌ 建立使用者失敗:', createError);
        throw createError || new Error('Failed to create user');
      }

      userId = newUser.user.id;
      console.log('✅ 測試帳號建立成功');

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: profile } = await adminClient
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();
      
      if (!profile) {
        throw new Error('無法取得新建立帳號的租戶資訊');
      }
      
      tenantId = profile.tenant_id;
    }

    // Call seed-demo-data function to populate demo data
    console.log('📊 呼叫 seed-demo-data 建立 Demo 資料...');
    
    try {
      // Sign in as test user to get access token
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      if (signInError || !signInData.session) {
        console.log('⚠️ 無法登入測試帳號，跳過 Demo 資料建立');
      } else {
        // Call seed-demo-data function with test user's token
        const demoResponse = await fetch(`${supabaseUrl}/functions/v1/seed-demo-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${signInData.session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        const demoResult = await demoResponse.json();
        if (demoResult.success) {
          console.log('✅ Demo 資料建立成功');
        } else if (demoResult.skipped) {
          console.log('ℹ️ Demo 資料已存在');
        } else {
          console.log('⚠️ Demo 資料建立失敗:', demoResult.error);
        }
      }
    } catch (demoError: any) {
      console.log('⚠️ 建立 Demo 資料時發生錯誤:', demoError.message);
    }

    console.log('🎉 測試帳號設定完成！');

    return new Response(
      JSON.stringify({
        success: true,
        message: '測試帳號建立成功並已填入 Demo 資料',
        credentials: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
        userId,
        tenantId,
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
