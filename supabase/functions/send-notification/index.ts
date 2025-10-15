import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  notification_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const { notification_id } = await req.json() as NotificationRequest;

    console.log('Sending notification:', notification_id);

    // Fetch notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles(full_name, email)
      `)
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error('Notification not found');
    }

    // Send based on channel
    let sent = false;
    let error = null;

    switch (notification.channel) {
      case 'email':
        if (notification.profiles?.email && resendApiKey) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Lovable TMS <onboarding@resend.dev>',
                to: [notification.profiles.email],
                subject: notification.title,
                html: `
                  <h2>${notification.title}</h2>
                  <p>${notification.message}</p>
                  ${notification.metadata?.action_url ? `<p><a href="${notification.metadata.action_url}">查看詳情</a></p>` : ''}
                  <hr>
                  <p style="color: #666; font-size: 12px;">此為系統自動發送的通知郵件</p>
                `,
              }),
            });

            const result = await emailResponse.json();
            console.log('Email sent:', result);
            sent = emailResponse.ok;
            if (!sent) {
              error = JSON.stringify(result);
            }
          } catch (e) {
            console.error('Error sending email:', e);
            error = e instanceof Error ? e.message : 'Unknown error';
          }
        } else if (!resendApiKey) {
          console.log('RESEND_API_KEY not configured, skipping email');
          error = 'Email service not configured';
        }
        break;

      case 'line':
        // LINE notification would require LINE Messaging API integration
        console.log('LINE notifications not yet implemented');
        error = 'LINE notifications not configured';
        break;

      case 'in_app':
        // In-app notifications are already in database
        sent = true;
        break;

      default:
        error = `Unknown notification channel: ${notification.channel}`;
    }

    // Update notification status
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        sent_at: sent ? new Date().toISOString() : null,
      })
      .eq('id', notification_id);

    if (updateError) {
      console.error('Error updating notification:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: sent, 
        error,
        notification_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});