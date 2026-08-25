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
        ignore_checks: !!g.ignore_checks || !!g.disable_checks,
        disable_checks: !!g.ignore_checks || !!g.disable_checks,
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

// 2. Update allowed roles, manual exceptions, and disable_checks status for a Telegram group
export const updateTelegramGroupRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      groupId: string;
      allowedRoleIds: string[];
      allowedExceptions?: string[];
      ignoreChecks?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runDaily1700TelegramAudit } = await import("@/lib/telegram.server");

    const cleanExceptions = (data.allowedExceptions || [])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updatePayload: any = {
      allowed_role_ids: data.allowedRoleIds,
      allowed_exceptions: cleanExceptions,
      allowed_handles: cleanExceptions,
      updated_at: new Date().toISOString(),
    };

    if (data.ignoreChecks !== undefined) {
      updatePayload.ignore_checks = !!data.ignoreChecks;
      updatePayload.disable_checks = !!data.ignoreChecks;
    }

    const { error } = await supabaseAdmin
      .from("telegram_groups")
      .update(updatePayload)
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

// 2b. Quick toggle checks and automated expulsions for a group
export const toggleTelegramGroupChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string; ignoreChecks: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("telegram_groups")
      .update({
        ignore_checks: !!data.ignoreChecks,
        disable_checks: !!data.ignoreChecks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.groupId);

    if (error) throw new Error(error.message);

    return { ok: true, ignoreChecks: data.ignoreChecks };
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

// 5b. Reinstate / Reintegrate a revoked or kicked member into a Telegram group
export const reinstateGroupMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { groupId?: string; chatId?: string | number; telegramUserId: number | string }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { unbanTelegramChatMember, createTelegramInviteLink, sendTelegramMessage } =
      await import("@/lib/telegram.server");

    const { data: allGroups } = await supabaseAdmin.from("telegram_groups").select("*");
    const targetGroupId = data.groupId;
    const targetChatId = data.chatId ? String(data.chatId) : null;

    const group = (allGroups || []).find(
      (g: any) =>
        (targetGroupId && g.id === targetGroupId) ||
        (targetChatId && String(g.chat_id) === targetChatId) ||
        (targetGroupId && String(g.chat_id) === String(targetGroupId)),
    );

    if (!group) throw new Error("Gruppo Telegram non trovato.");

    const effectiveGroupId = group.id;

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
      .eq("group_id", effectiveGroupId);

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
        id: `tgm-${effectiveGroupId}-${data.telegramUserId}`,
        group_id: effectiveGroupId,
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

    const isAllowed = isUserOrHandleAuthorizedForGroup(group, profile, userCustomRoleIds, isAdmin);

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

  throw new Error(
    "Permesso negato: non disponi dell'autorizzazione per inviare messaggi nei gruppi Telegram.",
  );
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

    const results: { chatId: string | number; title: string; success: boolean; error?: string }[] =
      [];

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

// 12. List all Telegram chats (Groups, Channels, and Private Direct Messages with Citizens/Staff)
export const listAllTelegramChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStoredChatMessages, isChatPinnedInStore, storeChatMessage, fetchTelegramUpdates } =
      await import("@/lib/telegram.server");

    // Fetch latest updates/messages from Telegram in background/sync
    await fetchTelegramUpdates().catch(() => {});

    const [{ data: groups }, { data: profiles }, { data: customRoles }, { data: userRoles }] =
      await Promise.all([
        supabaseAdmin
          .from("telegram_groups")
          .select("*")
          .order("registered_at", { ascending: false }),
        supabaseAdmin
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, telegram_handle, telegram_user_id, telegram_chat_id, telegram_connected, role, is_fired",
          ),
        supabaseAdmin.from("custom_roles").select("id, name, staff_color"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);

    const rolesMap = new Map((customRoles || []).map((r: any) => [r.id, r]));
    const chats: any[] = [];

    // 1. Add Registered Telegram Groups & Channels
    for (const g of groups || []) {
      const storedMsgs = getStoredChatMessages(g.chat_id);

      // If store is empty for this group, seed an initial message
      if (storedMsgs.length === 0) {
        storeChatMessage({
          id: `seed-${g.chat_id}-1`,
          chat_id: g.chat_id,
          message_id: 101,
          sender_type: "bot",
          sender_name: "Casinò Revenge Bot",
          text: `👋 <b>Canale Ufficiale ${g.title}</b> collegato e operativo con il Casinò Revenge a Liberty Bay.`,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          date: Math.floor((Date.now() - 3600000 * 4) / 1000),
          is_pinned: true,
          reactions: [{ emoji: "👑", count: 3, users: [{ id: "1", name: "Capitano" }] }],
        });
      }

      const latestMsgs = getStoredChatMessages(g.chat_id);
      const lastMsg = latestMsgs.length > 0 ? latestMsgs[latestMsgs.length - 1] : null;
      const pinnedCount = latestMsgs.filter((m) => m.is_pinned).length;

      chats.push({
        id: `group-${g.id}`,
        chat_id: g.chat_id,
        title: g.title || `Gruppo Staff (${g.chat_id})`,
        type: g.type === "channel" ? "channel" : "group",
        category: "groups",
        avatar_url: null,
        handle: null,
        subtitle: `Gruppo Ufficiale • ${g.allowed_role_ids?.length || 1} ruoli abilitati`,
        last_message: lastMsg ? lastMsg.text.replace(/<[^>]*>?/gm, "") : "Nessun messaggio recente",
        last_message_date: lastMsg
          ? lastMsg.created_at
          : g.registered_at || new Date().toISOString(),
        unread_count: 0,
        is_pinned: isChatPinnedInStore(g.chat_id),
        pinned_message_count: pinnedCount,
        online_count: Math.floor(Math.random() * 4) + 2,
        is_active: g.is_active,
      });
    }

    // 2. Add Direct Private Chats with Citizens and Staff with Telegram
    for (const p of profiles || []) {
      if (
        !p.telegram_connected &&
        !p.telegram_user_id &&
        !p.telegram_chat_id &&
        !p.telegram_handle
      ) {
        continue;
      }
      const chatId =
        p.telegram_chat_id || p.telegram_user_id || p.telegram_handle?.replace("@", "") || p.id;
      const storedMsgs = getStoredChatMessages(chatId);

      // If store is empty for this private chat, seed an initial greeting
      if (storedMsgs.length === 0) {
        storeChatMessage({
          id: `seed-dm-${chatId}-1`,
          chat_id: chatId,
          message_id: 201,
          sender_type: "user",
          sender_name: p.display_name || p.username || "Cittadino",
          sender_username: p.telegram_handle?.replace("@", "") || p.username,
          sender_avatar: p.avatar_url,
          text: `Salve staff del Casinò Revenge! Ho completato la verifica del mio profilo su Telegram.`,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          date: Math.floor((Date.now() - 3600000 * 2) / 1000),
          reactions: [{ emoji: "👍", count: 1, users: [{ id: "staff", name: "Staff" }] }],
        });
      }

      const latestMsgs = getStoredChatMessages(chatId);
      const lastMsg = latestMsgs.length > 0 ? latestMsgs[latestMsgs.length - 1] : null;
      const pinnedCount = latestMsgs.filter((m) => m.is_pinned).length;

      const cleanHandle = p.telegram_handle
        ? p.telegram_handle.startsWith("@")
          ? p.telegram_handle
          : `@${p.telegram_handle}`
        : null;

      chats.push({
        id: `private-${p.id}`,
        chat_id: chatId,
        title: p.display_name || p.username || "Cittadino Liberty Bay",
        type: "private",
        category: "private",
        avatar_url: p.avatar_url || `https://mc-heads.net/avatar/${p.username || "Steve"}/64`,
        handle: cleanHandle,
        username: p.username,
        subtitle: cleanHandle
          ? `${cleanHandle} • ID: ${p.telegram_user_id || chatId}`
          : `ID: ${p.telegram_user_id || chatId}`,
        last_message: lastMsg ? lastMsg.text.replace(/<[^>]*>?/gm, "") : "Nessun messaggio recente",
        last_message_date: lastMsg ? lastMsg.created_at : new Date().toISOString(),
        unread_count: 0,
        is_pinned: isChatPinnedInStore(chatId),
        pinned_message_count: pinnedCount,
        online_count: 1,
        profile_id: p.id,
      });
    }

    // Sort: pinned first, then by last message date descending
    chats.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime();
    });

    return { chats };
  });

// 13. Get Message History for a specific chat (with quotes/replies, reactions, pinned state and configurable limit)
export const getTelegramChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { getStoredChatMessagesAsync, fetchTelegramUpdates } =
      await import("@/lib/telegram.server");

    // Fetch live userbot/bot updates before returning messages
    await fetchTelegramUpdates().catch(() => {});

    const allMessages = await getStoredChatMessagesAsync(data.chatId);
    const limit = data.limit && data.limit > 0 ? Number(data.limit) : 50;
    const messages = allMessages.slice(-limit);

    return {
      messages,
      totalInStore: allMessages.length,
      limit,
    };
  });

// 14. Send Message in a Chat (supports Reply-to, Pinned on send, Silent, Inline URL buttons)
export const sendTelegramChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      chatId: string | number;
      text: string;
      replyToMessageId?: number;
      isPinned?: boolean;
      silent?: boolean;
      buttons?: { text: string; url: string }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTelegramMessage, pinTelegramChatMessage, storeChatMessage, getStoredChatMessages } =
      await import("@/lib/telegram.server");

    if (!data.text || data.text.trim().length === 0) {
      throw new Error("Il testo del messaggio non può essere vuoto.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const senderName = profile?.display_name || profile?.username || "Staff Casinò Revenge";

    let replyMarkup: any = undefined;
    if (data.buttons && data.buttons.length > 0) {
      const validButtons = data.buttons
        .filter((b) => b.text.trim() && b.url.trim())
        .map((b) => [{ text: b.text.trim(), url: b.url.trim() }]);
      if (validButtons.length > 0) {
        replyMarkup = { inline_keyboard: validButtons };
      }
    }

    // Try sending directly to Telegram Bot API
    let sentTgResult: any = null;
    try {
      sentTgResult = await sendTelegramMessage(data.chatId, data.text, replyMarkup, {
        replyToMessageId: data.replyToMessageId,
        disableNotification: data.silent,
      });
    } catch (e) {
      console.error("Error sending Telegram message via API:", e);
    }

    const newMsgId = sentTgResult?.result?.message_id || Date.now();

    // If pinned option was checked, call Telegram pin API
    if (data.isPinned) {
      try {
        await pinTelegramChatMessage(data.chatId, newMsgId, data.silent);
      } catch (e) {
        console.error("Error auto-pinning message:", e);
      }
    }

    // Find original replied message if exists
    let replyInfo: any = undefined;
    if (data.replyToMessageId) {
      const currentList = getStoredChatMessages(data.chatId);
      const original = currentList.find((m) => m.message_id === data.replyToMessageId);
      if (original) {
        replyInfo = {
          id: original.id,
          message_id: original.message_id,
          sender_name: original.sender_name,
          text: original.text,
        };
      }
    }

    const storedMsg = storeChatMessage({
      id: `staff-${data.chatId}-${newMsgId}`,
      chat_id: data.chatId,
      message_id: newMsgId,
      sender_type: "staff",
      sender_name: senderName,
      sender_username: profile?.username,
      sender_avatar: profile?.avatar_url,
      sender_role: "Amministratore",
      sender_id: context.userId,
      text: data.text,
      created_at: new Date().toISOString(),
      date: Math.floor(Date.now() / 1000),
      is_pinned: !!data.isPinned,
      pinned_at: data.isPinned ? new Date().toISOString() : undefined,
      reply_to_message_id: data.replyToMessageId,
      reply_to_message: replyInfo,
      inline_buttons: data.buttons?.filter((b) => b.text && b.url),
      delivery_status: sentTgResult?.ok ? "delivered" : "sent",
    });

    return { success: true, message: storedMsg };
  });

// 15. Toggle Pin Telegram Message
export const togglePinTelegramMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number; messageId: number; isPinned: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { pinTelegramChatMessage, unpinTelegramChatMessage, toggleChatMessagePinInStore } =
      await import("@/lib/telegram.server");

    if (data.isPinned) {
      await pinTelegramChatMessage(data.chatId, data.messageId, false);
    } else {
      await unpinTelegramChatMessage(data.chatId, data.messageId);
    }

    const updated = toggleChatMessagePinInStore(data.chatId, data.messageId, data.isPinned);
    return { success: true, isPinned: data.isPinned, message: updated };
  });

// 16. Toggle Telegram Message Reaction
export const toggleTelegramMessageReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number; messageId: number; emoji: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setTelegramMessageReaction, toggleChatMessageReactionInStore } =
      await import("@/lib/telegram.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("id", context.userId)
      .maybeSingle();

    const userName = profile?.display_name || profile?.username || "Staff";

    try {
      await setTelegramMessageReaction(data.chatId, data.messageId, [data.emoji]);
    } catch (e) {
      console.error("Error setting Telegram reaction:", e);
    }

    const updated = toggleChatMessageReactionInStore(data.chatId, data.messageId, data.emoji, {
      id: context.userId,
      name: userName,
      username: profile?.username,
    });

    return { success: true, message: updated };
  });

// 17. Toggle Pin Chat in Sidebar
export const togglePinChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { togglePinnedChatInStore } = await import("@/lib/telegram.server");
    const isPinned = togglePinnedChatInStore(data.chatId);
    return { success: true, isPinned };
  });

// 18. Delete Telegram Chat Message
export const deleteTelegramChatMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number; messageId: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { deleteTelegramChatMessage } = await import("@/lib/telegram.server");
    const ok = await deleteTelegramChatMessage(data.chatId, data.messageId);
    return { success: ok, messageId: data.messageId };
  });

// 19. Get Live Group Members List (Admins, Bot & Userbot Synced Members)
export const getTelegramGroupMembersListFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      getTelegramChatAdministrators,
      getStoredChatMessages,
      getTelegramChat,
      getTelegramChatMemberCount,
      fetchTelegramUpdates,
    } = await import("@/lib/telegram.server");

    // Fetch latest userbot & bot member updates
    await fetchTelegramUpdates().catch(() => {});

    const chatId = data.chatId;
    const rawChatIdStr = String(chatId).trim();

    // 1. Fetch data safely in parallel with catch handlers
    const [
      adminsResult,
      tgChatInfoResult,
      memberCountResult,
      dbGroupsResult,
      dbMembersResult,
      allProfilesResult,
      customRolesResult,
    ] = await Promise.all([
      getTelegramChatAdministrators(chatId).catch((err) => {
        console.warn("Could not get Telegram admins via API:", err);
        return [];
      }),
      getTelegramChat(chatId).catch(() => null),
      getTelegramChatMemberCount(chatId).catch(() => null),
      supabaseAdmin
        .from("telegram_groups")
        .select("*")
        .catch(() => ({ data: [] })),
      supabaseAdmin
        .from("telegram_group_members")
        .select("*")
        .catch(() => ({ data: [] })),
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, telegram_handle, telegram_user_id, telegram_chat_id, telegram_connected, role",
        )
        .catch(() => ({ data: [] })),
      supabaseAdmin
        .from("custom_roles")
        .select("id, name, staff_color")
        .catch(() => ({ data: [] })),
    ]);

    const admins = Array.isArray(adminsResult) ? adminsResult : [];
    const allGroups = (dbGroupsResult as any)?.data || [];
    const dbMembers = (dbMembersResult as any)?.data || [];
    const allProfiles = (allProfilesResult as any)?.data || [];
    const customRoles = (customRolesResult as any)?.data || [];

    // Find the corresponding group in telegram_groups table
    const matchedGroup = (allGroups || []).find(
      (g: any) =>
        String(g.chat_id) === rawChatIdStr ||
        String(g.id) === rawChatIdStr ||
        `tgroup-${Math.abs(Number(g.chat_id))}` === rawChatIdStr,
    );

    const customRolesMap = new Map((customRoles || []).map((r: any) => [r.id, r]));
    const profileTgIdMap = new Map<string, any>();
    const profileHandleMap = new Map<string, any>();
    const profileIdMap = new Map<string, any>();

    for (const p of allProfiles || []) {
      profileIdMap.set(p.id, p);
      if (p.telegram_user_id) {
        profileTgIdMap.set(String(p.telegram_user_id), p);
      }
      if (p.telegram_handle) {
        const clean = p.telegram_handle.toLowerCase().replace("@", "").trim();
        profileHandleMap.set(clean, p);
      }
    }

    // Collect distinct member objects
    const membersMap = new Map<string, any>();

    // 1. Add Telegram Chat Administrators from Telegram Bot API
    for (const adm of admins || []) {
      const u = adm.user;
      if (!u || !u.id) continue;
      const uId = String(u.id);

      const handle = u.username ? `@${u.username}` : "";
      const cleanH = u.username ? u.username.toLowerCase().trim() : "";
      const matchedProfile =
        profileTgIdMap.get(uId) || (cleanH ? profileHandleMap.get(cleanH) : null);

      membersMap.set(uId, {
        telegram_user_id: u.id,
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        username: u.username || "",
        handle:
          handle ||
          (matchedProfile?.telegram_handle
            ? `@${matchedProfile.telegram_handle.replace("@", "")}`
            : ""),
        display_name:
          matchedProfile?.display_name ||
          matchedProfile?.username ||
          [u.first_name, u.last_name].filter(Boolean).join(" ") ||
          u.username ||
          `Utente ${u.id}`,
        avatar_url:
          matchedProfile?.avatar_url ||
          (matchedProfile?.username
            ? `https://mc-heads.net/avatar/${matchedProfile.username}/64`
            : null),
        minecraft_username: matchedProfile?.username || null,
        status: adm.status, // "creator" | "administrator"
        custom_title:
          adm.custom_title || (adm.status === "creator" ? "Fondatore 👑" : "Amministratore 🛡️"),
        is_bot: !!u.is_bot,
        can_be_edited: adm.can_be_edited ?? false,
        can_delete_messages: adm.can_delete_messages ?? true,
        can_restrict_members: adm.can_restrict_members ?? true,
        can_promote_members: adm.can_promote_members ?? false,
        can_change_info: adm.can_change_info ?? false,
        can_invite_users: adm.can_invite_users ?? true,
        can_pin_messages: adm.can_pin_messages ?? true,
        profile_role: matchedProfile?.role || null,
      });
    }

    // 2. Add members stored in DB telegram_group_members
    const targetGroupMembers = (dbMembers || []).filter(
      (m: any) =>
        (matchedGroup && m.group_id === matchedGroup.id) ||
        String(m.chat_id) === rawChatIdStr ||
        String(m.group_id) === rawChatIdStr,
    );

    for (const dbm of targetGroupMembers) {
      const uId = String(dbm.telegram_user_id || dbm.user_id || dbm.id);
      if (!uId) continue;

      const cleanH = dbm.telegram_handle
        ? dbm.telegram_handle.toLowerCase().replace("@", "").trim()
        : "";
      const matchedProfile =
        profileTgIdMap.get(uId) ||
        (cleanH ? profileHandleMap.get(cleanH) : null) ||
        (dbm.user_id ? profileIdMap.get(dbm.user_id) : null);

      if (!membersMap.has(uId)) {
        const isKicked = dbm.status === "kicked";
        membersMap.set(uId, {
          telegram_user_id: dbm.telegram_user_id || uId,
          first_name: dbm.first_name || "",
          last_name: dbm.last_name || "",
          username: dbm.username || matchedProfile?.telegram_handle?.replace("@", "") || "",
          handle:
            dbm.telegram_handle ||
            (matchedProfile?.telegram_handle
              ? `@${matchedProfile.telegram_handle.replace("@", "")}`
              : cleanH
                ? `@${cleanH}`
                : ""),
          display_name:
            matchedProfile?.display_name ||
            matchedProfile?.username ||
            dbm.first_name ||
            cleanH ||
            `Utente ${uId}`,
          avatar_url:
            matchedProfile?.avatar_url ||
            (matchedProfile?.username
              ? `https://mc-heads.net/avatar/${matchedProfile.username}/64`
              : null),
          minecraft_username: matchedProfile?.username || null,
          status: dbm.status || "member", // "member" | "kicked" | "left"
          custom_title: isKicked ? "Espulso ⛔" : "Membro 👤",
          is_bot: false,
          can_be_edited: true,
          profile_role: matchedProfile?.role || null,
        });
      }
    }

    // 3. If this is a Staff Group with allowed_role_ids, include authorized staff members who have Telegram connected
    if (matchedGroup && matchedGroup.allowed_role_ids && matchedGroup.allowed_role_ids.length > 0) {
      const allowedRolesSet = new Set(matchedGroup.allowed_role_ids);
      for (const p of allProfiles || []) {
        if (!p.telegram_connected && !p.telegram_user_id && !p.telegram_handle) continue;
        const roleId = p.role || "member";
        const isAllowed =
          allowedRolesSet.has(roleId) ||
          allowedRolesSet.has("all") ||
          (allowedRolesSet.has("crole-admin") && p.role === "admin");

        if (isAllowed) {
          const uId = String(p.telegram_user_id || p.id);
          if (!membersMap.has(uId)) {
            const roleObj = customRolesMap.get(p.role);
            const roleName = roleObj?.name || (p.role === "admin" ? "Amministratore" : "Staff");
            const cleanH = p.telegram_handle ? p.telegram_handle.replace("@", "") : "";

            membersMap.set(uId, {
              telegram_user_id: p.telegram_user_id || p.id,
              first_name: p.display_name || p.username,
              last_name: "",
              username: cleanH || p.username,
              handle: cleanH ? `@${cleanH}` : "",
              display_name: p.display_name || p.username || `Staff ${p.id}`,
              avatar_url:
                p.avatar_url ||
                (p.username ? `https://mc-heads.net/avatar/${p.username}/64` : null),
              minecraft_username: p.username || null,
              status: "member",
              custom_title: roleName,
              is_bot: false,
              can_be_edited: true,
              profile_role: p.role,
            });
          }
        }
      }
    }

    // 4. Add members who have posted recent messages in this chat
    const storedMessages = getStoredChatMessages(chatId);
    for (const msg of storedMessages) {
      if (!msg.sender_id && !msg.sender_username) continue;
      const uId = String(msg.sender_id || msg.sender_username);
      if (!membersMap.has(uId) && msg.sender_type !== "bot") {
        const cleanH = msg.sender_username
          ? msg.sender_username.toLowerCase().replace("@", "").trim()
          : "";
        const matchedProfile =
          profileTgIdMap.get(uId) || (cleanH ? profileHandleMap.get(cleanH) : null);

        membersMap.set(uId, {
          telegram_user_id: msg.sender_id || uId,
          first_name: msg.sender_name || "",
          last_name: "",
          username: msg.sender_username || "",
          handle: msg.sender_username ? `@${msg.sender_username.replace("@", "")}` : "",
          display_name:
            matchedProfile?.display_name ||
            matchedProfile?.username ||
            msg.sender_name ||
            `Utente ${uId}`,
          avatar_url:
            matchedProfile?.avatar_url ||
            msg.sender_avatar ||
            (matchedProfile?.username
              ? `https://mc-heads.net/avatar/${matchedProfile.username}/64`
              : null),
          minecraft_username: matchedProfile?.username || null,
          status: "member",
          custom_title: msg.sender_role || "Membro 👤",
          is_bot: false,
          can_be_edited: true,
          profile_role: matchedProfile?.role || null,
        });
      }
    }

    // 5. If this is a Private/DM Chat (e.g. citizen DM), add the citizen profile directly
    const privateProfile = (allProfiles || []).find(
      (p: any) =>
        String(p.telegram_chat_id) === rawChatIdStr ||
        String(p.telegram_user_id) === rawChatIdStr ||
        String(p.id) === rawChatIdStr ||
        (p.telegram_handle &&
          p.telegram_handle.toLowerCase().replace("@", "") === rawChatIdStr.toLowerCase()),
    );

    if (privateProfile) {
      const uId = String(privateProfile.telegram_user_id || privateProfile.id);
      if (!membersMap.has(uId)) {
        const cleanH = privateProfile.telegram_handle
          ? privateProfile.telegram_handle.replace("@", "")
          : "";
        membersMap.set(uId, {
          telegram_user_id: privateProfile.telegram_user_id || privateProfile.id,
          first_name: privateProfile.display_name || privateProfile.username,
          last_name: "",
          username: cleanH || privateProfile.username,
          handle: cleanH ? `@${cleanH}` : "",
          display_name: privateProfile.display_name || privateProfile.username || "Cittadino",
          avatar_url:
            privateProfile.avatar_url ||
            (privateProfile.username
              ? `https://mc-heads.net/avatar/${privateProfile.username}/64`
              : null),
          minecraft_username: privateProfile.username || null,
          status: "member",
          custom_title: "Cittadino Liberty Bay",
          is_bot: false,
          can_be_edited: false,
          profile_role: privateProfile.role || "citizen",
        });
      }
    }

    // Always add the Casinò Revenge Bot as a member/assistant
    if (!membersMap.has("bot-revenge")) {
      membersMap.set("bot-revenge", {
        telegram_user_id: "bot-revenge",
        first_name: "Revenge Bot & Userbot",
        last_name: "",
        username: "CasinoRevengeBot",
        handle: "@CasinoRevengeBot",
        display_name: "Casinò Revenge Bot",
        avatar_url: null,
        minecraft_username: null,
        status: "administrator",
        custom_title: "BOT Ufficiale 🤖",
        is_bot: true,
        can_be_edited: false,
        profile_role: "bot",
      });
    }

    const membersList = Array.from(membersMap.values());

    // Sort: creator first, then administrator, then member, then kicked
    const rankWeight: Record<string, number> = {
      creator: 1,
      administrator: 2,
      member: 3,
      restricted: 4,
      kicked: 5,
      left: 6,
    };

    membersList.sort((a, b) => {
      const rA = rankWeight[a.status] || 99;
      const rB = rankWeight[b.status] || 99;
      if (rA !== rB) return rA - rB;
      return a.display_name.localeCompare(b.display_name);
    });

    return {
      members: membersList,
      memberCount: memberCountResult || membersList.length,
      groupInfo: tgChatInfoResult || matchedGroup || null,
    };
  });

// 20. Kick or Ban Member from Telegram Group
export const kickTelegramMemberFromGroupFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { chatId: string | number; userId: string | number; ban?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { kickTelegramChatMember, unbanTelegramChatMember } =
      await import("@/lib/telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ok = await kickTelegramChatMember(data.chatId, data.userId);

    // Update status in DB
    try {
      await supabaseAdmin
        .from("telegram_group_members")
        .update({ status: "kicked", updated_at: new Date().toISOString() })
        .match({ chat_id: String(data.chatId), telegram_user_id: String(data.userId) });
    } catch (e) {
      // ignore
    }

    return { success: ok, userId: data.userId };
  });

// 21. Promote or Demote Member in Telegram Group
export const promoteTelegramMemberInGroupFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      chatId: string | number;
      userId: string | number;
      isPromote: boolean;
      customTitle?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { promoteTelegramChatMember, demoteTelegramChatMember } =
      await import("@/lib/telegram.server");

    let ok = false;
    if (data.isPromote) {
      ok = await promoteTelegramChatMember(data.chatId, data.userId, {
        canDeleteMessages: true,
        canInviteUsers: true,
        canPinMessages: true,
        canRestrictMembers: true,
        canManageChat: true,
      });
    } else {
      ok = await demoteTelegramChatMember(data.chatId, data.userId);
    }

    return { success: ok, userId: data.userId, isPromote: data.isPromote };
  });

// 22. Get all Telegram Notification Rules
export const getTelegramNotificationRulesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getTelegramNotificationRules } = await import("@/lib/telegram.server");
    const rules = await getTelegramNotificationRules();
    return { rules };
  });

// 23. Save or Update Single Telegram Notification Rule
export const updateTelegramNotificationRuleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      id: string;
      enabled?: boolean;
      chat_id?: string;
      custom_chat_id?: string;
      silent?: boolean;
      min_amount_threshold?: number;
      template_override?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { saveTelegramNotificationRule } = await import("@/lib/telegram.server");
    const updated = await saveTelegramNotificationRule(data);
    return { rule: updated };
  });

// 24. Save All Telegram Notification Rules (Batch Save)
export const saveAllTelegramNotificationRulesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { rules: any[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { saveAllTelegramNotificationRules } = await import("@/lib/telegram.server");
    const updatedRules = await saveAllTelegramNotificationRules(data.rules);
    return { rules: updatedRules, count: updatedRules.length };
  });

// 25. Reset Notification Rules to Factory Defaults
export const resetTelegramNotificationRulesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { resetTelegramNotificationRules } = await import("@/lib/telegram.server");
    const defaults = await resetTelegramNotificationRules();
    return { rules: defaults };
  });

// 26. Test Send Notification Rule
export const testTelegramNotificationRuleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { ruleId: string; targetChatId?: string | number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { testTelegramNotificationRule } = await import("@/lib/telegram.server");
    const res = await testTelegramNotificationRule(data.ruleId, data.targetChatId);
    return res;
  });
