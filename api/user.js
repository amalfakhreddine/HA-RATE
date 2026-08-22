const crypto = require("crypto");

function validateTelegramData(initData, botToken) {
  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");
  if (!receivedHash) return false;

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(receivedHash, "hex")
    );
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { initData } = req.body || {};

    if (!initData) {
      return res.status(400).json({ error: "Missing Telegram data" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

    if (!botToken || !supabaseUrl || !supabaseSecret) {
      return res.status(500).json({
        error: "Server configuration is incomplete"
      });
    }

    const valid = validateTelegramData(initData, botToken);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid Telegram authentication"
      });
    }

    const params = new URLSearchParams(initData);
    const userString = params.get("user");

    if (!userString) {
      return res.status(400).json({
        error: "Telegram user data is missing"
      });
    }

    const telegramUser = JSON.parse(userString);

    const telegramId = telegramUser.id;
    const username = telegramUser.username || null;
    const firstName = telegramUser.first_name || "Player";

    const headers = {
      apikey: supabaseSecret,
      Authorization: `Bearer ${supabaseSecret}`,
      "Content-Type": "application/json"
    };

    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?telegram_id=eq.${telegramId}&select=*`,
      {
        method: "GET",
        headers
      }
    );

    if (!existingResponse.ok) {
      const errorText = await existingResponse.text();

      console.error("Supabase read error:", errorText);

      return res.status(500).json({
        error: "Could not load account"
      });
    }

    const existingUsers = await existingResponse.json();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      return res.status(200).json(existingUser);
    }

    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/users`,
      {
        method: "POST",

        headers: {
          ...headers,
          Prefer: "return=representation"
        },

        body: JSON.stringify({
          telegram_id: telegramId,
          username,
          first_name: firstName,
          coins: 0,
          level: 0
        })
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();

      console.error("Supabase create error:", errorText);

      return res.status(500).json({
        error: "Could not create account"
      });
    }

    const createdUsers = await createResponse.json();

    return res.status(200).json(createdUsers[0]);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
};
