import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calculateTimeElapsed } from "@/lib/master.utils";

async function assertMasterPermission(ctx: { supabase: any; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Check if admin
  const { data: adminData } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (adminData) return true;

  // Check if user has master permissions from user_roles or custom_roles
  const [{ data: userRoles }, { data: customs }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", ctx.userId),
    supabaseAdmin
      .from("user_custom_roles")
      .select("custom_role_id, custom_roles(permissions)")
      .eq("user_id", ctx.userId),
  ]);

  if ((userRoles || []).some((r: any) => r.role === "admin")) return true;

  const permissions = new Set<string>();
  for (const c of customs || []) {
    const perms = (c.custom_roles as any)?.permissions || [];
    for (const p of perms) permissions.add(p);
  }

  if (permissions.has("master.gestisci") || permissions.has("master.visualizza")) {
    return true;
  }

  throw new Error("Permesso negato: non hai l'autorizzazione per accedere alla sezione Master.");
}

/**
 * 1. Fetch full data for the Master section
 */
export const getMasterEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertMasterPermission(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: profiles },
      { data: userRoles },
      { data: customRoles },
      { data: userCustomRoles },
      { data: explanations },
      { data: masterSettings },
      { data: tgGroups },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, telegram_handle, has_employee_access, show_in_staff_list, staff_weight, staff_color, created_at",
        )
        .order("display_name", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("custom_roles")
        .select("id, name, description, is_reparto, staff_color, staff_weight"),
      supabaseAdmin.from("user_custom_roles").select("user_id, custom_role_id"),
      supabaseAdmin.from("master_explanations").select("*"),
      supabaseAdmin.from("master_settings").select("*").eq("id", "global").maybeSingle(),
      supabaseAdmin.from("telegram_groups").select("id, title, chat_id, is_active"),
    ]);

    // Map custom role lookup
    const customRoleMap = new Map<string, any>();
    for (const cr of customRoles || []) {
      customRoleMap.set(cr.id, cr);
    }

    // Identify all employees: has_employee_access OR has custom_role OR has user_role
    const employeeIds = new Set<string>();
    for (const p of profiles || []) {
      if (p.has_employee_access) employeeIds.add(p.id);
    }
    for (const ucr of userCustomRoles || []) {
      employeeIds.add(ucr.user_id);
    }
    for (const ur of userRoles || []) {
      employeeIds.add(ur.user_id);
    }

    // Explanation lookup
    const explanationMap = new Map<string, any>();
    for (const exp of explanations || []) {
      explanationMap.set(exp.user_id, exp);
    }

    const employees = (profiles || [])
      .filter((p) => employeeIds.has(p.id))
      .map((p) => {
        const roles = (userRoles || [])
          .filter((r: any) => r.user_id === p.id)
          .map((r: any) => r.role);
        const userCrIds = (userCustomRoles || [])
          .filter((ucr: any) => ucr.user_id === p.id)
          .map((ucr: any) => ucr.custom_role_id);
        const assignedCustomRoles = userCrIds
          .map((id: string) => customRoleMap.get(id))
          .filter(Boolean);

        const exp = explanationMap.get(p.id);
        // By default, if no record exists or needs_explanation is not strictly false, mark as true
        const needsExplanation = exp ? !!exp.needs_explanation : true;
        const roleChangedAt = exp?.role_changed_at || p.created_at || new Date().toISOString();
        const timeElapsed = calculateTimeElapsed(roleChangedAt);

        return {
          id: p.id,
          username: p.username,
          displayName: p.display_name || p.username,
          telegramHandle: p.telegram_handle,
          hasEmployeeAccess: p.has_employee_access,
          roles,
          customRoles: assignedCustomRoles,
          needsExplanation,
          roleChangedAt,
          timeElapsed,
          explanationDoneAt: exp?.explanation_done_at || null,
          explanationDoneById: exp?.explanation_done_by_id || null,
          explanationDoneByName: exp?.explanation_done_by_name || null,
          notes: exp?.notes || null,
          createdAt: p.created_at,
        };
      });

    const pendingCount = employees.filter((e) => e.needsExplanation).length;
    const completedCount = employees.filter((e) => !e.needsExplanation).length;

    return {
      employees,
      stats: {
        totalEmployees: employees.length,
        pendingCount,
        completedCount,
      },
      masterSettings: masterSettings || {
        id: "global",
        explanation_group_id: null,
        auto_kick_on_done: true,
      },
      availableTelegramGroups: tgGroups || [],
    };
  });

/**
 * 2. Mark explanation status (Toggle between Done and Needs Explanation)
 */
export const markExplanationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; done: boolean; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertMasterPermission(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { kickTelegramChatMember, sendTelegramMessage } = await import("@/lib/telegram.server");

    const nowIso = new Date().toISOString();

    // Get current master operator profile
    const { data: adminProf } = await supabaseAdmin
      .from("profiles")
      .select("username, display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const operatorName = adminProf?.display_name || adminProf?.username || "Master Staff";

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .maybeSingle();

    if (!targetProfile) throw new Error("Dipendente non trovato.");

    if (data.done) {
      // Mark as explanation done
      await supabaseAdmin.from("master_explanations").upsert({
        id: `expl-${data.userId}`,
        user_id: data.userId,
        needs_explanation: false,
        explanation_done_at: nowIso,
        explanation_done_by_id: context.userId,
        explanation_done_by_name: operatorName,
        notes: data.notes || null,
        updated_at: nowIso,
      });
    } else {
      // Mark back as needing explanation
      await supabaseAdmin.from("master_explanations").upsert({
        id: `expl-${data.userId}`,
        user_id: data.userId,
        needs_explanation: true,
        role_changed_at: nowIso,
        explanation_done_at: null,
        explanation_done_by_id: null,
        explanation_done_by_name: null,
        notes: data.notes || null,
        updated_at: nowIso,
      });
    }

    // Telegram Explanation Group Sync logic
    const { data: masterSettings } = await supabaseAdmin
      .from("master_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (masterSettings?.explanation_group_id) {
      const { data: group } = await supabaseAdmin
        .from("telegram_groups")
        .select("*")
        .eq("id", masterSettings.explanation_group_id)
        .maybeSingle();

      if (group) {
        const handle = targetProfile.telegram_handle
          ? targetProfile.telegram_handle.replace(/^@/, "").trim().toLowerCase()
          : "";
        const username = (targetProfile.username || "").trim().toLowerCase();

        const currentExceptions: string[] = group.allowed_exceptions || [];

        if (data.done) {
          // EXPLANATION DONE: Remove from allowed_exceptions of the explanation group
          const updatedExceptions = currentExceptions.filter((exc) => {
            const clean = exc.replace(/^@/, "").trim().toLowerCase();
            if (handle && clean === handle) return false;
            if (username && clean === username) return false;
            return true;
          });

          await supabaseAdmin
            .from("telegram_groups")
            .update({
              allowed_exceptions: updatedExceptions,
              allowed_handles: updatedExceptions,
              updated_at: nowIso,
            })
            .eq("id", group.id);

          // If user is inside the explanation group, kick/remove them now that explanation is done
          const { data: groupMembers } = await supabaseAdmin
            .from("telegram_group_members")
            .select("*")
            .eq("group_id", group.id);

          const memberMatch = (groupMembers || []).find((m: any) => {
            if (m.user_id === data.userId) return true;
            if (handle && m.telegram_handle) {
              return m.telegram_handle.replace(/^@/, "").trim().toLowerCase() === handle;
            }
            return false;
          });

          if (memberMatch && memberMatch.telegram_user_id) {
            try {
              await kickTelegramChatMember(group.chat_id, memberMatch.telegram_user_id);
              await supabaseAdmin
                .from("telegram_group_members")
                .update({
                  status: "graduated",
                  verified: false,
                  updated_at: nowIso,
                })
                .eq("id", memberMatch.id);
            } catch (e) {
              console.error("Error kicking user from explanation group on done:", e);
            }
          }

          // Optional notification to the user
          const tgChatId = targetProfile.telegram_chat_id || memberMatch?.telegram_user_id;
          if (tgChatId) {
            try {
              await sendTelegramMessage(
                tgChatId,
                `🎓 <b>SPIEGAZIONE RUOLO COMPLETATA CON SUCCESSO!</b>\n\n` +
                  `Ciao <b>${targetProfile.display_name || targetProfile.username}</b>,\n` +
                  `La spiegazione per il tuo incarico al <b>Casinò Revenge</b> è stata registrata come completata da <b>${operatorName}</b>.\n` +
                  `Hai completato il percorso iniziale e sei stato congedato dal gruppo di spiegazioni!\n\n` +
                  `Buon lavoro all'interno della Ciurma! ⚓`,
              );
            } catch (e) {
              // ignore
            }
          }
        } else {
          // NEEDS EXPLANATION: Add back to allowed_exceptions of the explanation group
          const updatedExceptions = [...currentExceptions];
          if (
            handle &&
            !updatedExceptions.some((e) => e.replace(/^@/, "").toLowerCase() === handle)
          ) {
            updatedExceptions.push(`@${handle}`);
          }
          if (username && !updatedExceptions.some((e) => e.toLowerCase() === username)) {
            updatedExceptions.push(username);
          }

          await supabaseAdmin
            .from("telegram_groups")
            .update({
              allowed_exceptions: updatedExceptions,
              allowed_handles: updatedExceptions,
              updated_at: nowIso,
            })
            .eq("id", group.id);
        }
      }
    }

    return { ok: true, needsExplanation: !data.done };
  });

/**
 * 3. Configure the designated Telegram group for explanations
 */
export const setMasterExplanationGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { groupId: string | null; autoKickOnDone?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertMasterPermission(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const nowIso = new Date().toISOString();

    await supabaseAdmin.from("master_settings").upsert({
      id: "global",
      explanation_group_id: data.groupId || null,
      auto_kick_on_done: data.autoKickOnDone ?? true,
      updated_at: nowIso,
    });

    // If a group was chosen, add all employees currently needing explanation to its exceptions
    if (data.groupId) {
      const [{ data: group }, { data: profiles }, { data: explanations }] = await Promise.all([
        supabaseAdmin.from("telegram_groups").select("*").eq("id", data.groupId).maybeSingle(),
        supabaseAdmin.from("profiles").select("id, username, telegram_handle, has_employee_access"),
        supabaseAdmin.from("master_explanations").select("user_id, needs_explanation"),
      ]);

      if (group) {
        const explanationMap = new Map<string, boolean>();
        for (const exp of explanations || []) {
          explanationMap.set(exp.user_id, !!exp.needs_explanation);
        }

        const currentExceptions = new Set<string>(
          (group.allowed_exceptions || []).map((s: string) => s.trim()),
        );

        for (const p of profiles || []) {
          const needs = explanationMap.has(p.id) ? explanationMap.get(p.id) : true;
          if (needs && p.has_employee_access) {
            if (p.telegram_handle) {
              const clean = p.telegram_handle.replace(/^@/, "").trim();
              if (clean) currentExceptions.add(`@${clean}`);
            }
            if (p.username) {
              currentExceptions.add(p.username.trim());
            }
          }
        }

        await supabaseAdmin
          .from("telegram_groups")
          .update({
            allowed_exceptions: Array.from(currentExceptions),
            allowed_handles: Array.from(currentExceptions),
            updated_at: nowIso,
          })
          .eq("id", group.id);
      }
    }

    return { ok: true };
  });

/**
 * 4. Summary stats for Dashboard Alert Banner
 */
export const getMasterStatsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if user is admin or has master permissions
    const [{ data: userRoles }, { data: customs }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId),
      supabaseAdmin
        .from("user_custom_roles")
        .select("custom_roles(permissions)")
        .eq("user_id", context.userId),
    ]);

    const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
    const perms = new Set<string>();
    for (const c of customs || []) {
      const pList = (c.custom_roles as any)?.permissions || [];
      for (const p of pList) perms.add(p);
    }

    const hasAccess = isAdmin || perms.has("master.gestisci") || perms.has("master.visualizza");
    if (!hasAccess) {
      return {
        hasAccess: false,
        pendingCount: 0,
        pendingEmployees: [],
      };
    }

    const [
      { data: profiles },
      { data: explanations },
      { data: userCustomRoles },
      { data: customRoles },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, telegram_handle, has_employee_access, created_at"),
      supabaseAdmin.from("master_explanations").select("*"),
      supabaseAdmin.from("user_custom_roles").select("user_id, custom_role_id"),
      supabaseAdmin.from("custom_roles").select("id, name, staff_color"),
    ]);

    const roleNameMap = new Map<string, { name: string; color: string }>();
    for (const cr of customRoles || []) {
      roleNameMap.set(cr.id, { name: cr.name, color: cr.staff_color || "#3b82f6" });
    }

    const expMap = new Map<string, any>();
    for (const exp of explanations || []) {
      expMap.set(exp.user_id, exp);
    }

    const employeeIds = new Set<string>();
    for (const p of profiles || []) {
      if (p.has_employee_access) employeeIds.add(p.id);
    }
    for (const ucr of userCustomRoles || []) {
      employeeIds.add(ucr.user_id);
    }

    const pendingEmployees: Array<{
      id: string;
      username: string;
      displayName: string;
      telegramHandle: string | null;
      roleNames: string[];
      roleChangedAt: string;
      timeElapsed: ReturnType<typeof calculateTimeElapsed>;
    }> = [];

    for (const p of profiles || []) {
      if (!employeeIds.has(p.id)) continue;

      const exp = expMap.get(p.id);
      const needs = exp ? !!exp.needs_explanation : true;

      if (needs) {
        const uRoles = (userCustomRoles || [])
          .filter((ucr: any) => ucr.user_id === p.id)
          .map((ucr: any) => roleNameMap.get(ucr.custom_role_id)?.name)
          .filter(Boolean) as string[];

        const roleChangedAt = exp?.role_changed_at || p.created_at || new Date().toISOString();
        const timeElapsed = calculateTimeElapsed(roleChangedAt);

        pendingEmployees.push({
          id: p.id,
          username: p.username,
          displayName: p.display_name || p.username,
          telegramHandle: p.telegram_handle,
          roleNames: uRoles.length > 0 ? uRoles : ["Nuovo Inserimento / Ciurma"],
          roleChangedAt,
          timeElapsed,
        });
      }
    }

    // Sort by longest duration waiting first
    pendingEmployees.sort((a, b) => b.timeElapsed.durationMs - a.timeElapsed.durationMs);

    return {
      hasAccess: true,
      pendingCount: pendingEmployees.length,
      pendingEmployees,
    };
  });
