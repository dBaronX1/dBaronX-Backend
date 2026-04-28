import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { pledge_id, amount_usd, campaign_id, user_id } = await req.json();

    if (!pledge_id || !amount_usd) {
      return NextResponse.json({ error: 'pledge_id and amount_usd are required' }, { status: 400 });
    }

    // Carbon calculation: ~0.8 kg CO₂ offset per USD pledged
    const carbon_kg = parseFloat((amount_usd * 0.8).toFixed(3));

    // Generate certificate number
    const certNumber = `DBX-CERT-${Date.now()}-${pledge_id.slice(0, 8).toUpperCase()}`;

    // Build certificate data (PDF generation via jsPDF on client or store metadata)
    const certificateData = {
      pledge_id,
      amount_usd,
      campaign_id,
      carbon_kg,
      certificate_number: certNumber,
      issued_at: new Date().toISOString(),
      platform: 'dBaronX',
    };

    // QR data for on-chain traceability
    const qrData = `https://dbaronx.com/trace/${pledge_id}`;

    // Update pledge with carbon_kg and certificate reference
    const { error: pledgeError } = await supabase
      .from('pledges')
      .update({
        carbon_kg,
        certificate_url: qrData,
      })
      .eq('id', pledge_id);

    if (pledgeError) {
      console.error('Pledge update error:', pledgeError.message);
    }

    // Insert into carbon_certificates table
    const { data: cert, error: certError } = await supabase
      .from('carbon_certificates')
      .insert({
        order_id: null,
        user_id: user_id || null,
        co2_offset_kg: carbon_kg,
        certificate_number: certNumber,
        pdf_url: qrData,
        is_minted: false,
      })
      .select()
      .single();

    if (certError) {
      console.error('Certificate insert error:', certError.message);
    }

    return NextResponse.json({
      success: true,
      carbon_kg,
      certificate_number: certNumber,
      qrData,
      certificate: cert,
      certificateData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
