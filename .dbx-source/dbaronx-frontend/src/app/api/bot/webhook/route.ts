import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number | string, text: string, parseMode = "HTML") {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
}

async function handleBotCommand(chatId: number | string, text: string, supabase: any) {
  const command = text?.split(" ")[0]?.toLowerCase();
  const args = text?.split(" ").slice(1).join(" ");

  switch (command) {
    case "/start": {
      const param = args?.trim();
      if (param?.startsWith("product-")) {
        await sendTelegramMessage(chatId,
          `🛍️ <b>dBaronX Shop</b>\n\nBrowse our eco-products:\n🌿 Amonkyi Natural Soaps\n🪨 Biochar / Activated Carbon\n♻️ Recycled Plastic Pavers\n🌾 Organic Farm Produce\n⚡ Biogas Fertilizer Packs\n\n<a href="https://dbaronx.com/shop">Visit Shop →</a>`
        );
      } else if (param?.startsWith("track-")) {
        const orderId = param.replace("track-", "");
        await sendTelegramMessage(chatId,
          `📦 <b>Order Tracking</b>\n\nTrack order: <code>${orderId}</code>\n\n<a href="https://dbaronx.com/shop">View Orders →</a>`
        );
      } else if (param === "impact") {
        await sendTelegramMessage(chatId,
          `🌍 <b>Live Impact Hub</b>\n\nSee real-time metrics from our global operations:\n♻️ Waste processed\n🌱 CO₂ saved\n👷 Jobs created\n\n<a href="https://dbaronx.com/impact">View Dashboard →</a>`
        );
      } else if (param === "dreams") {
        await sendTelegramMessage(chatId,
          `💫 <b>dBaronX Dreams</b>\n\nKickstarter-style crowdfunding — back real projects, earn rewards.\n\n<a href="https://dbaronx.com/dreams">Browse Campaigns →</a>`
        );
      } else if (param === "wallet") {
        await sendTelegramMessage(chatId,
          `👻 <b>DBX Wallet</b>\n\nConnect Phantom or Solflare wallet for:\n💎 15% discount on all purchases\n🎯 Premium ID Card\n📈 Staking rewards\n\n<a href="https://dbaronx.com/id-card">Connect Wallet →</a>`
        );
      } else if (param === "affiliate") {
        await sendTelegramMessage(chatId,
          `💰 <b>Affiliate Program</b>\n\nEarn 10% commission on every sale.\nCommissions paid after delivery confirmation.\n\n<a href="https://dbaronx.com/affiliates">Your Dashboard →</a>`
        );
      } else {
        await sendTelegramMessage(chatId,
          `🌿 <b>Welcome to dBaronX!</b>\n\nOne Platform. Real Impact. Zero Waste.\n\n<b>Quick Commands:</b>\n/shop — Browse eco-products\n/impact — Live impact metrics\n/track — Track your order\n/dreams — Crowdfunding campaigns\n/affiliate — Your earnings\n/wallet — Connect Phantom\n/support — Get help\n\n<a href="https://dbaronx.com">Visit Website →</a>`
        );
      }
      break;
    }
    case "/shop": case"/products": {
      const { data } = await supabase.from("products").select("name, price, category").eq("is_active", true).limit(5);
      const productList = (data || []).map((p: any) => `• ${p.name} — $${p.price}`).join("\n") || "No products available";
      await sendTelegramMessage(chatId,
        `🛍️ <b>dBaronX Shop</b>\n\n${productList}\n\n<a href="https://dbaronx.com/shop">Browse All Products →</a>`
      );
      break;
    }
    case "/impact": {
      const { data } = await supabase.from("impact_metrics").select("*").order("metric_date", { ascending: false }).limit(7);
      const rows = data || [];
      const waste = rows.reduce((s: number, r: any) => s + (r.waste_processed_tons || 0), 0).toFixed(1);
      const co2 = rows.reduce((s: number, r: any) => s + (r.co2_saved_tons || 0), 0).toFixed(1);
      const jobs = Math.max(...rows.map((r: any) => r.jobs_created || 0), 0);
      await sendTelegramMessage(chatId,
        `🌍 <b>Live Impact (Last 7 Days)</b>\n\n♻️ Waste Processed: <b>${waste}t</b>\n🌱 CO₂ Saved: <b>${co2}t</b>\n👷 Jobs Created: <b>${jobs}</b>\n\n<a href="https://dbaronx.com/impact">Full Dashboard →</a>`
      );
      break;
    }
    case "/track": {
      if (!args) {
        await sendTelegramMessage(chatId, `📦 <b>Order Tracking</b>\n\nUsage: /track YOUR_ORDER_ID\n\nOr visit: <a href="https://dbaronx.com/shop">dbaronx.com/shop</a>`);
      } else {
        const { data } = await supabase.from("orders").select("id, payment_status, total_usd, created_at").eq("id", args.trim()).single();
        if (data) {
          await sendTelegramMessage(chatId,
            `📦 <b>Order Status</b>\n\nID: <code>${data.id.slice(0, 8)}...</code>\nStatus: <b>${data.payment_status}</b>\nTotal: $${data.total_usd}\nDate: ${new Date(data.created_at).toLocaleDateString()}\n\n<a href="https://dbaronx.com/shop">View Shop →</a>`
          );
        } else {
          await sendTelegramMessage(chatId, `❌ Order not found. Check your order ID and try again.`);
        }
      }
      break;
    }
    case "/dreams": case"/campaigns": {
      const { data } = await supabase.from("campaigns").select("title, raised_usd, goal_usd").eq("campaign_status", "active").limit(3);
      const list = (data || []).map((c: any) => `• ${c.title} — ${Math.round((c.raised_usd / c.goal_usd) * 100)}% funded`).join("\n") || "No active campaigns";
      await sendTelegramMessage(chatId,
        `💫 <b>Active Campaigns</b>\n\n${list}\n\n<a href="https://dbaronx.com/dreams">Back a Project →</a>`
      );
      break;
    }
    case "/affiliate": {
      await sendTelegramMessage(chatId,
        `💰 <b>Affiliate Program</b>\n\n✅ 10% commission on every sale\n✅ Paid after delivery confirmation\n✅ DBX token + cash payouts\n\n<a href="https://dbaronx.com/affiliates">Your Dashboard →</a>`
      );
      break;
    }
    case "/wallet": {
      await sendTelegramMessage(chatId,
        `👻 <b>DBX Wallet Connect</b>\n\nConnect Phantom or Solflare for:\n💎 15% discount on all purchases\n🪪 Premium ID Card\n📈 Staking rewards\n\nDBX Token: <code>4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE</code>\n\n<a href="https://dbaronx.com/id-card">Connect Now →</a>`
      );
      break;
    }
    case "/support": case"/help": {
      await sendTelegramMessage(chatId,
        `🆘 <b>Support</b>\n\n📧 Email: info@dbaronx.com\n💬 Response: Within 24 hours\n\n<b>Commands:</b>\n/shop — Products\n/impact — Impact metrics\n/track [id] — Order tracking\n/dreams — Campaigns\n/affiliate — Earnings\n/wallet — Phantom connect\n\n<a href="https://dbaronx.com">Website →</a>`
      );
      break;
    }
    default: {
      await sendTelegramMessage(chatId,
        `❓ Unknown command. Type /help to see all available commands.\n\n<a href="https://dbaronx.com">Visit dbaronx.com →</a>`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    const supabase = await createClient();

    // Handle message updates
    if (update?.message) {
      const { chat, text, from } = update.message;
      const chatId = chat?.id;

      if (text && chatId) {
        await handleBotCommand(chatId, text, supabase);
      }
    }

    // Handle callback queries (inline buttons)
    if (update?.callback_query) {
      const { id, data, message } = update.callback_query;
      const chatId = message?.chat?.id;

      if (chatId && data) {
        await handleBotCommand(chatId, data, supabase);
        // Answer callback query to remove loading state
        if (BOT_TOKEN) {
          await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: id }),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    webhook: "dBaronX Telegram Bot Webhook",
    status: BOT_TOKEN ? "configured" : "missing_token",
    setup_instructions: {
      step1: "Get your bot token from @BotFather on Telegram",
      step2: "Add TELEGRAM_BOT_TOKEN to your .env file",
      step3: `Set webhook URL: https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://dbaronx.com/api/bot/webhook`,
      step4: "Set bot commands via BotFather: /setcommands",
      commands: [
        "shop - Browse eco-products",
        "impact - Live impact metrics",
        "track - Track your order",
        "dreams - Crowdfunding campaigns",
        "affiliate - Check earnings",
        "wallet - Connect Phantom wallet",
        "support - Get help",
        "help - Show all commands",
      ],
    },
    deep_link_examples: {
      product: "https://t.me/dBaronX_DBX_Token?start=product-PRODUCT_ID",
      track: "https://t.me/dBaronX_DBX_Token?start=track-ORDER_ID",
      campaign: "https://t.me/dBaronX_DBX_Token?start=campaign-CAMPAIGN_ID",
      affiliate: "https://t.me/dBaronX_DBX_Token?start=affiliate-REF_CODE",
      impact: "https://t.me/dBaronX_DBX_Token?start=impact",
      wallet: "https://t.me/dBaronX_DBX_Token?start=wallet",
      dreams: "https://t.me/dBaronX_DBX_Token?start=dreams",
    },
  });
}
