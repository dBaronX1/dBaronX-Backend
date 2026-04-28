import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7551623297:AAGyptsg8jTeI7FuB9P8pQr4-d3_pULGWbI';

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function logToSupabase(chatId: number, message: string, type = 'bot_reply'): Promise<void> {
  try {
    await supabase.from('telegram_notifications').insert({
      type,
      chat_id: chatId.toString(),
      message,
      status: 'sent',
    });
  } catch (err) {
    console.error('Supabase log error:', err);
  }
}

async function generateAIStory(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dbaronx8001.builtwithrocket.new'}/api/ai/chat-completion`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Write a short, inspiring story (max 200 words) about: ${prompt}. Make it related to African entrepreneurship, sustainability, or community impact.`,
            },
          ],
        }),
      }
    );
    if (!response.ok) throw new Error('AI request failed');
    const data = await response.json();
    return data.content || data.message || 'Story generation failed. Please try again.';
  } catch (err) {
    console.error('AI story error:', err);
    return '✨ Story generation is temporarily unavailable. Please try again shortly.';
  }
}

async function getTrackingStatus(code: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('deliveries')
      .select('status, updated_at, destination')
      .eq('tracking_code', code)
      .single();

    if (!data) {
      return `📦 Tracking code <b>${code}</b> not found.\n\nDouble-check your code or visit:\nhttps://dbaronx.com/track`;
    }

    return `📦 <b>Tracking: ${code}</b>\n\n🔄 Status: ${data.status}\n📍 Destination: ${data.destination || 'N/A'}\n🕐 Updated: ${new Date(data.updated_at).toLocaleDateString()}\n\n🔗 Full details: https://dbaronx.com/track`;
  } catch {
    return `📦 Tracking code: <b>${code}</b>\n\n🔗 Check live status: https://dbaronx.com/track`;
  }
}

async function getDriverJobs(): Promise<string> {
  try {
    const { data } = await supabase
      .from('deliveries')
      .select('id, destination, status, created_at')
      .eq('status', 'pending')
      .limit(5);

    if (!data || data.length === 0) {
      return '🚗 <b>Driver Jobs</b>\n\nNo open delivery jobs right now.\n\nCheck back soon or register as a driver:\nhttps://dbaronx.com/driver';
    }

    const jobList = data
      .map((job, i) => `${i + 1}. 📍 ${job.destination || 'Location TBD'} — ${job.status}`)
      .join('\n');

    return `🚗 <b>Available Driver Jobs</b>\n\n${jobList}\n\n📝 Apply: https://dbaronx.com/driver`;
  } catch {
    return '🚗 <b>Driver Jobs</b>\n\nView available delivery jobs:\nhttps://dbaronx.com/driver\n\n📝 Register as a driver to get started!';
  }
}

async function getUserPortfolio(chatId: number): Promise<string> {
  try {
    const { data } = await supabase
      .from('pledges')
      .select('amount, campaign_id, status, created_at')
      .eq('telegram_chat_id', chatId.toString())
      .limit(5);

    if (!data || data.length === 0) {
      return '📊 <b>Your Portfolio</b>\n\nNo contributions found for this account.\n\n🌍 Start backing projects:\nhttps://dbaronx.com/dreams\n\n🪪 View your impact card:\nhttps://dbaronx.com/id-card';
    }

    const total = data.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pledgeList = data
      .map((p, i) => `${i + 1}. Campaign #${p.campaign_id} — $${p.amount} (${p.status})`)
      .join('\n');

    return `📊 <b>Your dBaronX Portfolio</b>\n\n${pledgeList}\n\n💰 Total Contributed: $${total}\n\n🪪 Full impact card: https://dbaronx.com/id-card`;
  } catch {
    return '📊 <b>Your Portfolio</b>\n\n🪪 View your locked contributions and DBX rewards:\nhttps://dbaronx.com/id-card\n\n📈 Track your impact:\nhttps://dbaronx.com/impact';
  }
}

// Store pending AI prompts per chat
const pendingAIPrompts = new Map<number, boolean>();
const pendingTrackCodes = new Map<number, boolean>();

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const chatId = update.message?.chat?.id;
    const text = (update.message?.text || '').trim();
    const firstName = update.message?.from?.first_name || 'Friend';

    if (!chatId) return new Response('ok');

    let reply = '';

    // Handle pending AI prompt
    if (pendingAIPrompts.get(chatId) && text && !text.startsWith('/')) {
      pendingAIPrompts.delete(chatId);
      reply = '✨ Generating your story...\n\nPlease wait a moment.';
      await sendMessage(chatId, reply);
      const story = await generateAIStory(text);
      reply = `📖 <b>Your AI Story</b>\n\n${story}\n\n✨ Generate another: /ai`;
      await sendMessage(chatId, reply);
      await logToSupabase(chatId, reply, 'ai_story');
      return new Response('ok');
    }

    // Handle pending track code
    if (pendingTrackCodes.get(chatId) && text && !text.startsWith('/')) {
      pendingTrackCodes.delete(chatId);
      reply = await getTrackingStatus(text.toUpperCase());
      await sendMessage(chatId, reply);
      await logToSupabase(chatId, reply, 'track_query');
      return new Response('ok');
    }

    // Command routing
    if (text === '/start' || text === '/start@dbaronxbot') {
      reply = `👋 <b>Welcome to dBaronX, ${firstName}!</b>\n\n🌍 Africa's transparent impact platform — back real projects, earn DBX tokens, track every delivery.\n\n<b>Commands:</b>\n/campaigns — Browse live campaigns\n/portfolio — Your contributions & impact\n/track — Track a delivery\n/ai — Generate an AI story\n/delivery — Driver job listings\n/help — Full command list\n\n🔗 https://dbaronx.com`;
    } else if (text === '/campaigns' || text === '/dreams') {
      reply = `🌍 <b>Live dBaronX Campaigns</b>\n\n1. 🌱 <b>Farm-to-Table Ghana</b>\nhttps://dbaronx.com/dreams\n\n2. ♻️ <b>Recycling Revolution</b>\nhttps://dbaronx.com/dreams\n\n3. 🧼 <b>Soap for Schools</b>\nhttps://dbaronx.com/dreams\n\n4. 💧 <b>Clean Water Initiative</b>\nhttps://dbaronx.com/dreams\n\n5. 🌞 <b>Solar Village Project</b>\nhttps://dbaronx.com/dreams\n\n6. 🎓 <b>Youth Tech Academy</b>\nhttps://dbaronx.com/dreams\n\n📲 Back a project: https://dbaronx.com/dreams`;
    } else if (text === '/portfolio') {
      reply = await getUserPortfolio(chatId);
    } else if (text === '/track') {
      pendingTrackCodes.set(chatId, true);
      reply = '📦 <b>Delivery Tracker</b>\n\nPlease send your tracking code (e.g. DBX-123456):';
    } else if (text?.startsWith('/track ')) {
      const code = text.replace('/track ', '').trim().toUpperCase();
      reply = await getTrackingStatus(code);
    } else if (text === '/ai') {
      pendingAIPrompts.set(chatId, true);
      reply = '✨ <b>AI Story Generator</b>\n\nWhat topic would you like a story about?\n\nExample: "a farmer in Ghana who changed his village"';
    } else if (text === '/delivery') {
      reply = await getDriverJobs();
    } else if (text === '/help') {
      reply = `📋 <b>dBaronX Bot — Full Command List</b>\n\n/start — Welcome & main menu\n/campaigns — Browse all 6 live campaigns\n/portfolio — Your contributions & DBX rewards\n/track — Track a delivery by code\n/ai — Generate an AI-powered impact story\n/delivery — View available driver jobs\n/help — Show this help menu\n\n🌐 Website: https://dbaronx.com\n📧 Support: info@dbaronx.com\n\n💡 <i>Tip: After /ai or /track, just type your response — no need for another command.</i>`;
    } else if (text?.startsWith('/pledge')) {
      reply = '💳 <b>How to Pledge</b>\n\n1. Choose a campaign: https://dbaronx.com/dreams\n2. Send payment via Solana or DBX token\n3. Upload your proof of payment\n4. We lock your contribution instantly!\n\n🔐 All pledges are transparent and traceable.';
    } else {
      reply = `👋 Hi ${firstName}! I didn\'t understand that command.\n\nTry /help to see all available commands, or visit https://dbaronx.com`;
    }

    if (reply) {
      await sendMessage(chatId, reply);
      await logToSupabase(chatId, reply);
    }

    return new Response('ok');
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return new Response('ok');
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    bot: 'dBaronX Telegram Bot',
    commands: ['/start', '/campaigns', '/portfolio', '/track', '/ai', '/delivery', '/help'],
    webhook: '/api/telegram/webhook',
  });
}
