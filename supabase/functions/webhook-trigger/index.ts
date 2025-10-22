import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookTriggerRequest {
  event_type: string;
  tenant_id: string;
  payload: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { event_type, tenant_id, payload } = await req.json() as WebhookTriggerRequest;

    console.log('Triggering webhooks for event:', event_type, 'tenant:', tenant_id);

    // Find active webhooks for this event type and tenant
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for this event');
      return new Response(
        JSON.stringify({ message: 'No active webhooks found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger each webhook
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        console.log('Triggering webhook:', webhook.name, webhook.url);
        
        let response;
        let responseStatus = 0;
        let responseBody = '';
        let attemptCount = 1;

        try {
          // Create signature (simple HMAC-like approach)
          const timestamp = Date.now();
          
          // Enrich payload with vehicle type information
          const enrichedPayload = {
            ...payload,
            vehicleType: {
              preferred: payload.preferred_vehicle_type || 'no_preference',
              actual: payload.actual_vehicle_type || payload.preferred_vehicle_type || 'no_preference',
              notes: payload.vehicle_type_notes || null,
            },
            source: 'booking_system',
            timestamp: new Date().toISOString(),
          };
          
          const signaturePayload = `${timestamp}.${JSON.stringify(enrichedPayload)}`;
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhook.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(signaturePayload)
          );
          const signatureHex = Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signatureHex,
              'X-Webhook-Timestamp': timestamp.toString(),
              'X-Event-Type': event_type,
            },
            body: JSON.stringify(enrichedPayload),
          });

          responseStatus = response.status;
          responseBody = await response.text();

          console.log('Webhook response:', responseStatus, responseBody.substring(0, 200));
        } catch (error) {
          console.error('Error triggering webhook:', error);
          responseStatus = 0;
          responseBody = error instanceof Error ? error.message : 'Unknown error';
          attemptCount = 1;
        }

        // Log webhook attempt
        const { error: logError } = await supabase
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type,
            payload,
            response_status: responseStatus,
            response_body: responseBody.substring(0, 1000),
            attempt_count: attemptCount,
          });

        if (logError) {
          console.error('Error logging webhook:', logError);
        }

        return { webhook: webhook.name, status: responseStatus, success: responseStatus >= 200 && responseStatus < 300 };
      })
    );

    const summary = results.map((r) => 
      r.status === 'fulfilled' ? r.value : { error: r.reason }
    );

    console.log('Webhook trigger summary:', summary);

    return new Response(
      JSON.stringify({ success: true, results: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in webhook-trigger:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});