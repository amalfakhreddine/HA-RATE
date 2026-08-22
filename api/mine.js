module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { telegram_id } = req.body || {};

    if (!telegram_id) {
      return res.status(400).json({ error: "Missing telegram_id" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecret) {
      return res.status(500).json({
        error: "Server configuration is incomplete"
      });
    }

    const headers = {
      apikey: supabaseSecret,
      Authorization: `Bearer ${supabaseSecret}`,
      "Content-Type": "application/json"
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?telegram_id=eq.${telegram_id}&select=*`,
      {
        method: "GET",
        headers
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Could not load player" });
    }

    const users = await response.json();

    if (!users.length) {
      return res.status(404).json({ error: "Player not found" });
    }

    const user = users[0];

    const now = new Date();
    const lastMined = user.last_mined_at
      ? new Date(user.last_mined_at)
      : null;

    // mining can happen once every hour
    if (lastMined) {
      const millisecondsPassed = now - lastMined;
      const oneHour = 60 * 60 * 1000;

      if (millisecondsPassed < oneHour) {
        const remaining = oneHour - millisecondsPassed;

        return res.status(429).json({
          error: "Mining cooldown",
          remaining_ms: remaining
        });
      }
    }

    // base mining reward
    const reward = 100;

    const newCoins = Number(user.coins || 0) + reward;

    // one level every 100,000 coins, maximum level 20
    const newLevel = Math.min(
      20,
      Math.floor(newCoins / 100000)
    );

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?telegram_id=eq.${telegram_id}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          coins: newCoins,
          level: newLevel,
          last_mined_at: now.toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      console.error(text);

      return res.status(500).json({
        error: "Could not save mining reward"
      });
    }

    const updatedUsers = await updateResponse.json();

    return res.status(200).json({
      success: true,
      reward,
      user: updatedUsers[0]
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error"
    });
  }
};
