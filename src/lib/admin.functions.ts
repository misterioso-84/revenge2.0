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
      supabaseAdmin.from("profiles").select("id, username, display_name").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin
        .from("user_custom_roles")
        .select("user_id, custom_role_id, custom_roles(name)")
        .in("user_id", ids),
    ]);
    return list.users.map((u) => ({
      id: u.id,
      username: profiles?.find((p) => p.id === u.id)?.username ?? (u.email ?? "").split("@")[0],
      display_name: profiles?.find((p) => p.id === u.id)?.display_name ?? null,
      created_at: u.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
      custom_roles: (customs ?? [])
        .filter((c) => c.user_id === u.id)
        .map((c: any) => ({ id: c.custom_role_id, name: c.custom_roles?.name })),
    }));
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
    if (data.isAdmin && created.user) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
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
      .eq("username", data.username.toLowerCase())
      .neq("id", data.userId)
      .maybeSingle();

    if (existing) {
      throw new Error("Questo username è già in uso da un altro utente.");
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        username: data.username.toLowerCase(),
        display_name: data.displayName || null,
      })
      .eq("id", data.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
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
