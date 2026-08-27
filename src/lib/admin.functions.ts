import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.-]+$/);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Permesso negato: serve ruolo admin.");
}

export const listPanelUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const ids = list.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }, { data: customs }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, has_employee_access, telegram_handle, telegram_connected, telegram_user_id, show_in_staff_list, staff_weight, staff_color",
        )
        .in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin
        .from("user_custom_roles")
        .select("user_id, custom_role_id, custom_roles(name)")
        .in("user_id", ids),
    ]);
    return list.users.map((u) => {
      const p = profiles?.find((prof) => prof.id === u.id);
      return {
        id: u.id,
        username: p?.username ?? (u.email ?? "").split("@")[0],
        display_name: p?.display_name ?? null,
        has_employee_access: p?.has_employee_access ?? false,
        telegram_handle: p?.telegram_handle ?? null,
        telegram_connected: p?.telegram_connected ?? false,
        telegram_user_id: p?.telegram_user_id ?? null,
        show_in_staff_list: p?.show_in_staff_list ?? true,
        staff_weight: p?.staff_weight ?? 50,
        staff_color: p?.staff_color ?? "#3b82f6",
        created_at: u.created_at,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
        custom_roles: (customs ?? [])
          .filter((c) => c.user_id === u.id)
          .map((c: any) => ({ id: c.custom_role_id, name: c.custom_roles?.name })),
      };
    });
  });

export const createPanelUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    usernameSchema.parse(payload.username);
    z.string().min(6).max(72).parse(payload.password);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${data.username.toLowerCase()}@revenge.local`;
    let handle = (data.telegramHandle || "").trim();
    if (handle && !handle.startsWith("@")) handle = `@${handle}`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username,
        display_name: data.displayName ?? data.username,
        has_employee_access: data.hasEmployeeAccess ?? true,
        telegram_handle: handle,
        show_in_staff_list: data.showInStaffList ?? true,
        staff_weight: data.staffWeight ?? 50,
        staff_color: data.staffColor ?? "#3b82f6",
      },
    });
    if (error) throw new Error(error.message);
    if (created?.user) {
      if (data.isAdmin) {
        await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
      }

      const profilePayload: any = {
        username: data.username,
        display_name: data.displayName ?? data.username,
        has_employee_access: data.hasEmployeeAccess ?? true,
        telegram_handle: handle || null,
        telegram_connected: !!handle,
        show_in_staff_list: data.showInStaffList ?? true,
        staff_weight: data.staffWeight ?? 50,
        staff_color: data.staffColor ?? "#3b82f6",
      };

      if (handle) {
        const cleanH = handle.toLowerCase().replace("@", "").trim();
        const { data: startLogs } = await supabaseAdmin.from("telegram_start_logs").select("*");
        const matched = (startLogs || []).find(
          (l: any) => l.username && l.username.toLowerCase().replace("@", "") === cleanH
        );
        if (matched) {
          profilePayload.telegram_user_id = matched.telegram_user_id;
          profilePayload.telegram_chat_id = matched.chat_id || matched.telegram_user_id;
        }
      }

      await supabaseAdmin
        .from("profiles")
        .update(profilePayload)
        .eq("id", created.user.id);

      try {
        const { triggerRoleChangeExplanationReset } = await import("@/lib/master.functions");
        await triggerRoleChangeExplanationReset(created.user.id);
      } catch (e) {
        // ignore
      }
    }
    return { id: created.user?.id };
  });

export const updatePanelUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.userId);
    usernameSchema.parse(payload.username);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if username is already taken by another user
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", data.username)
      .neq("id", data.userId)
      .maybeSingle();

    if (existing) {
      throw new Error("Questo username è già in uso da un altro utente.");
    }

    const updateFields: any = {
      username: data.username,
      display_name: data.displayName || null,
    };

    if (data.telegramHandle !== undefined) {
      let handle = (data.telegramHandle || "").trim();
      if (handle && !handle.startsWith("@")) handle = `@${handle}`;
      updateFields.telegram_handle = handle || null;
      updateFields.telegram_connected = !!handle; // Setting manual handle bypasses mandatory /associa verification!

      if (handle) {
        const cleanH = handle.toLowerCase().replace("@", "").trim();
        const { data: startLogs } = await supabaseAdmin.from("telegram_start_logs").select("*");
        const matched = (startLogs || []).find(
          (l: any) => l.username && l.username.toLowerCase().replace("@", "") === cleanH
        );
        if (matched) {
          updateFields.telegram_user_id = matched.telegram_user_id;
          updateFields.telegram_chat_id = matched.chat_id || matched.telegram_user_id;
        }
      }
    }
    if (data.hasEmployeeAccess !== undefined)
      updateFields.has_employee_access = !!data.hasEmployeeAccess;
    if (data.showInStaffList !== undefined)
      updateFields.show_in_staff_list = !!data.showInStaffList;
    if (data.staffWeight !== undefined) updateFields.staff_weight = Number(data.staffWeight) || 50;
    if (data.staffColor !== undefined) updateFields.staff_color = data.staffColor;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateFields)
      .eq("id", data.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const forceVerifyTelegramStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.userId);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();

    if (!profile) throw new Error("Utente non trovato.");

    const rawHandle = profile.telegram_handle ? profile.telegram_handle.trim() : "";
    const cleanHandle = rawHandle ? rawHandle.toLowerCase().replace("@", "").trim() : "";
    const tgUserId = profile.telegram_user_id ? String(profile.telegram_user_id) : null;

    if (!cleanHandle && !tgUserId) {
      throw new Error(
        "L'utente non ha un username Telegram (@) o Telegram ID impostato. Inserisci prima l'username Telegram."
      );
    }

    // 1. Check in telegram_start_logs
    const { data: startLogs } = await supabaseAdmin.from("telegram_start_logs").select("*");
    let matchedLog = (startLogs || []).find((l: any) => {
      if (tgUserId && String(l.telegram_user_id) === tgUserId) return true;
      if (cleanHandle && l.username && String(l.username).toLowerCase().replace("@", "") === cleanHandle)
        return true;
      return false;
    });

    // 2. Fallback check in telegram_group_members or telegram_chat_messages
    if (!matchedLog) {
      const [{ data: groupMembers }, { data: chatMessages }] = await Promise.all([
        supabaseAdmin.from("telegram_group_members").select("*"),
        supabaseAdmin.from("telegram_chat_messages").select("*"),
      ]);

      const matchedMember = (groupMembers || []).find((m: any) => {
        if (tgUserId && String(m.telegram_user_id) === tgUserId) return true;
        if (cleanHandle && m.telegram_handle && String(m.telegram_handle).toLowerCase().replace("@", "") === cleanHandle)
          return true;
        return false;
      });

      const matchedMessage = (chatMessages || []).find((msg: any) => {
        if (tgUserId && String(msg.sender_id) === tgUserId) return true;
        if (cleanHandle && msg.sender_username && String(msg.sender_username).toLowerCase().replace("@", "") === cleanHandle)
          return true;
        return false;
      });

      if (matchedMember) {
        matchedLog = {
          telegram_user_id: matchedMember.telegram_user_id,
          chat_id: matchedMember.chat_id,
          username: cleanHandle,
        };
      } else if (matchedMessage) {
        matchedLog = {
          telegram_user_id: matchedMessage.sender_id,
          chat_id: matchedMessage.chat_id,
          username: cleanHandle,
        };
      }
    }

    if (matchedLog) {
      // User HAS executed /start or interacted with bot in past!
      const updatePayload: any = {
        telegram_connected: true,
        telegram_user_id: matchedLog.telegram_user_id || profile.telegram_user_id,
        telegram_chat_id: matchedLog.chat_id || matchedLog.telegram_user_id || profile.telegram_chat_id,
      };

      await supabaseAdmin.from("profiles").update(updatePayload).eq("id", data.userId);

      return {
        hasStarted: true,
        telegramUserId: updatePayload.telegram_user_id,
        message: `✅ VERIFICATO! L'utente ${rawHandle || profile.username} ha già inviato /start al Bot in passato (ID Telegram: ${updatePayload.telegram_user_id}).`,
      };
    } else {
      // User has NOT executed /start yet
      return {
        hasStarted: false,
        message: `⚠️ ATTENZIONE: Nessun comando /start o interazione con il Bot rilevata per ${rawHandle || profile.username}. L'utente deve inviare /start al Bot @CasinoRevengeBot.`,
      };
    }
  });

export const resetPanelUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.userId);
    z.string().min(6).max(72).parse(payload.newPassword);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePanelUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.userId);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Non puoi eliminare te stesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.userId);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncUserTelegramGroupAccess } = await import("@/lib/telegram.server");

    if (data.admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" });
    } else {
      if (data.userId === context.userId)
        throw new Error("Non puoi rimuovere l'admin a te stesso.");
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }

    try {
      syncUserTelegramGroupAccess(data.userId).catch(() => {});
    } catch (e) {
      // ignore
    }

    return { ok: true };
  });

// Bootstrap: crea il primo admin se nessun account esiste ancora. Pubblico (no auth).
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string; displayName?: string }) => {
    usernameSchema.parse(d.username);
    z.string().min(6).max(72).parse(d.password);
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: e1 } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    if (e1) throw new Error(e1.message);
    if (existing.users.length > 0) throw new Error("Un amministratore esiste già.");
    const email = `${data.username.toLowerCase()}@revenge.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username.toLowerCase(),
        display_name: data.displayName ?? data.username,
      },
    });
    if (error) throw new Error(error.message);
    if (created.user) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    return { ok: true };
  });

export const hasAnyUser = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
  if (error) throw new Error(error.message);
  return { hasUser: data.users.length > 0 };
});

export const assignCustomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; customRoleId: string; assign: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncUserTelegramGroupAccess } = await import("@/lib/telegram.server");

    if (data.assign) {
      await supabaseAdmin
        .from("user_custom_roles")
        .upsert({ user_id: data.userId, custom_role_id: data.customRoleId });
    } else {
      await supabaseAdmin
        .from("user_custom_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("custom_role_id", data.customRoleId);
    }

    try {
      const { triggerRoleChangeExplanationReset } = await import("@/lib/master.functions");
      await triggerRoleChangeExplanationReset(data.userId);
    } catch (e) {
      // ignore
    }

    try {
      syncUserTelegramGroupAccess(data.userId).catch(() => {});
    } catch (e) {
      // ignore
    }

    return { ok: true };
  });

export const applySanction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get admin profile for the created_by_name
    const { data: adminProf } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("id", context.userId)
      .maybeSingle();
    const adminName = adminProf?.display_name || adminProf?.username || "Amministratore";

    // Helper to archive all verbal warnings and warns for a user (called when entering Grado 3)
    const clearGrades1And2 = async (targetUserId: string) => {
      const { data: activeSancs } = await supabaseAdmin
        .from("sanctions")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_active", true);

      const itemsToDeactivate = (activeSancs || []).filter(
        (s: any) => s.type === "richiamo_verbale" || s.type === "warn",
      );

      for (const item of itemsToDeactivate) {
        await supabaseAdmin.from("sanctions").update({ is_active: false }).eq("id", item.id);
      }
    };

    const runAutomaticUpgrades = async (targetUserId: string) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: allActive } = await supabaseAdmin
        .from("sanctions")
        .select("*")
        .eq("user_id", targetUserId)
        .eq("is_active", true);

      const activeRichiamiInMonth = (allActive || []).filter(
        (s: any) => s.type === "richiamo_verbale" && new Date(s.created_at) >= thirtyDaysAgo,
      );

      if (activeRichiamiInMonth.length >= 3) {
        // Archive active verbal warnings
        const richiamiToArchive = (allActive || []).filter(
          (s: any) => s.type === "richiamo_verbale",
        );
        for (const r of richiamiToArchive) {
          await supabaseAdmin.from("sanctions").update({ is_active: false }).eq("id", r.id);
        }

        // Add automatic Warn
        const warnData = {
          user_id: targetUserId,
          type: "warn",
          reason: "Conversione automatica: accumulo di 3 richiami verbali nel mese.",
          created_by_id: "system",
          created_by_name: "Sistema",
          is_active: true,
          expires_at: null,
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from("sanctions").insert(warnData);

        // Recursively trigger automatic upgrade checks since a new Warn was added
        await runAutomaticUpgrades(targetUserId);
        return;
      }

      // Check active Warns in the last 30 days
      const activeWarnsInMonth = (allActive || []).filter(
        (s: any) => s.type === "warn" && new Date(s.created_at) >= thirtyDaysAgo,
      );

      if (activeWarnsInMonth.length >= 3) {
        // Archive all active warns and verbal warnings (Grado 3 clears lower grades)
        await clearGrades1And2(targetUserId);

        // Add automatic Sospensione for 3 days
        const defaultSospExpiration = new Date();
        defaultSospExpiration.setDate(defaultSospExpiration.getDate() + 3);

        const sospData = {
          user_id: targetUserId,
          type: "sospensione",
          reason: "Sospensione automatica: accumulo di 3 warn nel mese.",
          created_by_id: "system",
          created_by_name: "Sistema",
          is_active: true,
          expires_at: defaultSospExpiration.toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from("sanctions").insert(sospData);
      }
    };

    // Main logic for the applied sanction
    const newSanction = {
      user_id: data.userId,
      type: data.type,
      reason: data.reason,
      created_by_id: context.userId,
      created_by_name: adminName,
      is_active: true,
      expires_at: data.expiresAt,
      created_at: new Date().toISOString(),
    };

    // If it's a Grado 3 sanction, clear lower grades first
    if (data.type === "sospensione" || data.type === "espulsione") {
      await clearGrades1And2(data.userId);
    }

    // Insert the sanction
    const { data: inserted, error } = await supabaseAdmin.from("sanctions").insert(newSanction);

    if (error) throw new Error(error.message);

    // If Grado 1 or Grado 2, check for automatic upgrades
    if (data.type === "richiamo_verbale" || data.type === "warn") {
      await runAutomaticUpgrades(data.userId);
    }

    // If it's an espulsione, strip roles
    if (data.type === "espulsione") {
      await supabaseAdmin.from("user_custom_roles").delete().eq("user_id", data.userId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    }

    return { ok: true, data: inserted };
  });

export const updateSanction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updateFields: any = {};
    if (data.reason !== undefined) updateFields.reason = data.reason;
    if (data.expiresAt !== undefined) updateFields.expires_at = data.expiresAt;

    if (data.isActive !== undefined) {
      updateFields.is_active = data.isActive;
      if (data.isActive === false) {
        // Fetch the deactivating admin's profile
        const { data: adminProf } = await supabaseAdmin
          .from("profiles")
          .select("display_name, username")
          .eq("id", context.userId)
          .maybeSingle();
        const adminName = adminProf?.display_name || adminProf?.username || "Amministratore";

        updateFields.removed_by_id = context.userId;
        updateFields.removed_by_name = adminName;
        updateFields.removed_at = new Date().toISOString();
      } else {
        // Reactivating, clear removal tracking fields
        updateFields.removed_by_id = null;
        updateFields.removed_by_name = null;
        updateFields.removed_at = null;
      }
    }

    const { error } = await supabaseAdmin
      .from("sanctions")
      .update(updateFields)
      .eq("id", data.sanctionId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSanctionCompletely = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    z.string().min(1).parse(payload.sanctionId);
    return payload;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("sanctions").delete().eq("id", data.sanctionId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("maintenance_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  return {
    id: "global",
    is_maintenance: Boolean(data?.is_maintenance),
    updated_at: data?.updated_at || new Date().toISOString(),
  };
});

export const setMaintenanceMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    return {
      isMaintenance: Boolean(payload?.isMaintenance),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("maintenance_settings").upsert({
      id: "global",
      is_maintenance: data.isMaintenance,
      updated_at: now,
    });

    if (error) throw new Error(error.message);
    return { is_maintenance: data.isMaintenance, updated_at: now, ok: true };
  });
