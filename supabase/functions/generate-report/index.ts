import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  report_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { report_id } = await req.json() as ReportRequest;

    console.log('Generating report:', report_id);

    // Fetch report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Generate report based on type
    let reportData: any = {};
    let csvContent = '';

    switch (report.report_type) {
      case 'monthly_trips':
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_number,
            scheduled_time,
            status,
            estimated_cost,
            actual_cost,
            preferred_vehicle_type,
            actual_vehicle_type,
            vehicle_type_notes,
            passengers(name, department)
          `)
          .eq('tenant_id', report.tenant_id)
          .gte('scheduled_time', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .lte('scheduled_time', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString())
          .order('scheduled_time', { ascending: false });

        reportData = { bookings };
        csvContent = 'Booking Number,Scheduled Time,Status,Passenger,Department,Preferred Vehicle,Actual Vehicle,Vehicle Notes,Estimated Cost,Actual Cost\n';
        bookings?.forEach((b: any) => {
          const vehicleTypeLabels: Record<string, string> = {
            human_driver: '人類司機',
            autonomous: '自駕車',
            no_preference: '無偏好',
          };
          const preferredVehicle = vehicleTypeLabels[b.preferred_vehicle_type] || '';
          const actualVehicle = b.actual_vehicle_type ? (vehicleTypeLabels[b.actual_vehicle_type] || '') : '';
          csvContent += `${b.booking_number},${b.scheduled_time},${b.status},${b.passengers?.name || ''},${b.passengers?.department || ''},${preferredVehicle},${actualVehicle},"${b.vehicle_type_notes || ''}",${b.estimated_cost || ''},${b.actual_cost || ''}\n`;
        });
        break;

      case 'department_cost':
        const { data: deptCosts } = await supabase
          .from('bookings')
          .select(`
            passengers(department),
            estimated_cost,
            actual_cost
          `)
          .eq('tenant_id', report.tenant_id)
          .not('passengers', 'is', null);

        const costByDept = (deptCosts || []).reduce((acc: any, item: any) => {
          const dept = item.passengers?.department || 'Unassigned';
          if (!acc[dept]) acc[dept] = { count: 0, total: 0 };
          acc[dept].count++;
          acc[dept].total += Number(item.actual_cost || item.estimated_cost || 0);
          return acc;
        }, {});

        reportData = { departments: costByDept };
        csvContent = 'Department,Trip Count,Total Cost\n';
        Object.entries(costByDept).forEach(([dept, data]: [string, any]) => {
          csvContent += `${dept},${data.count},${data.total}\n`;
        });
        break;

      case 'invoice_summary':
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', report.tenant_id)
          .order('period_start', { ascending: false });

        reportData = { invoices };
        csvContent = 'Invoice Number,Period Start,Period End,Total Amount,Tax Amount,Status\n';
        invoices?.forEach((inv: any) => {
          csvContent += `${inv.invoice_number},${inv.period_start},${inv.period_end},${inv.total_amount},${inv.tax_amount || 0},${inv.paid_at ? 'Paid' : 'Pending'}\n`;
        });
        break;
    }

    // Upload to storage
    const fileName = `${report.tenant_id}/${report_id}_${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, csvContent, {
        contentType: 'text/csv',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    // Update report with file URL
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        file_url: urlData.publicUrl,
        last_run_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Report generated successfully:', fileName);

    return new Response(
      JSON.stringify({ success: true, file_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});