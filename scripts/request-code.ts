import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";

const apiId = 2040;
const apiHash = "b18441a1ff607e10a989891a5462e627";
const phoneNumber = "+393241502181";

async function requestCode() {
  console.log("Sending code to", phoneNumber);
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  const res = await client.sendCode({ apiId, apiHash }, phoneNumber);

  const pendingState = {
    phoneNumber,
    phoneCodeHash: res.phoneCodeHash,
    sessionString: client.session.save(),
  };

  fs.writeFileSync("/tmp/telegram_pending_auth.json", JSON.stringify(pendingState, null, 2));
  console.log("SUCCESS! Code sent via Telegram app.");
  console.log("PhoneCodeHash:", res.phoneCodeHash);
  await client.disconnect();
}

requestCode().catch((err) => {
  console.error("Error sending code:", err);
  process.exit(1);
});
