const { getNeonClient } = require("./src/lib/neon.server.cjs");
getNeonClient().then(async (client) => {
  const { rows } = await client.query(
    "SELECT * FROM profiles WHERE telegram_handle ILIKE '%beppe%' OR telegram_user_id IS NOT NULL",
  );
  console.log(rows);
  client.end();
});
