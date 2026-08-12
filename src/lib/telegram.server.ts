const BOT_TOKEN = "8914449193:AAF94fiCf0od_YjoK2e_Pw4Nsc6vVFA6mlk";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Cache verified codes and pending codes on globalThis to survive HMR/server reloads
const g = globalThis as any;

if (!g._telegramPendingCodes) {
  g._telegramPendingCodes = new Map<string, { createdAt: number; userId?: string }>();
}
if (!g._telegramVerifiedCodes) {
  g._telegramVerifiedCodes = new Map<string, { handle: string; chatId: number; firstName: string; date: number }>();
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

const pendingCodesStore: Map<string, { createdAt: number; userId?: string }> = g._telegramPendingCodes;
const verifiedCodesStore: Map<string, { handle: string; chatId: number; firstName: string; date: number }> = g._telegramVerifiedCodes;
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
    const res = await fetch(`${API_URL}/getMe`);
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

export async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
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
    });
    return await res.json();
  } catch (err) {
    console.error("Error sending Telegram message:", err);
    return null;
  }
}

export async function fetchTelegramUpdates() {
  if (g._telegramIsFetching) return [];
  g._telegramIsFetching = true;

  try {
    // Clear webhook only once on startup and drop pending backlog
    if (!g._telegramWebhookCleared) {
      g._telegramWebhookCleared = true;
      await fetch(`${API_URL}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
    }

    const lastId = g._telegramLastUpdateId || 0;
    const offsetParam = lastId > 0 ? `?offset=${lastId + 1}&timeout=0` : `?timeout=0`;
    const res = await fetch(`${API_URL}/getUpdates${offsetParam}`);
    const data = await res.json();

    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      g._telegramIsFetching = false;
      return [];
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
          const rawHandle = cbFrom.username ? `@${cbFrom.username}` : null;
          if (rawHandle) {
            try {
              await supabaseAdmin
                .from("profiles")
                .update({
                  telegram_connected: false,
                  telegram_handle: null,
                  telegram_code: null,
                })
                .ilike("telegram_handle", rawHandle);
            } catch (err) {
              console.error("Error disconnecting Telegram handle:", err);
            }
          }
          await sendTelegramMessage(
            chatId,
            `❌ <b>Account Telegram scollegato con successo.</b>\n\n` +
              `L'associazione con il tuo profilo Minecraft è stata rimossa.\n` +
              `Per collegare un nuovo account, invia il comando /start.`
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

      // Handle /scollega command directly
      if (text === "/scollega") {
        if (from.username) {
          try {
            await supabaseAdmin
              .from("profiles")
              .update({
                telegram_connected: false,
                telegram_handle: null,
                telegram_code: null,
              })
              .ilike("telegram_handle", `@${from.username}`);
          } catch (err) {
            console.error("Error unlinking handle via /scollega:", err);
          }
        }
        await sendTelegramMessage(
          msg.chat.id,
          `❌ <b>Account Telegram scollegato con successo.</b>\n\n` +
            `L'associazione con il tuo profilo Minecraft è stata rimossa.\n` +
            `Per associare un nuovo account Minecraft, invia /start.`
        );
        continue;
      }

      // Match code from commands like "/associa 849201", "/start 849201", "849201"
      const codeMatch = text.match(/\b\d{6}\b/);
      if (codeMatch) {
        const code = codeMatch[0];

        // Check if this code is valid (pending in memory OR existing in database)
        const isPendingInMemory = pendingCodesStore.has(code);
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
              `🔥 <i>Grazie per far parte di Casinò Revenge!</i>`
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
              `💡 <i>Assicurati di generare il codice dal sito prima di inviarlo!</i>`
          );
        }
      } else {
        // Handle message without 6-digit code (e.g. /start or general message)
        let connectedProf: any = null;
        if (from.username) {
          try {
            const { data: dbProf } = await supabaseAdmin
              .from("profiles")
              .select("username, display_name, telegram_connected")
              .ilike("telegram_handle", `@${from.username}`)
              .eq("telegram_connected", true)
              .maybeSingle();
            if (dbProf) connectedProf = dbProf;
          } catch (e) {
            // ignore
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
            }
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
              `💡 <i>Invia /start in qualsiasi momento per verificare lo stato del tuo collegamento.</i>`
          );
        }
      }
    }

    g._telegramIsFetching = false;
    return data.result;
  } catch (err) {
    console.error("Error fetching Telegram updates:", err);
    g._telegramIsFetching = false;
    return [];
  }
}

export function getCachedCodeVerification(code: string) {
  return verifiedCodesStore.get(code) || null;
}

export function startBackgroundPolling() {
  if (g._telegramPollingStarted) return;
  g._telegramPollingStarted = true;

  fetchTelegramUpdates().catch(() => {});

  setInterval(() => {
    fetchTelegramUpdates().catch((err) => {
      console.error("Background polling error:", err);
    });
  }, 1000);
}

if (typeof window === "undefined") {
  startBackgroundPolling();
}
