import { supabaseAdmin } from "../integrations/supabase/client.server";

export function getBotToken(): string {
  return (
    process.env.TELEGRAM_BOT_TOKEN || "8914449193:AAHO7p6gZg044X8d839z2y-aXzsa613MubQ"
  ).trim();
}

export function getApiUrl(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

// Proxy object or getter for API_URL so it stays dynamic
const API_URL = {
  toString() {
    return getApiUrl();
  },
  valueOf() {
    return getApiUrl();
  },
  [Symbol.toPrimitive]() {
    return getApiUrl();
  },
};

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
if (g._lastTelegramAuditDate === undefined) {
  g._lastTelegramAuditDate = "";
}
if (!g._telegramUnregisteredNoticeCooldown) {
  g._telegramUnregisteredNoticeCooldown = new Map<string, number>();
}
if (!g._telegramChatMessages) {
  g._telegramChatMessages = new Map<string, any[]>();
}
if (!g._telegramPinnedChats) {
  g._telegramPinnedChats = new Set<string>();
}

const pendingCodesStore: Map<string, { createdAt: number; userId?: string }> =
  g._telegramPendingCodes;
const verifiedCodesStore: Map<
  string,
  { handle: string; chatId: number; firstName: string; date: number }
> = g._telegramVerifiedCodes;
const processedUpdatesSet: Set<number> = g._telegramProcessedUpdates;
const unregisteredNoticeCooldown: Map<string, number> = g._telegramUnregisteredNoticeCooldown;
const chatMessagesStore: Map<string, any[]> = g._telegramChatMessages;
const pinnedChatsStore: Set<string> = g._telegramPinnedChats;

export async function registerPendingCode(code: string, userId?: string) {
  pendingCodesStore.set(code, { createdAt: Date.now(), userId });
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    await supabaseAdmin.from("telegram_pending_codes").upsert({
      id: code,
      code,
      user_id: userId || null,
      created_at: new Date().toISOString(),
      verified: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    // ignore
  }
}

export async function cancelPendingCode(code: string) {
  if (!code) return;
  pendingCodesStore.delete(code);
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    await supabaseAdmin.from("telegram_pending_codes").delete().eq("code", code);
  } catch (err) {
    // ignore
  }
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
  options?: {
    replyToMessageId?: number;
    disableNotification?: boolean;
  },
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
    if (options?.replyToMessageId) {
      payload.reply_parameters = { message_id: options.replyToMessageId };
    }
    if (options?.disableNotification) {
      payload.disable_notification = true;
    }
    const res = await fetch(`${getApiUrl()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    let data = await res.json();
    // Auto fallback if Telegram fails due to unescaped HTML entities
    if (
      !data.ok &&
      data.description &&
      (data.description.includes("can't parse entities") || data.description.includes("entity"))
    ) {
      console.warn(
        "[Telegram Bot] HTML parse error, retrying with plain text fallback:",
        data.description,
      );
      const plainText = text.replace(/<[^>]*>/g, "");
      const retryRes = await fetch(`${getApiUrl()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          text: plainText,
          parse_mode: undefined,
        }),
        signal: AbortSignal.timeout(8000),
      });
      data = await retryRes.json();
    }
    return data;
  } catch (err) {
    console.error("Error sending Telegram message:", err);
    return null;
  }
}

export async function sendDirectTelegramNotificationToUser(
  supabaseAdmin: any,
  userId: string,
  htmlMessage: string,
  options?: { disableNotification?: boolean },
) {
  try {
    if (!userId || !htmlMessage) return false;

    // 1. Fetch Profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, display_name, telegram_handle, telegram_user_id, telegram_chat_id, telegram_connected",
      )
      .eq("id", userId)
      .maybeSingle();

    if (!profile) return false;

    let targetChatId: string | number | null =
      profile.telegram_chat_id || profile.telegram_user_id || null;

    // 2. If no numeric chat_id on profile, lookup in telegram_group_members using telegram_handle or username
    if (!targetChatId && profile.telegram_handle) {
      const cleanH = profile.telegram_handle.replace("@", "").trim().toLowerCase();
      const { data: members } = await supabaseAdmin
        .from("telegram_group_members")
        .select("telegram_user_id, telegram_handle, username")
        .or(`telegram_handle.ilike.%${cleanH}%,username.ilike.%${cleanH}%`)
        .limit(1);

      if (members && members.length > 0 && members[0].telegram_user_id) {
        targetChatId = members[0].telegram_user_id;
      }
    }

    // 3. Fallback to telegram_chat_messages to find user's private chat_id
    if (!targetChatId && profile.telegram_handle) {
      const cleanH = profile.telegram_handle.replace("@", "").trim().toLowerCase();
      const { data: msgs } = await supabaseAdmin
        .from("telegram_chat_messages")
        .select("sender_id, chat_id, sender_handle")
        .or(`sender_handle.ilike.%${cleanH}%,sender_name.ilike.%${cleanH}%`)
        .limit(1);

      if (msgs && msgs.length > 0 && msgs[0].sender_id) {
        targetChatId = msgs[0].sender_id;
      }
    }

    if (targetChatId) {
      const result = await sendTelegramMessage(targetChatId, htmlMessage, undefined, options);
      return !!result?.ok;
    }

    return false;
  } catch (err) {
    console.error("[Telegram] Error in sendDirectTelegramNotificationToUser:", userId, err);
    return false;
  }
}

export async function pinTelegramChatMessage(
  chatId: number | string,
  messageId: number,
  disableNotification: boolean = false,
) {
  try {
    const res = await fetch(`${API_URL}/pinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        disable_notification: disableNotification,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (err) {
    console.error("Error pinning Telegram chat message:", err);
    return null;
  }
}

export async function unpinTelegramChatMessage(chatId: number | string, messageId?: number) {
  try {
    const body: any = { chat_id: chatId };
    if (messageId) body.message_id = messageId;
    const res = await fetch(`${API_URL}/unpinChatMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (err) {
    console.error("Error unpinning Telegram chat message:", err);
    return null;
  }
}

export async function setTelegramMessageReaction(
  chatId: number | string,
  messageId: number,
  emojis: string[],
) {
  try {
    const reaction = emojis.map((e) => ({ type: "emoji", emoji: e }));
    const res = await fetch(`${API_URL}/setMessageReaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (err) {
    console.error("Error setting Telegram message reaction:", err);
    return null;
  }
}

export interface ChatMessageRecord {
  id: string;
  chat_id: string | number;
  message_id: number;
  sender_type: "bot" | "user" | "staff" | "channel";
  sender_name: string;
  sender_username?: string;
  sender_avatar?: string;
  sender_role?: string;
  sender_id?: string | number;
  text: string;
  created_at: string;
  date: number;
  is_pinned?: boolean;
  pinned_at?: string;
  reply_to_message_id?: number;
  reply_to_message?: {
    id: string;
    message_id: number;
    sender_name: string;
    text: string;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: { id: string | number; name: string; username?: string }[];
  }[];
  inline_buttons?: { text: string; url: string }[];
  delivery_status?: "sent" | "delivered" | "read" | "failed";
}

export function getStoredChatMessages(chatId: string | number): ChatMessageRecord[] {
  const cId = String(chatId);
  if (!chatMessagesStore.has(cId)) {
    chatMessagesStore.set(cId, []);
  }
  return chatMessagesStore.get(cId) || [];
}

export async function getStoredChatMessagesAsync(
  chatId: string | number,
): Promise<ChatMessageRecord[]> {
  const cId = String(chatId);
  let list = getStoredChatMessages(cId);

  // If memory cache is empty, attempt to hydrate from database
  if (list.length === 0) {
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server");
      const { data: dbMessages } = await supabaseAdmin
        .from("telegram_chat_messages")
        .select("*")
        .eq("chat_id", cId)
        .order("date", { ascending: true })
        .limit(150);

      if (Array.isArray(dbMessages) && dbMessages.length > 0) {
        list = dbMessages;
        chatMessagesStore.set(cId, list);
      }
    } catch (e) {
      // Ignore fallback errors
    }
  }

  return list;
}

export function storeChatMessage(msg: ChatMessageRecord) {
  const cId = String(msg.chat_id);
  let list = getStoredChatMessages(cId);

  // Auto-resolve reply_to_message details if only ID was provided
  if (msg.reply_to_message_id && !msg.reply_to_message) {
    const parentMsg = list.find((m) => m.message_id === msg.reply_to_message_id);
    if (parentMsg) {
      msg.reply_to_message = {
        id: parentMsg.id,
        message_id: parentMsg.message_id,
        sender_name: parentMsg.sender_name || "Utente",
        text: parentMsg.text || "",
      };
    }
  }

  const existingIdx = list.findIndex((m) => m.message_id === msg.message_id || m.id === msg.id);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...msg };
  } else {
    list.push(msg);
  }

  // Sort chronologically
  list.sort((a, b) => (a.date || 0) - (b.date || 0));

  // Cap in-memory storage to max 150 items per chat to prevent memory bloat
  if (list.length > 150) {
    list = list.slice(-150);
  }
  chatMessagesStore.set(cId, list);

  // Non-blocking persistent write to database
  (async () => {
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server");
      await supabaseAdmin.from("telegram_chat_messages").upsert({
        id: msg.id || `tg-${msg.chat_id}-${msg.message_id}`,
        chat_id: String(msg.chat_id),
        message_id: msg.message_id,
        sender_type: msg.sender_type || "user",
        sender_name: msg.sender_name || "Utente",
        sender_username: msg.sender_username || null,
        sender_avatar: msg.sender_avatar || null,
        sender_role: msg.sender_role || null,
        sender_id: msg.sender_id || null,
        text: msg.text || "",
        created_at: msg.created_at || new Date().toISOString(),
        date: msg.date || Math.floor(Date.now() / 1000),
        is_pinned: !!msg.is_pinned,
        pinned_at: msg.pinned_at || null,
        reply_to_message_id: msg.reply_to_message_id || null,
        reply_to_message: msg.reply_to_message || null,
        reactions: msg.reactions || [],
        inline_buttons: msg.inline_buttons || [],
        delivery_status: msg.delivery_status || "delivered",
      });
    } catch (e) {
      // ignore
    }
  })();

  return msg;
}

export function toggleChatMessagePinInStore(
  chatId: string | number,
  messageId: number,
  isPinned: boolean,
) {
  const cId = String(chatId);
  const list = getStoredChatMessages(cId);
  const msg = list.find((m) => m.message_id === messageId);
  if (msg) {
    msg.is_pinned = isPinned;
    msg.pinned_at = isPinned ? new Date().toISOString() : undefined;
  }
  return msg;
}

export function toggleChatMessageReactionInStore(
  chatId: string | number,
  messageId: number,
  emoji: string,
  user: { id: string | number; name: string; username?: string },
) {
  const cId = String(chatId);
  const list = getStoredChatMessages(cId);
  const msg = list.find((m) => m.message_id === messageId);
  if (!msg) return null;

  if (!msg.reactions) msg.reactions = [];

  const existingReaction = msg.reactions.find((r) => r.emoji === emoji);
  if (existingReaction) {
    const userIdx = existingReaction.users.findIndex((u) => String(u.id) === String(user.id));
    if (userIdx >= 0) {
      // Remove reaction
      existingReaction.users.splice(userIdx, 1);
      existingReaction.count = existingReaction.users.length;
      if (existingReaction.count === 0) {
        msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      // Add user to reaction
      existingReaction.users.push(user);
      existingReaction.count = existingReaction.users.length;
    }
  } else {
    // New reaction
    msg.reactions.push({
      emoji,
      count: 1,
      users: [user],
    });
  }

  return msg;
}

export function togglePinnedChatInStore(chatId: string | number): boolean {
  const cId = String(chatId);
  if (pinnedChatsStore.has(cId)) {
    pinnedChatsStore.delete(cId);
    return false;
  } else {
    pinnedChatsStore.add(cId);
    return true;
  }
}

export function deleteChatMessageFromStore(chatId: string | number, messageId: number) {
  const cId = String(chatId);
  const list = getStoredChatMessages(cId);
  const nextList = list.filter((m) => m.message_id !== messageId);
  chatMessagesStore.set(cId, nextList);

  (async () => {
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server");
      await supabaseAdmin
        .from("telegram_chat_messages")
        .delete()
        .eq("chat_id", cId)
        .eq("message_id", messageId);
    } catch (e) {
      // ignore
    }
  })();

  return nextList;
}

export async function deleteTelegramChatMessage(chatId: number | string, messageId: number) {
  try {
    deleteChatMessageFromStore(chatId, messageId);
    const res = await fetch(`${API_URL}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("Error deleting Telegram chat message:", err);
    return false;
  }
}

export async function promoteTelegramChatMember(
  chatId: number | string,
  userId: number | string,
  options?: {
    canManageChat?: boolean;
    canDeleteMessages?: boolean;
    canManageVideoChats?: boolean;
    canRestrictMembers?: boolean;
    canPromoteMembers?: boolean;
    canChangeInfo?: boolean;
    canInviteUsers?: boolean;
    canPinMessages?: boolean;
  },
) {
  try {
    const res = await fetch(`${API_URL}/promoteChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        can_manage_chat: options?.canManageChat ?? true,
        can_delete_messages: options?.canDeleteMessages ?? true,
        can_restrict_members: options?.canRestrictMembers ?? true,
        can_invite_users: options?.canInviteUsers ?? true,
        can_pin_messages: options?.canPinMessages ?? true,
        can_manage_video_chats: options?.canManageVideoChats ?? true,
        can_change_info: options?.canChangeInfo ?? false,
        can_promote_members: options?.canPromoteMembers ?? false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("Error promoting Telegram chat member:", err);
    return false;
  }
}

export async function demoteTelegramChatMember(chatId: number | string, userId: number | string) {
  try {
    const res = await fetch(`${API_URL}/promoteChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        can_manage_chat: false,
        can_delete_messages: false,
        can_restrict_members: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_video_chats: false,
        can_change_info: false,
        can_promote_members: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("Error demoting Telegram chat member:", err);
    return false;
  }
}

export function isChatPinnedInStore(chatId: string | number): boolean {
  return pinnedChatsStore.has(String(chatId));
}

export async function getTelegramChat(chatId: number | string) {
  try {
    const res = await fetch(`${API_URL}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error("Error getting Telegram chat info:", err);
    return null;
  }
}

export async function createTelegramInviteLink(
  chatId: number | string,
  name?: string,
  memberLimit: number = 0,
  expireHours: number = 48,
) {
  try {
    const expireDate = Math.floor(Date.now() / 1000) + expireHours * 3600;
    const payload: any = {
      chat_id: chatId,
      name: name || "Invito Casinò Revenge",
      expire_date: expireDate,
      creates_join_request: false,
    };
    if (memberLimit > 0) {
      payload.member_limit = memberLimit;
    }
    const res = await fetch(`${API_URL}/createChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.ok && data.result?.invite_link) {
      return data.result.invite_link;
    }

    // Fallback: try exportChatInviteLink
    const expRes = await fetch(`${API_URL}/exportChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
      signal: AbortSignal.timeout(8000),
    });
    const expData = await expRes.json();
    if (expData.ok && expData.result) {
      return expData.result;
    }
    return null;
  } catch (err) {
    console.error("Error creating Telegram invite link:", err);
    return null;
  }
}

export async function getTelegramChatAdministrators(chatId: number | string) {
  try {
    const res = await fetch(`${API_URL}/getChatAdministrators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      return data.result;
    }
    return [];
  } catch (err) {
    console.error("Error getting Telegram chat administrators:", err);
    return [];
  }
}

export async function getTelegramChatMemberCount(chatId: number | string) {
  try {
    const res = await fetch(`${API_URL}/getChatMemberCount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.ok && typeof data.result === "number") {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error("Error getting Telegram chat member count:", err);
    return null;
  }
}

export async function checkTelegramChatMember(chatId: number | string, userId: number | string) {
  try {
    const res = await fetch(`${API_URL}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error("Error checking Telegram chat member:", err);
    return null;
  }
}

export async function getGroupBotPermissions(chatId: number | string) {
  try {
    const botInfo = await getTelegramBotInfo();
    if (!botInfo || !botInfo.id) {
      return {
        isAvailable: false,
        isAdmin: false,
        canInviteUsers: false,
        canRestrictMembers: false,
        canDeleteMessages: false,
        canManageChat: false,
        status: "unknown",
        botUsername: null,
        botId: null,
        errorMessage:
          "Impossibile recuperare i dettagli del Bot Telegram (Token non valido o offline).",
        allRequiredGranted: false,
      };
    }

    const botMember = await checkTelegramChatMember(chatId, botInfo.id);
    if (!botMember) {
      return {
        isAvailable: false,
        isAdmin: false,
        canInviteUsers: false,
        canRestrictMembers: false,
        canDeleteMessages: false,
        canManageChat: false,
        status: "not_found",
        botUsername: botInfo.username,
        botId: botInfo.id,
        errorMessage: `Il Bot (@${botInfo.username}) non è presente nel gruppo o non ha i permessi di lettura della chat.`,
        allRequiredGranted: false,
      };
    }

    const status = botMember.status; // "creator" | "administrator" | "member" | "left" | "kicked"
    const isAdmin = status === "administrator" || status === "creator";
    const canInviteUsers = !!(botMember.can_invite_users || status === "creator");
    const canRestrictMembers = !!(botMember.can_restrict_members || status === "creator");
    const canDeleteMessages = !!(botMember.can_delete_messages || status === "creator");
    const canManageChat = !!(botMember.can_manage_chat || status === "creator");

    const allRequiredGranted = isAdmin && canInviteUsers && canRestrictMembers;

    let errorMessage: string | null = null;
    if (!isAdmin) {
      errorMessage = `Il Bot (@${botInfo.username}) è presente solo come membro semplice. Devi promuoverlo ad Amministratore nel gruppo Telegram.`;
    } else if (!canInviteUsers && !canRestrictMembers) {
      errorMessage =
        "Il Bot è Amministratore ma mancano sia il permesso 'Invitare utenti tramite link' sia 'Espellere/Limitare utenti'.";
    } else if (!canInviteUsers) {
      errorMessage = "Il Bot è Amministratore ma manca il permesso 'Invitare utenti tramite link'.";
    } else if (!canRestrictMembers) {
      errorMessage = "Il Bot è Amministratore ma manca il permesso 'Espellere/Limitare utenti'.";
    }

    return {
      isAvailable: true,
      isAdmin,
      status,
      botUsername: botInfo.username,
      botId: botInfo.id,
      canInviteUsers,
      canRestrictMembers,
      canDeleteMessages,
      canManageChat,
      allRequiredGranted,
      errorMessage,
    };
  } catch (err: any) {
    console.error("Error checking group bot permissions:", err);
    return {
      isAvailable: false,
      isAdmin: false,
      canInviteUsers: false,
      canRestrictMembers: false,
      canDeleteMessages: false,
      canManageChat: false,
      status: "error",
      botUsername: null,
      botId: null,
      errorMessage: err?.message || "Errore di connessione con le API Telegram.",
      allRequiredGranted: false,
    };
  }
}

export async function kickTelegramChatMember(chatId: number | string, userId: number | string) {
  try {
    const res = await fetch(`${API_URL}/banChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        revoke_messages: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data.ok) {
      console.log(
        `[Telegram banChatMember Notice] Chat ${chatId}, User ${userId}: ${data.description || "error"} (code: ${data.error_code})`,
      );
      return false;
    } else {
      console.log(`[Telegram banChatMember Success] Chat ${chatId}, User ${userId}`);
    }

    // After 1.5 seconds unban so they can rejoin in future if authorized later
    setTimeout(async () => {
      try {
        await fetch(`${API_URL}/unbanChatMember`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            user_id: userId,
            only_if_banned: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
      } catch (e) {
        // ignore
      }
    }, 1500);

    return data.ok;
  } catch (err) {
    console.error("Error kicking Telegram chat member:", err);
    return false;
  }
}

export async function unbanTelegramChatMember(chatId: number | string, userId: number | string) {
  try {
    const res = await fetch(`${API_URL}/unbanChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        only_if_banned: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error("Error unbanning Telegram chat member:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Universal Sync Helper for Telegram User & Group Memberships
// -------------------------------------------------------------
export async function syncTelegramUserWithGroupAndProfile(
  fromUser: { id: number | string; username?: string; first_name?: string; last_name?: string },
  groupChatId?: number | string | null,
) {
  if (!fromUser || !fromUser.id) return null;

  const rawHandle = fromUser.username
    ? `@${fromUser.username}`
    : `@${(fromUser.first_name || "Utente").replace(/\s+/g, "")}_${fromUser.id}`;

  const cleanUsername = fromUser.username ? fromUser.username.toLowerCase().replace("@", "") : "";
  const cleanFirstName = fromUser.first_name
    ? fromUser.first_name.toLowerCase().replace("@", "").trim()
    : "";
  const tgIdStr = String(fromUser.id);

  const { data: allProfs } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, username, display_name, telegram_connected, telegram_user_id, telegram_handle, telegram_chat_id",
    );

  const matchedProf = (allProfs || []).find((p: any) => {
    // 1. Exact telegram_user_id match
    if (p.telegram_user_id && String(p.telegram_user_id) === tgIdStr) return true;
    if (p.telegram_chat_id && String(p.telegram_chat_id) === tgIdStr) return true;

    // 2. telegram_handle match
    if (p.telegram_handle) {
      const pHandle = p.telegram_handle.toLowerCase().replace("@", "").trim();
      if (cleanUsername && pHandle === cleanUsername) return true;
      if (cleanFirstName && pHandle === cleanFirstName) return true;
      if (pHandle === rawHandle.toLowerCase().replace("@", "")) return true;
    }

    // 3. username match
    if (p.username) {
      const pUser = p.username.toLowerCase().replace("@", "").trim();
      if (cleanUsername && pUser === cleanUsername) return true;
      if (cleanFirstName && pUser === cleanFirstName) return true;
    }

    // 4. display_name match
    if (p.display_name) {
      const pDisplay = p.display_name.toLowerCase().replace("@", "").trim();
      if (cleanUsername && pDisplay === cleanUsername) return true;
      if (cleanFirstName && pDisplay === cleanFirstName) return true;
    }

    return false;
  });

  if (matchedProf) {
    if (
      !matchedProf.telegram_user_id ||
      matchedProf.telegram_handle !== rawHandle ||
      !matchedProf.telegram_connected
    ) {
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_user_id: fromUser.id,
          telegram_handle: rawHandle,
          telegram_connected: true,
          telegram_chat_id: fromUser.id,
        })
        .eq("id", matchedProf.id);
    }
  }

  if (groupChatId) {
    const { data: dbGroup } = await supabaseAdmin
      .from("telegram_groups")
      .select("*")
      .eq("chat_id", groupChatId)
      .maybeSingle();

    if (dbGroup) {
      await supabaseAdmin.from("telegram_group_members").upsert({
        id: `tgm-${dbGroup.id}-${fromUser.id}`,
        group_id: dbGroup.id,
        chat_id: groupChatId,
        telegram_user_id: fromUser.id,
        telegram_handle: rawHandle,
        user_id: matchedProf ? matchedProf.id : null,
        status: "member",
        verified: !!matchedProf,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return matchedProf;
}

// -------------------------------------------------------------
// Audit Routine & Role Change Sync
// -------------------------------------------------------------
export function isUserOrHandleAuthorizedForGroup(
  group: any,
  profile: any | null,
  userRoleIds: string[] | Set<string> = [],
  isAdmin: boolean = false,
  telegramHandleOverride?: string,
  telegramUserIdOverride?: string | number,
): boolean {
  if (!group) return false;

  // 0. Fired employees or employees without employee access are NEVER authorized in staff groups
  if (profile && (profile.is_fired === true || profile.has_employee_access === false)) {
    return false;
  }

  // 1. Admins or groups with disabled checks are inherently authorized
  if (isAdmin || group.ignore_checks || group.disable_checks) return true;

  const allowedRoles = group.allowed_role_ids || [];

  // If allowedRoles is empty or contains "all" / "staff", any active staff member is allowed
  if (allowedRoles.length === 0 || allowedRoles.includes("all") || allowedRoles.includes("staff")) {
    if (profile?.has_employee_access !== false) return true;
  }

  if (allowedRoles.includes("admin") || allowedRoles.includes("crole-admin")) {
    if (isAdmin) return true;
  }

  // 2. Build set of user roles, custom role IDs, and role names
  const roleSet = new Set<string>();
  const rawRoleList = Array.isArray(userRoleIds) ? userRoleIds : Array.from(userRoleIds || []);

  for (const r of rawRoleList) {
    if (!r) continue;
    const str = String(r).trim();
    roleSet.add(str);
    roleSet.add(str.toLowerCase());
  }

  if (profile) {
    if (profile.role) {
      roleSet.add(String(profile.role).trim());
      roleSet.add(String(profile.role).trim().toLowerCase());
    }
    if (profile.custom_role) {
      roleSet.add(String(profile.custom_role).trim());
      roleSet.add(String(profile.custom_role).trim().toLowerCase());
    }
    if (profile.username) {
      roleSet.add(String(profile.username).trim().toLowerCase());
    }
  }

  const cleanAllowedRoles = allowedRoles.map((r: any) =>
    String(r || "")
      .trim()
      .toLowerCase(),
  );

  const hasRole = cleanAllowedRoles.some((allowed: string) => {
    if (!allowed) return false;
    if (allowed === "admin" && isAdmin) return true;
    for (const userRole of roleSet) {
      const cleanUserRole = userRole.toLowerCase();
      if (
        cleanUserRole === allowed ||
        cleanUserRole.includes(allowed) ||
        allowed.includes(cleanUserRole)
      ) {
        return true;
      }
    }
    return false;
  });

  if (hasRole) return true;

  // 3. Check manual exceptions / allowed handles / allowed nicknames / manual user ids
  const rawExceptions: string[] = [
    ...(group.allowed_exceptions || []),
    ...(group.allowed_handles || []),
    ...(group.manual_user_ids || []),
  ];

  const exceptions = rawExceptions
    .map((s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/^@+/, ""),
    )
    .filter(Boolean);

  if (exceptions.length === 0) return false;

  // Check user profile IDs
  if (profile?.id && exceptions.includes(String(profile.id).toLowerCase())) return true;

  // Check Telegram User ID
  if (telegramUserIdOverride && exceptions.includes(String(telegramUserIdOverride).toLowerCase()))
    return true;
  if (
    profile?.telegram_user_id &&
    exceptions.includes(String(profile.telegram_user_id).toLowerCase())
  )
    return true;

  // Check Telegram handle
  if (telegramHandleOverride) {
    const cleanTg = telegramHandleOverride.trim().toLowerCase().replace(/^@+/, "");
    if (cleanTg && exceptions.includes(cleanTg)) return true;
  }
  if (profile?.telegram_handle) {
    const cleanTg = profile.telegram_handle.trim().toLowerCase().replace(/^@+/, "");
    if (cleanTg && exceptions.includes(cleanTg)) return true;
  }

  // Check Minecraft nickname / site username / display name
  if (profile?.username) {
    const cleanUsername = profile.username.trim().toLowerCase().replace(/^@+/, "");
    if (cleanUsername && exceptions.includes(cleanUsername)) return true;
  }
  if (profile?.display_name) {
    const cleanDisplay = profile.display_name.trim().toLowerCase().replace(/^@+/, "");
    if (cleanDisplay && exceptions.includes(cleanDisplay)) return true;
  }

  return false;
}

export async function syncUserTelegramGroupAccess(userId: string) {
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const [
      { data: profile },
      { data: userRoles },
      { data: customRoles },
      { data: allGroups },
      { data: allMembers },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin.from("user_custom_roles").select("custom_role_id").eq("user_id", userId),
      supabaseAdmin.from("telegram_groups").select("*").eq("is_active", true),
      supabaseAdmin.from("telegram_group_members").select("*"),
    ]);

    if (!profile) return { ok: false };

    const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
    const userRoleIds = (customRoles || []).map((cr: any) => cr.custom_role_id);
    const targetChatId = profile.telegram_chat_id || (profile.telegram_handle ? null : null);

    const userHandle = profile.telegram_handle
      ? profile.telegram_handle.toLowerCase().replace("@", "")
      : "";

    for (const group of allGroups || []) {
      if (group.ignore_checks || group.disable_checks) {
        continue;
      }

      const hasPermission = isUserOrHandleAuthorizedForGroup(group, profile, userRoleIds, isAdmin);

      const existingMember = (allMembers || []).find((m: any) => {
        const matchesGroup = m.group_id === group.id || String(m.chat_id) === String(group.chat_id);
        if (!matchesGroup) return false;
        if (m.user_id === userId) return true;
        if (userHandle && m.telegram_handle) {
          return m.telegram_handle.toLowerCase().replace("@", "") === userHandle;
        }
        return false;
      });

      const isInside = existingMember?.status === "member";

      if (hasPermission) {
        // If user is NOT inside and has Telegram connected: notify about new group!
        if (!isInside && targetChatId) {
          await sendTelegramMessage(
            targetChatId,
            `🎉 <b>NUOVO GRUPPO TELEGRAM DISPONIBILE!</b>\n\n` +
              `Ti è stato assegnato un ruolo che ti dà accesso al gruppo ufficiale dello Staff:\n` +
              `🔹 <b>${group.title}</b>\n\n` +
              `👉 Clicca sul pulsante qui sotto per ricevere il tuo <b>Link di Invito Personale</b> oppure accedi alla tua <b>Dashboard</b> sul sito!`,
            {
              inline_keyboard: [
                [
                  {
                    text: `🔗 Ricevi Invito per ${group.title}`,
                    callback_data: `genera_invito_${group.id}`,
                  },
                ],
                [{ text: `📱 I Miei Gruppi Abilitati`, callback_data: `miei_gruppi` }],
              ],
            },
          );
        }
      } else {
        // User DOES NOT have permission anymore: if they are inside, EXPEL them!
        if (isInside && existingMember) {
          if (existingMember.telegram_user_id) {
            await kickTelegramChatMember(group.chat_id, existingMember.telegram_user_id);
          }
          await supabaseAdmin
            .from("telegram_group_members")
            .update({
              status: "kicked",
              verified: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingMember.id);

          if (targetChatId || existingMember.telegram_user_id) {
            await sendTelegramMessage(
              targetChatId || existingMember.telegram_user_id,
              `⚠️ <b>ACCESSO AL GRUPPO REVOCATO</b>\n\n` +
                `I tuoi ruoli sul gestionale Casinò Revenge sono stati modificati.\n` +
                `Non disponi più dell'autorizzazione per far parte del gruppo: <b>${group.title}</b> ed è stata completata l'espulsione di sicurezza.`,
            );
          }
        }
      }
    }

    return { ok: true };
  } catch (err) {
    console.error("Error syncing user Telegram group access:", err);
    return { ok: false, error: String(err) };
  }
}

export async function runDaily1700TelegramAudit() {
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    // Fetch latest Telegram updates first
    try {
      await fetchTelegramUpdates();
    } catch (e) {
      console.error("[Telegram Audit 17:00] Error pre-fetching updates:", e);
    }

    const [{ data: groups }, { data: profiles }, { data: userRoles }, { data: customRoles }] =
      await Promise.all([
        supabaseAdmin.from("telegram_groups").select("*").eq("is_active", true),
        supabaseAdmin.from("profiles").select("*"),
        supabaseAdmin.from("user_roles").select("*"),
        supabaseAdmin.from("user_custom_roles").select("*"),
      ]);

    const adminUserIds = new Set(
      (userRoles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id),
    );
    const userRoleMap = new Map<string, Set<string>>();
    for (const cr of customRoles || []) {
      if (!userRoleMap.has(cr.user_id)) userRoleMap.set(cr.user_id, new Set());
      userRoleMap.get(cr.user_id)!.add(cr.custom_role_id);
    }

    let remindersSent = 0;
    let unauthorizedKicked = 0;

    // 0. Sync group administrators from Telegram API for each active group
    const groupTgAdminMaps = new Map<string, Map<string, any>>();

    for (const group of groups || []) {
      try {
        const tgAdmins = await getTelegramChatAdministrators(group.chat_id);
        const adminMap = new Map<string, any>();
        if (tgAdmins && tgAdmins.length > 0) {
          for (const adminItem of tgAdmins) {
            if (adminItem.user?.id) {
              adminMap.set(String(adminItem.user.id), adminItem);
            }
            if (adminItem.user && !adminItem.user.is_bot) {
              await syncTelegramUserWithGroupAndProfile(adminItem.user, group.chat_id);
            }
          }
        }
        groupTgAdminMaps.set(String(group.id), adminMap);
        groupTgAdminMaps.set(String(group.chat_id), adminMap);
      } catch (e) {
        console.error(`Error fetching Telegram admins for group ${group.id}:`, e);
      }
    }

    // Re-fetch all group members after sync
    const { data: allMembers } = await supabaseAdmin.from("telegram_group_members").select("*");

    for (const group of groups || []) {
      if (group.ignore_checks || group.disable_checks) {
        console.log(
          `[Telegram Audit] Skipping group "${group.title}" (${group.id}) - controlli ed espulsioni disabilitate.`,
        );
        continue;
      }

      const tgAdminMap =
        groupTgAdminMaps.get(String(group.id)) ||
        groupTgAdminMaps.get(String(group.chat_id)) ||
        new Map<string, any>();

      // 1. Check all users who should have access: send reminder if not inside
      for (const prof of profiles || []) {
        // Skip fired profiles or profiles without employee access
        if (prof.is_fired === true || prof.has_employee_access === false) {
          continue;
        }

        const isAdmin = adminUserIds.has(prof.id);
        const roles = userRoleMap.get(prof.id) || new Set();
        const hasAccess = isUserOrHandleAuthorizedForGroup(group, prof, roles, isAdmin);

        const userHandle = prof.telegram_handle
          ? prof.telegram_handle.toLowerCase().replace(/^@+/, "")
          : "";
        const memberRecord = (allMembers || []).find((m: any) => {
          const matches = m.group_id === group.id || String(m.chat_id) === String(group.chat_id);
          if (!matches) return false;
          if (m.user_id === prof.id) return true;
          if (
            prof.telegram_user_id &&
            String(m.telegram_user_id) === String(prof.telegram_user_id)
          ) {
            return true;
          }
          if (userHandle && m.telegram_handle) {
            return m.telegram_handle.toLowerCase().replace(/^@+/, "") === userHandle;
          }
          return false;
        });

        const isInside = memberRecord && memberRecord.status === "member";

        if (hasAccess && !isInside) {
          const chatId =
            prof.telegram_chat_id || memberRecord?.telegram_user_id || prof.telegram_user_id;
          if (chatId) {
            await sendTelegramMessage(
              chatId,
              `🔔 <b>CONTROLLO GIORNALIERO STAFF (Ore 17:00)</b>\n\n` +
                `Ciao <b>${prof.display_name || prof.username}</b>!\n` +
                `Risulti autorizzato per il gruppo <b>${group.title}</b> ma non sei ancora entrato.\n\n` +
                `👉 Clicca sul pulsante qui sotto per ricevere subito il tuo link di invito ed unirti alla conversazione con la Ciurma:`,
              {
                inline_keyboard: [
                  [
                    {
                      text: `🔗 Ricevi Invito per ${group.title}`,
                      callback_data: `genera_invito_${group.id}`,
                    },
                  ],
                ],
              },
            ).catch(() => {});
            remindersSent++;
          }
        }
      }

      // 2. Check all recorded members of this group: expel if no longer authorized
      const groupMembers = (allMembers || []).filter(
        (m: any) =>
          (m.group_id === group.id || String(m.chat_id) === String(group.chat_id)) &&
          m.status !== "kicked" &&
          m.status !== "left",
      );

      for (const m of groupMembers) {
        // Skip bots from audit
        const mHandle = (m.telegram_handle || "").toLowerCase().replace(/^@+/, "");
        const isBot =
          m.is_bot === true ||
          mHandle.endsWith("bot") ||
          (m.telegram_user_id && tgAdminMap.get(String(m.telegram_user_id))?.user?.is_bot);
        if (isBot) {
          continue;
        }

        let matchedProfile: any = null;

        if (m.user_id) {
          matchedProfile = (profiles || []).find((p: any) => p.id === m.user_id);
        }
        if (!matchedProfile && m.telegram_user_id) {
          matchedProfile = (profiles || []).find(
            (p: any) => String(p.telegram_user_id) === String(m.telegram_user_id),
          );
        }
        if (!matchedProfile && mHandle) {
          matchedProfile = (profiles || []).find((p: any) => {
            const pHandle = p.telegram_handle
              ? p.telegram_handle.toLowerCase().replace(/^@+/, "")
              : "";
            return pHandle === mHandle;
          });
        }

        // Check if user is a Telegram Administrator or Creator in Telegram chat
        const tgAdmin = m.telegram_user_id
          ? tgAdminMap.get(String(m.telegram_user_id))
          : matchedProfile?.telegram_user_id
            ? tgAdminMap.get(String(matchedProfile.telegram_user_id))
            : null;
        const isTelegramAdmin =
          tgAdmin && (tgAdmin.status === "creator" || tgAdmin.status === "administrator");

        const isFired =
          matchedProfile &&
          (matchedProfile.is_fired === true || matchedProfile.has_employee_access === false);

        let isAuthorized = false;

        if (isFired) {
          isAuthorized = false;
        } else if (isTelegramAdmin) {
          // Telegram Chat Creators / Administrators are inherently authorized in the chat
          isAuthorized = true;
        } else {
          isAuthorized = isUserOrHandleAuthorizedForGroup(
            group,
            matchedProfile,
            matchedProfile ? userRoleMap.get(matchedProfile.id) || new Set() : new Set(),
            matchedProfile ? adminUserIds.has(matchedProfile.id) : false,
            m.telegram_handle,
            m.telegram_user_id,
          );
        }

        if (!isAuthorized) {
          // Expel unauthorized user from group
          const targetTelegramUserId = m.telegram_user_id || matchedProfile?.telegram_user_id;
          const displayHandle = mHandle
            ? `@${mHandle}`
            : matchedProfile?.telegram_handle
              ? `@${matchedProfile.telegram_handle.replace(/^@+/, "")}`
              : "unknown";

          if (targetTelegramUserId) {
            const kickSuccess = await kickTelegramChatMember(group.chat_id, targetTelegramUserId);
            console.log(
              `[Telegram Audit 17:00] Expelling user ${targetTelegramUserId} (${displayHandle}) from group "${group.title}": ${kickSuccess ? "OK" : "FAILED / PROCESSED"}`,
            );
          }

          await supabaseAdmin
            .from("telegram_group_members")
            .update({
              status: "kicked",
              verified: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", m.id);

          if (targetTelegramUserId) {
            await sendTelegramMessage(
              targetTelegramUserId,
              `⚠️ <b>REVOCA ACCESSO GRUPPO TELEGRAM</b>\n\n` +
                `Durante il controllo giornaliero di sicurezza (Ore 17:00), è emerso che non possiedi più i ruoli o i permessi autorizzati per il gruppo <b>${group.title}</b>.\n` +
                `Sei stato rimosso automaticamente dal gruppo. Se ritieni si tratti di un errore, contatta un Amministratore.`,
            ).catch(() => {});
          }
          unauthorizedKicked++;
        }
      }
    }

    console.log(
      `[Telegram Audit 17:00] Completed. Reminders sent: ${remindersSent}, Unauthorized kicked: ${unauthorizedKicked}`,
    );

    try {
      const { executeMembershipDailyReminders } = await import("./membership.functions");
      const memRes = await executeMembershipDailyReminders();
      console.log(
        `[Telegram Audit 17:00] Membership expiring reminders sent: ${memRes.remindedCount}`,
      );
    } catch (memErr) {
      console.error("[Telegram Audit 17:00] Error sending membership expiring reminders:", memErr);
    }

    return {
      success: true,
      remindersSent,
      unauthorizedKicked,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Telegram Audit 17:00] Error during audit:", err);
    return { success: false, error: String(err) };
  }
}

// -------------------------------------------------------------
// Fetch & Process Telegram Updates
// -------------------------------------------------------------
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

    // Check if daily 17:00 audit is due
    const now = new Date();
    // Using UTC+1/UTC+2 (Europe/Rome timezone estimation or local hours)
    const hours = now.getHours();
    const todayStr = now.toISOString().slice(0, 10);
    if (hours === 17 && g._lastTelegramAuditDate !== todayStr) {
      g._lastTelegramAuditDate = todayStr;
      runDaily1700TelegramAudit().catch((err) => {
        console.error("Scheduled 17:00 audit error:", err);
      });
    }

    const lastId = g._telegramLastUpdateId || 0;
    const res = await fetch(`${API_URL}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: lastId > 0 ? lastId + 1 : undefined,
        timeout: 0,
        allowed_updates: [
          "message",
          "edited_message",
          "channel_post",
          "edited_channel_post",
          "chat_member",
          "my_chat_member",
          "callback_query",
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      return [];
    }

    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    // Process all incoming updates
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

      try {
        // -------------------------------------------------------------
        // 1. INLINE CALLBACK QUERY HANDLER
        // -------------------------------------------------------------
        if (update.callback_query) {
          const cb = update.callback_query;
          const cbFrom = cb.from;
          const chatId = cb.message?.chat?.id || cbFrom.id;
          const cbData = cb.data || "";

          if (cbData === "sync_profile" && cbFrom && chatId) {
            const rawCbHandle = cbFrom.username
              ? `@${cbFrom.username}`
              : `@${(cbFrom.first_name || "Utente").replace(/\s+/g, "")}_${cbFrom.id}`;

            try {
              const matchedProf = await syncTelegramUserWithGroupAndProfile(
                cbFrom,
                cb.message?.chat?.id || chatId,
              );

              if (matchedProf) {
                await fetch(`https://api.telegram.org/bot${getBotToken()}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cb.id,
                    text: `✅ Profilo sincronizzato con successo (${rawCbHandle})!`,
                    show_alert: true,
                  }),
                });
              } else {
                await fetch(`https://api.telegram.org/bot${getBotToken()}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cb.id,
                    text: `✅ Sincronizzazione gruppo effettuata (${rawCbHandle})! Assicurati di registrarti anche sul sito per abbinare il tuo profilo.`,
                    show_alert: true,
                  }),
                });
              }
            } catch (e) {
              console.error("Error passive syncing member", e);
            }
            continue;
          }

          if (cbData === "scollega" && cbFrom && chatId) {
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
                    telegram_chat_id: null,
                    telegram_user_id: null,
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
          } else if (cbData.startsWith("genera_invito_") && cbFrom && chatId) {
            const groupId = cbData.replace("genera_invito_", "");
            const rawCbHandle = cbFrom.username
              ? `@${cbFrom.username}`
              : `@${(cbFrom.first_name || "Utente").replace(/\s+/g, "")}_${cbFrom.id}`;

            // Find group and user profile
            const [{ data: group }, { data: profiles }] = await Promise.all([
              supabaseAdmin.from("telegram_groups").select("*").eq("id", groupId).maybeSingle(),
              supabaseAdmin.from("profiles").select("*"),
            ]);

            const cleanCbHandle = cbFrom.username ? cbFrom.username.toLowerCase() : "";
            const prof = (profiles || []).find((p: any) => {
              if (p.telegram_user_id && String(p.telegram_user_id) === String(cbFrom.id))
                return true;
              if (cleanCbHandle && p.telegram_handle) {
                const pClean = p.telegram_handle.toLowerCase().replace("@", "");
                if (pClean === cleanCbHandle) return true;
              }
              return false;
            });

            if (!group) {
              await sendTelegramMessage(chatId, `❌ Gruppo non trovato o non più attivo.`);
            } else if (!prof) {
              await sendTelegramMessage(
                chatId,
                `⚠️ <b>PROFILO NON COLLEGATO</b>\n\n` +
                  `Non risulti ancora associato a nessun account Minecraft sul sito del Casinò.\n` +
                  `Invia <code>/start</code> o visita la Dashboard per associare il tuo profilo.`,
              );
            } else {
              // 🔒 RULE: If the user is ALREADY in the group, they CANNOT request a new invite link!
              const { data: allMembers } = await supabaseAdmin
                .from("telegram_group_members")
                .select("*");
              const existingMember = (allMembers || []).find((m: any) => {
                const matchesGroup =
                  m.group_id === group.id || String(m.chat_id) === String(group.chat_id);
                if (!matchesGroup) return false;
                if (m.user_id === prof.id) return true;
                if (m.telegram_user_id && String(m.telegram_user_id) === String(cbFrom.id))
                  return true;
                if (rawCbHandle && m.telegram_handle) {
                  return m.telegram_handle.toLowerCase().replace("@", "") === rawCbHandle;
                }
                return false;
              });

              let isAlreadyInside = existingMember?.status === "member";
              if (!isAlreadyInside && group.chat_id && cbFrom.id) {
                const liveCheck = await checkTelegramChatMember(group.chat_id, cbFrom.id);
                if (
                  liveCheck &&
                  (liveCheck.status === "member" ||
                    liveCheck.status === "administrator" ||
                    liveCheck.status === "creator")
                ) {
                  isAlreadyInside = true;
                }
              }

              if (isAlreadyInside) {
                await sendTelegramMessage(
                  chatId,
                  `ℹ️ <b>SEI GIÀ MEMBRO DI QUESTO GRUPPO</b>\n\n` +
                    `Fai già parte del gruppo <b>${group.title}</b> con il tuo account Telegram (<b>${rawCbHandle}</b>).\n\n` +
                    `🔒 <i>Regola di sicurezza: Non è consentito richiedere nuovi link di invito se sei già membro attivo del gruppo.</i>`,
                );
                continue;
              }

              // Check roles
              const [{ data: uRoles }, { data: cRoles }] = await Promise.all([
                supabaseAdmin.from("user_roles").select("role").eq("user_id", prof.id),
                supabaseAdmin
                  .from("user_custom_roles")
                  .select("custom_role_id")
                  .eq("user_id", prof.id),
              ]);

              const isAdmin = (uRoles || []).some((r: any) => r.role === "admin");
              const userRoleIds = (cRoles || []).map((cr: any) => cr.custom_role_id);
              const allowed = group.allowed_role_ids || [];

              const isAllowed = isUserOrHandleAuthorizedForGroup(
                group,
                prof,
                userRoleIds,
                isAdmin,
                cbFrom?.username,
                cbFrom?.id,
              );

              if (isAllowed) {
                const inviteLink = await createTelegramInviteLink(
                  group.chat_id,
                  `Invito per ${prof.display_name || prof.username}`,
                  1,
                  48,
                );

                if (inviteLink) {
                  await sendTelegramMessage(
                    chatId,
                    `🔗 <b>LINK DI INVITO PERSONALE GENERATO!</b>\n\n` +
                      `🏛️ <b>Gruppo:</b> <b>${group.title}</b>\n` +
                      `👤 <b>Destinatario:</b> ${prof.display_name || prof.username} (${rawCbHandle})\n` +
                      `⏳ <b>Validità:</b> 48 ore (Monouso)\n\n` +
                      `👉 <a href="${inviteLink}"><b>CLICCA QUI PER UNIRTI AL GRUPPO</b></a>\n\n` +
                      `<code>${inviteLink}</code>\n\n` +
                      `<i>Nota: Appena entrerai nel gruppo, il bot convaliderà il tuo accesso. Una volta entrato, non potrai richiedere ulteriori link d'invito.</i>`,
                  );
                } else {
                  await sendTelegramMessage(
                    chatId,
                    `❌ Impossibile generare il link di invito. Verifica che il bot sia amministratore del gruppo con permesso di invitare utenti.`,
                  );
                }
              } else {
                await sendTelegramMessage(
                  chatId,
                  `⛔ <b>ACCESSO NON AUTORIZZATO</b>\n\nNon disponi dei ruoli richiesti per entrare in <b>${group.title}</b>.`,
                );
              }
            }
          } else if (cbData === "miei_gruppi" && cbFrom && chatId) {
            // List user groups
            const rawCbHandle = cbFrom.username ? cbFrom.username.toLowerCase() : "";
            const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
            const prof = (profiles || []).find((p: any) => {
              if (p.telegram_user_id && String(p.telegram_user_id) === String(cbFrom.id))
                return true;
              if (rawCbHandle && p.telegram_handle) {
                return p.telegram_handle.toLowerCase().replace("@", "") === rawCbHandle;
              }
              return false;
            });

            if (!prof) {
              await sendTelegramMessage(
                chatId,
                `⚠️ Il tuo account Telegram non è ancora collegato. Invia <code>/start</code>.`,
              );
            } else {
              const [{ data: uRoles }, { data: cRoles }, { data: allGroups }, { data: members }] =
                await Promise.all([
                  supabaseAdmin.from("user_roles").select("role").eq("user_id", prof.id),
                  supabaseAdmin
                    .from("user_custom_roles")
                    .select("custom_role_id")
                    .eq("user_id", prof.id),
                  supabaseAdmin.from("telegram_groups").select("*").eq("is_active", true),
                  supabaseAdmin.from("telegram_group_members").select("*"),
                ]);

              const isAdmin = (uRoles || []).some((r: any) => r.role === "admin");
              const userRoleIds = (cRoles || []).map((cr: any) => cr.custom_role_id);

              const userGroups = (allGroups || []).filter((g: any) =>
                isUserOrHandleAuthorizedForGroup(
                  g,
                  prof,
                  userRoleIds,
                  isAdmin,
                  cbFrom?.username,
                  cbFrom?.id,
                ),
              );

              if (userGroups.length === 0) {
                await sendTelegramMessage(
                  chatId,
                  `ℹ️ Non hai attualmente gruppi Telegram associati ai tuoi ruoli.`,
                );
              } else {
                const buttons = userGroups.map((g: any) => {
                  const isInside = (members || []).some((m: any) => {
                    const matchesGroup =
                      m.group_id === g.id || String(m.chat_id) === String(g.chat_id);
                    if (!matchesGroup) return false;
                    if (m.status !== "member") return false;
                    if (m.user_id === prof.id) return true;
                    if (m.telegram_user_id && String(m.telegram_user_id) === String(cbFrom.id))
                      return true;
                    if (rawCbHandle && m.telegram_handle) {
                      return m.telegram_handle.toLowerCase().replace("@", "") === rawCbHandle;
                    }
                    return false;
                  });

                  if (isInside) {
                    return [
                      { text: `✅ Già Membro: ${g.title}`, callback_data: `genera_invito_${g.id}` },
                    ];
                  }
                  return [
                    {
                      text: `🔗 Ricevi Invito: ${g.title}`,
                      callback_data: `genera_invito_${g.id}`,
                    },
                  ];
                });

                await sendTelegramMessage(
                  chatId,
                  `📋 <b>I TUOI GRUPPI TELEGRAM ABILITATI:</b>\n\n` +
                    userGroups
                      .map((g: any, idx: number) => `🔹 <b>${idx + 1}. ${g.title}</b>`)
                      .join("\n") +
                    `\n\n<i>Seleziona un gruppo per unirti o visualizzare il tuo stato:</i>`,
                  { inline_keyboard: buttons },
                );
              }
            }
          }
          continue;
        }

        // -------------------------------------------------------------
        // 2. USERBOT REAL-TIME MEMBER & STATUS UPDATES (chat_member / my_chat_member)
        // -------------------------------------------------------------
        if (update.chat_member) {
          const cm = update.chat_member;
          const groupChatId = cm.chat.id;
          const groupTitle = cm.chat.title || "Gruppo Staff";
          const newStatus = cm.new_chat_member?.status;
          const targetUser = cm.new_chat_member?.user;

          if (targetUser && !targetUser.is_bot) {
            const { data: dbGroup } = await supabaseAdmin
              .from("telegram_groups")
              .select("*")
              .eq("chat_id", groupChatId)
              .maybeSingle();

            if (dbGroup) {
              const memberHandle = targetUser.username
                ? `@${targetUser.username}`
                : `@${targetUser.first_name}_${targetUser.id}`;
              const cleanHandle = targetUser.username ? targetUser.username.toLowerCase() : "";

              if (
                newStatus === "member" ||
                newStatus === "administrator" ||
                newStatus === "creator" ||
                newStatus === "restricted"
              ) {
                const [{ data: profiles }, { data: existingGroupMembers }] = await Promise.all([
                  supabaseAdmin.from("profiles").select("*"),
                  supabaseAdmin
                    .from("telegram_group_members")
                    .select("*")
                    .eq("group_id", dbGroup.id),
                ]);

                let matchedProf = (profiles || []).find((p: any) => {
                  if (p.telegram_user_id && String(p.telegram_user_id) === String(targetUser.id))
                    return true;
                  if (p.telegram_chat_id && String(p.telegram_chat_id) === String(targetUser.id))
                    return true;
                  if (cleanHandle && p.telegram_handle) {
                    return p.telegram_handle.toLowerCase().replace("@", "") === cleanHandle;
                  }
                  return false;
                });

                const dbMemberMatch = (existingGroupMembers || []).find(
                  (m: any) =>
                    (m.telegram_user_id && String(m.telegram_user_id) === String(targetUser.id)) ||
                    (matchedProf && m.user_id === matchedProf.id) ||
                    (cleanHandle &&
                      m.telegram_handle &&
                      m.telegram_handle.toLowerCase().replace("@", "") === cleanHandle),
                );

                if (!matchedProf && dbMemberMatch?.user_id) {
                  matchedProf = (profiles || []).find((p: any) => p.id === dbMemberMatch.user_id);
                }

                // Check if user is explicitly revoked by admin (status === 'kicked') or is a fired employee
                const isExplicitlyRevoked = dbMemberMatch && dbMemberMatch.status === "kicked";
                const isFiredEmployee =
                  matchedProf &&
                  (matchedProf.is_fired === true || matchedProf.has_employee_access === false);

                const isChecksDisabled = !!dbGroup.ignore_checks || !!dbGroup.disable_checks;

                if (!isChecksDisabled && (isExplicitlyRevoked || isFiredEmployee)) {
                  // Unauthorized / revoked user: expel
                  try {
                    await kickTelegramChatMember(groupChatId, targetUser.id);
                  } catch (e) {
                    console.error("Error kicking revoked user in Telegram:", e);
                  }
                  await supabaseAdmin.from("telegram_group_members").upsert({
                    id: `tgm-${dbGroup.id}-${targetUser.id}`,
                    group_id: dbGroup.id,
                    chat_id: groupChatId,
                    telegram_user_id: targetUser.id,
                    telegram_handle: memberHandle,
                    user_id: matchedProf?.id || null,
                    status: "kicked",
                    verified: false,
                    joined_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                } else {
                  // Authorized or regular member
                  await supabaseAdmin.from("telegram_group_members").upsert({
                    id: `tgm-${dbGroup.id}-${targetUser.id}`,
                    group_id: dbGroup.id,
                    chat_id: groupChatId,
                    telegram_user_id: targetUser.id,
                    telegram_handle: memberHandle,
                    user_id: matchedProf?.id || dbMemberMatch?.user_id || null,
                    status: "member",
                    verified: !!matchedProf || dbMemberMatch?.verified === true,
                    joined_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });

                  if (matchedProf) {
                    await supabaseAdmin
                      .from("profiles")
                      .update({
                        telegram_connected: true,
                        telegram_user_id: targetUser.id,
                        telegram_handle: memberHandle,
                        is_fired: false,
                        has_employee_access: true,
                      })
                      .eq("id", matchedProf.id);
                  }
                }
              } else if (newStatus === "left" || newStatus === "kicked" || newStatus === "banned") {
                // Ensure expelled/left members are accurately recorded so they can be reviewed and reinstated
                const [{ data: profiles }, { data: existingGroupMembers }] = await Promise.all([
                  supabaseAdmin.from("profiles").select("id, telegram_user_id, telegram_handle"),
                  supabaseAdmin
                    .from("telegram_group_members")
                    .select("*")
                    .eq("group_id", dbGroup.id),
                ]);

                const cleanHandle = targetUser.username ? targetUser.username.toLowerCase() : "";
                const matchedProf = (profiles || []).find(
                  (p: any) =>
                    (p.telegram_user_id && String(p.telegram_user_id) === String(targetUser.id)) ||
                    (cleanHandle &&
                      p.telegram_handle &&
                      p.telegram_handle.toLowerCase().replace("@", "") === cleanHandle),
                );

                const existingMember = (existingGroupMembers || []).find(
                  (m: any) =>
                    String(m.telegram_user_id) === String(targetUser.id) ||
                    (matchedProf && m.user_id === matchedProf.id),
                );

                await supabaseAdmin.from("telegram_group_members").upsert({
                  id: existingMember?.id || `tgm-${dbGroup.id}-${targetUser.id}`,
                  group_id: dbGroup.id,
                  chat_id: groupChatId,
                  telegram_user_id: targetUser.id,
                  telegram_handle: memberHandle,
                  user_id: existingMember?.user_id || matchedProf?.id || null,
                  status: "kicked",
                  verified: false,
                  updated_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (update.my_chat_member) {
          const mcm = update.my_chat_member;
          const groupChatId = mcm.chat.id;
          const groupTitle = mcm.chat.title || "Gruppo Staff";
          const newBotStatus = mcm.new_chat_member?.status;

          if (newBotStatus === "administrator" || newBotStatus === "member") {
            console.log(
              `[Telegram Userbot] Bot added/promoted in chat ${groupTitle} (${groupChatId})`,
            );
          }
        }

        // -------------------------------------------------------------
        // 3. CHAT MEMBER JOIN VIA MESSAGE EVENT
        // -------------------------------------------------------------
        const msg = update.message || update.edited_message;

        // Handle new members joining via update.message.new_chat_members
        if (
          msg &&
          msg.new_chat_members &&
          Array.isArray(msg.new_chat_members) &&
          msg.new_chat_members.length > 0
        ) {
          const groupChatId = msg.chat.id;
          const groupTitle = msg.chat.title || "Gruppo Staff";

          const { data: dbGroup } = await supabaseAdmin
            .from("telegram_groups")
            .select("*")
            .eq("chat_id", groupChatId)
            .maybeSingle();

          if (dbGroup) {
            const [{ data: profiles }, { data: existingGroupMembers }] = await Promise.all([
              supabaseAdmin.from("profiles").select("*"),
              supabaseAdmin.from("telegram_group_members").select("*").eq("group_id", dbGroup.id),
            ]);

            for (const newMember of msg.new_chat_members) {
              if (newMember.is_bot) continue;

              const memberHandle = newMember.username
                ? `@${newMember.username}`
                : `@${newMember.first_name}_${newMember.id}`;
              const cleanHandle = newMember.username ? newMember.username.toLowerCase() : "";

              let matchedProf = (profiles || []).find((p: any) => {
                if (p.telegram_user_id && String(p.telegram_user_id) === String(newMember.id))
                  return true;
                if (p.telegram_chat_id && String(p.telegram_chat_id) === String(newMember.id))
                  return true;
                if (cleanHandle && p.telegram_handle) {
                  return p.telegram_handle.toLowerCase().replace("@", "") === cleanHandle;
                }
                return false;
              });

              const dbMemberMatch = (existingGroupMembers || []).find(
                (m: any) =>
                  (m.telegram_user_id && String(m.telegram_user_id) === String(newMember.id)) ||
                  (matchedProf && m.user_id === matchedProf.id) ||
                  (cleanHandle &&
                    m.telegram_handle &&
                    m.telegram_handle.toLowerCase().replace("@", "") === cleanHandle),
              );

              if (!matchedProf && dbMemberMatch?.user_id) {
                matchedProf = (profiles || []).find((p: any) => p.id === dbMemberMatch.user_id);
              }

              // Check if user is explicitly revoked by admin (status === 'kicked') or is a fired employee
              const isExplicitlyRevoked = dbMemberMatch && dbMemberMatch.status === "kicked";
              const isFiredEmployee =
                matchedProf &&
                (matchedProf.is_fired === true || matchedProf.has_employee_access === false);

              const isChecksDisabled = !!dbGroup.ignore_checks || !!dbGroup.disable_checks;

              if (!isChecksDisabled && (isExplicitlyRevoked || isFiredEmployee)) {
                try {
                  await kickTelegramChatMember(groupChatId, newMember.id);
                } catch (e) {
                  console.error("Error kicking revoked user in Telegram:", e);
                }

                await supabaseAdmin.from("telegram_group_members").upsert({
                  id: `tgm-${dbGroup.id}-${newMember.id}`,
                  group_id: dbGroup.id,
                  chat_id: groupChatId,
                  telegram_user_id: newMember.id,
                  telegram_handle: memberHandle,
                  user_id: matchedProf?.id || null,
                  status: "kicked",
                  verified: false,
                  joined_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              } else {
                // Authorized or regular member
                await supabaseAdmin.from("telegram_group_members").upsert({
                  id: `tgm-${dbGroup.id}-${newMember.id}`,
                  group_id: dbGroup.id,
                  chat_id: groupChatId,
                  telegram_user_id: newMember.id,
                  telegram_handle: memberHandle,
                  user_id: matchedProf?.id || dbMemberMatch?.user_id || null,
                  status: "member",
                  verified: !!matchedProf || dbMemberMatch?.verified === true,
                  joined_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

                if (matchedProf) {
                  await supabaseAdmin
                    .from("profiles")
                    .update({
                      telegram_connected: true,
                      telegram_user_id: newMember.id,
                      telegram_handle: memberHandle,
                      is_fired: false,
                      has_employee_access: true,
                    })
                    .eq("id", matchedProf.id);
                }
              }
            }
          }
        }

        // Handle members leaving or being kicked via message event (left_chat_member)
        if (msg && (msg.left_chat_member || (msg as any).left_chat_participant)) {
          const leftUser = msg.left_chat_member || (msg as any).left_chat_participant;
          if (leftUser && !leftUser.is_bot) {
            const groupChatId = msg.chat.id;
            const { data: dbGroup } = await supabaseAdmin
              .from("telegram_groups")
              .select("*")
              .eq("chat_id", groupChatId)
              .maybeSingle();

            if (dbGroup) {
              const memberHandle = leftUser.username
                ? `@${leftUser.username}`
                : `@${leftUser.first_name}_${leftUser.id}`;
              const cleanHandle = leftUser.username ? leftUser.username.toLowerCase() : "";

              const [{ data: profiles }, { data: existingGroupMembers }] = await Promise.all([
                supabaseAdmin.from("profiles").select("id, telegram_user_id, telegram_handle"),
                supabaseAdmin.from("telegram_group_members").select("*").eq("group_id", dbGroup.id),
              ]);

              const matchedProf = (profiles || []).find(
                (p: any) =>
                  (p.telegram_user_id && String(p.telegram_user_id) === String(leftUser.id)) ||
                  (cleanHandle &&
                    p.telegram_handle &&
                    p.telegram_handle.toLowerCase().replace("@", "") === cleanHandle),
              );

              const existingMember = (existingGroupMembers || []).find(
                (m: any) =>
                  String(m.telegram_user_id) === String(leftUser.id) ||
                  (matchedProf && m.user_id === matchedProf.id),
              );

              await supabaseAdmin.from("telegram_group_members").upsert({
                id: existingMember?.id || `tgm-${dbGroup.id}-${leftUser.id}`,
                group_id: dbGroup.id,
                chat_id: groupChatId,
                telegram_user_id: leftUser.id,
                telegram_handle: memberHandle,
                user_id: existingMember?.user_id || matchedProf?.id || null,
                status: "kicked",
                verified: false,
                updated_at: new Date().toISOString(),
              });
            }
          }
        }

        // -------------------------------------------------------------
        // 4. TEXT MESSAGE PROCESSING
        // -------------------------------------------------------------
        if (!msg || !msg.text) continue;

        const text = msg.text.trim();
        const from = msg.from;
        if (!from) continue;

        // Auto-record /start log and bot subscriber activity for this Telegram user
        if (!from.is_bot) {
          try {
            const cleanFromUser = from.username
              ? from.username.toLowerCase().replace("@", "").trim()
              : "";
            await supabaseAdmin.from("telegram_start_logs").upsert({
              id: `tglog-${from.id}`,
              telegram_user_id: String(from.id),
              username: cleanFromUser || null,
              first_name: from.first_name || "",
              last_name: from.last_name || "",
              chat_id: String(msg.chat.id),
              has_started: true,
              last_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            // Automatically attach Telegram user ID and chat ID to matching website profile
            const { data: allProfs } = await supabaseAdmin.from("profiles").select("*");
            if (allProfs && allProfs.length > 0) {
              for (const p of allProfs) {
                let isMatch = false;
                if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) {
                  isMatch = true;
                } else if (cleanFromUser && p.telegram_handle) {
                  const cleanP = p.telegram_handle.toLowerCase().replace("@", "").trim();
                  if (cleanP === cleanFromUser) {
                    isMatch = true;
                  }
                }
                if (isMatch) {
                  const updatesToMake: any = {
                    telegram_user_id: from.id,
                    telegram_chat_id: msg.chat.id,
                    telegram_connected: true,
                  };
                  if (!p.telegram_handle && cleanFromUser) {
                    updatesToMake.telegram_handle = `@${from.username}`;
                  }
                  await supabaseAdmin.from("profiles").update(updatesToMake).eq("id", p.id);
                }
              }
            }
          } catch (err) {
            console.error("Error updating telegram_start_logs:", err);
          }
        }

        // Auto-store incoming message in chat message history
        let replyInfo: any = undefined;
        if (msg.reply_to_message && msg.reply_to_message.text) {
          replyInfo = {
            id: `tg-${msg.chat.id}-${msg.reply_to_message.message_id}`,
            message_id: msg.reply_to_message.message_id,
            sender_name:
              msg.reply_to_message.from?.first_name ||
              msg.reply_to_message.from?.username ||
              "Utente",
            text: msg.reply_to_message.text,
          };
        }

        storeChatMessage({
          id: `tg-${msg.chat.id}-${msg.message_id}`,
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          sender_type: from.is_bot ? "bot" : "user",
          sender_name:
            [from.first_name, from.last_name].filter(Boolean).join(" ") ||
            from.username ||
            "Utente",
          sender_username: from.username,
          sender_id: from.id,
          text: msg.text,
          created_at: new Date((msg.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          date: msg.date || Math.floor(Date.now() / 1000),
          reply_to_message_id: msg.reply_to_message?.message_id,
          reply_to_message: replyInfo,
          delivery_status: "read",
        });

        const rawHandle = from.username
          ? `@${from.username}`
          : `@${(from.first_name || "Utente").replace(/\s+/g, "")}_${from.id}`;

        const isGroup =
          msg.chat.type === "group" ||
          msg.chat.type === "supergroup" ||
          msg.chat.type === "channel" ||
          Number(msg.chat.id) < 0;
        const cleanCmd = text.toLowerCase().split(/\s+/)[0];

        // =============================================================
        // A. GROUP CHAT HANDLING (Strictly limited commands & no spam)
        // =============================================================
        if (isGroup) {
          // 1. Group Registration Command (/registragruppo, /collegagruppo, etc.)
          if (
            cleanCmd === "/registragruppo" ||
            cleanCmd === "/registra_gruppo" ||
            cleanCmd === "/registra" ||
            cleanCmd === "/collegagruppo" ||
            cleanCmd === "/collega_gruppo" ||
            cleanCmd === "/associa_gruppo" ||
            cleanCmd === "/associagruppo" ||
            cleanCmd === "/collega" ||
            cleanCmd.startsWith("/registragruppo@") ||
            cleanCmd.startsWith("/registra_gruppo@") ||
            cleanCmd.startsWith("/registra@") ||
            cleanCmd.startsWith("/collegagruppo@") ||
            cleanCmd.startsWith("/collega_gruppo@") ||
            cleanCmd.startsWith("/associa_gruppo@") ||
            cleanCmd.startsWith("/associagruppo@") ||
            cleanCmd.startsWith("/collega@")
          ) {
            const [{ data: allProfiles }, { data: allUserRoles }, { data: allCustomRoles }] =
              await Promise.all([
                supabaseAdmin.from("profiles").select("*"),
                supabaseAdmin.from("user_roles").select("*"),
                supabaseAdmin.from("user_custom_roles").select("*"),
              ]);

            const cleanFromHandle = from.username ? from.username.toLowerCase() : "";

            const senderProfile = (allProfiles || []).find((p: any) => {
              if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) return true;
              if (p.telegram_chat_id && String(p.telegram_chat_id) === String(from.id)) return true;
              if (cleanFromHandle && p.telegram_handle) {
                const cleanP = p.telegram_handle.toLowerCase().replace("@", "");
                if (cleanP === cleanFromHandle) return true;
              }
              return false;
            });

            // Check if user is an admin on the site
            let isUserAdmin = false;
            if (senderProfile) {
              const uId = senderProfile.id;
              const userRoles = (allUserRoles || []).filter((r: any) => r.user_id === uId);
              const customRoles = (allCustomRoles || []).filter((r: any) => r.user_id === uId);
              isUserAdmin =
                userRoles.some(
                  (r: any) => r.role === "admin" || r.role === "gestore" || r.role === "capitano",
                ) ||
                customRoles.some(
                  (cr: any) =>
                    cr.custom_role_id === "crole-admin" ||
                    cr.custom_role_id === "crole-gestore" ||
                    cr.custom_role_id === "crole-1",
                ) ||
                senderProfile.role === "admin" ||
                senderProfile.role === "gestore" ||
                senderProfile.username?.toLowerCase() === "admin" ||
                senderProfile.username?.toLowerCase() === "giuse84pro";
            }

            // Check if user is a Telegram chat admin/creator
            let isTgGroupAdmin = false;
            try {
              const chatMember = await checkTelegramChatMember(msg.chat.id, from.id);
              if (
                chatMember &&
                (chatMember.status === "creator" || chatMember.status === "administrator")
              ) {
                isTgGroupAdmin = true;
              }
            } catch (e) {
              // ignore
            }

            if (!isTgGroupAdmin && !isUserAdmin) {
              try {
                const admins = await getTelegramChatAdministrators(msg.chat.id);
                if (admins && admins.some((a: any) => String(a.user?.id) === String(from.id))) {
                  isTgGroupAdmin = true;
                }
              } catch (e) {
                // ignore
              }
            }

            const groupId = `tgroup-${Math.abs(Number(msg.chat.id))}`;
            const groupTitle = msg.chat.title || `Gruppo Staff (${msg.chat.id})`;

            const { data: existingGroup } = await supabaseAdmin
              .from("telegram_groups")
              .select("*")
              .eq("chat_id", msg.chat.id)
              .maybeSingle();

            const allowedRoleIds =
              existingGroup?.allowed_role_ids && existingGroup.allowed_role_ids.length > 0
                ? existingGroup.allowed_role_ids
                : ["crole-admin"];

            await supabaseAdmin.from("telegram_groups").upsert({
              id: existingGroup?.id || groupId,
              chat_id: msg.chat.id,
              title: groupTitle,
              type: msg.chat.type || "supergroup",
              allowed_role_ids: allowedRoleIds,
              is_active: true,
              registered_at: existingGroup?.registered_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            await supabaseAdmin.from("telegram_group_members").upsert({
              id: `tgm-${existingGroup?.id || groupId}-${from.id}`,
              group_id: existingGroup?.id || groupId,
              chat_id: msg.chat.id,
              telegram_user_id: from.id,
              telegram_handle: rawHandle,
              user_id: senderProfile?.id || null,
              status: "member",
              verified: true,
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            let botPermsText = "";
            try {
              const botPerms = await getGroupBotPermissions(msg.chat.id);
              if (botPerms.allRequiredGranted) {
                botPermsText = `🛡️ <b>Permessi Bot Telegram:</b> ✅ <b>PERMESSI COMPLETI</b>\n   • Invito Utenti: Concesso ✅\n   • Espulsione Membri: Concesso ✅\n   • Gestione Chat: Concesso ✅\n\n`;
              } else if (!botPerms.isAdmin) {
                botPermsText = `⚠️ <b>ATTENZIONE: IL BOT NON È ANCORA AMMINISTRATORE!</b>\nPromuovi <b>@${botPerms.botUsername || "Bot"}</b> ad <b>Amministratore</b> in questo gruppo e abilita i permessi di invito ed espulsione per permettere la gestione automatica.\n\n`;
              } else {
                botPermsText = `⚠️ <b>ATTENZIONE: PERMESSI BOT PARZIALI!</b>\n${botPerms.errorMessage}\n\n`;
              }
            } catch (e) {
              // ignore
            }

            const adminDisplayName = senderProfile
              ? `${senderProfile.display_name || senderProfile.username} (${rawHandle})`
              : `${from.first_name || from.username || "Utente"} (${rawHandle})`;

            await sendTelegramMessage(
              msg.chat.id,
              `🏛️ <b>GRUPPO REGISTRATO CON SUCCESSO!</b>\n\n` +
                `📌 <b>Nome Gruppo:</b> <b>${groupTitle}</b>\n` +
                `🆔 <b>ID Gruppo:</b> <code>${msg.chat.id}</code>\n` +
                `👑 <b>Registrato da:</b> <b>${adminDisplayName}</b>\n` +
                `🤖 <b>Monitoraggio & Userbot:</b> ATTIVO\n\n` +
                botPermsText +
                `✅ <b>Sincronizzazione completata!</b> Il gruppo è visibile sul gestionale del <b>Casinò Revenge</b>.\n` +
                `Puoi configurare i ruoli abilitati dal <b>Pannello Amministratore → Ruoli & Permessi → Gruppi Telegram</b>.`,
            );
            continue;
          }

          // 2. Handle /id command in group chat
          if (cleanCmd === "/id" || cleanCmd.startsWith("/id@")) {
            await sendTelegramMessage(
              msg.chat.id,
              `👥 <b>INFORMAZIONI CHAT DI GRUPPO</b>\n\n` +
                `🆔 <b>ID Gruppo:</b> <code>${msg.chat.id}</code>\n` +
                `🏷️ <b>Nome Gruppo:</b> <b>${msg.chat.title || "Gruppo"}</b>\n\n` +
                `👤 <b>Il tuo ID Utente:</b> <code>${from.id}</code>\n` +
                `🏷️ <b>Il tuo Username:</b> ${from.username ? `@${from.username}` : "Nessuno"}`,
            );
            continue;
          }

          // 3. Handle /sincronizzamembri in group chat
          if (
            cleanCmd === "/sincronizzamembri" ||
            cleanCmd === "/sincronizza" ||
            cleanCmd.startsWith("/sincronizzamembri@") ||
            cleanCmd.startsWith("/sincronizza@")
          ) {
            await syncTelegramUserWithGroupAndProfile(from, msg.chat.id);
            let syncedCount = 0;
            try {
              const tgAdmins = await getTelegramChatAdministrators(msg.chat.id);
              if (tgAdmins && tgAdmins.length > 0) {
                for (const adminItem of tgAdmins) {
                  if (adminItem.user && !adminItem.user.is_bot) {
                    await syncTelegramUserWithGroupAndProfile(adminItem.user, msg.chat.id);
                    syncedCount++;
                  }
                }
              }
            } catch (e) {
              console.error("Error syncing Telegram group admins:", e);
            }

            await sendTelegramMessage(
              msg.chat.id,
              `🔄 <b>SINCRONIZZAZIONE DI MASSA COMPLETATA</b>\n\n` +
                `✅ Sincronizzati con successo <b>${syncedCount}</b> membri del gruppo Telegram.`,
            );
            continue;
          }

          // 4. Handle /info or /aiuto in group chat
          if (
            cleanCmd === "/info" ||
            cleanCmd === "/aiuto" ||
            cleanCmd === "/help" ||
            cleanCmd.startsWith("/info@") ||
            cleanCmd.startsWith("/aiuto@") ||
            cleanCmd.startsWith("/help@")
          ) {
            await sendTelegramMessage(
              msg.chat.id,
              `ℹ️ <b>BOT CASINÒ REVENGE — CHAT DI GRUPPO</b>\n\n` +
                `📌 <b>Comandi disponibili nel gruppo:</b>\n` +
                `🔹 <code>/id</code> - Mostra l'ID di questo gruppo e il tuo ID\n` +
                `🔹 <code>/registragruppo</code> - Registra questo gruppo nel gestionale Staff\n` +
                `🔹 <code>/sincronizzamembri</code> - Sincronizza i membri del gruppo\n\n` +
                `💡 <i>Per associare il tuo account Minecraft o visualizzare i tuoi gruppi, usa la chat privata con il bot!</i>`,
            );
            continue;
          }

          // 5. Commands restricted to PRIVATE chat: provide polite redirection if sent in group
          if (
            cleanCmd === "/start" ||
            cleanCmd.startsWith("/start@") ||
            cleanCmd === "/associa" ||
            cleanCmd.startsWith("/associa@") ||
            cleanCmd === "/collega" ||
            cleanCmd.startsWith("/collega@") ||
            text.match(/^\d{6}$/)
          ) {
            try {
              const senderName = from.first_name || from.username || "Utente";
              await sendTelegramMessage(
                msg.chat.id,
                `👋 Ciao <b>${senderName}</b>!\n\n` +
                  `Per motivi di privacy e sicurezza, invia il comando <code>/associa</code> nella <b>chat privata</b> con il bot.\n\n` +
                  `👉 <b>Clicca qui per aprire la chat:</b> @CasinoRevengeBot`,
                {
                  reply_to_message_id: msg.message_id,
                },
              );
            } catch {
              // ignore
            }
            continue;
          }

          if (
            cleanCmd === "/scollega" ||
            cleanCmd.startsWith("/scollega@") ||
            cleanCmd === "/gruppi" ||
            cleanCmd.startsWith("/gruppi@")
          ) {
            continue;
          }

          // 6. Regular message in group: passive tracking & notify unregistered users
          try {
            await syncTelegramUserWithGroupAndProfile(from, msg.chat.id);
          } catch (e) {
            // ignore
          }

          // Check if user is associated with any Minecraft nickname in profiles
          const { data: allProfs } = await supabaseAdmin
            .from("profiles")
            .select(
              "id, username, display_name, telegram_user_id, telegram_chat_id, telegram_handle, telegram_connected",
            );

          const cleanFromHandle = from.username ? from.username.toLowerCase().replace("@", "") : "";
          const tgIdStr = String(from.id);

          const matchedProf = (allProfs || []).find((p: any) => {
            if (
              p.telegram_user_id &&
              String(p.telegram_user_id) === tgIdStr &&
              p.telegram_connected
            )
              return true;
            if (
              p.telegram_chat_id &&
              String(p.telegram_chat_id) === tgIdStr &&
              p.telegram_connected
            )
              return true;
            if (cleanFromHandle && p.telegram_handle && p.telegram_connected) {
              return p.telegram_handle.toLowerCase().replace("@", "") === cleanFromHandle;
            }
            return false;
          });

          if (!matchedProf) {
            // User is NOT associated with any Minecraft nickname!
            // Apply 6-hour anti-spam cooldown per user per group
            const cooldownKey = `unreg_${msg.chat.id}_${from.id}`;
            const lastSent = unregisteredNoticeCooldown.get(cooldownKey) || 0;
            const now = Date.now();

            if (now - lastSent > 6 * 3600 * 1000) {
              unregisteredNoticeCooldown.set(cooldownKey, now);
              await sendTelegramMessage(
                msg.chat.id,
                `👋 Ciao <b>${from.first_name || from.username || "Utente"}</b> (<code>${rawHandle}</code>)!\n\n` +
                  `Non risulti ancora associato ad alcun nickname <b>Minecraft</b> sul gestionale del <b>Casinò Revenge</b>.\n\n` +
                  `🌐 <b>Come registrarsi o collegare il tuo account:</b>\n` +
                  `1️⃣ Registrati o accedi sul sito ufficiale del Casinò\n` +
                  `2️⃣ Apri la <b>chat privata</b> con questo bot ed invia il comando <code>/associa CODICE</code> per collegare il tuo profilo!`,
              );
            }
          }

          // Associated users chat normally: bot is completely silent (no spam!)
          continue;
        }

        // =============================================================
        // B. PRIVATE CHAT HANDLING (Personal association, groups, /start)
        // =============================================================

        // 1. Handle /id in private chat
        if (cleanCmd === "/id" || cleanCmd.startsWith("/id@")) {
          await sendTelegramMessage(
            msg.chat.id,
            `👤 <b>INFORMAZIONI CHAT PRIVATA</b>\n\n` +
              `🆔 <b>Il tuo ID Utente:</b> <code>${from.id}</code>\n` +
              `🏷️ <b>Username:</b> ${from.username ? `@${from.username}` : "Nessuno"}\n` +
              `👤 <b>Nome:</b> ${from.first_name || "Utente"}\n` +
              `💬 <b>ID Chat:</b> <code>${msg.chat.id}</code>`,
          );
          continue;
        }

        // 2. Handle /gruppi command in private chat
        if (cleanCmd === "/gruppi" || cleanCmd.startsWith("/gruppi@")) {
          const rawCbHandle = from.username ? from.username.toLowerCase() : "";
          const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
          const prof = (profiles || []).find((p: any) => {
            if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) return true;
            if (rawCbHandle && p.telegram_handle) {
              return p.telegram_handle.toLowerCase().replace("@", "") === rawCbHandle;
            }
            return false;
          });

          if (!prof) {
            await sendTelegramMessage(
              msg.chat.id,
              `⚠️ Il tuo account Telegram non è ancora collegato a nessun profilo del Casinò. Invia <code>/start</code>.`,
            );
          } else {
            const [{ data: uRoles }, { data: cRoles }, { data: allGroups }] = await Promise.all([
              supabaseAdmin.from("user_roles").select("role").eq("user_id", prof.id),
              supabaseAdmin
                .from("user_custom_roles")
                .select("custom_role_id")
                .eq("user_id", prof.id),
              supabaseAdmin.from("telegram_groups").select("*").eq("is_active", true),
            ]);

            const isAdmin = (uRoles || []).some((r: any) => r.role === "admin");
            const userRoleIds = (cRoles || []).map((cr: any) => cr.custom_role_id);

            const userGroups = (allGroups || []).filter((g: any) => {
              if (isAdmin) return true;
              const allowed = g.allowed_role_ids || [];
              if (allowed.includes("admin") && isAdmin) return true;
              return userRoleIds.some((rId: string) => allowed.includes(rId));
            });

            if (userGroups.length === 0) {
              await sendTelegramMessage(
                msg.chat.id,
                `ℹ️ Non hai attualmente gruppi Telegram associati ai tuoi ruoli nel Casinò Revenge.`,
              );
            } else {
              const buttons = userGroups.map((g: any) => [
                { text: `🔗 Ricevi Invito: ${g.title}`, callback_data: `genera_invito_${g.id}` },
              ]);

              await sendTelegramMessage(
                msg.chat.id,
                `📋 <b>I TUOI GRUPPI TELEGRAM ABILITATI:</b>\n\n` +
                  userGroups
                    .map((g: any, idx: number) => `🔹 <b>${idx + 1}. ${g.title}</b>`)
                    .join("\n") +
                  `\n\n<i>Clicca su un gruppo per generare il tuo link di invito personale:</i>`,
                { inline_keyboard: buttons },
              );
            }
          }
          continue;
        }

        // 3. Handle /scollega command in private chat
        if (cleanCmd === "/scollega" || cleanCmd.startsWith("/scollega@")) {
          try {
            const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
            for (const p of allProfiles || []) {
              let matches = false;
              if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) {
                matches = true;
              }
              if (p.telegram_chat_id && String(p.telegram_chat_id) === String(from.id)) {
                matches = true;
              }
              if (p.telegram_handle) {
                const cleanP = p.telegram_handle.toLowerCase().replace("@", "").trim();
                const cleanFrom = from.username ? from.username.toLowerCase().trim() : "";
                const cleanRaw = rawHandle.toLowerCase().replace("@", "").trim();
                if ((cleanFrom && cleanP === cleanFrom) || cleanP === cleanRaw) {
                  matches = true;
                }
              }
              if (matches) {
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    telegram_connected: false,
                    telegram_handle: null,
                    telegram_code: null,
                    telegram_chat_id: null,
                    telegram_user_id: null,
                  })
                  .eq("id", p.id);
              }
            }
            // Clean pending/verified codes associated with this user
            await supabaseAdmin
              .from("telegram_pending_codes")
              .delete()
              .or(`telegram_user_id.eq.${from.id},handle.ilike.%${from.username || from.id}%`);
          } catch (err) {
            console.error("Error unlinking handle via /scollega:", err);
          }

          await sendTelegramMessage(
            msg.chat.id,
            `❌ <b>Account Telegram scollegato con successo.</b>\n\n` +
              `L'associazione con il tuo profilo Minecraft è stata rimossa.\n` +
              `Per associare un nuovo account Minecraft, genera un nuovo codice dal sito ed invia <code>/associa CODICE</code> (oppure <code>/associa TUO_NICKNAME</code>).`,
          );
          continue;
        }

        // 4. Handle /info or /aiuto in private chat
        if (
          cleanCmd === "/info" ||
          cleanCmd === "/aiuto" ||
          cleanCmd === "/help" ||
          cleanCmd.startsWith("/info@") ||
          cleanCmd.startsWith("/aiuto@") ||
          cleanCmd.startsWith("/help@")
        ) {
          await sendTelegramMessage(
            msg.chat.id,
            `ℹ️ <b>BOT UFFICIALE CASINÒ REVENGE — LIBERTY BAY</b>\n\n` +
              `📌 <b>Comandi Disponibili in Chat Privata:</b>\n` +
              `🔹 <code>/start</code> - Verifica lo stato di associazione del tuo account\n` +
              `🔹 <code>/associa CODICE</code> - Collega il tuo account con il codice a 6 cifre\n` +
              `🔹 <code>/associa NICKNAME</code> - Collega direttamente con il tuo nickname Minecraft\n` +
              `🔹 <code>/gruppi</code> - Visualizza i gruppi riservati dello Staff a cui hai accesso\n` +
              `🔹 <code>/scollega</code> - Scollega il tuo account Telegram dal profilo Minecraft\n` +
              `🔹 <code>/id</code> - Mostra il tuo ID utente e ID chat\n` +
              `🔹 <code>/info</code> - Mostra questo messaggio di aiuto\n\n` +
              `💡 <i>Il bot è attivo H24 per la verifica istantanea dei profili e dei gruppi.</i>`,
          );
          continue;
        }

        // 5. EXTRACT COMMAND ARGUMENTS & CODES
        const rawArgs = text.replace(/^(\/\w+(@\w+)?|\S+)\s*/, "").trim();

        // Extract 4-8 digit numeric code from anywhere in text (e.g. "/associa 849201", "/start 849201", "849201", "/start associa_849201", "/associa: 849201")
        const cleanDigits = text.replace(/[^\d]/g, "");
        const explicitCodeMatch =
          text.match(/\b\d{4,8}\b/) ||
          (cleanDigits.length >= 4 && cleanDigits.length <= 8 ? [cleanDigits] : null);
        const extractedCode = explicitCodeMatch ? explicitCodeMatch[0] : "";

        // Check if user is already connected in database
        let alreadyConnectedProf: any = null;
        try {
          const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
          for (const p of allProfiles || []) {
            if (!p.telegram_connected) continue;
            if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) {
              alreadyConnectedProf = p;
              break;
            }
            if (p.telegram_chat_id && String(p.telegram_chat_id) === String(from.id)) {
              alreadyConnectedProf = p;
              break;
            }
            if (p.telegram_handle) {
              const cleanP = p.telegram_handle.toLowerCase().replace("@", "").trim();
              const cleanFrom = from.username ? from.username.toLowerCase().trim() : "";
              const cleanRaw = rawHandle.toLowerCase().replace("@", "").trim();
              if ((cleanFrom && cleanP === cleanFrom) || cleanP === cleanRaw) {
                alreadyConnectedProf = p;
                break;
              }
            }
          }
        } catch {
          // ignore
        }

        // 6. IS THIS AN ASSOCIATION INTENT?
        const isAssociaCmd =
          cleanCmd === "/associa" ||
          cleanCmd.startsWith("/associa@") ||
          cleanCmd === "/collega" ||
          cleanCmd.startsWith("/collega@");
        const isStartWithArg =
          (cleanCmd === "/start" || cleanCmd.startsWith("/start@")) &&
          (Boolean(extractedCode) || Boolean(rawArgs));
        const isDirectCodeOnly = Boolean(extractedCode) && text.trim().length <= 16;
        const isAssociaIntent = isAssociaCmd || isStartWithArg || isDirectCodeOnly;

        if (isAssociaIntent) {
          let targetCode = extractedCode;
          let matchedProfile: any = null;
          let pendingDbObj: any = null;
          let targetUserId: string | undefined = undefined;

          // STEP A: Lookup by code if provided
          if (targetCode) {
            // Check memory store
            const pendingMemoryObj = pendingCodesStore.get(targetCode);
            if (pendingMemoryObj?.userId) {
              targetUserId = pendingMemoryObj.userId;
            }

            // Check database pending codes & profiles
            try {
              const [{ data: pendD }, { data: profD }] = await Promise.all([
                supabaseAdmin
                  .from("telegram_pending_codes")
                  .select("*")
                  .eq("code", targetCode)
                  .maybeSingle(),
                supabaseAdmin
                  .from("profiles")
                  .select("*")
                  .eq("telegram_code", targetCode)
                  .maybeSingle(),
              ]);
              pendingDbObj = pendD;
              if (profD) matchedProfile = profD;
              if (!targetUserId && pendD?.user_id) targetUserId = pendD.user_id;
              if (!targetUserId && profD?.id) targetUserId = profD.id;
            } catch (e) {
              // ignore
            }
          }

          // STEP B: Lookup by nickname/argument or username if not yet found
          if (!matchedProfile && !pendingDbObj && rawArgs) {
            const cleanArg = rawArgs.replace(/^@/, "").toLowerCase().trim();
            try {
              const { data: allProfs } = await supabaseAdmin.from("profiles").select("*");
              matchedProfile = (allProfs || []).find((p: any) => {
                if (p.username && p.username.toLowerCase().trim() === cleanArg) return true;
                if (p.display_name && p.display_name.toLowerCase().trim() === cleanArg) return true;
                if (
                  p.telegram_handle &&
                  p.telegram_handle.toLowerCase().replace("@", "").trim() === cleanArg
                )
                  return true;
                return false;
              });
              if (matchedProfile) {
                targetUserId = matchedProfile.id;
                if (matchedProfile.telegram_code) {
                  targetCode = matchedProfile.telegram_code;
                }
              }
            } catch {
              // ignore
            }
          }

          // STEP C: Auto-lookup by Telegram handle, sender name, or recent pending registration
          if (!matchedProfile && !pendingDbObj) {
            const cleanFromUsername = from.username
              ? from.username.toLowerCase().replace("@", "").trim()
              : "";
            const cleanFirstName = from.first_name ? from.first_name.toLowerCase().trim() : "";
            try {
              const { data: allProfs } = await supabaseAdmin.from("profiles").select("*");

              // 1. Check profile matching Telegram handle or first name
              matchedProfile = (allProfs || []).find((p: any) => {
                if (
                  cleanFromUsername &&
                  p.telegram_handle &&
                  p.telegram_handle.toLowerCase().replace("@", "").trim() === cleanFromUsername
                )
                  return true;
                if (
                  cleanFromUsername &&
                  p.username &&
                  p.username.toLowerCase().trim() === cleanFromUsername
                )
                  return true;
                if (
                  cleanFirstName &&
                  p.username &&
                  (p.username.toLowerCase().trim() === cleanFirstName ||
                    cleanFirstName.includes(p.username.toLowerCase().trim()))
                )
                  return true;
                if (
                  cleanFirstName &&
                  p.display_name &&
                  (p.display_name.toLowerCase().trim() === cleanFirstName ||
                    cleanFirstName.includes(p.display_name.toLowerCase().trim()))
                )
                  return true;
                return false;
              });

              // 2. Check profiles with an active pending telegram_code
              if (!matchedProfile) {
                const unverifiedProfsWithCode = (allProfs || []).filter(
                  (p: any) => !p.telegram_connected && p.telegram_code,
                );
                if (unverifiedProfsWithCode.length === 1) {
                  matchedProfile = unverifiedProfsWithCode[0];
                }
              }

              if (matchedProfile) {
                targetUserId = matchedProfile.id;
                if (matchedProfile.telegram_code) {
                  targetCode = matchedProfile.telegram_code;
                }
              }
            } catch {
              // ignore
            }
          }

          // If code was not known but matchedProfile has one, use it
          if (!targetCode && matchedProfile?.telegram_code) {
            targetCode = matchedProfile.telegram_code;
          }
          if (!targetCode) {
            targetCode = String(Math.floor(100000 + Math.random() * 900000));
          }

          const isValidAssociation = Boolean(
            matchedProfile ||
            pendingDbObj ||
            pendingCodesStore.get(targetCode) ||
            (targetCode && targetCode.length >= 4),
          );

          if (isValidAssociation) {
            // Check if Telegram account is already linked to ANOTHER user
            let existingLinkedOther: any = null;
            try {
              const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
              for (const p of allProfiles || []) {
                if (!p.telegram_connected) continue;
                if (targetUserId && p.id === targetUserId) continue; // Same user, allow re-verifying
                if (p.telegram_user_id && String(p.telegram_user_id) === String(from.id)) {
                  existingLinkedOther = p;
                  break;
                }
                if (p.telegram_handle) {
                  const cleanP = p.telegram_handle.toLowerCase().replace("@", "").trim();
                  const cleanFrom = from.username ? from.username.toLowerCase().trim() : "";
                  const cleanRaw = rawHandle.toLowerCase().replace("@", "").trim();
                  if ((cleanFrom && cleanP === cleanFrom) || cleanP === cleanRaw) {
                    existingLinkedOther = p;
                    break;
                  }
                }
              }
            } catch (err) {
              console.error("Error checking duplicate telegram profile:", err);
            }

            if (existingLinkedOther && (!targetUserId || existingLinkedOther.id !== targetUserId)) {
              await sendTelegramMessage(
                msg.chat.id,
                `⚠️ <b>ACCOUNT TELEGRAM GIÀ COLLEGATO</b>\n\n` +
                  `Questo account Telegram (<b>${rawHandle}</b>) è già stato collegato all'account Minecraft: <b>${existingLinkedOther.display_name || existingLinkedOther.username}</b>.\n\n` +
                  `📌 <b>Regola:</b> Un utente può avere al massimo <b>1 solo account</b> collegato a Telegram.\n\n` +
                  `Se desideri cambiare account o associare questo Telegram a un nuovo profilo, invia prima il comando <code>/scollega</code> qui in chat.`,
              );
              continue;
            }

            // Store verification in memory
            const verificationRecord = {
              handle: rawHandle,
              chatId: msg.chat.id,
              firstName: from.first_name || "Cliente",
              date: Date.now(),
              userId: targetUserId,
            };
            verifiedCodesStore.set(targetCode, verificationRecord);

            // Update database persistent tables
            try {
              await supabaseAdmin.from("telegram_pending_codes").upsert({
                id: targetCode,
                code: targetCode,
                user_id: targetUserId || null,
                handle: rawHandle,
                telegram_user_id: from.id,
                telegram_chat_id: msg.chat.id,
                first_name: from.first_name || "Cliente",
                verified: true,
                verified_at: new Date().toISOString(),
              });

              if (targetUserId) {
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    telegram_handle: rawHandle,
                    telegram_connected: true,
                    telegram_code: null,
                    telegram_chat_id: from.id,
                    telegram_user_id: from.id,
                  })
                  .eq("id", targetUserId);
              }

              if (targetCode) {
                await supabaseAdmin
                  .from("profiles")
                  .update({
                    telegram_handle: rawHandle,
                    telegram_connected: true,
                    telegram_code: null,
                    telegram_chat_id: from.id,
                    telegram_user_id: from.id,
                  })
                  .eq("telegram_code", targetCode);
              }

              // Also sync matching citizen
              if (matchedProfile?.username || matchedProfile?.display_name) {
                const nick = matchedProfile.username || matchedProfile.display_name;
                const { data: citList } = await supabaseAdmin
                  .from("citizens")
                  .select("id, nickname")
                  .ilike("nickname", nick);
                if (citList && citList.length > 0) {
                  await supabaseAdmin
                    .from("citizens")
                    .update({ telegram_handle: rawHandle })
                    .eq("id", citList[0].id);
                }
              }
            } catch (dbErr) {
              console.error("Error auto-updating database profile for code:", dbErr);
            }

            const targetName =
              matchedProfile?.display_name ||
              matchedProfile?.username ||
              from.first_name ||
              "Utente";

            await sendTelegramMessage(
              msg.chat.id,
              `🎉 <b>COLLEGAMENTO TELEGRAM COMPLETATO CON SUCCESSO!</b>\n\n` +
                `👋 Ciao <b>${from.first_name || "Utente"}</b>!\n` +
                `Il tuo profilo Telegram (<b>${rawHandle}</b>) è stato collegato con successo all'account <b>${targetName}</b> sul portale <b>Casinò Revenge</b>.\n\n` +
                `📌 <b>Prossimi Passaggi:</b>\n` +
                `1️⃣ Torna alla pagina del browser dove stavi effettuando la verifica o registrazione.\n` +
                `2️⃣ La pagina riconoscerà il collegamento ed <b>avanzerà automaticamente</b> entro pochi secondi!\n` +
                `3️⃣ Ora puoi accedere a tutte le sezioni e visualizzare i gruppi a cui hai accesso.\n\n` +
                `💡 <i>Invia <code>/gruppi</code> in qualsiasi momento per visualizzare e unirti ai gruppi riservati!</i>`,
              {
                inline_keyboard: [
                  [{ text: "📋 I Miei Gruppi Abilitati", callback_data: "miei_gruppi" }],
                ],
              },
            );
            continue;
          }

          // If already connected and just sent /associa or /start
          if (alreadyConnectedProf) {
            await sendTelegramMessage(
              msg.chat.id,
              `ℹ️ <b>ACCOUNT GIÀ COLLEGATO</b>\n\n` +
                `Ciao ${from.first_name || "Utente"}, il tuo account Telegram (<b>${rawHandle}</b>) risulta già collegato al profilo Minecraft <b>${alreadyConnectedProf.display_name || alreadyConnectedProf.username}</b>.\n\n` +
                `Se desideri cambiare account o associare un nuovo profilo, invia prima il comando <code>/scollega</code> qui in chat.\n` +
                `💡 <i>Invia <code>/gruppi</code> per gestire i tuoi gruppi abilitati.</i>`,
              {
                inline_keyboard: [
                  [{ text: "📋 I Miei Gruppi Abilitati", callback_data: "miei_gruppi" }],
                  [{ text: "🔌 Scollega Account", callback_data: "scollega" }],
                ],
              },
            );
            continue;
          }

          // Association attempt failed -> send helpful instructions
          await sendTelegramMessage(
            msg.chat.id,
            `⚠️ <b>CODICE O NICKNAME NON TROVATO</b>\n\n` +
              `Ciao ${from.first_name || "Utente"}, non abbiamo trovato nessuna richiesta attiva per collegare questo account Telegram.\n\n` +
              `👉 <b>Come collegare il tuo account:</b>\n` +
              `1️⃣ Vai sul sito ufficiale del <b>Casinò Revenge</b> ed avvia la Registrazione o l'Accesso.\n` +
              `2️⃣ Clicca su <b>'Genera Comando /associa'</b> per ottenere il tuo codice a 6 cifre.\n` +
              `3️⃣ Invia qui il comando (es. <code>/associa 849201</code>).\n\n` +
              `💡 <i>Puoi anche associare inviando: <code>/associa TUO_NICKNAME_MINECRAFT</code></i>`,
          );
          continue;
        }

        // 7. General messages / commands in private chat (e.g. /start without args)
        const isExplicitCommand =
          cleanCmd === "/start" || cleanCmd === "/help" || cleanCmd === "/info";

        if (!isExplicitCommand) {
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
              .select("id, username, display_name, telegram_connected, telegram_handle")
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
          try {
            await supabaseAdmin
              .from("profiles")
              .update({
                telegram_chat_id: from.id,
                telegram_user_id: from.id,
              })
              .eq("id", connectedProf.id);
          } catch (e) {
            // ignore
          }

          await sendTelegramMessage(
            msg.chat.id,
            `✅ <b>ACCOUNT TELEGRAM COLLEGATO</b>\n\n` +
              `👋 Ciao <b>${from.first_name || "Utente"}</b>!\n` +
              `Il tuo profilo Telegram (<b>${rawHandle}</b>) è attualmente collegato all'account Minecraft: <b>${connectedProf.display_name || connectedProf.username}</b>.\n\n` +
              `Puoi visualizzare i tuoi gruppi abilitati o scollegare il tuo account con i pulsanti qui sotto:`,
            {
              inline_keyboard: [
                [{ text: "📋 I Miei Gruppi Abilitati", callback_data: "miei_gruppi" }],
                [{ text: "🔌 Scollega Account", callback_data: "scollega" }],
              ],
            },
          );
        } else {
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
      } catch (singleUpdateErr) {
        console.error(
          `[Telegram Bot] Error processing update #${update.update_id}:`,
          singleUpdateErr,
        );
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

export async function getCachedCodeVerification(code: string) {
  const mem = verifiedCodesStore.get(code);
  if (mem) return mem;
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: dbEntry } = await supabaseAdmin
      .from("telegram_pending_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (dbEntry && dbEntry.verified && dbEntry.handle) {
      const obj = {
        handle: dbEntry.handle,
        chatId: dbEntry.telegram_chat_id || 0,
        firstName: dbEntry.first_name || "Cliente",
        date: new Date(dbEntry.verified_at || dbEntry.created_at).getTime() || Date.now(),
        userId: dbEntry.user_id || undefined,
      };
      verifiedCodesStore.set(code, obj);
      return obj;
    }
  } catch {
    // ignore
  }
  return null;
}

export function startBackgroundPolling(forceRestart: boolean = false) {
  // Only start long-running setInterval on dedicated Node.js processes (not Edge/Cloudflare Workers)
  const isDedicatedNodeProcess =
    typeof process !== "undefined" &&
    process.versions?.node &&
    !process.env.CF_PAGES &&
    !process.env.WORKERS &&
    typeof setInterval === "function";

  if (!isDedicatedNodeProcess) return;

  if (g._telegramPollingInterval && !forceRestart) {
    // Already running
    return;
  }

  if (g._telegramPollingInterval) {
    try {
      clearInterval(g._telegramPollingInterval);
    } catch (e) {
      // ignore
    }
    g._telegramPollingInterval = null;
  }

  g._telegramPollingStarted = true;
  console.log("[Telegram Bot] Initializing background polling service (every 2.5s)...");

  try {
    // Immediate initial run
    fetchTelegramUpdates().catch(() => {});

    // Continuous background loop running every 2.5 seconds
    g._telegramPollingInterval = setInterval(() => {
      fetchTelegramUpdates().catch((err) => {
        console.error("Background polling loop error:", err);
      });
    }, 2500);
  } catch (e) {
    console.error("[Telegram Bot] Failed to set background polling timer:", e);
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

// ============================================================================
// TELEGRAM NOTIFICATION ROUTER SYSTEM (Configuratore Notifiche per Sezione)
// ============================================================================

export interface TelegramNotificationRule {
  id: string;
  section:
    | "candidature"
    | "cittadini"
    | "cassa"
    | "eventi"
    | "staff"
    | "congedi"
    | "stipendi"
    | "sicurezza";
  section_title: string;
  event_type: string;
  title: string;
  description: string;
  enabled: boolean;
  chat_id: string; // Target Telegram Chat/Group ID or "" (unassigned)
  custom_chat_id?: string;
  silent: boolean;
  min_amount_threshold?: number;
  template_override?: string;
  icon?: string;
  updated_at?: string;
}

export function getDefaultTelegramNotificationRules(): TelegramNotificationRule[] {
  return [
    // 1. CANDIDATURE
    {
      id: "rule_candidature_new",
      section: "candidature",
      section_title: "Candidature & Selezioni Staff",
      event_type: "candidature_new",
      title: "Nuova Candidatura Inviata",
      description:
        "Notifica istantanea quando un utente invia una candidatura per un bando staff aperto.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "FileText",
    },
    {
      id: "rule_candidature_evaluated",
      section: "candidature",
      section_title: "Candidature & Selezioni Staff",
      event_type: "candidature_evaluated",
      title: "Esito Valutazione Candidatura",
      description: "Notifica quando un esaminatore approva o respinge formalmente una candidatura.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Award",
    },
    {
      id: "rule_candidature_second_chance",
      section: "candidature",
      section_title: "Candidature & Selezioni Staff",
      event_type: "candidature_second_chance",
      title: "Seconda Possibilità / Reset Cooldown",
      description:
        "Notifica quando viene concesso un nuovo tentativo a un candidato precedentemente respinto.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "RotateCcw",
    },
    {
      id: "rule_candidature_form_published",
      section: "candidature",
      section_title: "Candidature & Selezioni Staff",
      event_type: "candidature_form_published",
      title: "Nuovo Bando Candidature Creato",
      description:
        "Notifica quando viene pubblicato un nuovo bando di selezione per ruoli o mansioni.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "PlusCircle",
    },

    // 2. CITTADINI & ANAGRAFICA
    {
      id: "rule_citizen_created",
      section: "cittadini",
      section_title: "Cittadini & Tesseramenti",
      event_type: "citizen_created",
      title: "Nuovo Cittadino Registrato",
      description:
        "Notifica quando un nuovo cliente/cittadino viene aggiunto all'anagrafica del casinò.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "UserPlus",
    },
    {
      id: "rule_citizen_sanctioned",
      section: "cittadini",
      section_title: "Cittadini & Tesseramenti",
      event_type: "citizen_sanctioned",
      title: "Sanzione / Provvedimento a Cittadino",
      description:
        "Notifica immediata di richiami, allontanamenti temporanei o sanzioni pecuniarie.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "AlertTriangle",
    },
    {
      id: "rule_membership_activated",
      section: "cittadini",
      section_title: "Cittadini & Tesseramenti",
      event_type: "membership_activated",
      title: "Attivazione / Rinnovo Tessera VIP",
      description:
        "Notifica quando un cittadino acquista o rinnova un piano di tesseramento VIP o Standard.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Crown",
    },
    {
      id: "rule_membership_expired_alert",
      section: "cittadini",
      section_title: "Cittadini & Tesseramenti",
      event_type: "membership_expired_alert",
      title: "Avviso Scadenza Tessera VIP",
      description: "Notifica di avviso quando un abbonamento VIP raggiunge la data di scadenza.",
      enabled: false,
      chat_id: "-1003625594442",
      silent: true,
      icon: "Clock",
    },

    // 3. CASSA & CONVERSIONI
    {
      id: "rule_conversion_completed",
      section: "cassa",
      section_title: "Cassa, Dobloni & Economia",
      event_type: "conversion_completed",
      title: "Conversione Valuta (Dobloni ⇄ Euro)",
      description: "Notifica per ogni cambio fiches/valuta completato dai cassieri abilitati.",
      enabled: true,
      chat_id: "-1003625594442",
      min_amount_threshold: 0,
      silent: false,
      icon: "ArrowLeftRight",
    },
    {
      id: "rule_cassa_night_opened",
      section: "cassa",
      section_title: "Cassa, Dobloni & Economia",
      event_type: "cassa_night_opened",
      title: "Apertura Serata di Gioco",
      description:
        "Notifica quando il responsabile apre ufficialmente i tavoli da gioco e la cassa.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Play",
    },
    {
      id: "rule_cassa_night_closed",
      section: "cassa",
      section_title: "Cassa, Dobloni & Economia",
      event_type: "cassa_night_closed",
      title: "Chiusura Serata & Report Incassi",
      description:
        "Notifica con il report consuntivo di chiusura: incasso totale, payout e bilancio fiches.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "CheckCircle2",
    },

    // 4. EVENTI & TORNEI
    {
      id: "rule_event_created",
      section: "eventi",
      section_title: "Eventi, Gare & Corse",
      event_type: "event_created",
      title: "Nuovo Evento o Torneo Programmato",
      description:
        "Notifica quando viene annunciato un nuovo torneo di poker, corsa o evento speciale.",
      enabled: true,
      chat_id: "-1004480446106",
      silent: false,
      icon: "Calendar",
    },
    {
      id: "rule_event_ticket_bought",
      section: "eventi",
      section_title: "Eventi, Gare & Corse",
      event_type: "event_ticket_bought",
      title: "Acquisto Biglietto / Scommessa Evento",
      description:
        "Notifica quando un partecipante acquista una schedina o si iscrive a un torneo.",
      enabled: true,
      chat_id: "-1004480446106",
      silent: true,
      icon: "Ticket",
    },
    {
      id: "rule_event_winner_announced",
      section: "eventi",
      section_title: "Eventi, Gare & Corse",
      event_type: "event_winner_announced",
      title: "Vincitori Torneo / Gara Proclamati",
      description:
        "Notifica con il podio finale, i vincitori e il montepremi erogato per l'evento.",
      enabled: true,
      chat_id: "-1004480446106",
      silent: false,
      icon: "Trophy",
    },

    // 5. STAFF & DIPENDENTI
    {
      id: "rule_staff_hired",
      section: "staff",
      section_title: "Staff, Dipendenti & Ruoli",
      event_type: "staff_hired",
      title: "Nuova Assunzione Staff",
      description:
        "Notifica quando viene creato un nuovo dipendente o abilitato un profilo per lo staff.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "UserCheck",
    },
    {
      id: "rule_staff_fired",
      section: "staff",
      section_title: "Staff, Dipendenti & Ruoli",
      event_type: "staff_fired",
      title: "Licenziamento / Revoca Dipendente",
      description:
        "Notifica quando un membro viene licenziato dall'organico con revoca credenziali.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "UserX",
    },
    {
      id: "rule_staff_sanction",
      section: "staff",
      section_title: "Staff, Dipendenti & Ruoli",
      event_type: "staff_sanction",
      title: "Provvedimento Disciplinare a Staff",
      description: "Notifica per sanzioni, multe o note di biasimo emesse contro un collaboratore.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "ShieldAlert",
    },
    {
      id: "rule_staff_role_promoted",
      section: "staff",
      section_title: "Staff, Dipendenti & Ruoli",
      event_type: "staff_role_promoted",
      title: "Promozione Ruolo o Permessi Staff",
      description: "Notifica quando un dipendente riceve una promozione di grado o ruoli speciali.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "ShieldCheck",
    },

    // 6. FERIE & CONGEDI
    {
      id: "rule_leave_request_new",
      section: "congedi",
      section_title: "Ferie & Congedi",
      event_type: "leave_request_new",
      title: "Nuova Richiesta Ferie Inviata",
      description:
        "Notifica immediata alla direzione quando un dipendente richiede un periodo di assenza.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "CalendarDays",
    },
    {
      id: "rule_leave_request_evaluated",
      section: "congedi",
      section_title: "Ferie & Congedi",
      event_type: "leave_request_evaluated",
      title: "Esito Richiesta Ferie (Approvata / Respinta)",
      description: "Notifica quando la direzione approva o respinge una richiesta di congedo.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "CheckSquare",
    },

    // 7. STIPENDI & BUSTE PAGA
    {
      id: "rule_salary_paid",
      section: "stipendi",
      section_title: "Stipendi & Buste Paga",
      event_type: "salary_paid",
      title: "Pagamento Stipendio Dipendente",
      description:
        "Notifica quando viene saldato il compenso mensile o straordinari a un collaboratore.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Banknote",
    },

    // 8. SICUREZZA & BOT
    {
      id: "rule_security_unauthorized_kick",
      section: "sicurezza",
      section_title: "Sicurezza & Bot Telegram",
      event_type: "security_unauthorized_kick",
      title: "Espulsione Automatica Non Autorizzati",
      description:
        "Notifica quando la guardia automatica espelle dai gruppi Telegram un account non in regola.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "UserMinus",
    },
    {
      id: "rule_system_daily_audit",
      section: "sicurezza",
      section_title: "Sicurezza & Bot Telegram",
      event_type: "system_daily_audit",
      title: "Report Audit Giornaliero (Ore 17:00)",
      description:
        "Notifica periodica di riepilogo con lo stato di sincronizzazione gruppi e tesseramenti.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Activity",
    },

    // 9. BOARD & BACHECA AZIENDALE
    {
      id: "rule_board_task_assigned",
      section: "board",
      section_title: "Board & Bacheca",
      event_type: "board_task_assigned",
      title: "Nuova Task Assegnata sulla Board",
      description:
        "Notifica quando una task con scadenza viene assegnata a uno o più membri dello staff.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "CheckSquare",
    },
    {
      id: "rule_board_task_due_reminder",
      section: "board",
      section_title: "Board & Bacheca",
      event_type: "board_task_due_reminder",
      title: "Promemoria Scadenza Task Imminente",
      description:
        "Invia promemoria in privato (DM) allo staff se una task assegnata sta per scadere e non è completata.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "AlertTriangle",
    },
    {
      id: "rule_board_daily_morning_briefing",
      section: "board",
      section_title: "Board & Bacheca",
      event_type: "board_daily_morning_briefing",
      title: "Riepilogo Giornaliero Task (Ore 07:00)",
      description:
        "Invia ogni giorno alle ore 07:00 l'elenco delle task da svolgere in privato ai singoli dipendenti e al gruppo staff.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Sun",
    },
    {
      id: "rule_board_meeting_scheduled",
      section: "board",
      section_title: "Board & Bacheca",
      event_type: "board_meeting_scheduled",
      title: "Nuova Riunione Programmata",
      description:
        "Notifica quando viene convocata e pianificata una riunione o briefing sulla Board.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "CalendarDays",
    },
    {
      id: "rule_board_announcement_pinned",
      section: "board",
      section_title: "Board & Bacheca",
      event_type: "board_announcement_pinned",
      title: "Comunicazione Fissata in Bacheca",
      description:
        "Notifica quando una nota o direttiva importante viene fissata in alto nella Board.",
      enabled: true,
      chat_id: "-1003625594442",
      silent: false,
      icon: "Pin",
    },
  ];
}

export function normalizeSmallCaps(str: string): string {
  if (!str) return "";
  const smallCapsMap: Record<string, string> = {
    ᴀ: "a",
    ʙ: "b",
    ᴄ: "c",
    ᴅ: "d",
    ᴇ: "e",
    ꜰ: "f",
    ɢ: "g",
    ʜ: "h",
    ɪ: "i",
    ᴊ: "j",
    ᴋ: "k",
    ʟ: "l",
    ᴍ: "m",
    ɴ: "n",
    ᴏ: "o",
    ᴘ: "p",
    ǫ: "q",
    ʀ: "r",
    ꜱ: "s",
    ᴛ: "t",
    ᴜ: "u",
    ᴠ: "v",
    ᴡ: "w",
    x: "x",
    ʏ: "y",
    ᴢ: "z",
    "𝐀": "a",
    "𝐁": "b",
    "𝐂": "c",
    "𝐃": "d",
    "𝐄": "e",
    "𝐅": "f",
    "𝐆": "g",
    "𝐇": "h",
    "𝐈": "i",
    "𝐉": "j",
    "𝐊": "k",
    "𝐋": "l",
    "𝐌": "m",
    "𝐍": "n",
    "𝐎": "o",
    "𝐏": "p",
    "𝐐": "q",
    "𝐑": "r",
    "𝐒": "s",
    "𝐓": "t",
    "𝐔": "u",
    "𝐕": "v",
    "𝐖": "w",
    "𝐗": "x",
    "𝐘": "y",
    "𝐙": "z",
    "𝐚": "a",
    "𝐛": "b",
    "𝐜": "c",
    "𝐝": "d",
    "𝐞": "e",
    "𝐟": "f",
    "𝐠": "g",
    "𝐡": "h",
    "𝐢": "i",
    "𝐣": "j",
    "𝐤": "k",
    "𝐥": "l",
    "𝐦": "m",
    "𝐧": "n",
    "𝐨": "o",
    "𝐩": "p",
    "𝐪": "q",
    "𝐫": "r",
    "𝐬": "s",
    "𝐭": "t",
    "𝐮": "u",
    "𝐯": "v",
    "𝐰": "w",
    "𝐱": "x",
    "𝐲": "y",
    "𝐳": "z",
  };
  return str
    .split("")
    .map((c) => smallCapsMap[c] || c)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function resolveFallbackChatIdForSection(
  section: string,
  ruleTitle?: string,
): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: groups } = await supabaseAdmin.from("telegram_groups").select("*");
    if (groups && groups.length > 0) {
      const activeGroups = groups.filter((g: any) => g.is_active !== false && g.chat_id);
      if (activeGroups.length > 0) {
        const sec = (section || "").toLowerCase();
        const match = activeGroups.find((g: any) => {
          const title = normalizeSmallCaps(g.title || "");
          if (
            sec === "candidature" &&
            (title.includes("candidat") ||
              title.includes("direzione") ||
              title.includes("staff") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "cassa" &&
            (title.includes("cassa") ||
              title.includes("direzione") ||
              title.includes("master") ||
              title.includes("econom"))
          )
            return true;
          if (
            sec === "sicurezza" &&
            (title.includes("gorilla") ||
              title.includes("sicurezza") ||
              title.includes("direzione") ||
              title.includes("guard") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "congedi" &&
            (title.includes("direzione") ||
              title.includes("conged") ||
              title.includes("ferie") ||
              title.includes("staff") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "stipendi" &&
            (title.includes("direzione") ||
              title.includes("stipend") ||
              title.includes("cassa") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "cittadini" &&
            (title.includes("direzione") ||
              title.includes("cittadin") ||
              title.includes("vip") ||
              title.includes("client") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "eventi" &&
            (title.includes("event") ||
              title.includes("tornei") ||
              title.includes("annunc") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "staff" &&
            (title.includes("direzione") ||
              title.includes("dipendenti") ||
              title.includes("staff") ||
              title.includes("master"))
          )
            return true;
          if (
            sec === "board" &&
            (title.includes("direzione") ||
              title.includes("staff") ||
              title.includes("comunicaz") ||
              title.includes("annunc") ||
              title.includes("board") ||
              title.includes("master"))
          )
            return true;
          return false;
        });

        if (match) return String(match.chat_id);

        // Look for Direzione group
        const direzioneGrp = activeGroups.find((g: any) =>
          normalizeSmallCaps(g.title || "").includes("direzione"),
        );
        if (direzioneGrp) return String(direzioneGrp.chat_id);

        // Fallback to Master or first active group
        const masterGrp = activeGroups.find((g: any) =>
          normalizeSmallCaps(g.title || "").includes("master"),
        );
        if (masterGrp) return String(masterGrp.chat_id);

        return String(activeGroups[0].chat_id);
      }
    }
  } catch (err) {
    console.error("[Telegram Notifications] Error in resolveFallbackChatIdForSection:", err);
  }
  return process.env.TELEGRAM_CHAT_ID || "-1003625594442";
}

export async function getTelegramNotificationRules(): Promise<TelegramNotificationRule[]> {
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: dbRules } = await supabaseAdmin.from("telegram_notification_rules").select("*");

    const defaultRules = getDefaultTelegramNotificationRules();
    if (!dbRules || dbRules.length === 0) {
      // Seed default rules
      try {
        await supabaseAdmin.from("telegram_notification_rules").upsert(defaultRules);
      } catch {
        // ignore
      }
      return defaultRules;
    }

    // Merge default rules with stored rules to ensure newly added rules are present
    const ruleMap = new Map<string, TelegramNotificationRule>();
    for (const d of defaultRules) {
      ruleMap.set(d.id, d);
    }
    for (const r of dbRules) {
      const existing = ruleMap.get(r.id);
      ruleMap.set(r.id, {
        ...(existing || {}),
        ...r,
        chat_id: r.chat_id || existing?.chat_id || "",
      });
    }

    return Array.from(ruleMap.values());
  } catch (err) {
    console.error("Error getting telegram notification rules:", err);
    return getDefaultTelegramNotificationRules();
  }
}

export async function saveTelegramNotificationRule(
  rule: Partial<TelegramNotificationRule> & { id: string },
): Promise<TelegramNotificationRule> {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  const fullRule = {
    ...rule,
    updated_at: new Date().toISOString(),
  };
  await supabaseAdmin.from("telegram_notification_rules").upsert(fullRule);
  return fullRule as TelegramNotificationRule;
}

export async function saveAllTelegramNotificationRules(
  rules: TelegramNotificationRule[],
): Promise<TelegramNotificationRule[]> {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  const now = new Date().toISOString();
  const rulesToSave = rules.map((r) => ({ ...r, updated_at: now }));
  await supabaseAdmin.from("telegram_notification_rules").upsert(rulesToSave);
  return rulesToSave;
}

export async function resetTelegramNotificationRules(): Promise<TelegramNotificationRule[]> {
  const defaults = getDefaultTelegramNotificationRules();
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  await supabaseAdmin.from("telegram_notification_rules").upsert(defaults);
  return defaults;
}

// Formats rich HTML Telegram message with nice aesthetics and dynamic fields
export function formatTelegramNotificationPayload(
  eventType: string,
  payload: Record<string, any>,
): { title: string; html: string; defaultSilent: boolean } {
  const nowStr = new Date().toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  switch (eventType) {
    case "candidature_new":
      return {
        title: "Nuova Candidatura Inviata",
        defaultSilent: false,
        html:
          `📋 <b>NUOVA CANDIDATURA STAFF RICEVUTA</b>\n\n` +
          `👤 <b>Candidato:</b> <code>${escapeHtml(payload.applicant_name || payload.nickname || "Candidato")}</code>\n` +
          `📌 <b>Bando / Ruolo:</b> <b>${escapeHtml(payload.form_title || payload.bando || "Candidatura Staff")}</b>\n` +
          `💬 <b>Telegram:</b> ${payload.telegram_handle ? `@${escapeHtml(payload.telegram_handle.replace("@", ""))}` : "<i>Non specificato</i>"}\n` +
          `🆔 <b>Codice Cittadino:</b> #${escapeHtml(payload.citizen_code || payload.citizen_id || "N/D")}\n` +
          (payload.answers_preview
            ? `📝 <b>Sintesi Risposte:</b>\n<i>${escapeHtml(payload.answers_preview)}</i>\n`
            : "") +
          `\n⏱️ <i>Inviata il ${nowStr} • Casinò Revenge System</i>`,
      };

    case "candidature_evaluated": {
      const isApproved =
        String(payload.status).toLowerCase() === "approved" ||
        String(payload.status).toLowerCase() === "approvata";
      const statusBadge = isApproved ? "✅ APPROVATA" : "❌ RESPINTA";
      return {
        title: "Esito Candidatura Staff",
        defaultSilent: false,
        html:
          `⚖️ <b>ESITO CANDIDATURA STAFF REGISTRATO</b>\n\n` +
          `👤 <b>Candidato:</b> <code>${escapeHtml(payload.applicant_name || "Candidato")}</code>\n` +
          `📌 <b>Bando:</b> <b>${escapeHtml(payload.form_title || "Bando Staff")}</b>\n` +
          `🏷️ <b>Esito:</b> <b>${statusBadge}</b>\n` +
          `👨‍⚖️ <b>Valutato da:</b> ${escapeHtml(payload.reviewer_name || "Direzione")}\n` +
          (payload.reviewer_notes
            ? `💬 <b>Motivazione:</b> <i>${escapeHtml(payload.reviewer_notes)}</i>\n`
            : "") +
          `\n⏱️ <i>Registrato il ${nowStr}</i>`,
      };
    }

    case "candidature_second_chance":
      return {
        title: "Seconda Possibilità Candidato",
        defaultSilent: false,
        html:
          `🔄 <b>SECONDA POSSIBILITÀ CONCESSA</b>\n\n` +
          `👤 <b>Candidato:</b> <code>${escapeHtml(payload.applicant_name || "Candidato")}</code>\n` +
          `📌 <b>Bando:</b> <b>${escapeHtml(payload.form_title || "Bando Staff")}</b>\n` +
          `🔓 <b>Azione:</b> Il periodo di blocco/cooldown è stato azzerato.\n` +
          `👮‍♂️ <b>Autorizzato da:</b> ${escapeHtml(payload.authorized_by || "Amministrazione")}\n` +
          `\n⏱️ <i>Operazione eseguita il ${nowStr}</i>`,
      };

    case "candidature_form_published":
      return {
        title: "Nuovo Bando Candidature",
        defaultSilent: false,
        html:
          `📢 <b>NUOVO BANDO CANDIDATURE APERTO</b>\n\n` +
          `📜 <b>Titolo Bando:</b> <b>${escapeHtml(payload.title || "Nuovo Bando")}</b>\n` +
          `💼 <b>Mansione / Ruolo:</b> ${escapeHtml(payload.target_role || "Staff")}\n` +
          (payload.description
            ? `ℹ️ <b>Dettagli:</b> <i>${escapeHtml(payload.description)}</i>\n`
            : "") +
          `\n🌐 <i>Le candidature sono ora aperte sul portale ufficiale del Casinò Revenge.</i>`,
      };

    case "citizen_created":
      return {
        title: "Nuovo Cittadino Registrato",
        defaultSilent: false,
        html:
          `👤 <b>NUOVO CITTADINO REGISTRATO</b>\n\n` +
          `💳 <b>Nominativo:</b> <b>${escapeHtml(payload.full_name || "Cittadino")}</b>\n` +
          `🆔 <b>ID / Codice:</b> <code>${escapeHtml(payload.code || payload.id || "N/D")}</code>\n` +
          `📱 <b>Telegram:</b> ${payload.telegram_handle ? `@${escapeHtml(payload.telegram_handle.replace("@", ""))}` : "<i>Non collegato</i>"}\n` +
          (payload.phone ? `📞 <b>Telefono:</b> ${escapeHtml(payload.phone)}\n` : "") +
          (payload.notes ? `📝 <b>Note:</b> <i>${escapeHtml(payload.notes)}</i>\n` : "") +
          `\n⏱️ <i>Aggiunto al registro anagrafico il ${nowStr}</i>`,
      };

    case "citizen_sanctioned": {
      const sType = payload.sanction_type || payload.type || "Richiamo Ufficiale";
      return {
        title: "Sanzione Disciplinare Cittadino",
        defaultSilent: false,
        html:
          `⚠️ <b>SANZIONE DISCIPLINARE EMESSA</b>\n\n` +
          `👤 <b>Destinatario:</b> <b>${escapeHtml(payload.citizen_name || payload.full_name || "Cittadino")}</b>\n` +
          `🛑 <b>Tipologia:</b> <code>${escapeHtml(sType)}</code>\n` +
          `📜 <b>Motivazione:</b> <i>${escapeHtml(payload.reason || "Violazione del regolamento interno del Casinò")}</i>\n` +
          `👮‍♂️ <b>Emessa da:</b> ${escapeHtml(payload.issued_by || payload.created_by || "Sicurezza Casinò")}\n` +
          (payload.expires_at ? `⏳ <b>Scadenza:</b> ${escapeHtml(payload.expires_at)}\n` : "") +
          `\n⏱️ <i>Provvedimento protocollato il ${nowStr}</i>`,
      };
    }

    case "membership_activated":
      return {
        title: "Attivazione Tessera VIP",
        defaultSilent: false,
        html:
          `👑 <b>NUOVO TESSERAMENTO / ABBONAMENTO VIP</b>\n\n` +
          `👤 <b>Titolare:</b> <b>${escapeHtml(payload.citizen_name || "Cittadino")}</b>\n` +
          `💎 <b>Piano Attivato:</b> <code>${escapeHtml(payload.plan_name || "Tessera VIP")}</code>\n` +
          (payload.price
            ? `💰 <b>Costo / Valuta:</b> ${escapeHtml(String(payload.price))}\n`
            : "") +
          `📅 <b>Data Attivazione:</b> ${nowStr}\n` +
          (payload.expires_at
            ? `⏳ <b>Scadenza:</b> ${escapeHtml(payload.expires_at)}\n`
            : "♾️ <b>Durata:</b> Permanente\n") +
          `\n✨ <i>Benvenuto tra i clienti esclusivi del Casinò Revenge!</i>`,
      };

    case "conversion_completed": {
      const isEurToDob =
        payload.direction === "eur_to_dobloni" || payload.direction === "cash_to_dobloni";
      const dir = isEurToDob ? "💶 Soldi (Euro) ➔ 🪙 Dobloni" : "🪙 Dobloni ➔ 💶 Soldi (Euro)";
      const balanceImpact = isEurToDob
        ? "🟢 <b>ENTRATA CASSA (+ GUADAGNO PER IL CASINÒ)</b>"
        : "🔴 <b>USCITA CASSA (- ESBORSO EURO / PAGAMENTO CLIENTE)</b>";
      const eur = Number(payload.eur_amount || payload.eur || 0).toLocaleString("it-IT");
      const dob = Number(payload.dobloni_amount || payload.dobloni || 0).toLocaleString("it-IT");
      const eurSign = isEurToDob ? `+€ ${eur}` : `-€ ${eur}`;
      const dobSign = isEurToDob ? `+🪙 ${dob}` : `-🪙 ${dob}`;
      return {
        title: isEurToDob
          ? "🟢 Entrata Cassa — Soldi ➔ Dobloni"
          : "🔴 Uscita Cassa — Dobloni ➔ Soldi",
        defaultSilent: false,
        html:
          `💱 <b>TRANSAZIONE DI CASSA REGISTRATA</b>\n\n` +
          `📊 <b>Esito Bilancio:</b> ${balanceImpact}\n` +
          `🔄 <b>Operazione:</b> <b>${dir}</b>\n` +
          `💵 <b>Controvalore Euro:</b> <b>${eurSign}</b>\n` +
          `🪙 <b>Controvalore Dobloni:</b> <b>${dobSign}</b>\n` +
          `👤 <b>Cliente:</b> ${escapeHtml(payload.citizen_name || payload.client || "Cliente al banco")}\n` +
          `💼 <b>Operatore Cassa:</b> ${escapeHtml(payload.operator_name || payload.created_by || "Cassiere")}\n` +
          `\n⏱️ <i>Registrata il ${nowStr}</i>`,
      };
    }

    case "cassa_night_opened":
      return {
        title: "Apertura Serata Casinò",
        defaultSilent: false,
        html:
          `🎰 <b>APERTURA SERATA DI GIOCO & CASSA</b>\n\n` +
          `🌙 <b>Data Serata:</b> <b>${escapeHtml(payload.night_label || payload.date || nowStr)}</b>\n` +
          `🎲 <b>Tavoli e Servizi:</b> Attivi e operativi\n` +
          `💼 <b>Responsabile di Turno:</b> ${escapeHtml(payload.responsible_name || "Direzione")}\n` +
          (payload.starting_float
            ? `💰 <b>Fondo Cassa Iniziale:</b> € ${escapeHtml(String(payload.starting_float))}\n`
            : "") +
          `\n🎉 <i>Le sale da gioco del Casinò Revenge sono ufficialmente aperte!</i>`,
      };

    case "cassa_night_closed": {
      const incasso = Number(payload.total_revenue || payload.totale || 0).toLocaleString("it-IT");
      const chipRemain = Number(payload.chips_remaining || 0).toLocaleString("it-IT");
      return {
        title: "Chiusura Serata & Bilancio Cassa",
        defaultSilent: false,
        html:
          `🏁 <b>CHIUSURA UFFICIALE SERATA DI GIOCO</b>\n\n` +
          `🌙 <b>Serata:</b> <b>${escapeHtml(payload.night_label || "Sessione di Gioco")}</b>\n` +
          `💰 <b>Incasso Totale Registrato:</b> <b>€ ${incasso}</b>\n` +
          (payload.chips_remaining
            ? `🪙 <b>Fiches Residue nei Tavoli:</b> 🪙 ${chipRemain}\n`
            : "") +
          `💼 <b>Chiusura Registrata da:</b> ${escapeHtml(payload.closed_by || "Responsabile Cassa")}\n` +
          `\n📊 <i>Sessione archiviata e bilanci allineati con successo.</i>`,
      };
    }

    case "event_created":
      return {
        title: "Nuovo Evento Programmato",
        defaultSilent: false,
        html:
          `🎲 <b>NUOVO EVENTO PROGRAMMATO AL CASINÒ</b>\n\n` +
          `🏆 <b>Titolo Evento:</b> <b>${escapeHtml(payload.title || "Torneo Speciale")}</b>\n` +
          `📅 <b>Data e Ora:</b> ${escapeHtml(payload.scheduled_date || payload.event_date || "Prossimamente")}\n` +
          (payload.prize_pool
            ? `💰 <b>Montepremi Totale:</b> <b>${escapeHtml(String(payload.prize_pool))}</b>\n`
            : "") +
          (payload.ticket_price
            ? `🎟️ <b>Costo Iscrizione:</b> ${escapeHtml(String(payload.ticket_price))}\n`
            : "") +
          (payload.description
            ? `ℹ️ <b>Descrizione:</b> <i>${escapeHtml(payload.description)}</i>\n`
            : "") +
          `\n🎫 <i>Iscrizioni e schedine aperte presso il personale autorizzato!</i>`,
      };

    case "event_ticket_bought":
      return {
        title: "Iscrizione / Scommessa Evento",
        defaultSilent: true,
        html:
          `🎟️ <b>NUOVO BIGLIETTO EVENTO ACQUISTATO</b>\n\n` +
          `🏆 <b>Evento:</b> <b>${escapeHtml(payload.event_title || "Torneo Casinò")}</b>\n` +
          `👤 <b>Partecipante:</b> ${escapeHtml(payload.player_name || payload.buyer_name || "Giocatore")}\n` +
          `🔢 <b>Numero Ticket:</b> #${escapeHtml(payload.ticket_number || payload.id || "1")}\n` +
          (payload.amount
            ? `💵 <b>Importo Versato:</b> € ${escapeHtml(String(payload.amount))}\n`
            : "") +
          `\n⏱️ <i>Registrato il ${nowStr}</i>`,
      };

    case "event_winner_announced":
      return {
        title: "Vincitori Evento Proclamati",
        defaultSilent: false,
        html:
          `🥇 <b>PROCLAMAZIONE VINCITORI EVENTO</b>\n\n` +
          `🏆 <b>Evento:</b> <b>${escapeHtml(payload.event_title || "Gara Speciale")}</b>\n` +
          `🥇 <b>1° Classificato:</b> <b>${escapeHtml(payload.first_place || "Campione")}</b>\n` +
          (payload.second_place
            ? `🥈 <b>2° Classificato:</b> ${escapeHtml(payload.second_place)}\n`
            : "") +
          (payload.third_place
            ? `🥉 <b>3° Classificato:</b> ${escapeHtml(payload.third_place)}\n`
            : "") +
          (payload.prize_awarded
            ? `💰 <b>Premio Erogato:</b> <b>${escapeHtml(String(payload.prize_awarded))}</b>\n`
            : "") +
          `\n🎉 <i>Congratulazioni a tutti i partecipanti!</i>`,
      };

    case "staff_hired":
      return {
        title: "Nuova Assunzione Staff",
        defaultSilent: false,
        html:
          `👥 <b>NUOVO MEMBRO DELLO STAFF ASSUNTO</b>\n\n` +
          `👤 <b>Nome:</b> <b>${escapeHtml(payload.name || payload.username || "Nuovo Dipendente")}</b>\n` +
          `💼 <b>Ruolo Assegnato:</b> <code>${escapeHtml(payload.role_name || payload.role || "Staff")}</code>\n` +
          `📱 <b>Telegram:</b> ${payload.telegram_handle ? `@${escapeHtml(payload.telegram_handle.replace("@", ""))}` : "<i>N/D</i>"}\n` +
          `👮‍♂️ <b>Autorizzato da:</b> ${escapeHtml(payload.hired_by || "Direzione Risorse Umane")}\n` +
          `\n🤝 <i>Benvenuto nella squadra del Casinò Revenge!</i>`,
      };

    case "staff_fired":
      return {
        title: "Licenziamento Membro Staff",
        defaultSilent: false,
        html:
          `🚫 <b>REVOCA MEMBRO DELLO STAFF</b>\n\n` +
          `👤 <b>Ex Dipendente:</b> <b>${escapeHtml(payload.name || payload.username || "Membro Staff")}</b>\n` +
          `📜 <b>Motivazione:</b> <i>${escapeHtml(payload.reason || "Cessazione del rapporto di collaborazione")}</i>\n` +
          `🔒 <b>Stato:</b> Credenziali disattivate e rimozione dai canali interni avviata.\n` +
          `👮‍♂️ <b>Eseguito da:</b> ${escapeHtml(payload.fired_by || "Direzione")}\n` +
          `\n⏱️ <i>Data provvedimento: ${nowStr}</i>`,
      };

    case "staff_sanction":
      return {
        title: "Provvedimento Disciplinare Staff",
        defaultSilent: false,
        html:
          `🛡️ <b>PROVVEDIMENTO DISCIPLINARE STAFF</b>\n\n` +
          `👤 <b>Dipendente:</b> <b>${escapeHtml(payload.employee_name || "Membro Staff")}</b>\n` +
          `🛑 <b>Tipo Provvedimento:</b> <code>${escapeHtml(payload.sanction_type || "Richiamo Formale")}</code>\n` +
          `📝 <b>Descrizione / Fatti:</b> <i>${escapeHtml(payload.reason || "Comportamento non conforme agli standard")}</i>\n` +
          `👮‍♂️ <b>Rilasciato da:</b> ${escapeHtml(payload.issued_by || "Amministrazione")} \n` +
          `\n⏱️ <i>Notifica interna protocollata il ${nowStr}</i>`,
      };

    case "staff_role_promoted":
      return {
        title: "Promozione Ruolo Staff",
        defaultSilent: false,
        html:
          `🎖️ <b>PROMOZIONE DI RUOLO STAFF</b>\n\n` +
          `👤 <b>Dipendente:</b> <b>${escapeHtml(payload.employee_name || "Membro Staff")}</b>\n` +
          `⭐ <b>Nuovo Ruolo:</b> <b>${escapeHtml(payload.new_role || "Ruolo Superiore")}</b>\n` +
          (payload.old_role
            ? `⏮️ <b>Ruolo Precedente:</b> ${escapeHtml(payload.old_role)}\n`
            : "") +
          `👮‍♂️ <b>Promosso da:</b> ${escapeHtml(payload.promoted_by || "Direzione Generale")}\n` +
          `\n👏 <i>Complimenti per il traguardo raggiunto!</i>`,
      };

    case "leave_request_new":
      return {
        title: "Nuova Richiesta Ferie Dipendente",
        defaultSilent: false,
        html:
          `🏖️ <b>NUOVA RICHIESTA FERIE / CONGEDO INVIATA</b>\n\n` +
          `👤 <b>Dipendente:</b> <b>${escapeHtml(payload.employee_name || "Dipendente")}</b>\n` +
          `📅 <b>Periodo Richiesto:</b> dal <b>${escapeHtml(payload.start_date || "Inizio")}</b> al <b>${escapeHtml(payload.end_date || "Fine")}</b>\n` +
          (payload.reason ? `💬 <b>Motivazione:</b> <i>${escapeHtml(payload.reason)}</i>\n` : "") +
          `\n📌 <i>In attesa di valutazione da parte della direzione nella sezione Congedi.</i>`,
      };

    case "leave_request_evaluated": {
      const isApproved =
        String(payload.status).toLowerCase() === "approved" ||
        String(payload.status).toLowerCase() === "approvata";
      const statusBadge = isApproved ? "✅ APPROVATA" : "❌ RESPINTA";
      return {
        title: "Esito Richiesta Ferie",
        defaultSilent: false,
        html:
          `🏖️ <b>ESITO RICHIESTA FERIE / CONGEDO</b>\n\n` +
          `👤 <b>Dipendente:</b> <b>${escapeHtml(payload.employee_name || "Dipendente")}</b>\n` +
          `📅 <b>Periodo:</b> dal ${escapeHtml(payload.start_date || "N/D")} al ${escapeHtml(payload.end_date || "N/D")}\n` +
          `🏷️ <b>Stato:</b> <b>${statusBadge}</b>\n` +
          `👮‍♂️ <b>Valutato da:</b> ${escapeHtml(payload.reviewed_by || "Direzione")}\n` +
          (payload.review_notes
            ? `💬 <b>Note:</b> <i>${escapeHtml(payload.review_notes)}</i>\n`
            : "") +
          `\n⏱️ <i>Data decisione: ${nowStr}</i>`,
      };
    }

    case "salary_paid":
      return {
        title: "Stipendio Erogato",
        defaultSilent: false,
        html:
          `💶 <b>PAGAMENTO STIPENDIO REGISTRATO</b>\n\n` +
          `👤 <b>Dipendente:</b> <b>${escapeHtml(payload.employee_name || "Dipendente")}</b>\n` +
          `💰 <b>Importo Erogato:</b> <b>€ ${Number(payload.amount || 0).toLocaleString("it-IT")}</b>\n` +
          `📅 <b>Mese / Periodo:</b> ${escapeHtml(payload.period || "Mese Corrente")}\n` +
          `💼 <b>Registrato da:</b> ${escapeHtml(payload.paid_by || "Amministrazione")}\n` +
          `\n⏱️ <i>Contabile emessa il ${nowStr}</i>`,
      };

    case "security_unauthorized_kick":
      return {
        title: "Espulsione Sicurezza Bot",
        defaultSilent: false,
        html:
          `🛡️ <b>ESPULSIONE AUTOMATICA SICUREZZA ESEGUITA</b>\n\n` +
          `👤 <b>Account Espulso:</b> <code>${escapeHtml(payload.target_handle || payload.target_name || "Utente Non Autorizzato")}</code>\n` +
          `👥 <b>Gruppo Telegram:</b> <b>${escapeHtml(payload.group_title || "Gruppo Riservato")}</b>\n` +
          `⚠️ <b>Causa:</b> Account non presente in organico o licenziato\n` +
          `\n🤖 <i>Azione automatica di protezione Revenge Bot eseguita alle ${nowStr}</i>`,
      };

    case "system_daily_audit":
      return {
        title: "Report Audit Giornaliero Gruppi",
        defaultSilent: false,
        html:
          `📊 <b>REPORT AUDIT AUTOMATICO GIORNALIERO (ORE 17:00)</b>\n\n` +
          `👥 <b>Gruppi Ufficiali Scansionati:</b> ${escapeHtml(String(payload.groups_count || "Tutti"))}\n` +
          `🛡️ <b>Membri Verificati in Regola:</b> ${escapeHtml(String(payload.valid_members || "100%"))}\n` +
          `🚫 <b>Espulsioni Eseguite:</b> ${escapeHtml(String(payload.kicked_count || 0))}\n` +
          `👑 <b>Tessere VIP Attive:</b> ${escapeHtml(String(payload.active_vip || "N/D"))}\n` +
          `\n✅ <i>Integrità del sistema e controllo permessi verificati con successo.</i>`,
      };

    case "board_task_assigned":
      return {
        title: "Nuova Task Assegnata sulla Board",
        defaultSilent: false,
        html:
          `📋 <b>NUOVA TASK ASSEGNATA SULLA BOARD</b>\n\n` +
          `📌 <b>Titolo:</b> <b>${escapeHtml(payload.task_title || "Task Operativa")}</b>\n` +
          `📁 <b>Cartella:</b> ${escapeHtml(payload.category_name || "Board Generale")} / <b>Sottocategoria:</b> ${escapeHtml(payload.subcategory_name || "Generale")}\n` +
          `👤 <b>Assegnata a:</b> <b>${escapeHtml(payload.assigned_to_names || "Staff")}</b>\n` +
          `⏰ <b>Scadenza:</b> <b>${escapeHtml(payload.deadline || "Nessuna data limite")}</b>\n` +
          `⚡ <b>Priorità:</b> <b>${escapeHtml(payload.priority || "Normale")}</b>\n` +
          `✍️ <b>Creata da:</b> ${escapeHtml(payload.created_by_name || "Staff")}\n` +
          (payload.content ? `\n📝 <i>${escapeHtml(payload.content)}</i>\n` : "") +
          `\n⏱️ <i>Notifica automatica Board Casinò Revenge emessa alle ${nowStr}</i>`,
      };

    case "board_task_due_reminder":
      return {
        title: "Promemoria Scadenza Task",
        defaultSilent: false,
        html:
          `⚠️ <b>PROMEMORIA SCADENZA TASK: MANCA POCO!</b>\n\n` +
          `📌 <b>Task:</b> <b>${escapeHtml(payload.task_title || "Task Operativa")}</b>\n` +
          `📁 <b>Cartella:</b> ${escapeHtml(payload.category_name || "Board")} / <b>Sottocategoria:</b> ${escapeHtml(payload.subcategory_name || "Generale")}\n` +
          `👤 <b>Assegnata a:</b> <b>${escapeHtml(payload.assigned_to_names || "Staff")}</b>\n` +
          `⏰ <b>Scadenza:</b> <b>${escapeHtml(payload.deadline || "Imminente")}</b>` +
          (payload.time_remaining ? ` (<i>${escapeHtml(payload.time_remaining)}</i>)` : "") +
          `\n⚡ <b>Priorità:</b> <b>${escapeHtml(payload.priority || "Normale")}</b>\n` +
          `📊 <b>Stato:</b> <b>${escapeHtml(payload.status || "In corso")}</b>\n` +
          (payload.content ? `\n📝 <i>${escapeHtml(payload.content)}</i>\n` : "") +
          (payload.checklist_status
            ? `\n☑️ <i>${escapeHtml(payload.checklist_status)}</i>\n`
            : "") +
          `\n🚨 <i>Ti ricordiamo di completarla e aggiornare il pannello gestionale.</i>`,
      };

    case "board_daily_morning_briefing":
      return {
        title: "Report Giornaliero Task (Ore 07:00)",
        defaultSilent: false,
        html:
          `🌅 <b>REPORT GIORNALIERO TASK CASINÒ REVENGE (ORE 07:00)</b>\n\n` +
          `📅 <b>Data:</b> <b>${escapeHtml(payload.today_date || "Oggi")}</b>\n` +
          `🚨 <b>Task che Scadono Oggi:</b> <b>${escapeHtml(String(payload.today_count || 0))}</b>\n` +
          `⚠️ <b>Task Scadute / In Ritardo:</b> <b>${escapeHtml(String(payload.overdue_count || 0))}</b>\n` +
          `📋 <b>Totale Task Attive:</b> <b>${escapeHtml(String(payload.total_open || 0))}</b>\n\n` +
          `${payload.summary_body ? `${payload.summary_body}\n\n` : ""}` +
          `⏱️ <i>Report automatico emesso alle 07:00 dalla Board Aziendale</i>`,
      };

    case "board_meeting_scheduled":
      return {
        title: "Nuova Riunione Programmata",
        defaultSilent: false,
        html:
          `📅 <b>CONVOCAZIONE RIUNIONE DI STAFF</b>\n\n` +
          `📢 <b>Oggetto:</b> <b>${escapeHtml(payload.meeting_title || "Riunione Staff")}</b>\n` +
          `📁 <b>Cartella:</b> ${escapeHtml(payload.category_name || "Board")} / <b>Sottocategoria:</b> ${escapeHtml(payload.subcategory_name || "Generale")}\n` +
          `🗓️ <b>Data e Ora:</b> <b>${escapeHtml(payload.meeting_date || "Da definire")}</b>\n` +
          `📍 <b>Luogo / Canale:</b> ${escapeHtml(payload.meeting_location || "Canale Vocale Staff / Discord")}\n` +
          `👥 <b>Partecipanti Invitati:</b> ${escapeHtml(payload.attendees_names || "Tutti i membri autorizzati")}\n` +
          (payload.agenda
            ? `\n📋 <b>Ordine del Giorno:</b>\n${escapeHtml(payload.agenda)}\n`
            : "") +
          `\n⏱️ <i>Convocata da ${escapeHtml(payload.created_by_name || "Direzione")} alle ${nowStr}</i>`,
      };

    case "board_announcement_pinned":
      return {
        title: "Annuncio Fissato in Bacheca",
        defaultSilent: false,
        html:
          `📌 <b>NUOVA COMUNICAZIONE FISSATA IN ALTO</b>\n\n` +
          `📢 <b>Titolo:</b> <b>${escapeHtml(payload.announcement_title || "Comunicazione Ufficiale")}</b>\n` +
          `📁 <b>Categoria:</b> ${escapeHtml(payload.category_name || "Bacheca")} / ${escapeHtml(payload.subcategory_name || "Generale")}\n` +
          `✍️ <b>Autore:</b> <b>${escapeHtml(payload.author_name || "Staff")}</b>\n` +
          (payload.content ? `\n📄 <b>Contenuto:</b>\n${escapeHtml(payload.content)}\n` : "") +
          `\n⭐ <i>Fissato in evidenza per tutto il personale autorizzato alle ${nowStr}</i>`,
      };

    default:
      return {
        title: escapeHtml(payload.title || "Notifica di Sistema"),
        defaultSilent: false,
        html:
          `🔔 <b>${escapeHtml(payload.title || "NOTIFICA CASINÒ REVENGE")}</b>\n\n` +
          `${escapeHtml(payload.text || payload.message || "Evento registrato nel sistema.")}\n\n` +
          `⏱️ <i>${nowStr}</i>`,
      };
  }
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function dispatchTelegramNotification(
  eventType: string,
  payload: Record<string, any>,
  options?: { customChatId?: string | number },
): Promise<{ success: boolean; sentTo: string[]; error?: string }> {
  try {
    const rules = await getTelegramNotificationRules();
    const rule = rules.find((r) => r.event_type === eventType || r.id === eventType);

    if (!rule) {
      console.warn(`[Telegram Notifications] No rule found for event '${eventType}'`);
      return { success: false, sentTo: [], error: `Nessuna regola configurata per '${eventType}'` };
    }

    if (!rule.enabled && !options?.customChatId) {
      console.log(
        `[Telegram Notifications] Rule '${rule.title}' (${eventType}) is disabled in settings`,
      );
      return {
        success: false,
        sentTo: [],
        error: `Notifica '${rule.title}' disabilitata nelle impostazioni`,
      };
    }

    // Amount threshold check if specified
    if (rule.min_amount_threshold && rule.min_amount_threshold > 0) {
      const amt = Number(
        payload.eur_amount || payload.amount || payload.price || payload.total_revenue || 0,
      );
      if (amt < rule.min_amount_threshold && !options?.customChatId) {
        return {
          success: false,
          sentTo: [],
          error: `Importo sotto soglia minima (${amt} < ${rule.min_amount_threshold})`,
        };
      }
    }

    // Determine target chat ID
    let targetChatId = options?.customChatId || rule.custom_chat_id || rule.chat_id;

    // Intelligent fallback if no specific chat ID assigned to the rule
    if (!targetChatId) {
      targetChatId = (await resolveFallbackChatIdForSection(rule.section, rule.title)) || undefined;
    }

    if (!targetChatId) {
      console.warn(
        `[Telegram Notifications] No Telegram chat ID resolved for rule '${rule.title}' (${eventType})`,
      );
      return {
        success: false,
        sentTo: [],
        error: `Nessun gruppo Telegram assegnato alla regola '${rule.title}'`,
      };
    }

    const { html, defaultSilent } = formatTelegramNotificationPayload(eventType, payload);
    const silent = rule.silent !== undefined ? rule.silent : defaultSilent;

    console.log(
      `[Telegram Notifications] Dispatching '${eventType}' -> Target Chat ID: ${targetChatId}`,
    );
    let res = await sendTelegramMessage(targetChatId, html, undefined, {
      disableNotification: silent,
    });

    if (res && res.ok) {
      console.log(`[Telegram Notifications] Successfully sent '${eventType}' to ${targetChatId}`);
      return { success: true, sentTo: [String(targetChatId)] };
    }

    // Fallback: If primary targetChatId failed (or was hardcoded dummy ID), try resolving real registered group
    console.warn(
      `[Telegram Notifications] Primary send failed for '${eventType}' to ${targetChatId} (${res?.description}). Trying active group fallback...`,
    );
    const fallbackChatId = await resolveFallbackChatIdForSection(rule.section, rule.title);
    if (fallbackChatId && String(fallbackChatId) !== String(targetChatId)) {
      console.log(
        `[Telegram Notifications] Retrying '${eventType}' with fallback Chat ID: ${fallbackChatId}`,
      );
      res = await sendTelegramMessage(fallbackChatId, html, undefined, {
        disableNotification: silent,
      });
      if (res && res.ok) {
        console.log(
          `[Telegram Notifications] Successfully sent '${eventType}' to fallback group ${fallbackChatId}`,
        );
        return { success: true, sentTo: [String(fallbackChatId)] };
      }
    }

    console.error(`[Telegram Notifications] All attempts failed for '${eventType}':`, res);
    return {
      success: false,
      sentTo: [],
      error: res?.description || "Errore sconosciuto durante l'invio su Telegram",
    };
  } catch (err: any) {
    console.error("[Telegram Notifications] Error in dispatchTelegramNotification:", err);
    return { success: false, sentTo: [], error: err.message || String(err) };
  }
}

export async function testTelegramNotificationRule(
  ruleIdOrEventType: string,
  targetChatId?: string | number,
): Promise<{ success: boolean; messageText: string; sentTo?: string; error?: string }> {
  try {
    const rules = await getTelegramNotificationRules();
    const rule = rules.find(
      (r) => r.id === ruleIdOrEventType || r.event_type === ruleIdOrEventType,
    );

    if (!rule) {
      throw new Error(`Regola '${ruleIdOrEventType}' non trovata.`);
    }

    let chatIdToSend = targetChatId || rule.custom_chat_id || rule.chat_id;
    if (!chatIdToSend) {
      chatIdToSend = (await resolveFallbackChatIdForSection(rule.section, rule.title)) || undefined;
    }
    if (!chatIdToSend) {
      throw new Error("Seleziona prima un gruppo Telegram per testare l'invio della notifica.");
    }

    // Sample payload for realistic testing preview
    const samplePayloads: Record<string, any> = {
      candidature_new: {
        applicant_name: "Marco_Rossi",
        form_title: "Staff Dealer & Sicurezza - Stagione Autunno",
        telegram_handle: "marcorossi_tg",
        citizen_code: "REV-8924",
        answers_preview:
          "Disponibilità serale 4 giorni a settimana, esperienza pregressa come croupier.",
      },
      candidature_evaluated: {
        applicant_name: "Marco_Rossi",
        form_title: "Staff Dealer & Sicurezza",
        status: "approved",
        reviewer_name: "Amministratore",
        reviewer_notes: "Ottimo profilo e disponibilità confermata via colloquio.",
      },
      candidature_second_chance: {
        applicant_name: "Luca_Bianchi",
        form_title: "Croupier Roulette",
        authorized_by: "Direzione Generale",
      },
      candidature_form_published: {
        title: "Bando Selezioni Croupier Blackjack & Roulette",
        target_role: "Croupier Ufficiale",
        description: "Aperte le selezioni per 3 nuovi tavoli esclusivi in Sala Privé.",
      },
      citizen_created: {
        full_name: "Alessandro Del Piero",
        code: "CIT-7819",
        telegram_handle: "alessandro_dp",
        phone: "+39 340 1234567",
        notes: "Cliente referenziato per ingresso tavoli alti limiti.",
      },
      citizen_sanctioned: {
        citizen_name: "Giuseppe Verdi",
        sanction_type: "Allontanamento 7 Giorni",
        reason: "Comportamento scorretto e disturbo agli altri giocatori al tavolo roulette.",
        issued_by: "Capo Sicurezza",
        expires_at: "30/08/2026",
      },
      membership_activated: {
        citizen_name: "Roberto Baggio",
        plan_name: "Exclusive VIP Club",
        price: "10.000 € / 1.000 Dobloni",
        expires_at: "23/09/2026",
      },
      membership_expired_alert: {
        citizen_name: "Mario Rossi",
        plan_name: "VIP Diamond",
        days_remaining: 0,
      },
      conversion_completed: {
        direction: "eur_to_dobloni",
        eur_amount: 500,
        dobloni_amount: 50,
        citizen_name: "Francesco Totti",
        operator_name: "Cassiere Turno 1",
      },
      cassa_night_opened: {
        night_label: "Serata Sabato Notte Gran Casinò",
        responsible_name: "Direttore di Sala",
        starting_float: "25.000",
      },
      cassa_night_closed: {
        night_label: "Serata Sabato Notte Gran Casinò",
        total_revenue: "148.500",
        chips_remaining: "1.250",
        closed_by: "Responsabile Cassa",
      },
      event_created: {
        title: "Gran Torneo Poker Texas Hold'em - 100.000€ GTD",
        scheduled_date: "Venerdì ore 21:30",
        prize_pool: "100.000 €",
        ticket_price: "2.500 €",
        description: "Struttura deepstack, blind 15 min, re-entry consentito fino al 6° livello.",
      },
      event_ticket_bought: {
        event_title: "Gran Torneo Poker Texas Hold'em",
        player_name: "Andrea Pirlo",
        ticket_number: "TK-042",
        amount: 2500,
      },
      event_winner_announced: {
        event_title: "Gran Torneo Poker Texas Hold'em",
        first_place: "Andrea Pirlo",
        second_place: "Filippo Inzaghi",
        third_place: "Gennaro Gattuso",
        prize_awarded: "50.000 €",
      },
      staff_hired: {
        name: "Matteo_Staff",
        role_name: "Croupier Professionista",
        telegram_handle: "matteostaff_tg",
        hired_by: "Responsabile Risorse Umane",
      },
      staff_fired: {
        name: "Ex_Dipendente_1",
        reason: "Mancato rispetto degli orari e assenze ingiustificate.",
        fired_by: "Direzione",
      },
      staff_sanction: {
        employee_name: "Stefano_Dealer",
        sanction_type: "Decurtazione 10% e Richiamo Scritto",
        reason: "Ritardo all'apertura tavolo senza preavviso.",
        issued_by: "Responsabile Sala",
      },
      staff_role_promoted: {
        employee_name: "Matteo_Staff",
        new_role: "Capo Tavolo & Pit Boss",
        old_role: "Croupier",
        promoted_by: "Direttore Generale",
      },
      leave_request_new: {
        employee_name: "Elena_Bar",
        start_date: "01/09/2026",
        end_date: "08/09/2026",
        reason: "Ferie estive concordate con il turno.",
      },
      leave_request_evaluated: {
        employee_name: "Elena_Bar",
        start_date: "01/09/2026",
        end_date: "08/09/2026",
        status: "approved",
        reviewed_by: "Direzione Personale",
        review_notes: "Copertura turni garantita dal collega di sala.",
      },
      salary_paid: {
        employee_name: "Elena_Bar",
        amount: 1850,
        period: "Agosto 2026",
        paid_by: "Amministrazione Contabile",
      },
      security_unauthorized_kick: {
        target_handle: "@utente_non_autorizzato",
        target_name: "Ex Dipendente Rimasto",
        group_title: "Casinò Revenge - Staff Privato",
      },
      system_daily_audit: {
        groups_count: 5,
        valid_members: "48 membri in regola",
        kicked_count: 0,
        active_vip: 14,
      },
    };

    const payload = samplePayloads[rule.event_type] || {
      title: `Test per ${rule.title}`,
      text: `Questo è un messaggio di test inviato dal Centro Notifiche del Casinò Revenge per verificare il funzionamento del bot su questo gruppo.`,
    };

    const { html } = formatTelegramNotificationPayload(rule.event_type, payload);
    const testHeader = `🧪 <b>[TEST NOTIFICA TELEGRAM]</b>\n` + html;

    const res = await sendTelegramMessage(chatIdToSend, testHeader, undefined, {
      disableNotification: rule.silent,
    });

    if (res && res.ok) {
      return {
        success: true,
        messageText: html,
        sentTo: String(chatIdToSend),
      };
    } else {
      throw new Error(res?.description || "Telegram API ha rifiutato l'invio.");
    }
  } catch (err: any) {
    return {
      success: false,
      messageText: "",
      error: err.message || String(err),
    };
  }
}

// Global DB Event Notifications dispatcher hook
export async function dispatchDbEventNotifications(
  operation: "insert" | "update" | "upsert" | "delete",
  table: string,
  rows: any[] | any,
  db: any,
) {
  try {
    const list = Array.isArray(rows) ? rows : [rows];
    if (list.length === 0) return;

    for (const item of list) {
      if (!item) continue;

      if (table === "applications" && operation === "insert") {
        // Resolve form title from database if possible
        const forms = db?.application_forms || db?.candidature_forms || [];
        const formObj = forms.find((f: any) => f.id === item.form_id);
        const formTitle = formObj?.title || item.form_title || "Bando Staff";

        let answersSummary = "";
        if (item.answers && typeof item.answers === "object") {
          const ansKeys = Object.keys(item.answers);
          const parts: string[] = [];
          for (const k of ansKeys.slice(0, 4)) {
            const val = item.answers[k];
            if (val !== undefined && val !== null && String(val).trim()) {
              parts.push(String(val).slice(0, 40));
            }
          }
          answersSummary = parts.join(" • ");
        }

        await dispatchTelegramNotification("candidature_new", {
          applicant_name:
            item.applicant_name || item.applicant_nickname || item.name || "Nuovo Candidato",
          form_title: formTitle,
          telegram_handle: item.applicant_telegram || item.telegram_handle,
          citizen_code: item.citizen_id || item.citizen_code,
          answers_preview: answersSummary || undefined,
        });
      } else if (table === "applications" && operation === "update") {
        const forms = db?.application_forms || db?.candidature_forms || [];
        const formObj = forms.find((f: any) => f.id === item.form_id);
        const formTitle = formObj?.title || item.form_title || "Bando Staff";

        if (item.status && item.status !== "pending" && item.status !== "draft") {
          await dispatchTelegramNotification("candidature_evaluated", {
            applicant_name:
              item.applicant_name || item.applicant_nickname || item.name || "Candidato",
            form_title: formTitle,
            status: item.status,
            reviewer_name: item.reviewer_name || "Direzione / Staff",
            reviewer_notes: item.reviewer_notes || item.notes,
          });
        }
        if (item.allow_retry === true) {
          await dispatchTelegramNotification("candidature_second_chance", {
            applicant_name: item.applicant_name || "Candidato",
            form_title: formTitle,
            authorized_by: item.retry_granted_by || "Staff Esaminatore",
          });
        }
      } else if (
        (table === "application_forms" || table === "candidature_forms") &&
        (operation === "insert" || operation === "update") &&
        item.status === "open"
      ) {
        await dispatchTelegramNotification("candidature_form_published", {
          title: item.title || "Nuovo Bando Staff",
          target_role: item.role_target || "Collaboratore",
          description: item.description,
        });
      } else if (table === "citizens" && operation === "insert") {
        await dispatchTelegramNotification("citizen_created", {
          full_name: item.full_name,
          code: item.code || item.id,
          telegram_handle: item.telegram_handle,
          phone: item.phone,
          notes: item.notes,
        });
      } else if (table === "citizens" && operation === "update") {
        if (item.membership && item.membership !== "standard" && item.membership_since) {
          await dispatchTelegramNotification("membership_activated", {
            citizen_name: item.full_name || item.nickname || "Cittadino VIP",
            plan_name: item.membership_plan_name || item.membership || "Tessera VIP",
            expires_at: item.membership_expires_at,
          });
        }
      } else if (table === "membership_sales" && operation === "insert") {
        await dispatchTelegramNotification("membership_activated", {
          citizen_name: item.citizen_name || "Cittadino VIP",
          plan_name: item.plan_name || "Tessera VIP",
          price: item.amount_eur
            ? `€ ${item.amount_eur}`
            : item.amount_dobloni
              ? `⛃ ${item.amount_dobloni}`
              : "Gratuito",
          expires_at: item.expires_at,
        });
      } else if (
        table === "memberships" &&
        (operation === "insert" || operation === "update") &&
        item.is_active !== false
      ) {
        await dispatchTelegramNotification("membership_activated", {
          citizen_name: item.citizen_name || item.full_name || "Cittadino VIP",
          plan_name: item.tier_name || item.tier || "Tessera VIP",
          expires_at: item.expires_at,
        });
      } else if (table === "sanctions" && operation === "insert") {
        // Look up user name if missing
        let targetName = item.citizen_name || item.user_name || item.employee_name;
        let isStaff = false;
        if (!targetName && item.user_id && db?.profiles) {
          const prof = (db.profiles || []).find((p: any) => p.id === item.user_id);
          if (prof) {
            targetName = prof.display_name || prof.username;
            isStaff = true;
          }
        }
        if (!targetName && item.user_id && db?.citizens) {
          const cit = (db.citizens || []).find((c: any) => c.id === item.user_id);
          if (cit) {
            targetName = cit.full_name || cit.nickname;
          }
        }
        targetName = targetName || "Utente";

        const sanctionType = item.sanction_type || item.type || "Provvedimento";
        if (isStaff) {
          await dispatchTelegramNotification("staff_sanction", {
            employee_name: targetName,
            sanction_type: sanctionType,
            reason: item.reason || "Violazione del regolamento staff",
            issued_by: item.issued_by || item.created_by || item.created_by_name || "Direzione",
          });
        } else {
          await dispatchTelegramNotification("citizen_sanctioned", {
            citizen_name: targetName,
            sanction_type: sanctionType,
            reason: item.reason || "Violazione del regolamento interno",
            issued_by:
              item.issued_by || item.created_by || item.created_by_name || "Capo Sicurezza",
            expires_at: item.expires_at,
          });
        }
      } else if (table === "conversions" && operation === "insert") {
        let opName = item.operator_name;
        if (
          (!opName || opName === "Cassiere") &&
          (item.created_by || item.operator_id) &&
          db?.profiles
        ) {
          const targetOpId = item.operator_id || item.created_by;
          const p = (db.profiles || []).find((prof: any) => prof.id === targetOpId);
          if (p) opName = p.display_name || p.username;
        }
        let citName = item.citizen_name;
        if ((!citName || citName === "Cittadino") && item.citizen_id && db?.citizens) {
          const c = (db.citizens || []).find((cit: any) => cit.id === item.citizen_id);
          if (c) citName = c.full_name;
        }

        await dispatchTelegramNotification("conversion_completed", {
          direction: item.direction || (item.eur_amount ? "cash_to_dobloni" : "dobloni_to_cash"),
          eur_amount: item.eur_amount || item.eur || item.amount || 0,
          dobloni_amount: item.dobloni_amount || item.dobloni || 0,
          citizen_name: citName || "Cittadino",
          operator_name: opName || "Cassiere",
        });
      } else if (table === "leave_requests" && operation === "insert") {
        let empName = item.employee_name || item.user_name;
        if (!empName && item.user_id && db?.profiles) {
          const p = (db.profiles || []).find((prof: any) => prof.id === item.user_id);
          if (p) empName = p.display_name || p.username;
        }
        await dispatchTelegramNotification("leave_request_new", {
          employee_name: empName || "Dipendente",
          start_date: item.start_date,
          end_date: item.end_date,
          reason: item.reason,
        });
      } else if (table === "leave_requests" && operation === "update" && item.status) {
        let empName = item.employee_name || item.user_name;
        if (!empName && item.user_id && db?.profiles) {
          const p = (db.profiles || []).find((prof: any) => prof.id === item.user_id);
          if (p) empName = p.display_name || p.username;
        }
        await dispatchTelegramNotification("leave_request_evaluated", {
          employee_name: empName || "Dipendente",
          start_date: item.start_date,
          end_date: item.end_date,
          status: item.status,
          reviewed_by: item.reviewed_by || "Direzione",
          review_notes: item.review_notes,
        });
      } else if (table === "nights" && operation === "insert") {
        await dispatchTelegramNotification("cassa_night_opened", {
          night_label: item.label || item.name || "Nuova Serata",
          responsible_name: item.created_by || "Responsabile Cassa",
          starting_float: item.initial_cash || item.starting_float || 0,
        });
      } else if (
        table === "nights" &&
        operation === "update" &&
        (item.closed || item.status === "closed" || item.is_closed)
      ) {
        await dispatchTelegramNotification("cassa_night_closed", {
          night_label: item.label || item.name || "Serata",
          total_revenue: item.total_revenue || item.total_eur || item.profit || 0,
          chips_remaining: item.chips_remaining || 0,
          closed_by: item.closed_by || "Responsabile Cassa",
        });
      } else if ((table === "events" || table === "eventi") && operation === "insert") {
        await dispatchTelegramNotification("event_created", {
          title: item.title || item.name || "Nuovo Evento Speciale",
          scheduled_date: item.event_date || item.date || item.start_time,
          prize_pool: item.prize_pool,
          ticket_price: item.ticket_price || item.entry_fee,
          description: item.description,
        });
      } else if (
        (table === "event_registrations" ||
          table === "eventi_tickets" ||
          table === "event_tickets" ||
          table === "eventi_scommesse") &&
        operation === "insert"
      ) {
        await dispatchTelegramNotification("event_ticket_bought", {
          event_title: item.event_title || item.title || "Evento Speciale",
          participant_name:
            item.participant_name || item.user_name || item.player_name || "Partecipante",
          ticket_price: item.ticket_price || item.price || item.amount || 0,
        });
      } else if (table === "eventi_finalisti" && operation === "insert") {
        await dispatchTelegramNotification("event_winner_announced", {
          event_title: item.event_title || "Torneo Casinò Revenge",
          first_place: item.first_place || item.winner || "1° Classificato",
          second_place: item.second_place || "2° Classificato",
          third_place: item.third_place || "3° Classificato",
          prize_awarded: item.prize_awarded || item.prize_pool || "Montepremi",
        });
      } else if ((table === "salaries" || table === "salary_payments") && operation === "insert") {
        await dispatchTelegramNotification("salary_paid", {
          employee_name: item.employee_name || item.user_name || "Dipendente",
          amount: item.amount || item.net_amount || 0,
          period: item.period || item.month || "Mese Corrente",
          paid_by: item.paid_by || "Amministrazione",
        });
      } else if (
        (table === "user_custom_roles" || table === "user_roles") &&
        (operation === "insert" || operation === "update")
      ) {
        let staffName = item.user_name || item.username;
        if (!staffName && item.user_id && db?.profiles) {
          const p = (db.profiles || []).find((prof: any) => prof.id === item.user_id);
          if (p) staffName = p.display_name || p.username;
        }
        if (staffName) {
          await dispatchTelegramNotification("staff_role_promoted", {
            employee_name: staffName,
            new_role: item.role_name || item.role || "Nuovo Ruolo Staff",
            promoted_by: item.promoted_by || "Direzione Generale",
          });
        }
      }
    }
  } catch (e) {
    console.error("[Telegram Notifications] Error in dispatchDbEventNotifications:", e);
  }
}
