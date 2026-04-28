import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const body = await req.json();
    const { type, userEmail, orderId, items, total, campaignTitle, amount, wallet } = body;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    let subject = "";
    let html = "";

    if (type === "order_confirmation") {
      subject = `✅ Order Confirmed — dBaronX #${orderId?.slice(0, 8)}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050510; color: #E8E8FF; padding: 32px; border-radius: 16px;">
          <h1 style="color: #00F0FF; margin-bottom: 8px;">Order Confirmed!</h1>
          <p style="color: #9090BB;">Thank you for your order. We've received your payment and will process it shortly.</p>
          <div style="background: #0D0D2B; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(94,23,235,0.3);">
            <p style="color: #9090BB; font-size: 12px; margin: 0 0 4px;">Order ID</p>
            <p style="color: #00F0FF; font-family: monospace; margin: 0;">#${orderId}</p>
          </div>
          <div style="background: #0D0D2B; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(94,23,235,0.3);">
            <p style="color: #9090BB; font-size: 12px; margin: 0 0 12px;">Items Ordered</p>
            ${(items || []).map((item: any) => `<p style="color: #E8E8FF; margin: 4px 0;">${item.name} × ${item.quantity} — $${(item.price * item.quantity).toFixed(2)}</p>`).join("")}
            <hr style="border-color: rgba(94,23,235,0.2); margin: 12px 0;" />
            <p style="color: #E8E8FF; font-weight: bold;">Total: $${total}</p>
          </div>
          <p style="color: #9090BB; font-size: 12px;">Admin will review your payment proof and fulfill your order within 24-48 hours.</p>
          <p style="color: #5E17EB; font-size: 12px; margin-top: 24px;">© 2026 dBaronX Ecosystem — Global Utility Token</p>
        </div>
      `;
    } else if (type === "pledge_confirmation") {
      subject = `🎉 Pledge Confirmed — ${campaignTitle}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050510; color: #E8E8FF; padding: 32px; border-radius: 16px;">
          <h1 style="color: #00F0FF; margin-bottom: 8px;">Pledge Submitted!</h1>
          <p style="color: #9090BB;">Your pledge for <strong style="color: #E8E8FF;">${campaignTitle}</strong> has been received.</p>
          <div style="background: #0D0D2B; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(94,23,235,0.3);">
            <p style="color: #9090BB; font-size: 12px; margin: 0 0 4px;">Pledge Amount</p>
            <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">$${amount}</p>
          </div>
          <p style="color: #9090BB; font-size: 12px;">Admin will verify your payment and update the campaign progress.</p>
          <p style="color: #5E17EB; font-size: 12px; margin-top: 24px;">© 2026 dBaronX Ecosystem — Global Utility Token</p>
        </div>
      `;
    } else if (type === "payout_request") {
      subject = `💰 Payout Request — $${amount}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050510; color: #E8E8FF; padding: 32px; border-radius: 16px;">
          <h1 style="color: #00F0FF; margin-bottom: 8px;">Payout Request Received</h1>
          <p style="color: #9090BB;">Your affiliate payout request has been submitted.</p>
          <div style="background: #0D0D2B; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(94,23,235,0.3);">
            <p style="color: #9090BB; font-size: 12px; margin: 0 0 4px;">Amount Requested</p>
            <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0 0 12px;">$${amount}</p>
            <p style="color: #9090BB; font-size: 12px; margin: 0 0 4px;">Wallet / Payment Details</p>
            <p style="color: #00F0FF; font-family: monospace; font-size: 12px; margin: 0; word-break: break-all;">${wallet}</p>
          </div>
          <p style="color: #9090BB; font-size: 12px;">Admin will process your payout within 48 hours.</p>
          <p style="color: #5E17EB; font-size: 12px; margin-top: 24px;">© 2026 dBaronX Ecosystem — Global Utility Token</p>
        </div>
      `;
    } else if (type === "affiliate_earning") {
      subject = `⭐ New Affiliate Commission — $${amount}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050510; color: #E8E8FF; padding: 32px; border-radius: 16px;">
          <h1 style="color: #00F0FF; margin-bottom: 8px;">Commission Earned!</h1>
          <p style="color: #9090BB;">You earned a 10% affiliate commission.</p>
          <div style="background: #0D0D2B; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(94,23,235,0.3);">
            <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">+$${amount}</p>
          </div>
          <p style="color: #9090BB; font-size: 12px;">Visit your Affiliates dashboard to request a payout.</p>
          <p style="color: #5E17EB; font-size: 12px; margin-top: 24px;">© 2026 dBaronX Ecosystem — Global Utility Token</p>
        </div>
      `;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "dBaronX <noreply@dbaronx.com>",
        to: [userEmail],
        subject,
        html,
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
