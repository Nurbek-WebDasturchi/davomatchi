require('dotenv').config();
const { Bot } = require('grammy');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN yozilmagan .env faylida');
  process.exit(1);
}

if (!WEBAPP_URL) {
  console.error('❌ WEBAPP_URL yozilmagan .env faylida');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// /start buyrug'i
bot.command('start', async (ctx) => {
  const firstName = ctx.from?.first_name || 'Foydalanuvchi';

  await ctx.reply(
    `👋 Assalomu alaykum, *${firstName}*!\n\n` +
    `🎓 *Davomat Bot*ga xush kelibsiz!\n\n` +
    `Bu bot orqali talabalar davomatini QR kod yordamida kuzatishingiz mumkin.\n\n` +
    `📌 Boshlash uchun quyidagi tugmani bosing:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📱 Ishga tushurish',
            web_app: { url: WEBAPP_URL }
          }
        ]]
      }
    }
  );
});

// /help buyrug'i
bot.command('help', async (ctx) => {
  await ctx.reply(
    `ℹ️ *Yordam*\n\n` +
    `🔹 /start — Botni ishga tushirish\n` +
    `🔹 /app — Ilovani ochish\n` +
    `🔹 /help — Yordam\n\n` +
    `*Rollar:*\n` +
    `👨‍💼 *Administrator* — Barcha kurslar statistikasi\n` +
    `👨‍🏫 *O'qituvchi* — Faqat o'z guruhini ko'radi\n` +
    `👨‍🎓 *Talaba* — QR kod orqali davomat belgilaydi\n\n` +
    `❓ Muammo bo'lsa administrator bilan bog'laning.`,
    { parse_mode: 'Markdown' }
  );
});

// /app buyrug'i
bot.command('app', async (ctx) => {
  await ctx.reply(
    '📱 Ilovani ochish uchun tugmani bosing:',
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📱 Ilovani ochish',
            web_app: { url: WEBAPP_URL }
          }
        ]]
      }
    }
  );
});

// WebApp dan qaytgan ma'lumotni qabul qilish
bot.on('message:web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);

    if (data.type === 'attendance_marked') {
      await ctx.reply(
        `✅ *Davomat belgilandi!*\n\n` +
        `👤 Talaba: *${data.studentName}*\n` +
        `📚 Guruh: *${data.groupName}*\n` +
        `🕐 Vaqt: *${new Date(data.scannedAt).toLocaleTimeString('uz-UZ')}*`,
        { parse_mode: 'Markdown' }
      );
    } else if (data.type === 'already_marked') {
      await ctx.reply(
        `⚠️ *Allaqachon belgilangan!*\n\n` +
        `👤 *${data.studentName}* bugun allaqachon qatnashish belgilagan.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (err) {
    console.error('WebApp data xatosi:', err.message);
  }
});

// Boshqa xabarlar
bot.on('message', async (ctx) => {
  await ctx.reply(
    'Ilovani ochish uchun quyidagi tugmani bosing yoki /start yuboring.',
    {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📱 Ishga tushurish',
            web_app: { url: WEBAPP_URL }
          }
        ]]
      }
    }
  );
});

bot.catch((err) => {
  console.error('Bot xatosi:', err.message);
});

bot.start({
  onStart: (info) => {
    console.log(`🤖 Bot @${info.username} ishga tushdi`);
    console.log(`🌐 WebApp: ${WEBAPP_URL}`);
  }
});
