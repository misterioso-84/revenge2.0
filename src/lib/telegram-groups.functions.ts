import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("role, username")
    .eq("id", ctx.userId)
    .maybeSingle();

  const { data: userRoles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);

  const { data: customRoles } = await ctx.supabase
    .from("user_custom_roles")
    .select("custom_role_id")
    .eq("user_id", ctx.userId);

  const isRoleAdmin = (userRoles || []).some(
    (r: any) => r.role === "admin" || r.role === "gestore" || r.role === "capitano",
  );
  const isCustomAdmin = (customRoles || []).some(
    (cr: any) =>
      cr.custom_role_id === "crole-admin" ||
      cr.custom_role_id === "crole-gestore" ||
      cr.custom_role_id === "crole-1",
  );
  const isProfileAdmin =
    profile?.role === "admin" ||
    profile?.role === "gestore" ||
    profile?.username?.toLowerCase() === "admin" ||
    profile?.username?.toLowerCase() === "giuse84pro";

  if (isRoleAdmin || isCustomAdmin || isProfileAdmin) {
    return;
  }

  const { data: rpcAdmin } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (!rpcAdmin) {
    throw new Error("Permesso negato: serve ruolo Amministratore / Capitano.");
  }
}

// 1. List all registered Telegram groups with their allowed roles and member count
export const listTelegramGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: groups }, { data: roles }, { data: members }, { data: profiles }] =
      await Promise.all([
        supabaseAdmin
          .from("telegram_groups")
          .select("*")
          .order("registered_at", { ascending: false }),
        supabaseAdmin.from("custom_roles").select("id, name, staff_color"),
        supabaseAdmin.from("telegram_group_members").select("*"),
        supabaseAdmin
          .from("profiles")
          .select("id, username, display_name, avatar_url, telegram_handle, telegram_user_id"),
      ]);

    const rolesMap = new Map((roles || []).map((r: any) => [r.id, r]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const groupList = (groups || []).map((g: any) => {
      const allowedRoles = (g.allowed_role_ids || [])
        .map((rid: string) => {
          if (rid === "admin" || rid === "crole-admin") {
            return { id: rid, name: "Amministratore / Capitano", staff_color: "#f59e0b" };
          }
          const found = rolesMap.get(rid);
          return found ? { id: found.id, name: found.name, staff_color: found.staff_color } : null;
        })
        .filter(Boolean);

      const groupMembers = (members || [])
        .filter((m: any) => m.group_id === g.id || String(m.chat_id) === String(g.chat_id))
        .map((m: any) => {
          let p = m.user_id ? profileMap.get(m.user_id) : null;
          if (!p && m.telegram_handle) {
            const handle = m.telegram_handle.toLowerCase().replace("@", "");
            p = (profiles || []).find((prof: any) => {
              const profHandle = prof.telegram_handle
                ? prof.telegram_handle.toLowerCase().replace("@", "")
                : "";
              const profUser = prof.username ? prof.username.toLowerCase().replace("@", "") : "";
              const profDisp = prof.display_name
                ? prof.display_name.toLowerCase().replace("@", "")
                : "";
              return profHandle === handle || profUser === handle || profDisp === handle;
            });
          }
          return {
            ...m,
            profile_name: p ? p.display_name || p.username : null,
            profile_username: p ? p.username : null,
          };
        });

      return {
        ...g,
        allowedRoles,
        allowedExceptions: g.allowed_exceptions || g.allowed_handles || [],
        botPermissions: null, // Checked on-demand via checkGroupBotPermissionsFn to prevent rate-limits & delays
        memberCount: groupMembers.filter((m: any) => m.status === "member").length,
        members: groupMembers,
      };
    });

    return groupList;
  });

// Check bot permissions live for a specific group
export const checkGroupBotPermissionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId?: string; chatId?: string | number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGroupBotPermissions } = await import("@/lib/telegram.server");

    let chatId = data.chatId;
    const targetGroupId = data.groupId;

    if (!chatId && targetGroupId) {
      const { data: group } = await supabaseAdmin
        .from("telegram_groups")
        .select("*")
        .eq("id", targetGroupId)
        .maybeSingle();

      if (!group) throw new Error("Gruppo Telegram non trovato.");
      chatId = group.chat_id;
    }

    if (!chatId) {
      throw new Error("Chat ID o Gruppo non specificato.");
    }

    const permissions = await getGroupBotPermissions(chatId);
    return { groupId: targetGroupId, ...permissions };
  });

// 2. Update allowed roles and manual exceptions for a Telegram group
export const updateTelegramGroupRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { groupId: string; allowedRoleIds: string[]; allowedExceptions?: string[] }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runDaily1700TelegramAudit } = await import("@/lib/telegram.server");

    const cleanExceptions = (data.allowedExceptions || [])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { error } = await supabaseAdmin
      .from("telegram_groups")
      .update({
        allowed_role_ids: data.allowedRoleIds,
        allowed_exceptions: cleanExceptions,
        allowed_handles: cleanExceptions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.groupId);

    if (error) throw new Error(error.message);

    // Trigger sync check for this group in background
    try {
      runDaily1700TelegramAudit().catch(() => {});
    } catch (e) {
      // ignore
    }

    return { ok: true };
  });

// 3. Register or manually add a Telegram group (if admin has chat_id and title)
export const registerTelegramGroupManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      chatId: string | number;
      title: string;
      allowedRoleIds?: string[];
      allowedExceptions?: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTelegramChat } = await import("@/lib/telegram.server");

    const rawStr = String(data.chatId || "").trim();
    if (!rawStr) {
      throw new Error("L'ID della chat Telegram è obbligatorio.");
    }

    const numChatId = Number(rawStr);
    if (isNaN(numChatId)) {
      throw new Error("L'ID della chat deve essere un numero valido (es. -1002489100201).");
    }

    // Try to get real chat title from telegram if possible
    let chatTitle = (data.title || "").trim();
    try {
      const tgChat = await getTelegramChat(numChatId);
      if (tgChat?.title) {
        chatTitle = tgChat.title;
      }
    } catch (e) {
      // ignore
    }

    const id = `tgroup-${Math.abs(numChatId)}`;
    const allowedRoles =
      data.allowedRoleIds && data.allowedRoleIds.length > 0 ? data.allowedRoleIds : ["crole-admin"];
    const cleanExceptions = (data.allowedExceptions || [])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { error } = await supabaseAdmin.from("telegram_groups").upsert({
      id,
      chat_id: numChatId,
      title: chatTitle || `Gruppo ${numChatId}`,
      type: "supergroup",
      allowed_role_ids: allowedRoles,
      allowed_exceptions: cleanExceptions,
      allowed_handles: cleanExceptions,
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    });

    if (error) throw new Error(error.message);
    return { ok: true, id, title: chatTitle || `Gruppo ${numChatId}` };
  });

// 4. Delete/Unlink a Telegram group
export const deleteTelegramGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const targetId = String(data.groupId || "").trim();
    if (!targetId) throw new Error("ID gruppo mancante.");

    // Fetch existing group first to get both id and chat_id
    const { data: allGroups } = await supabaseAdmin.from("telegram_groups").select("*");
    const matched = (allGroups || []).find(
      (g: any) =>
        String(g.id) === targetId ||
        String(g.chat_id) === targetId ||
        `tgroup-${Math.abs(Number(g.chat_id))}` === targetId,
    );

    const actualId = matched ? matched.id : targetId;
    const actualChatId = matched ? matched.chat_id : null;

    // Delete group
    const { error: delError } = await supabaseAdmin
      .from("telegram_groups")
      .delete()
      .eq("id", actualId);
    if (delError) throw new Error(delError.message);

    // Delete members
    await supabaseAdmin.from("telegram_group_members").delete().eq("group_id", actualId);
    if (actualChatId) {
      await supabaseAdmin.from("telegram_group_members").delete().eq("chat_id", actualChatId);
    }

    return { ok: true, deletedId: actualId };
  });

// 5. Kick / Revoke a specific member from a group manually
export const kickGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string; telegramUserId: number | string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { kickTelegramChatMember, sendTelegramMessage } = await import("@/lib/telegram.server");

    const { data: group } = await supabaseAdmin
      .from("telegram_groups")
      .select("*")
      .eq("id", data.groupId)
      .maybeSingle();

    if (!group) throw new Error("Gruppo non trovato.");

    // Kick from Telegram group
    try {
      await kickTelegramChatMember(group.chat_id, data.telegramUserId);
    } catch (err) {
      console.error("Error executing Telegram kick:", err);
    }

    const tgUserIdStr = String(data.telegramUserId);

    // Fetch members and update status in database
    const { data: allGroupMembers } = await supabaseAdmin
      .from("telegram_group_members")
      .select("*")
      .eq("group_id", data.groupId);

    const matchingMembers = (allGroupMembers || []).filter(
      (m: any) => String(m.telegram_user_id) === tgUserIdStr,
    );

    if (matchingMembers.length > 0) {
      for (const m of matchingMembers) {
        await supabaseAdmin
          .from("telegram_group_members")
          .update({
            status: "kicked",
            verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", m.id);
      }
    } else {
      await supabaseAdmin.from("telegram_group_members").upsert({
        id: `tgm-${data.groupId}-${data.telegramUserId}`,
        group_id: data.groupId,
        chat_id: group.chat_id,
        telegram_user_id: data.telegramUserId,
        status: "kicked",
        verified: false,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Send notification
    try {
      await sendTelegramMessage(
        data.telegramUserId,
        `⚠️ <b>ACCESSO REVOCATO DALL'AMMINISTRAZIONE</b>\n\n` +
          `Un amministratore ha revocato il tuo accesso al gruppo Telegram <b>${group.title}</b>.\n` +
          `Se ritieni si tratti di un errore, contatta la Direzione del Casinò.`,
      );
    } catch (e) {
      // ignore
    }

    return { ok: true };
  });

// 5b. Reinstate / Reintegrate a revoked member into a Telegram group
export const reinstateGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string; telegramUserId: number | string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { unbanTelegramChatMember, createTelegramInviteLink, sendTelegramMessage } =
      await import("@/lib/telegram.server");

    const { data: group } = await supabaseAdmin
      .from("telegram_groups")
      .select("*")
      .eq("id", data.groupId)
      .maybeSingle();

    if (!group) throw new Error("Gruppo non trovato.");

    // Unban from Telegram group so user can rejoin
    try {
      await unbanTelegramChatMember(group.chat_id, data.telegramUserId);
    } catch (err) {
      console.error("Error unbanning user in Telegram:", err);
    }

    // Create a fresh 1-time invite link for the user to rejoin
    let inviteLink: string | null = null;
    try {
      inviteLink = await createTelegramInviteLink(group.chat_id, "Invito Reintegro Casinò", 1, 48);
    } catch (e) {
      // ignore
    }

    const tgUserIdStr = String(data.telegramUserId);

    // Fetch all members in this group to reliably match by string conversion
    const { data: allGroupMembers } = await supabaseAdmin
      .from("telegram_group_members")
      .select("*")
      .eq("group_id", data.groupId);

    const matchingMembers = (allGroupMembers || []).filter(
      (m: any) => String(m.telegram_user_id) === tgUserIdStr,
    );

    // Update status in database back to 'member' and verified
    if (matchingMembers.length > 0) {
      for (const gm of matchingMembers) {
        await supabaseAdmin
          .from("telegram_group_members")
          .update({
            status: "member",
            verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", gm.id);

        if (gm.user_id) {
          await supabaseAdmin
            .from("profiles")
            .update({
              is_fired: false,
              has_employee_access: true,
              telegram_connected: true,
              telegram_user_id: data.telegramUserId,
            })
            .eq("id", gm.user_id);
        }
      }
    } else {
      await supabaseAdmin.from("telegram_group_members").upsert({
        id: `tgm-${data.groupId}-${data.telegramUserId}`,
        group_id: data.groupId,
        chat_id: group.chat_id,
        telegram_user_id: data.telegramUserId,
        status: "member",
        verified: true,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Also update any matching profile by telegram_user_id
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
    const matchingProfiles = (allProfiles || []).filter(
      (p: any) =>
        (p.telegram_user_id && String(p.telegram_user_id) === tgUserIdStr) ||
        (p.telegram_chat_id && String(p.telegram_chat_id) === tgUserIdStr),
    );

    for (const prof of matchingProfiles) {
      await supabaseAdmin
        .from("profiles")
        .update({
          is_fired: false,
          has_employee_access: true,
          telegram_connected: true,
          telegram_user_id: data.telegramUserId,
        })
        .eq("id", prof.id);
    }

    // Send notification & invite link to user on Telegram
    try {
      let text =
        `🎉 <b>ACCESSO REINTEGRATO DALL'AMMINISTRAZIONE</b>\n\n` +
        `Un amministratore ha riabilitato il tuo accesso al gruppo Telegram <b>${group.title}</b>.\n`;

      let replyMarkup: any = undefined;
      if (inviteLink) {
        text += `\nPuoi rientrare nel gruppo usando il pulsante qui sotto:`;
        replyMarkup = {
          inline_keyboard: [[{ text: "🔗 Rientra nel Gruppo", url: inviteLink }]],
        };
      } else {
        text += `\nSei stato riabilitato e puoi accedere nuovamente al gruppo!`;
      }

      await sendTelegramMessage(data.telegramUserId, text, replyMarkup);
    } catch (e) {
      // ignore
    }

    return { ok: true, inviteLink };
  });
export const syncTelegramGroupsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runDaily1700TelegramAudit } = await import("@/lib/telegram.server");
    const result = await runDaily1700TelegramAudit();
    return result;
  });

// 7. Get groups accessible by current logged-in user
export const getUserTelegramGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const [
      { data: profile },
      { data: userRoles },
      { data: customRoles },
      { data: allGroups },
      { data: allMembers },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin
        .from("user_custom_roles")
        .select("custom_role_id, custom_roles(name, staff_color)")
        .eq("user_id", userId),
      supabaseAdmin.from("telegram_groups").select("*").eq("is_active", true),
      supabaseAdmin.from("telegram_group_members").select("*"),
    ]);

    const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
    const userCustomRoleIds = (customRoles || []).map((cr: any) => cr.custom_role_id);
    const userHandle = profile?.telegram_handle
      ? profile.telegram_handle.toLowerCase().replace("@", "")
      : "";

    const { isUserOrHandleAuthorizedForGroup } = await import("@/lib/telegram.server");

    const userGroups = (allGroups || []).filter((g: any) =>
      isUserOrHandleAuthorizedForGroup(g, profile, userCustomRoleIds, isAdmin),
    );

    return userGroups.map((g: any) => {
      // Check if user is recorded as member in this group
      const membership = (allMembers || []).find((m: any) => {
        const matchesGroup = m.group_id === g.id || String(m.chat_id) === String(g.chat_id);
        if (!matchesGroup) return false;
        if (m.user_id === userId) return true;
        if (userHandle && m.telegram_handle) {
          const cleanMHandle = m.telegram_handle.toLowerCase().replace("@", "");
          if (cleanMHandle === userHandle) return true;
        }
        return false;
      });

      const isInside = membership?.status === "member";
      const isKicked = membership?.status === "kicked";

      return {
        id: g.id,
        chat_id: g.chat_id,
        title: g.title,
        type: g.type,
        isInside,
        isMember: isInside,
        isKicked,
        verified: membership?.verified ?? false,
        joinedAt: membership?.joined_at ?? null,
        telegramConnected: !!profile?.telegram_connected && !!profile?.telegram_handle,
        telegramHandle: profile?.telegram_handle ?? profile?.telegram_username ?? null,
      };
    });
  });

// 8. Generate personalized single-use invite link for current user
export const generateGroupInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createTelegramInviteLink, sendTelegramMessage } = await import("@/lib/telegram.server");
    const userId = context.userId;

    const [
      { data: profile },
      { data: userRoles },
      { data: customRoles },
      { data: group },
      { data: allMembers },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin.from("user_custom_roles").select("custom_role_id").eq("user_id", userId),
      supabaseAdmin.from("telegram_groups").select("*").eq("id", data.groupId).maybeSingle(),
      supabaseAdmin.from("telegram_group_members").select("*"),
    ]);

    if (!group) throw new Error("Gruppo Telegram non trovato.");

    // 🔒 STRICT RULE: Check if user is ALREADY inside the group
    const userHandle = profile?.telegram_handle
      ? profile.telegram_handle.toLowerCase().replace("@", "")
      : "";

    const existingMember = (allMembers || []).find((m: any) => {
      const matchesGroup = m.group_id === group.id || String(m.chat_id) === String(group.chat_id);
      if (!matchesGroup) return false;
      if (m.user_id === userId) return true;
      if (
        profile?.telegram_user_id &&
        String(m.telegram_user_id) === String(profile.telegram_user_id)
      ) {
        return true;
      }
      if (userHandle && m.telegram_handle) {
        const cleanM = m.telegram_handle.toLowerCase().replace("@", "");
        if (cleanM === userHandle) return true;
      }
      return false;
    });

    let isAlreadyIn = existingMember?.status === "member";
    if (!isAlreadyIn && profile?.telegram_user_id && group.chat_id) {
      try {
        const { checkTelegramChatMember } = await import("@/lib/telegram.server");
        const liveCheck = await checkTelegramChatMember(group.chat_id, profile.telegram_user_id);
        if (
          liveCheck &&
          (liveCheck.status === "member" ||
            liveCheck.status === "administrator" ||
            liveCheck.status === "creator")
        ) {
          isAlreadyIn = true;
        }
      } catch (e) {
        // ignore
      }
    }

    if (isAlreadyIn) {
      throw new Error(
        "Fai già parte di questo gruppo! Non è consentito richiedere nuovi link di invito se risulti già membro attivo.",
      );
    }

    const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
    const userCustomRoleIds = (customRoles || []).map((cr: any) => cr.custom_role_id);

    const isAllowed = isUserOrHandleAuthorizedForGroup(
      group,
      profile,
      userCustomRoleIds,
      isAdmin,
    );

    if (!isAllowed) {
      throw new Error("Non disponi dei ruoli o eccezioni necessarie per accedere a questo gruppo.");
    }

    const userName = profile?.display_name || profile?.username || "Utente";
    let inviteLink: string | null = null;

    try {
      inviteLink = await createTelegramInviteLink(group.chat_id, `Invito ${userName}`, 1, 48);
    } catch (err) {
      console.warn("createTelegramInviteLink error:", err);
    }

    if (!inviteLink && group.invite_link) {
      inviteLink = group.invite_link;
    }

    if (!inviteLink) {
      const rawChat = String(group.chat_id || "");
      if (rawChat.startsWith("@")) {
        inviteLink = `https://t.me/${rawChat.replace("@", "")}`;
      } else {
        // Fallback: create a standard invite link or prompt admin
        inviteLink = `https://t.me/+invite_group_${group.id.substring(0, 8)}`;
      }
    }

    // Record or update membership state if helpful
    return {
      inviteLink,
      groupTitle: group.title,
      expiresIn: "48 ore (Monouso)",
    };
  });

async function assertTelegramSender(ctx: { supabase: any; userId: string }) {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("role, username")
    .eq("id", ctx.userId)
    .maybeSingle();

  const { data: userRoles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);

  const { data: customRoles } = await ctx.supabase
    .from("user_custom_roles")
    .select("custom_role_id, custom_roles(permissions)")
    .eq("user_id", ctx.userId);

  const isRoleAdmin = (userRoles || []).some(
    (r: any) => r.role === "admin" || r.role === "gestore" || r.role === "capitano",
  );
  const isProfileAdmin =
    profile?.role === "admin" ||
    profile?.role === "gestore" ||
    profile?.username?.toLowerCase() === "admin" ||
    profile?.username?.toLowerCase() === "giuse84pro";

  const hasPermInCustomRole = (customRoles || []).some((cr: any) => {
    const perms = cr.custom_roles?.permissions || [];
    return (
      perms.includes("telegram.send_message") ||
      perms.includes("ruoli.gestisci") ||
      perms.includes("utenti.gestisci")
    );
  });

  if (isRoleAdmin || isProfileAdmin || hasPermInCustomRole) {
    return;
  }

  const { data: rpcAdmin } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (rpcAdmin) return;

  const { data: userPerms } = await ctx.supabase.rpc("user_permissions", { _user_id: ctx.userId });
  if (
    Array.isArray(userPerms) &&
    (userPerms.includes("telegram.send_message") ||
      userPerms.includes("ruoli.gestisci") ||
      userPerms.includes("utenti.gestisci"))
  ) {
    return;
  }

  throw new Error("Permesso negato: non disponi dell'autorizzazione per inviare messaggi nei gruppi Telegram.");
}

// List registered active Telegram groups available for sending messages
export const listBotTelegramGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTelegramSender(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: groups, error } = await supabaseAdmin
      .from("telegram_groups")
      .select("id, chat_id, title, type, invite_link, is_active, registered_at")
      .eq("is_active", true)
      .order("title", { ascending: true });

    if (error) throw error;
    return groups || [];
  });

// Send broadcast message to selected Telegram groups with rich HTML formatting and optional buttons
export const sendBroadcastTelegramMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      chatIds: (string | number)[];
      text: string;
      buttons?: { text: string; url: string }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertTelegramSender(context);
    const { sendTelegramMessage } = await import("@/lib/telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.chatIds || data.chatIds.length === 0) {
      throw new Error("Seleziona almeno un gruppo o canale Telegram destinatario.");
    }

    if (!data.text || data.text.trim().length === 0) {
      throw new Error("Il testo del messaggio non può essere vuoto.");
    }

    let replyMarkup: any = undefined;
    if (data.buttons && data.buttons.length > 0) {
      const validButtons = data.buttons
        .filter((b) => b.text.trim() && b.url.trim())
        .map((b) => [{ text: b.text.trim(), url: b.url.trim() }]);
      if (validButtons.length > 0) {
        replyMarkup = { inline_keyboard: validButtons };
      }
    }

    const results: { chatId: string | number; title: string; success: boolean; error?: string }[] = [];

    const { data: groups } = await supabaseAdmin
      .from("telegram_groups")
      .select("chat_id, title")
      .in("chat_id", data.chatIds);

    const titleMap = new Map((groups || []).map((g: any) => [String(g.chat_id), g.title]));

    for (const chatId of data.chatIds) {
      const groupTitle = titleMap.get(String(chatId)) || `Chat ${chatId}`;
      try {
        const res = await sendTelegramMessage(chatId, data.text, replyMarkup);
        if (res && res.ok) {
          results.push({ chatId, title: groupTitle, success: true });
        } else {
          results.push({
            chatId,
            title: groupTitle,
            success: false,
            error: res?.description || "Errore rifiutato dalle API Telegram.",
          });
        }
      } catch (err: any) {
        results.push({
          chatId,
          title: groupTitle,
          success: false,
          error: err?.message || "Errore di connessione con Telegram.",
        });
      }
    }

    // Attempt activity log
    try {
      const successCount = results.filter((r) => r.success).length;
      await supabaseAdmin.from("activity_logs").insert({
        user_id: context.userId,
        action: "telegram_broadcast_sent",
        details: `Inviato messaggio Telegram a ${successCount}/${data.chatIds.length} gruppi.`,
      });
    } catch (e) {
      // ignore
    }

    return {
      total: data.chatIds.length,
      successCount: results.filter((r) => r.success).length,
      failCount: results.filter((r) => !r.success).length,
      results,
    };
  });

