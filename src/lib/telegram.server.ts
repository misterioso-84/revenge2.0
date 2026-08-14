const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "8914449193:AAF94fiCf0od_YjoK2e_Pw4Nsc6vVFA6mlk";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Cache verified codes and pending codes on globalThis to survive HMR/server reloads
const g = globalThis as any;

if (!g._telegramPendingCodes) {
  g._telegramPendingCodes = new Map<string, { createdAt: number; userId?: string }>();
}
if (!g._telegramVerifiedCodes) {
  g._telegramVerifiedCodes = new Map<
    string,
    { handle: string; chatId: number; firstName: string; date: number }
  >();
}
if (!g._telegramProcessedUpdates) {
  g._telegramProcessedUpdates = new Set<number>();
}
if (g._telegramLastUpdateId === undefined) {
  g._telegramLastUpdateId = 0;
}
if (g._telegramWebhookCleared === undefined) {
  g._telegramWebhookCleared = false;
}
if (g._telegramIsFetching === undefined) {
  g._telegramIsFetching = false;
}
if (g._telegramPollingStarted === undefined) {
  g._telegramPollingStarted = false;
}

const pendingCodesStore: Map<string, { createdAt: number; userId?: string }> =
  g._telegramPendingCodes;
const verifiedCodesStore: Map<
  string,
  { handle: string; chatId: number; firstName: string; date: number }
> = g._telegramVerifiedCodes;
const processedUpdatesSet: Set<number> = g._telegramProcessedUpdates;

export function registerPendingCode(code: string, userId?: string) {
  pendingCodesStore.set(code, { createdAt: Date.now(), userId });
}

export function cancelPendingCode(code: string) {
  if (!code) return;
  pendingCodesStore.delete(code);
  verifiedCodesStore.delete(code);
}

export async function getTelegramBotInfo() {
  try {
    const res = await fetch(`${API_URL}/getMe`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error("Error fetching Telegram bot info:", err);
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: any,
) {
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (err) {
    console.error("Error sending Telegram message:", err);
    return null;
  }
}

export async function fetchTelegramUpdates() {
  // Auto-healing lock: if fetch was started > 10 seconds ago, force release lock
  if (g._telegramIsFetching) {
    if (g._telegramFetchStartTime && Date.now() - g._telegramFetchStartTime > 10000) {
      g._telegramIsFetching = false;
    } else {
      return [];
    }
  }

  g._telegramIsFetching = true;
  g._telegramFetchStartTime = Date.now();

  try {
    // Clear webhook only once on startup (do not drop pending updates to avoid missing messages)
    if (!g._telegramWebhookCleared) {
      g._telegramWebhookCleared = true;
      await fetch(`${API_URL}/deleteWebhook?drop_pending_updates=false`, {
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }

    const lastId = g._telegramLastUpdateId || 0;
    const offsetParam = lastId > 0 ? `?offset=${lastId + 1}&timeout=0` : `?timeout=0`;
    const res = await fetch(`${API_URL}/getUpdates${offsetParam}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      return [];
    }

    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    // Process all incoming messages and cache verified codes
    for (const update of data.result) {
      const updateId = update.update_id;
      if (updateId > g._telegramLastUpdateId) {
        g._telegramLastUpdateId = updateId;
      }

      if (processedUpdatesSet.has(updateId)) {
        continue;
      }
      processedUpdatesSet.add(updateId);

      // Keep set size manageable
      if (processedUpdatesSet.size > 2000) {
        const first = processedUpdatesSet.values().next().value;
        if (first !== undefined) processedUpdatesSet.delete(first);
      }

      // Handle inline button callback queries (e.g. Scollega button)
      if (update.callback_query) {
        const cb = update.callback_query;
        const cbFrom = cb.from;
        const chatId = cb.message?.chat?.id;
        if (cb.data === "scollega" && cbFrom && chatId) {
          const rawCbHandle = cbFrom.username
            ? `@${cbFrom.username}`
            : `@${(cbFrom.first_name || "Utente").replace(/\s+/g, "")}_${cbFrom.id}`;

          const handlesToUnlink = new Set<string>();
          handlesToUnlink.add(rawCbHandle);
          if (cbFrom.username) {
            handlesToUnlink.add(`@${cbFrom.username}`);
            handlesToUnlink.add(cbFrom.username);
          }

          for (const h of handlesToUnlink) {
            try {
              await supabaseAdmin
                .from("profiles")
                .update({
                  telegram_connected: false,
                  telegram_handle: null,
                  telegram_code: null,
                })
                .ilike("telegram_handle", h.startsWith("@") ? h : `@${h}`);
            } catch (err) {
              console.error("Error disconnecting Telegram handle:", err);
            }
          }

          await sendTelegramMessage(
            chatId,
            `❌ <b>Account Telegram scollegato con successo.</b>\n\n` +
              `L'associazione con il tuo profilo Minecraft è stata rimossa.\n` +
              `Per collegare un nuovo account, invia il comando /start.`,
          );
        }
        continue;
      }

      const msg = update.message || update.edited_message;
      if (!msg || !msg.text) continue;

      const text = msg.text.trim();
      const from = msg.from;
      if (!from) continue;

      const rawHandle = from.username
        ? `@${from.username}`
        : `@${(from.first_name || "Utente").replace(/\s+/g, "")}_${from.id}`;

      // Handle /id command (private chat or group chat)
      const cleanCmd = text.toLowerCase().split(/\s+/)[0];
      if (cleanCmd === "/id" || cleanCmd.startsWith("/id@")) {
        const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
        if (isGroup) {
          await sendTelegramMessage(
            msg.chat.id,
            `👥 <b>INFORMAZIONI CHAT DI GRUPPO</b>\n\n` +
              `🆔 <b>ID Gruppo:</b> <code>${msg.chat.id}</code>\n` +
              `🏷️ <b>Nome Gruppo:</b> <b>${msg.chat.title || "Gruppo"}</b>\n\n` +
              `👤 <b>Il tuo ID Utente:</b> <code>${from.id}</code>\n` +
              `🏷️ <b>Il tuo Username:</b> ${from.username ? `@${from.username}` : "Nessuno"}`,
          );
        } else {
          await sendTelegramMessage(
            msg.chat.id,
            `👤 <b>INFORMAZIONI CHAT PRIVATA</b>\n\n` +
              `🆔 <b>Il tuo ID Utente:</b> <code>${from.id}</code>\n` +
              `🏷️ <b>Username:</b> ${from.username ? `@${from.username}` : "Nessuno"}\n` +
              `👤 <b>Nome:</b> ${from.first_name || "Utente"}\n` +
              `💬 <b>ID Chat:</b> <code>${msg.chat.id}</code>`,
          );
        }
        continue;
      }

      // Handle /scollega command directly
      if (cleanCmd === "/scollega" || cleanCmd.startsWith("/scollega@")) {
        const scollegaHandles = new Set<string>();
        scollegaHandles.add(rawHandle);
        if (from.username) {
          scollegaHandles.add(`@${from.username}`);
          scollegaHandles.add(from.username);
        }

        for (const h of scollegaHandles) {
          try {
            await supabaseAdmin
              .from("profiles")
              .update({
                telegram_connected: false,
                telegram_handle: null,
                telegram_code: null,
              })
              .ilike("telegram_handle", h.startsWith("@") ? h : `@${h}`);
          } catch (err) {
            console.error("Error unlinking handle via /scollega:", err);
          }
        }
        await sendTelegramMessage(
          msg.chat.id,
          `❌ <b>Account Telegram scollegato con successo.</b>\n\n` +
            `L'associazione con il tuo profilo Minecraft è stata rimossa.\n` +
            `Per associare un nuovo account Minecraft, invia /start.`,
        );
        continue;
      }

      // Handle /info or /aiuto command
      if (
        cleanCmd === "/info" ||
        cleanCmd === "/aiuto" ||
        cleanCmd === "/help" ||
        cleanCmd.startsWith("/info@")
      ) {
        await sendTelegramMessage(
          msg.chat.id,
          `ℹ️ <b>BOT UFFICIALE CASINÒ REVENGE — LIBERTY BAY</b>\n\n` +
            `📌 <b>Comandi Disponibili:</b>\n` +
            `🔹 <code>/start</code> - Verifica lo stato di associazione del tuo account\n` +
            `🔹 <code>/associa CODICE</code> - Invia il codice a 6 cifre generato sul sito\n` +
            `🔹 <code>/scollega</code> - Scollega il tuo account Telegram dal profilo Minecraft\n` +
            `🔹 <code>/id</code> - Mostra l'ID della chat o del gruppo e il tuo ID utente\n` +
            `🔹 <code>/info</code> - Mostra questo messaggio di aiuto\n\n` +
            `💡 <i>Il bot è attivo H24 7 giorni su 7 per la verifica istantanea dei profili.</i>`,
        );
        continue;
      }

      // Handle /associa command without a 6-digit code
      if (
        (cleanCmd === "/associa" || cleanCmd.startsWith("/associa@")) &&
        !text.match(/\b\d{6}\b/)
      ) {
        await sendTelegramMessage(
          msg.chat.id,
          `⚠️ <b>CODICE DI VERIFICA MANCANTE</b>\n\n` +
            `Per collegare il tuo account Telegram, devi specificare il codice a 6 cifre generato dal sito del <b>Casinò Revenge</b>.\n\n` +
            `👉 <b>Esempio corretto:</b> <code>/associa 849201</code>\n\n` +
            `1️⃣ Torna sul sito di Casinò Revenge.\n` +
            `2️⃣ Clicca su <b>'Genera Comando /associa'</b> o copia il codice visibile.\n` +
            `3️⃣ Incolla il comando completo qui in chat.`,
        );
        continue;
      }

      // Match code from commands like "/associa 849201", "/start 849201", "849201"
      const codeMatch = text.match(/\b\d{6}\b/);
      if (codeMatch) {
        const code = codeMatch[0];

        // Check if this code is valid (pending in memory OR existing in database)
        const pendingMemoryObj = pendingCodesStore.get(code);
        const isPendingInMemory = !!pendingMemoryObj;
        let isPendingInDb = false;

        if (!isPendingInMemory) {
          try {
            const { data: dbProf } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("telegram_code", code);
            if (dbProf && dbProf.length > 0) {
              isPendingInDb = true;
            }
          } catch (e) {
            // ignore
          }
        }

        const isValidCode = isPendingInMemory || isPendingInDb;

        if (isValidCode) {
          verifiedCodesStore.set(code, {
            handle: rawHandle,
            chatId: msg.chat.id,
            firstName: from.first_name || "Cliente",
            date: Date.now(),
          });

          pendingCodesStore.delete(code);

          // Update database directly if a user profile is waiting for this code
          try {
            if (pendingMemoryObj?.userId) {
              await supabaseAdmin
                .from("profiles")
                .update({
                  telegram_handle: rawHandle,
                  telegram_connected: true,
                  telegram_code: null,
                })
                .eq("id", pendingMemoryObj.userId);
            }

            await supabaseAdmin
              .from("profiles")
              .update({
                telegram_handle: rawHandle,
                telegram_connected: true,
                telegram_code: null,
              })
              .eq("telegram_code", code);
          } catch (dbErr) {
            console.error("Error auto-updating database profile for code:", dbErr);
          }

          // Send instant, detailed response on Telegram
          await sendTelegramMessage(
            msg.chat.id,
            `🎉 <b>COLLEGAMENTO TELEGRAM COMPLETATO CON SUCCESSO!</b>\n\n` +
              `👋 Ciao <b>${from.first_name || "Utente"}</b>!\n` +
              `Il tuo profilo Telegram (<b>${rawHandle}</b>) è stato collegato ed autorizzato per la piattaforma <b>Casinò Revenge</b>.\n\n` +
              `📌 <b>Prossimi Passaggi:</b>\n` +
              `1️⃣ Torna alla pagina del browser dove stavi effettuando l'accesso o la registrazione.\n` +
              `2️⃣ La pagina riconoscerà il collegamento ed <b>avanzerà automaticamente</b> entro pochissimi secondi!\n` +
              `3️⃣ Ora puoi accedere a tutte le funzionalità riservate del pannello e della Ciurma dello Staff.\n\n` +
              `🔥 <i>Grazie per far parte di Casinò Revenge!</i>`,
          );
        } else {
          // Code is invalid or expired
          await sendTelegramMessage(
            msg.chat.id,
            `❌ <b>CODICE NON VALIDO O SCADUTO</b>\n\n` +
              `Ciao ${from.first_name || "Utente"}, il codice <code>${code}</code> non corrisponde a nessuna richiesta attiva sul sito del <b>Casinò Revenge</b>.\n\n` +
              `👉 <b>Come risolvere:</b>\n` +
              `1️⃣ Torna sul sito del Casinò Revenge.\n` +
              `2️⃣ Clicca su <b>'Genera Comando /associa'</b> per ottenere un codice valido.\n` +
              `3️⃣ Invia il nuovo comando qui in chat (es. <code>/associa 849201</code>).\n\n` +
              `💡 <i>Assicurati di generare il codice dal sito prima di inviarlo!</i>`,
          );
        }
      } else {
        // Handle message without 6-digit code (e.g. /start or general message)
        const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
        if (isGroup && !text.startsWith("/")) {
          // Do not send welcome procedure for regular chat messages in groups
          continue;
        }

        let connectedProf: any = null;
        const handlesToSearch = new Set<string>();
        if (rawHandle) handlesToSearch.add(rawHandle);
        if (from.username) {
          handlesToSearch.add(`@${from.username}`);
          handlesToSearch.add(from.username);
        }

        for (const h of handlesToSearch) {
          if (connectedProf) break;
          try {
            const { data: dbProfs } = await supabaseAdmin
              .from("profiles")
              .select("username, display_name, telegram_connected, telegram_handle")
              .ilike("telegram_handle", h.startsWith("@") ? h : `@${h}`)
              .eq("telegram_connected", true)
              .limit(1);
            if (dbProfs && dbProfs.length > 0) {
              connectedProf = dbProfs[0];
            }
          } catch (e) {
            console.error("Error finding connected Telegram profile:", e);
          }
        }

        if (connectedProf) {
          // Account is ALREADY connected
          await sendTelegramMessage(
            msg.chat.id,
            `✅ <b>ACCOUNT TELEGRAM COLLEGATO</b>\n\n` +
              `👋 Ciao <b>${from.first_name || "Utente"}</b>!\n` +
              `Il tuo profilo Telegram (<b>${rawHandle}</b>) è attualmente collegato all'account Minecraft: <b>${connectedProf.display_name || connectedProf.username}</b>.\n\n` +
              `Se desideri scollegare il tuo account, invia il comando <code>/scollega</code> o usa il pulsante qui sotto.`,
            {
              inline_keyboard: [[{ text: "🔌 Scollega Account", callback_data: "scollega" }]],
            },
          );
        } else {
          // Account NOT connected -> show procedure
          await sendTelegramMessage(
            msg.chat.id,
            `👋 <b>Benvenuto nel Bot Ufficiale del Casinò Revenge!</b>\n\n` +
              `Il tuo account Telegram non è ancora collegato a nessun profilo Minecraft.\n\n` +
              `📌 <b>Procedura di Collegamento:</b>\n` +
              `1️⃣ Vai sul sito web del <b>Casinò Revenge</b> ed avvia la Registrazione o l'Accesso.\n` +
              `2️⃣ Nel Passo 2, clicca su <b>'Genera Comando /associa'</b> per ottenere il tuo codice unico.\n` +
              `3️⃣ Invia qui in chat il comando generato (es: <code>/associa 849201</code>).\n\n` +
              `💡 <i>Invia /start in qualsiasi momento per verificare lo stato del tuo collegamento.</i>`,
          );
        }
      }
    }

    return data.result;
  } catch (err) {
    console.error("Error fetching Telegram updates:", err);
    return [];
  } finally {
    g._telegramIsFetching = false;
  }
}

export function getCachedCodeVerification(code: string) {
  return verifiedCodesStore.get(code) || null;
}

export function startBackgroundPolling() {
  if (g._telegramPollingStarted) return;

  // Only start long-running setInterval on dedicated Node.js processes (not Edge/Cloudflare Workers)
  const isDedicatedNodeProcess =
    typeof process !== "undefined" &&
    process.versions?.node &&
    !process.env.CF_PAGES &&
    !process.env.WORKERS &&
    typeof setInterval === "function";

  if (!isDedicatedNodeProcess) return;

  g._telegramPollingStarted = true;

  try {
    // Immediate initial run
    fetchTelegramUpdates().catch(() => {});

    // Continuous background loop running every 2 seconds
    setInterval(() => {
      fetchTelegramUpdates().catch((err) => {
        console.error("Background polling loop error:", err);
      });
    }, 2000);
  } catch (e) {
    // Silently fail if runtime does not support timers
  }
}

// Auto-start continuous polling on server load if supported
if (typeof window === "undefined") {
  try {
    startBackgroundPolling();
  } catch (e) {
    // ignore
  }
}
