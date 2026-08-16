import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const apiId = 2040;
const apiHash = "b18441a1ff607e10a989891a5462e627";

async function syncMembers() {
  console.log("Starting Telegram Userbot Sync...");

  // Load session from app_settings
  const { data: settingData } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "TELEGRAM_USERBOT_SESSION")
    .maybeSingle();

  const savedSession = settingData?.value;
  if (!savedSession) {
    console.error(
      "No TELEGRAM_USERBOT_SESSION found in app_settings table. Please complete authentication first.",
    );
    process.exit(1);
  }

  const stringSession = new StringSession(
    typeof savedSession === "string" ? savedSession : String(savedSession),
  );
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("Userbot connected successfully using stored session!");

  const { data: groups, error } = await supabaseAdmin.from("telegram_groups").select("*");
  if (error || !groups) {
    console.error("Error fetching groups from Supabase:", error);
    process.exit(1);
  }

  console.log(`Found ${groups.length} groups to sync.`);

  for (const group of groups) {
    const chatId = group.chat_id;
    console.log(`Syncing group: ${group.title} (${chatId})`);

    try {
      const participants = await client.getParticipants(chatId);
      console.log(`Found ${participants.length} participants in group ${group.title}`);

      for (const user of participants) {
        if (user.deleted || user.bot) continue;

        const rawHandle = user.username ? `@${user.username}` : `@${user.firstName}_${user.id}`;
        const telegramId = user.id.toString();

        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, telegram_user_id, telegram_handle");

        if (profs && profs.length > 0) {
          const match = profs.find(
            (p) =>
              p.telegram_user_id === telegramId ||
              (p.telegram_handle && p.telegram_handle.toLowerCase() === rawHandle.toLowerCase()) ||
              (user.username &&
                p.telegram_handle &&
                p.telegram_handle.toLowerCase() === `@${user.username.toLowerCase()}`),
          );

          if (match) {
            if (!match.telegram_user_id || match.telegram_handle !== rawHandle) {
              await supabaseAdmin
                .from("profiles")
                .update({
                  telegram_user_id: telegramId,
                  telegram_handle: rawHandle,
                  telegram_connected: true,
                })
                .eq("id", match.id);
              console.log(`Updated profile ${match.id} for user ${rawHandle}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Failed to sync group ${chatId}:`, e);
    }
  }

  console.log("Sync completed successfully.");
  await client.disconnect();
  process.exit(0);
}

syncMembers().catch(console.error);
