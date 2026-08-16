import { TelegramClient, Api } from "telegram";
import { computeCheck } from "telegram/Password";
import { StringSession } from "telegram/sessions";
import fs from "fs";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const apiId = 2040;
const apiHash = "b18441a1ff607e10a989891a5462e627";

async function confirmCode() {
  const code = process.argv[2];
  if (!code) {
    console.error(
      "Please provide the 5-digit code as argument: npx tsx scripts/confirm-code.ts 12345",
    );
    process.exit(1);
  }

  if (!fs.existsSync("/tmp/telegram_pending_auth.json")) {
    console.error(
      "No pending authorization state found in /tmp/telegram_pending_auth.json. Run request-code first.",
    );
    process.exit(1);
  }

  const pending = JSON.parse(fs.readFileSync("/tmp/telegram_pending_auth.json", "utf-8"));
  console.log("Attempting sign in for", pending.phoneNumber, "with code", code);

  const client = new TelegramClient(new StringSession(pending.sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    let result: any;
    try {
      result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: pending.phoneNumber,
          phoneCodeHash: pending.phoneCodeHash,
          phoneCode: code,
        }),
      );
    } catch (err: any) {
      if (
        err?.errorMessage === "SESSION_PASSWORD_NEEDED" ||
        err?.message === "SESSION_PASSWORD_NEEDED"
      ) {
        const password = process.argv[3];
        if (!password) {
          console.log(
            "2FA_REQUIRED: Il tuo account Telegram è protetto da Password di Verifica in Due Passaggi (2FA).",
          );
          console.log("Esegui di nuovo il comando fornendo anche la password 2FA:");
          console.log("npx tsx scripts/confirm-code.ts <CODICE> <PASSWORD_2FA>");
          process.exit(42);
        }

        console.log("Verifica password 2FA in corso...");
        const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
        const passwordSrpCheck = await computeCheck(passwordSrpResult, password);
        result = await client.invoke(
          new Api.auth.CheckPassword({
            password: passwordSrpCheck,
          }),
        );
      } else {
        throw err;
      }
    }

    console.log("User successfully signed in:", result);
    const finalSession = (client.session as StringSession).save();
    console.log("FINAL STRING SESSION:", finalSession);

    // Save session string to environment or file
    fs.writeFileSync("/tmp/telegram_userbot_session.txt", finalSession);

    // Also persist string session to app_settings DB or process.env so it survives restarts
    await supabaseAdmin.from("app_settings").upsert({
      key: "TELEGRAM_USERBOT_SESSION",
      value: finalSession,
      updated_at: new Date().toISOString(),
    });

    console.log("Session saved to app_settings table!");

    // Run initial sync of participants
    const { data: groups } = await supabaseAdmin.from("telegram_groups").select("*");
    for (const group of groups || []) {
      try {
        console.log(`Syncing participants for group ${group.title} (${group.chat_id})...`);
        const participants = await client.getParticipants(group.chat_id);
        console.log(`Found ${participants.length} participants in ${group.title}`);

        for (const u of participants) {
          if (u.deleted || u.bot) continue;
          const rawHandle = u.username ? `@${u.username}` : `@${u.firstName || "User"}_${u.id}`;
          const tgId = u.id.toString();

          // Upsert to telegram_group_members
          await supabaseAdmin.from("telegram_group_members").upsert({
            id: `tgm-${group.id}-${tgId}`,
            group_id: group.id,
            chat_id: group.chat_id,
            telegram_user_id: tgId,
            telegram_handle: rawHandle,
            status: "member",
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error(`Error syncing group ${group.title}:`, e);
      }
    }

    console.log("ALL MEMBERS SYNCED SUCCESSFULLY!");
  } catch (err: any) {
    console.error("Sign-in failed:", err?.errorMessage || err);
  } finally {
    await client.disconnect();
  }
}

confirmCode().catch(console.error);
