import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceRequest {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  trip_type: 'one_way' | 'round_trip' | 'hourly';
  preferred_vehicle_type?: 'human_driver' | 'autonomous' | 'no_preference';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      pickup_lat, 
      pickup_lng, 
      dropoff_lat, 
      dropoff_lng, 
      trip_type,
      preferred_vehicle_type
    } = await req.json() as PriceRequest;

    console.log('Calculating price for trip:', { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, trip_type });

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (dropoff_lat - pickup_lat) * Math.PI / 180;
    const dLon = (dropoff_lng - pickup_lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickup_lat * Math.PI / 180) * Math.cos(dropoff_lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km

    // Simple pricing calculation
    const basePrice = 50; // Base price in TWD
    const pricePerKm = 15; // Price per km
    const minimumCharge = 100; // Minimum charge
    
    let estimatedCost = basePrice + (distance * pricePerKm);
    
    // Apply trip type multiplier
    if (trip_type === 'round_trip') {
      estimatedCost = estimatedCost * 1.8; // 1.8x for round trip (slight discount)
    } else if (trip_type === 'hourly') {
      estimatedCost = 500; // Flat hourly rate
    }
    
    // Apply autonomous vehicle discount (10% off)
    if (preferred_vehicle_type === 'autonomous') {
      estimatedCost = estimatedCost * 0.9;
      console.log('Applied autonomous vehicle discount (10% off)');
    }
    
    // Ensure minimum charge
    estimatedCost = Math.max(estimatedCost, minimumCharge);
    
    // Round to nearest 10
    estimatedCost = Math.round(estimatedCost / 10) * 10;
    
    // Estimate duration (assuming 40 km/h average speed)
    const estimatedDuration = Math.round((distance / 40) * 60); // in minutes

    console.log('Price calculation result:', { distance, estimatedCost, estimatedDuration });

    return new Response(
      JSON.stringify({
        success: true,
        distance_km: Number(distance.toFixed(2)),
        estimated_cost: estimatedCost,
        estimated_duration_minutes: estimatedDuration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});