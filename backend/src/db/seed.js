const pool = require("./pool");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function seed() {
  const client = await pool.connect();
  try {
    // ─────────────────────────────────────────────────────────
    // MUHIM: Bu seed FAQAT asosiy admin/manager userlarni
    // yaratadi. Supabase'dagi mavjud ma'lumotlarga TEGMAYDI.
    // Agar user allaqachon mavjud bo'lsa — o'tkazib yuboradi.
    // ─────────────────────────────────────────────────────────

    const check = await client.query(
      `SELECT id FROM users WHERE id = 'DR0001'`,
    );
    if (check.rows.length > 0) {
      console.log("ℹ️  Default adminlar allaqachon mavjud, seed o'tkazildi.");
      return;
    }

    console.log("🌱 Default admin userlar yaratilmoqda...");
    const hash = (pw) => bcrypt.hash(pw, 10);

    const defaultUsers = [
      ["DR0001", "director123", "director", "Jasur", "Xalmuratov"],
      ["DP0001", "deputy123", "deputy", "Malika", "Yusupova"],
      ["AM0001", "manager123", "attendance_manager", "Bobur", "Toshmatov"],
    ];

    for (const [id, pw, role, fn, ln] of defaultUsers) {
      await client.query(
        `INSERT INTO users (id, password, role, first_name, last_name)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [id, await hash(pw), role, fn, ln],
      );
    }

    console.log("✅ Default userlar yaratildi!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👤 Default login ma'lumotlari:");
    console.log("   Director:     DR0001 / director123");
    console.log("   Deputy:       DP0001 / deputy123");
    console.log("   Att.Manager:  AM0001 / manager123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("ℹ️  Guruhlar, talabalar va o'qituvchilar");
    console.log("   Supabase dashboard orqali qo'shing.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("❌ Seed xatosi:", err.message);
    // Seed xatosi serverga ta'sir qilmasin
  } finally {
    client.release();
  }
}

module.exports = seed;
