import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const chatId = update.message?.chat?.id;
    const text = update.message?.text || '';

    if (!chatId) return new Response('ok');

    let reply =
      '👋 Welcome to dBaronX Dreams!\n\n/campaigns — Back real projects\n/portfolio — Your impact\n/support — Get help\n/track — Track delivery\n/pledge — How to pledge';

    if (text === '/campaigns' || text === '/dreams') {
      reply =
        '🌍 Live Campaigns: Farms, Recycling, Soap & more!\n\nTap to browse: https://dbaronx.com/dreams';
    } else if (text === '/portfolio') {
      reply =
        '📊 Your locked contributions + DBX rewards:\nhttps://dbaronx.com/id-card';
    } else if (text?.startsWith('/pledge')) {
      reply =
        '💳 Send proof after Solana/DBX payment — we will lock it instantly!\n\nVisit: https://dbaronx.com/dreams';
    } else if (text === '/track') {
      reply =
        '📦 Track your delivery:\nhttps://dbaronx.com/track\n\nOr use: /track DBX-XXXXXX';
    } else if (text?.startsWith('/track ')) {
      const code = text.replace('/track ', '').trim();
      reply = `📦 Tracking: ${code}\n\nhttps://dbaronx.com/track/${code}`;
    } else if (text === '/support') {
      reply =
        '🆘 Support:\n📧 info@dbaronx.com\n\nCommands:\n/campaigns /portfolio /track /pledge /support';
    }

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });

    // Log to telegram_notifications table
    await supabase.from('telegram_notifications').insert({
      type: 'bot_reply',
      chat_id: chatId.toString(),
      message: reply,
      status: 'sent',
    });

    return new Response('ok');
  } catch (err) {
    console.error('Telegram bot error:', err);
    return new Response('ok');
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    bot: 'dBaronX Telegram Bot',
    commands: ['/campaigns', '/portfolio', '/pledge', '/track', '/support'],
  });
}
