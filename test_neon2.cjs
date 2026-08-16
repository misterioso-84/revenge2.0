const { getNeonClient } = require("./src/lib/neon.server.cjs");
getNeonClient().then(async (client) => {
  const { rows } = await client.query(
    "SELECT id, telegram_handle, telegram_user_id, has_employee_access FROM profiles",
  );
  console.log(rows);
  const roles = await client.query("SELECT * FROM user_roles");
  console.log(roles.rows);
  client.end();
});
