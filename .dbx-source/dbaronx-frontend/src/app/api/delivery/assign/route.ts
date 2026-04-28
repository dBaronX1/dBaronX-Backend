import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { order_id, driver_id, pickup_location, delivery_location } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const tracking_code = 'DBX-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('delivery_jobs')
      .insert({
        order_id,
        driver_id: driver_id || null,
        status: driver_id ? 'assigned' : 'pending',
        tracking_code,
        pickup_location: pickup_location || 'dBaronX Fulfilment Hub',
        delivery_location: delivery_location || {},
        carbon_offset_kg: 0.5,
      })
      .select()
      .single();

    if (error) throw error;

    // Send Telegram notification if driver assigned
    if (driver_id) {
      await supabase.from('telegram_notifications').insert({
        type: 'delivery_assigned',
        reference_id: data.id,
        message: `📦 New delivery assigned! Tracking: ${tracking_code}`,
        status: 'sent',
      });
    }

    return NextResponse.json({
      success: true,
      tracking_code: data.tracking_code,
      delivery_job: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tracking_code = searchParams.get('code');

  if (!tracking_code) {
    return NextResponse.json({ error: 'tracking code required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('delivery_jobs')
    .select('*, drivers(vehicle_type, rating)')
    .eq('tracking_code', tracking_code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  }

  return NextResponse.json({ delivery: data });
}
