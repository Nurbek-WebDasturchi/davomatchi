require("dotenv").config();
const { Bot, webhookCallback } = require("grammy");
const express = require("express");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN yozilmagan");
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.error("❌ WEBAPP_URL yozilmagan");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// /start buyrug'i
bot.command("start", async (ctx) => {
  const firstName = ctx.from?.first_name || "Foydalanuvchi";
  await ctx.reply(
    `👋 Assalomu alaykum, *${firstName}*!\n\n` +
      `🎓 *Davomat Bot*ga xush kelibsiz!\n\n` +
      `📌 Boshlash uchun quyidagi tugmani bosing:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Ishga tushurish",
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    },
  );
});

// /help buyrug'i
bot.command("help", async (ctx) => {
  await ctx.reply(
    `ℹ️ *Yordam*\n\n` +
      `🔹 /start — Botni ishga tushirish\n` +
      `🔹 /app — Ilovani ochish\n` +
      `🔹 /help — Yordam\n\n` +
      `*Rollar:*\n` +
      `👨‍💼 *Administrator* — Barcha kurslar statistikasi\n` +
      `👨‍🏫 *O\'qituvchi* — Faqat o\'z guruhini ko\'radi\n` +
      `👨‍🎓 *Talaba* — QR kod orqali davomat belgilaydi`,
    { parse_mode: "Markdown" },
  );
});

// /app buyrug'i
bot.command("app", async (ctx) => {
  await ctx.reply("📱 Ilovani ochish uchun tugmani bosing:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📱 Ilovani ochish",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

// WebApp dan qaytgan ma'lumot
bot.on("message:web_app_data", async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    if (data.type === "attendance_marked") {
      await ctx.reply(
        `✅ *Davomat belgilandi!*\n\n` +
          `👤 Talaba: *${data.studentName}*\n` +
          `📚 Guruh: *${data.groupName}*\n` +
          `🕐 Vaqt: *${new Date(data.scannedAt).toLocaleTimeString("uz-UZ")}*`,
        { parse_mode: "Markdown" },
      );
    } else if (data.type === "already_marked") {
      await ctx.reply(
        `⚠️ *Allaqachon belgilangan!*\n\n` +
          `👤 *${data.studentName}* bugun allaqachon qatnashish belgilagan.`,
        { parse_mode: "Markdown" },
      );
    }
  } catch (err) {
    console.error("WebApp data xatosi:", err.message);
  }
});

// Boshqa xabarlar
bot.on("message", async (ctx) => {
  await ctx.reply("Ilovani ochish uchun quyidagi tugmani bosing:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📱 Ishga tushurish",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

bot.catch((err) => {
  console.error("Bot xatosi:", err.message);
});

// ─── Express server + Webhook ─────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", bot: "running" });
});

// Webhook endpoint
app.use("/webhook", webhookCallback(bot, "express"));

// Serverni ishga tushirish
app.listen(PORT, async () => {
  console.log(`🚀 Bot server http://localhost:${PORT} da ishlamoqda`);

  // Webhook o'rnatish
  const RENDER_URL = process.env.RENDER_URL;
  if (RENDER_URL) {
    try {
      await bot.api.setWebhook(`${RENDER_URL}/webhook`);
      console.log(`✅ Webhook o'rnatildi: ${RENDER_URL}/webhook`);
    } catch (err) {
      console.error("❌ Webhook xatosi:", err.message);
    }
  } else {
    console.log("⚠️ RENDER_URL yo'q — webhook o'rnatilmadi");
  }
});
