import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  dispatchTelegramNotification,
  sendDirectTelegramNotificationToUser,
} from "@/lib/telegram.server";

export interface BoardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  // Permissions configuration
  permission_mode?: "public" | "restricted"; // Who can view
  allowed_roles?: string[]; // Custom role IDs or names allowed to view
  allowed_user_ids?: string[]; // Specific employee IDs allowed to view
  publish_mode?: "all_viewers" | "restricted"; // Who can post notes/tasks/meetings in this folder
  publish_roles?: string[]; // Specific custom roles allowed to publish
  publish_user_ids?: string[]; // Specific employee IDs allowed to publish
  can_manage_roles?: string[]; // Custom roles allowed to manage within this category
  can_manage_user_ids?: string[]; // Specific employee IDs allowed to manage within this category

  // Computed flags for current user
  can_view?: boolean;
  can_publish?: boolean;
  can_manage?: boolean;
  can_delete?: boolean;
  can_edit_permissions?: boolean;
}

export interface BoardCustomRole {
  id: string;
  name: string;
  description?: string;
  staff_color?: string;
  staff_weight?: number;
  permissions?: string[];
}

export interface BoardEmployee {
  id: string;
  username: string;
  display_name: string;
  telegram_handle?: string | null;
  staff_color?: string;
  custom_roles: string[];
  custom_role_ids: string[];
}

export interface BoardSubcategory {
  id: string;
  category_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by?: string;
  created_by_name?: string;
  created_at: string;

  // Granular Subcategory Permissions (Relative to / under folder)
  permission_mode?: "inherit" | "public" | "restricted"; // Who can view
  allowed_roles?: string[]; // Roles allowed to view when restricted
  allowed_user_ids?: string[]; // Users allowed to view when restricted
  publish_mode?: "inherit" | "all_viewers" | "restricted"; // Who can post items inside
  publish_roles?: string[]; // Roles allowed to post when restricted
  publish_user_ids?: string[]; // Users allowed to post when restricted
  can_manage_roles?: string[]; // Roles allowed to manage this subcategory
  can_manage_user_ids?: string[]; // Specific user IDs allowed to manage this subcategory

  // Computed flags for current user
  can_view?: boolean;
  can_publish?: boolean;
  can_manage?: boolean;
  can_delete?: boolean;
  can_edit_permissions?: boolean;
}

export interface BoardChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BoardItem {
  id: string;
  category_id: string;
  subcategory_id: string;
  type: "note" | "task" | "meeting";
  title: string;
  content: string;
  is_pinned: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  tags?: string[];

  // Task specific
  task_status?: "todo" | "in_progress" | "review" | "done";
  deadline?: string | null;
  assigned_to_ids?: string[];
  assigned_to_names?: string[];
  completed_at?: string | null;
  completed_by?: string | null;
  checklist?: BoardChecklistItem[];

  // Meeting specific
  meeting_date?: string | null;
  meeting_location?: string | null;
  meeting_status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  attendees_ids?: string[];
  attendees_names?: string[];
  meeting_notes?: string | null;

  author_id: string;
  author_name: string;
  author_avatar?: string | null;
  author_role?: string | null;
  created_at: string;
  updated_at: string;
}

async function getUserPermissions(ctx: { supabase: any; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: userRoles }, { data: customs }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", ctx.userId),
    supabaseAdmin
      .from("user_custom_roles")
      .select("custom_role_id, custom_roles(id, name, permissions)")
      .eq("user_id", ctx.userId),
    supabaseAdmin.from("profiles").select("*").eq("id", ctx.userId).maybeSingle(),
  ]);

  const isAdmin = (userRoles || []).some((r: any) => r.role === "admin");
  const permissions = new Set<string>();
  const customRoleIds = (customs || []).map((c: any) => c.custom_role_id).filter(Boolean);
  const customRoleNames = (customs || []).map((c: any) => c.custom_roles?.name).filter(Boolean);

  for (const c of customs || []) {
    const perms = (c.custom_roles as any)?.permissions || [];
    for (const p of perms) permissions.add(p);
  }

  const isBoardAdmin = isAdmin || permissions.has("board.admin");

  return {
    isAdmin,
    isBoardAdmin,
    permissions,
    profile,
    customRoleIds,
    roles: customRoleNames,
  };
}

function assertPermission(
  perms: Set<string>,
  required: string | string[],
  isBoardAdmin: boolean,
  errorMessage = "Permesso negato per questa operazione.",
) {
  if (isBoardAdmin) return true;
  const reqList = Array.isArray(required) ? required : [required];
  const has = reqList.some((r) => perms.has(r));
  if (!has) {
    throw new Error(errorMessage);
  }
  return true;
}

/**
 * 1. Fetch entire Board Dataset with Granular Category Permissions & Staff List
 */
export const getBoardDataFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdmin, isBoardAdmin, permissions, profile, roles, customRoleIds } =
      await getUserPermissions(context);

    // Verify minimum access permission
    if (
      !isAdmin &&
      !isBoardAdmin &&
      !permissions.has("board.access") &&
      !permissions.has("board.manage_categories") &&
      !permissions.has("board.manage_subcategories") &&
      !permissions.has("board.notes.create") &&
      !permissions.has("board.tasks.create") &&
      !permissions.has("board.meetings.manage")
    ) {
      throw new Error("Non hai il permesso di accedere alla Board & Bacheca.");
    }

    const [
      { data: categories = [] },
      { data: subcategories = [] },
      { data: items = [] },
      { data: allProfiles = [] },
      { data: customRoles = [] },
      { data: userCustomRoles = [] },
    ] = await Promise.all([
      supabaseAdmin.from("board_categories").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("board_subcategories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("board_items")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, telegram_handle, has_employee_access, staff_color, staff_weight",
        )
        .order("display_name", { ascending: true }),
      supabaseAdmin
        .from("custom_roles")
        .select("id, name, description, staff_color, staff_weight, permissions")
        .order("staff_weight", { ascending: false }),
      supabaseAdmin
        .from("user_custom_roles")
        .select("user_id, custom_role_id, custom_roles(id, name, staff_color)"),
    ]);

    // Build map of employees (staff members who have panel access or at least one custom role)
    const userRoleMap = new Map<string, { names: string[]; ids: string[] }>();
    for (const ucr of userCustomRoles || []) {
      if (!ucr.user_id) continue;
      const current = userRoleMap.get(ucr.user_id) || { names: [], ids: [] };
      if (ucr.custom_role_id) current.ids.push(ucr.custom_role_id);
      const rName = (ucr.custom_roles as any)?.name;
      if (rName) current.names.push(rName);
      userRoleMap.set(ucr.user_id, current);
    }

    const employees: BoardEmployee[] = (allProfiles || [])
      .filter((p: any) => {
        const uRoles = userRoleMap.get(p.id);
        return p.has_employee_access || (uRoles && uRoles.ids.length > 0);
      })
      .map((p: any) => {
        const uRoles = userRoleMap.get(p.id) || { names: [], ids: [] };
        return {
          id: p.id,
          username: p.username || "staff",
          display_name: p.display_name || p.username || "Dipendente",
          telegram_handle: p.telegram_handle,
          staff_color: p.staff_color || "#3b82f6",
          custom_roles: uRoles.names,
          custom_role_ids: uRoles.ids,
        };
      });

    // Process categories and check accessibility & permission editing rights
    const processedCategories: BoardCategory[] = (categories || []).map((cat: any) => {
      const isCreator = cat.created_by === context.userId;
      const isManagerOrAdmin =
        isAdmin ||
        isBoardAdmin ||
        isCreator ||
        permissions.has("board.manage_categories") ||
        permissions.has("board.admin");

      // Check view permission
      let canView = true;
      if (!isAdmin && !isBoardAdmin && !isCreator && cat.permission_mode === "restricted") {
        const inAllowedUsers = (cat.allowed_user_ids || []).includes(context.userId);
        const inAllowedRoles = (cat.allowed_roles || []).some(
          (r: string) => customRoleIds.includes(r) || roles.includes(r),
        );
        canView = inAllowedUsers || inAllowedRoles;
      }

      // Check publish permission
      let canPublish = true;
      if (!isAdmin && !isBoardAdmin && !isCreator) {
        if (!canView) {
          canPublish = false;
        } else if (cat.publish_mode === "restricted") {
          const inPublishUsers = (cat.publish_user_ids || []).includes(context.userId);
          const inPublishRoles = (cat.publish_roles || []).some(
            (r: string) => customRoleIds.includes(r) || roles.includes(r),
          );
          canPublish = inPublishUsers || inPublishRoles;
        }
      }

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description || "",
        icon: cat.icon || "Folder",
        color: cat.color || "#f59e0b",
        sort_order: cat.sort_order ?? 0,
        created_by: cat.created_by,
        created_by_name: cat.created_by_name,
        created_at: cat.created_at,
        permission_mode: cat.permission_mode || "public",
        allowed_roles: cat.allowed_roles || [],
        allowed_user_ids: cat.allowed_user_ids || [],
        publish_mode: cat.publish_mode || "all_viewers",
        publish_roles: cat.publish_roles || [],
        publish_user_ids: cat.publish_user_ids || [],
        can_manage_roles: cat.can_manage_roles || [],
        can_manage_user_ids: cat.can_manage_user_ids || [],
        can_view: canView,
        can_publish: canPublish,
        can_manage: isManagerOrAdmin,
        can_delete: isManagerOrAdmin,
        can_edit_permissions: isManagerOrAdmin,
      };
    });

    // Map of processed categories for quick parent lookup
    const catMap = new Map(processedCategories.map((c) => [c.id, c]));

    // Process subcategories with relative permissions
    const processedSubcategories: BoardSubcategory[] = (subcategories || []).map((sub: any) => {
      const parentCat = catMap.get(sub.category_id);
      const isSubCreator = sub.created_by === context.userId;
      const isParentCatCreator = parentCat?.created_by === context.userId;
      const isParentManager = parentCat?.can_manage || false;

      // Subcategory Manager / Admin check
      const hasSubManagePerm =
        isAdmin ||
        isBoardAdmin ||
        isSubCreator ||
        isParentCatCreator ||
        isParentManager ||
        permissions.has("board.manage_subcategories") ||
        permissions.has("board.manage_categories") ||
        permissions.has("board.admin") ||
        (sub.can_manage_user_ids || []).includes(context.userId) ||
        (sub.can_manage_roles || []).some(
          (r: string) => customRoleIds.includes(r) || roles.includes(r),
        );

      // View Permission calculation
      let canViewSub = false;
      if (!parentCat || !parentCat.can_view) {
        canViewSub = false;
      } else if (hasSubManagePerm) {
        canViewSub = true;
      } else if (sub.permission_mode === "restricted") {
        const inAllowedUsers = (sub.allowed_user_ids || []).includes(context.userId);
        const inAllowedRoles = (sub.allowed_roles || []).some(
          (r: string) => customRoleIds.includes(r) || roles.includes(r),
        );
        canViewSub = inAllowedUsers || inAllowedRoles;
      } else {
        // "inherit" or "public" - inherits folder visibility
        canViewSub = true;
      }

      // Publish Permission calculation
      let canPublishSub = false;
      if (!canViewSub || (parentCat && !parentCat.can_publish)) {
        canPublishSub = false;
      } else if (hasSubManagePerm) {
        canPublishSub = true;
      } else if (sub.publish_mode === "restricted") {
        const inPublishUsers = (sub.publish_user_ids || []).includes(context.userId);
        const inPublishRoles = (sub.publish_roles || []).some(
          (r: string) => customRoleIds.includes(r) || roles.includes(r),
        );
        canPublishSub = inPublishUsers || inPublishRoles;
      } else {
        // "inherit" or "all_viewers"
        canPublishSub = true;
      }

      return {
        id: sub.id,
        category_id: sub.category_id,
        name: sub.name,
        description: sub.description || "",
        icon: sub.icon || "Folder",
        color: sub.color || "#3b82f6",
        sort_order: sub.sort_order ?? 0,
        created_by: sub.created_by,
        created_by_name: sub.created_by_name,
        created_at: sub.created_at,
        permission_mode: sub.permission_mode || "inherit",
        allowed_roles: sub.allowed_roles || [],
        allowed_user_ids: sub.allowed_user_ids || [],
        publish_mode: sub.publish_mode || "inherit",
        publish_roles: sub.publish_roles || [],
        publish_user_ids: sub.publish_user_ids || [],
        can_manage_roles: sub.can_manage_roles || [],
        can_manage_user_ids: sub.can_manage_user_ids || [],
        can_view: canViewSub,
        can_publish: canPublishSub,
        can_manage: hasSubManagePerm,
        can_delete: hasSubManagePerm,
        can_edit_permissions: hasSubManagePerm,
      };
    });

    // Filter categories visible to current user
    const visibleCategories = processedCategories.filter((cat) => cat.can_view);
    const visibleCategoryIds = new Set(visibleCategories.map((c) => c.id));

    // Filter subcategories visible to current user and belonging to visible categories
    const visibleSubcategories = processedSubcategories.filter(
      (sub) => sub.can_view && visibleCategoryIds.has(sub.category_id),
    );
    const visibleSubcategoryIds = new Set(visibleSubcategories.map((s) => s.id));

    // Filter items visible to current user
    const visibleItems = (items || []).filter(
      (item: any) =>
        visibleCategoryIds.has(item.category_id) && visibleSubcategoryIds.has(item.subcategory_id),
    );

    return {
      categories: visibleCategories,
      subcategories: visibleSubcategories,
      items: visibleItems as BoardItem[],
      customRoles: (customRoles || []) as BoardCustomRole[],
      staffMembers: employees,
      userContext: {
        userId: context.userId,
        isAdmin,
        isBoardAdmin,
        displayName: profile?.display_name || profile?.username || "Operatore",
        username: profile?.username || "staff",
        permissions: Array.from(permissions),
        userRoles: roles,
        customRoleIds,
      },
    };
  });

/**
 * 2. Create Category
 */
export const createBoardCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      name: z.string().min(2, "Il nome della cartella è obbligatorio"),
      description: z.string().default(""),
      icon: z.string().default("Folder"),
      color: z.string().default("#f59e0b"),
      permission_mode: z.enum(["public", "restricted"]).default("public"),
      allowed_roles: z.array(z.string()).default([]),
      allowed_user_ids: z.array(z.string()).default([]),
      publish_mode: z.enum(["all_viewers", "restricted"]).default("all_viewers"),
      publish_roles: z.array(z.string()).default([]),
      publish_user_ids: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions, profile } = await getUserPermissions(context);
    assertPermission(
      permissions,
      ["board.manage_categories", "board.admin"],
      isBoardAdmin,
      "Non hai il permesso di creare cartelle sulla Board.",
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newCategory: BoardCategory = {
      id: `cat-${Date.now()}`,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon,
      color: data.color,
      sort_order: Date.now(),
      created_by: context.userId,
      created_by_name: profile?.display_name || profile?.username || "Staff",
      created_at: new Date().toISOString(),
      permission_mode: data.permission_mode,
      allowed_roles: data.allowed_roles,
      allowed_user_ids: data.allowed_user_ids,
      publish_mode: data.publish_mode,
      publish_roles: data.publish_roles,
      publish_user_ids: data.publish_user_ids,
    };

    const { data: created, error } = await supabaseAdmin
      .from("board_categories")
      .insert([newCategory])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, category: created || newCategory };
  });

/**
 * 3. Update Category (Meta & Styling)
 */
export const updateBoardCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(2),
      description: z.string().default(""),
      icon: z.string().default("Folder"),
      color: z.string().default("#f59e0b"),
      sort_order: z.number().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cat } = await supabaseAdmin
      .from("board_categories")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!cat) throw new Error("Cartella non trovata.");

    const isCreator = cat.created_by === context.userId;
    const canEdit =
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!canEdit) {
      throw new Error("Non hai il permesso di modificare questa cartella.");
    }

    const { error } = await supabaseAdmin
      .from("board_categories")
      .update({
        name: data.name.trim(),
        description: data.description.trim(),
        icon: data.icon,
        color: data.color,
        sort_order: data.sort_order,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 3b. Update Category Permissions (View & Publish Permissions for Roles & Employees)
 */
export const updateBoardCategoryPermissionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      category_id: z.string(),
      permission_mode: z.enum(["public", "restricted"]),
      allowed_roles: z.array(z.string()).default([]),
      allowed_user_ids: z.array(z.string()).default([]),
      publish_mode: z.enum(["all_viewers", "restricted"]).default("all_viewers"),
      publish_roles: z.array(z.string()).default([]),
      publish_user_ids: z.array(z.string()).default([]),
      can_manage_roles: z.array(z.string()).default([]),
      can_manage_user_ids: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cat } = await supabaseAdmin
      .from("board_categories")
      .select("*")
      .eq("id", data.category_id)
      .maybeSingle();

    if (!cat) throw new Error("Cartella non trovata.");

    // The creator of the category OR users with board.manage_categories/admin permissions can modify category permissions
    const isCreator = cat.created_by === context.userId;
    const hasPerms =
      isAdmin ||
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!hasPerms) {
      throw new Error(
        "Permesso negato: solo chi ha creato la cartella o gli amministratori possono modificare i permessi.",
      );
    }

    const { error } = await supabaseAdmin
      .from("board_categories")
      .update({
        permission_mode: data.permission_mode,
        allowed_roles: data.allowed_roles,
        allowed_user_ids: data.allowed_user_ids,
        publish_mode: data.publish_mode,
        publish_roles: data.publish_roles,
        publish_user_ids: data.publish_user_ids,
        can_manage_roles: data.can_manage_roles,
        can_manage_user_ids: data.can_manage_user_ids,
      })
      .eq("id", data.category_id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 4. Delete Category (Allowed by Creator, Board Admin, or Category Manager)
 */
export const deleteBoardCategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cat } = await supabaseAdmin
      .from("board_categories")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!cat) throw new Error("Cartella non trovata.");

    const isCreator = cat.created_by === context.userId;
    const canDelete =
      isAdmin ||
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!canDelete) {
      throw new Error(
        "Permesso negato: solo chi ha creato la cartella o un amministratore può eliminarla.",
      );
    }

    // Delete subcategories and items of this category
    await Promise.all([
      supabaseAdmin.from("board_items").delete().eq("category_id", data.id),
      supabaseAdmin.from("board_subcategories").delete().eq("category_id", data.id),
      supabaseAdmin.from("board_categories").delete().eq("id", data.id),
    ]);

    return { success: true };
  });

/**
 * 5. Create Subcategory
 */
export const createBoardSubcategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      category_id: z.string(),
      name: z.string().min(2, "Nome sottocategoria obbligatorio"),
      description: z.string().default(""),
      icon: z.string().default("Folder"),
      color: z.string().default("#3b82f6"),
      permission_mode: z.enum(["inherit", "public", "restricted"]).default("inherit"),
      allowed_roles: z.array(z.string()).default([]),
      allowed_user_ids: z.array(z.string()).default([]),
      publish_mode: z.enum(["inherit", "all_viewers", "restricted"]).default("inherit"),
      publish_roles: z.array(z.string()).default([]),
      publish_user_ids: z.array(z.string()).default([]),
      can_manage_roles: z.array(z.string()).default([]),
      can_manage_user_ids: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions, profile } = await getUserPermissions(context);
    assertPermission(
      permissions,
      ["board.manage_subcategories", "board.manage_categories", "board.admin"],
      isBoardAdmin,
      "Non hai il permesso di creare sottocategorie sulla Board.",
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newSubcategory: BoardSubcategory = {
      id: `subcat-${Date.now()}`,
      category_id: data.category_id,
      name: data.name.trim(),
      description: data.description.trim(),
      icon: data.icon || "Folder",
      color: data.color || "#3b82f6",
      sort_order: Date.now(),
      created_by: context.userId,
      created_by_name: profile?.display_name || profile?.username || "Staff",
      created_at: new Date().toISOString(),
      permission_mode: data.permission_mode,
      allowed_roles: data.allowed_roles,
      allowed_user_ids: data.allowed_user_ids,
      publish_mode: data.publish_mode,
      publish_roles: data.publish_roles,
      publish_user_ids: data.publish_user_ids,
      can_manage_roles: data.can_manage_roles,
      can_manage_user_ids: data.can_manage_user_ids,
    };

    const { data: created, error } = await supabaseAdmin
      .from("board_subcategories")
      .insert([newSubcategory])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, subcategory: created || newSubcategory };
  });

/**
 * 6. Update Subcategory (Metadata)
 */
export const updateBoardSubcategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(2),
      description: z.string().default(""),
      icon: z.string().default("Folder"),
      color: z.string().default("#3b82f6"),
      sort_order: z.number().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("board_subcategories")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!sub) throw new Error("Sottocategoria non trovata.");

    const isCreator = sub.created_by === context.userId;
    const canManage =
      isAdmin ||
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_subcategories") ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!canManage) {
      throw new Error("Non hai il permesso di modificare questa sottocategoria.");
    }

    const { error } = await supabaseAdmin
      .from("board_subcategories")
      .update({
        name: data.name.trim(),
        description: data.description.trim(),
        icon: data.icon,
        color: data.color,
        sort_order: data.sort_order,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 6b. Update Subcategory Permissions (Granular relative access control)
 */
export const updateBoardSubcategoryPermissionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string(),
      permission_mode: z.enum(["inherit", "public", "restricted"]),
      allowed_roles: z.array(z.string()).default([]),
      allowed_user_ids: z.array(z.string()).default([]),
      publish_mode: z.enum(["inherit", "all_viewers", "restricted"]),
      publish_roles: z.array(z.string()).default([]),
      publish_user_ids: z.array(z.string()).default([]),
      can_manage_roles: z.array(z.string()).default([]),
      can_manage_user_ids: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("board_subcategories")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!sub) throw new Error("Sottocategoria non trovata.");

    const isCreator = sub.created_by === context.userId;
    const canManage =
      isAdmin ||
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_subcategories") ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!canManage) {
      throw new Error("Non hai il permesso di modificare i permessi di questa sottocategoria.");
    }

    const { error } = await supabaseAdmin
      .from("board_subcategories")
      .update({
        permission_mode: data.permission_mode,
        allowed_roles: data.allowed_roles,
        allowed_user_ids: data.allowed_user_ids,
        publish_mode: data.publish_mode,
        publish_roles: data.publish_roles,
        publish_user_ids: data.publish_user_ids,
        can_manage_roles: data.can_manage_roles,
        can_manage_user_ids: data.can_manage_user_ids,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 7. Delete Subcategory
 */
export const deleteBoardSubcategoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub } = await supabaseAdmin
      .from("board_subcategories")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!sub) throw new Error("Sottocategoria non trovata.");

    const isCreator = sub.created_by === context.userId;
    const canDelete =
      isAdmin ||
      isBoardAdmin ||
      isCreator ||
      permissions.has("board.manage_subcategories") ||
      permissions.has("board.manage_categories") ||
      permissions.has("board.admin");

    if (!canDelete) {
      throw new Error("Non hai il permesso di eliminare questa sottocategoria.");
    }

    await Promise.all([
      supabaseAdmin.from("board_items").delete().eq("subcategory_id", data.id),
      supabaseAdmin.from("board_subcategories").delete().eq("id", data.id),
    ]);

    return { success: true };
  });

/**
 * 8. Create Board Item (Note, Task, or Meeting)
 */
export const createBoardItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      category_id: z.string(),
      subcategory_id: z.string(),
      type: z.enum(["note", "task", "meeting"]),
      title: z.string().min(2, "Il titolo è obbligatorio"),
      content: z.string().default(""),
      is_pinned: z.boolean().default(false),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      tags: z.array(z.string()).default([]),

      // Task fields
      task_status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
      deadline: z.string().nullable().optional(),
      assigned_to_ids: z.array(z.string()).optional(),
      assigned_to_names: z.array(z.string()).optional(),
      checklist: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
          }),
        )
        .optional(),

      // Meeting fields
      meeting_date: z.string().nullable().optional(),
      meeting_location: z.string().nullable().optional(),
      attendees_ids: z.array(z.string()).optional(),
      attendees_names: z.array(z.string()).optional(),
      meeting_notes: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isAdmin, isBoardAdmin, permissions, profile, roles, customRoleIds } =
      await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch Category and Subcategory names
    const [{ data: catObj }, { data: subcatObj }] = await Promise.all([
      supabaseAdmin.from("board_categories").select("*").eq("id", data.category_id).maybeSingle(),
      supabaseAdmin
        .from("board_subcategories")
        .select("name")
        .eq("id", data.subcategory_id)
        .maybeSingle(),
    ]);

    // Check category specific publishing permission
    if (catObj && !isAdmin && !isBoardAdmin && catObj.created_by !== context.userId) {
      if (catObj.publish_mode === "restricted") {
        const inPublishUsers = (catObj.publish_user_ids || []).includes(context.userId);
        const inPublishRoles = (catObj.publish_roles || []).some(
          (r: string) => customRoleIds.includes(r) || roles.includes(r),
        );
        if (!inPublishUsers && !inPublishRoles) {
          throw new Error(
            "Non hai il permesso di pubblicare contenuti in questa cartella riservata.",
          );
        }
      }
    }

    // Check type-specific permission
    if (data.type === "note") {
      assertPermission(
        permissions,
        ["board.notes.create", "board.admin"],
        isBoardAdmin,
        "Non hai il permesso per creare note o appunti.",
      );
    } else if (data.type === "task") {
      assertPermission(
        permissions,
        ["board.tasks.create", "board.tasks.assign", "board.admin"],
        isBoardAdmin,
        "Non hai il permesso per creare task operative.",
      );
      if ((data.assigned_to_ids && data.assigned_to_ids.length > 0) || data.deadline) {
        assertPermission(
          permissions,
          ["board.tasks.assign", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso per assegnare task e scadenze ad altri membri.",
        );
      }
    } else if (data.type === "meeting") {
      assertPermission(
        permissions,
        ["board.meetings.manage", "board.admin"],
        isBoardAdmin,
        "Non hai il permesso per pianificare riunioni.",
      );
    }

    if (data.is_pinned) {
      assertPermission(
        permissions,
        ["board.pin", "board.admin"],
        isBoardAdmin,
        "Non hai il permesso di fissare elementi in evidenza.",
      );
    }

    const nowIso = new Date().toISOString();
    const authorName = profile?.display_name || profile?.username || "Staff";

    const newItem: BoardItem = {
      id: `item-${Date.now()}`,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      type: data.type,
      title: data.title.trim(),
      content: data.content.trim(),
      is_pinned: data.is_pinned,
      priority: data.priority,
      tags: data.tags,

      task_status: data.type === "task" ? data.task_status || "todo" : undefined,
      deadline: data.type === "task" ? data.deadline || null : undefined,
      assigned_to_ids: data.type === "task" ? data.assigned_to_ids || [] : undefined,
      assigned_to_names: data.type === "task" ? data.assigned_to_names || [] : undefined,
      checklist: data.type === "task" ? data.checklist || [] : undefined,

      meeting_date: data.type === "meeting" ? data.meeting_date || null : undefined,
      meeting_location: data.type === "meeting" ? data.meeting_location || null : undefined,
      meeting_status: data.type === "meeting" ? "scheduled" : undefined,
      attendees_ids: data.type === "meeting" ? data.attendees_ids || [] : undefined,
      attendees_names: data.type === "meeting" ? data.attendees_names || [] : undefined,
      meeting_notes: data.type === "meeting" ? data.meeting_notes || null : undefined,

      author_id: context.userId,
      author_name: authorName,
      author_role: isBoardAdmin ? "Amministratore" : "Staff",
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: created, error } = await supabaseAdmin
      .from("board_items")
      .insert([newItem])
      .select()
      .single();

    if (error) throw new Error(error.message);

    const catName = catObj?.name || "Bacheca";
    const subcatName = subcatObj?.name || "Generale";

    // Telegram Notification Dispatch
    try {
      if (data.type === "task" && data.assigned_to_names && data.assigned_to_names.length > 0) {
        const deadlineFormatted = newItem.deadline
          ? new Date(newItem.deadline).toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nessuna data limite";

        const priorityLabel =
          newItem.priority === "urgent"
            ? "🔴 URGENTE"
            : newItem.priority === "high"
              ? "🟠 ALTA"
              : newItem.priority === "medium"
                ? "🟡 MEDIA"
                : "🟢 BASSA";

        // 1. Send Group Notification
        await dispatchTelegramNotification("board_task_assigned", {
          task_title: newItem.title,
          category_name: catName,
          subcategory_name: subcatName,
          assigned_to_names: newItem.assigned_to_names?.join(", ") || "Staff",
          deadline: deadlineFormatted,
          priority: priorityLabel,
          created_by_name: authorName,
          content: newItem.content,
        });

        // 2. Send Private DM Notification to each assigned member
        if (data.assigned_to_ids && data.assigned_to_ids.length > 0) {
          const dmText =
            `📋 <b>TI È STATA ASSEGNATA UNA NUOVA TASK!</b>\n\n` +
            `📌 <b>Titolo:</b> <b>${newItem.title}</b>\n` +
            `📁 <b>Cartella:</b> ${catName} / <b>Sottocategoria:</b> ${subcatName}\n` +
            `⏰ <b>Scadenza:</b> <b>${deadlineFormatted}</b>\n` +
            `⚡ <b>Priorità:</b> <b>${priorityLabel}</b>\n` +
            `✍️ <b>Assegnata da:</b> ${authorName}\n` +
            (newItem.content ? `\n📝 <b>Istruzioni:</b>\n<i>${newItem.content}</i>\n` : "") +
            `\n👉 <i>Accedi alla Board per iniziare a lavorarci e aggiornare lo stato.</i>`;

          for (const uId of data.assigned_to_ids) {
            await sendDirectTelegramNotificationToUser(supabaseAdmin, uId, dmText).catch(() => {});
          }
        }
      } else if (data.type === "meeting" && data.meeting_date) {
        await dispatchTelegramNotification("board_meeting_scheduled", {
          meeting_title: newItem.title,
          category_name: catName,
          subcategory_name: subcatName,
          meeting_date: new Date(data.meeting_date).toLocaleString("it-IT", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          meeting_location: data.meeting_location || "Discord / Canale Staff",
          attendees_names: newItem.attendees_names?.join(", ") || "Tutto il personale",
          agenda: newItem.content,
          created_by_name: authorName,
        });
      } else if (data.is_pinned) {
        await dispatchTelegramNotification("board_announcement_pinned", {
          announcement_title: newItem.title,
          category_name: catName,
          subcategory_name: subcatName,
          author_name: authorName,
          content: newItem.content,
        });
      }
    } catch (notifErr) {
      console.error("[Board] Telegram notification failed:", notifErr);
    }

    return { success: true, item: created || newItem };
  });

/**
 * 9. Update Board Item
 */
export const updateBoardItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(2),
      content: z.string().default(""),
      is_pinned: z.boolean().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      tags: z.array(z.string()).optional(),

      // Task fields
      task_status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
      deadline: z.string().nullable().optional(),
      assigned_to_ids: z.array(z.string()).optional(),
      assigned_to_names: z.array(z.string()).optional(),
      checklist: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
          }),
        )
        .optional(),

      // Meeting fields
      meeting_date: z.string().nullable().optional(),
      meeting_location: z.string().nullable().optional(),
      meeting_status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
      attendees_ids: z.array(z.string()).optional(),
      attendees_names: z.array(z.string()).optional(),
      meeting_notes: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("board_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!existing) throw new Error("Elemento non trovato.");

    const isAuthor = existing.author_id === context.userId;

    if (!isAuthor && !isBoardAdmin) {
      if (existing.type === "note") {
        assertPermission(
          permissions,
          ["board.notes.edit", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di modificare gli appunti altrui.",
        );
      } else if (existing.type === "task") {
        assertPermission(
          permissions,
          ["board.tasks.create", "board.tasks.assign", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di modificare questa task.",
        );
      } else if (existing.type === "meeting") {
        assertPermission(
          permissions,
          ["board.meetings.manage", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di modificare le riunioni.",
        );
      }
    }

    const updates: Partial<BoardItem> = {
      title: data.title.trim(),
      content: data.content.trim(),
      updated_at: new Date().toISOString(),
    };

    if (data.is_pinned !== undefined) updates.is_pinned = data.is_pinned;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.tags !== undefined) updates.tags = data.tags;

    if (existing.type === "task") {
      if (data.task_status !== undefined) updates.task_status = data.task_status;
      if (data.deadline !== undefined) updates.deadline = data.deadline;
      if (data.assigned_to_ids !== undefined) updates.assigned_to_ids = data.assigned_to_ids;
      if (data.assigned_to_names !== undefined) updates.assigned_to_names = data.assigned_to_names;
      if (data.checklist !== undefined) updates.checklist = data.checklist;
    }

    if (existing.type === "meeting") {
      if (data.meeting_date !== undefined) updates.meeting_date = data.meeting_date;
      if (data.meeting_location !== undefined) updates.meeting_location = data.meeting_location;
      if (data.meeting_status !== undefined) updates.meeting_status = data.meeting_status;
      if (data.attendees_ids !== undefined) updates.attendees_ids = data.attendees_ids;
      if (data.attendees_names !== undefined) updates.attendees_names = data.attendees_names;
      if (data.meeting_notes !== undefined) updates.meeting_notes = data.meeting_notes;
    }

    const { error } = await supabaseAdmin.from("board_items").update(updates).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 10. Toggle Pin Board Item
 */
export const togglePinBoardItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string(), is_pinned: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions, profile } = await getUserPermissions(context);
    assertPermission(
      permissions,
      ["board.pin", "board.admin"],
      isBoardAdmin,
      "Non hai il permesso di fissare o rimuovere elementi in evidenza.",
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item } = await supabaseAdmin
      .from("board_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!item) throw new Error("Elemento non trovato.");

    const { error } = await supabaseAdmin
      .from("board_items")
      .update({
        is_pinned: data.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    // If pinned, dispatch Telegram notification
    if (data.is_pinned) {
      try {
        const [{ data: catObj }, { data: subcatObj }] = await Promise.all([
          supabaseAdmin
            .from("board_categories")
            .select("name")
            .eq("id", item.category_id)
            .maybeSingle(),
          supabaseAdmin
            .from("board_subcategories")
            .select("name")
            .eq("id", item.subcategory_id)
            .maybeSingle(),
        ]);
        await dispatchTelegramNotification("board_announcement_pinned", {
          announcement_title: item.title,
          category_name: catObj?.name || "Bacheca",
          subcategory_name: subcatObj?.name || "Generale",
          author_name: profile?.display_name || profile?.username || item.author_name,
          content: item.content,
        });
      } catch (err) {
        console.error("[Board] Pin Telegram notification failed:", err);
      }
    }

    return { success: true, is_pinned: data.is_pinned };
  });

/**
 * 11. Update Task Status & Checklist (Quick Toggle)
 */
export const updateTaskStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string(),
      task_status: z.enum(["todo", "in_progress", "review", "done"]),
      checklist: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            done: z.boolean(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions, profile } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: item } = await supabaseAdmin
      .from("board_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!item) throw new Error("Task non trovata.");

    const isAssigned = item.assigned_to_ids?.includes(context.userId);
    const isAuthor = item.author_id === context.userId;

    if (!isAssigned && !isAuthor && !isBoardAdmin) {
      assertPermission(
        permissions,
        ["board.tasks.update_status", "board.tasks.create", "board.tasks.assign", "board.admin"],
        isBoardAdmin,
        "Non hai il permesso di aggiornare lo stato di questa task.",
      );
    }

    const updates: Partial<BoardItem> = {
      task_status: data.task_status,
      updated_at: new Date().toISOString(),
    };

    if (data.checklist) {
      updates.checklist = data.checklist;
    }

    if (data.task_status === "done") {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = profile?.display_name || profile?.username || "Staff";
    }

    const { error } = await supabaseAdmin.from("board_items").update(updates).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true, task_status: data.task_status };
  });

/**
 * 12. Delete Board Item
 */
export const deleteBoardItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const { isBoardAdmin, permissions } = await getUserPermissions(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: item } = await supabaseAdmin
      .from("board_items")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!item) throw new Error("Elemento non trovato.");

    const isAuthor = item.author_id === context.userId;

    if (!isAuthor && !isBoardAdmin) {
      if (item.type === "note") {
        assertPermission(
          permissions,
          ["board.notes.delete", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di eliminare appunti.",
        );
      } else if (item.type === "task") {
        assertPermission(
          permissions,
          ["board.tasks.delete", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di eliminare task.",
        );
      } else if (item.type === "meeting") {
        assertPermission(
          permissions,
          ["board.meetings.manage", "board.admin"],
          isBoardAdmin,
          "Non hai il permesso di eliminare riunioni.",
        );
      }
    }

    const { error } = await supabaseAdmin.from("board_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * 13. Trigger Task Due Reminders (DM to assigned users if deadline approaches)
 */
export const triggerTaskDueRemindersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch active tasks with deadlines
    const { data: activeTasks } = await supabaseAdmin
      .from("board_items")
      .select("*")
      .eq("type", "task")
      .neq("task_status", "done")
      .not("deadline", "is", null);

    const [{ data: categories = [] }, { data: subcategories = [] }] = await Promise.all([
      supabaseAdmin.from("board_categories").select("id, name"),
      supabaseAdmin.from("board_subcategories").select("id, name"),
    ]);

    const catMap = new Map((categories || []).map((c: any) => [c.id, c.name]));
    const subcatMap = new Map((subcategories || []).map((s: any) => [s.id, s.name]));

    const now = Date.now();
    let remindersSent = 0;
    const notifiedTasks: string[] = [];

    for (const task of activeTasks || []) {
      if (!task.deadline || !task.assigned_to_ids || task.assigned_to_ids.length === 0) continue;

      const deadlineTime = new Date(task.deadline).getTime();
      const diffMs = deadlineTime - now;
      const hoursRemaining = diffMs / (1000 * 60 * 60);

      // Trigger if deadline is in less than 24 hours, or overdue (within last 72 hours)
      if (hoursRemaining <= 24 && hoursRemaining >= -72) {
        const catName = catMap.get(task.category_id) || "Board";
        const subcatName = subcatMap.get(task.subcategory_id) || "Generale";

        const timeRemainingStr =
          hoursRemaining < 0
            ? `Scaduta da ${Math.abs(Math.round(hoursRemaining))} ore ⚠️`
            : hoursRemaining < 1
              ? `Meno di 1 ora al termine! 🚨`
              : `Mancano circa ${Math.round(hoursRemaining)} ore ⏰`;

        const priorityLabel =
          task.priority === "urgent"
            ? "🔴 URGENTE"
            : task.priority === "high"
              ? "🟠 ALTA"
              : task.priority === "medium"
                ? "🟡 MEDIA"
                : "🟢 BASSA";

        const statusLabel =
          task.task_status === "in_progress"
            ? "In Corso 🟡"
            : task.task_status === "review"
              ? "In Revisione 🟣"
              : "Da Iniziare ⚪";

        const deadlineFormatted = new Date(task.deadline).toLocaleString("it-IT", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const pendingChecks = (task.checklist || []).filter((c: any) => !c.done);
        const checklistStr =
          pendingChecks.length > 0
            ? `${pendingChecks.length} voci su ${(task.checklist || []).length} ancora da completare`
            : "";

        const dmText =
          `⚠️ <b>PROMEMORIA TASK IN SCADENZA: MANCA POCO!</b>\n\n` +
          `📌 <b>Task:</b> <b>${task.title}</b>\n` +
          `📁 <b>Cartella:</b> ${catName} / <b>Sottocategoria:</b> ${subcatName}\n` +
          `⏰ <b>Scadenza:</b> <b>${deadlineFormatted}</b> (<i>${timeRemainingStr}</i>)\n` +
          `⚡ <b>Priorità:</b> <b>${priorityLabel}</b>\n` +
          `📊 <b>Stato Attuale:</b> <b>${statusLabel}</b>\n` +
          (task.content ? `\n📝 <b>Dettagli:</b>\n<i>${task.content}</i>\n` : "") +
          (checklistStr ? `\n☑️ <i>${checklistStr}</i>\n` : "") +
          `\n🚨 <i>Ti ricordiamo di completarla e aggiornare il pannello gestionale.</i>`;

        for (const uId of task.assigned_to_ids) {
          const sent = await sendDirectTelegramNotificationToUser(supabaseAdmin, uId, dmText);
          if (sent) remindersSent++;
        }

        notifiedTasks.push(task.title);
      }
    }

    return {
      success: true,
      remindersSent,
      totalChecked: (activeTasks || []).length,
      tasksNotified: notifiedTasks,
    };
  });

/**
 * 14. Trigger Daily Task Morning Briefing (Ore 07:00 DM report & channel briefing)
 */
export const triggerDailyTaskMorningBriefingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: activeTasks },
      { data: allProfiles },
      { data: categories = [] },
      { data: subcategories = [] },
    ] = await Promise.all([
      supabaseAdmin.from("board_items").select("*").eq("type", "task").neq("task_status", "done"),
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, display_name, telegram_handle, telegram_user_id, telegram_chat_id, telegram_connected",
        ),
      supabaseAdmin.from("board_categories").select("id, name"),
      supabaseAdmin.from("board_subcategories").select("id, name"),
    ]);

    const catMap = new Map((categories || []).map((c: any) => [c.id, c.name]));
    const subcatMap = new Map((subcategories || []).map((s: any) => [s.id, s.name]));
    const profileMap = new Map((allProfiles || []).map((p: any) => [p.id, p]));

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const todayDateStr = now.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // Group tasks by assigned user
    const tasksByUser = new Map<string, any[]>();
    for (const task of activeTasks || []) {
      for (const uId of task.assigned_to_ids || []) {
        const list = tasksByUser.get(uId) || [];
        list.push(task);
        tasksByUser.set(uId, list);
      }
    }

    let dmSentCount = 0;
    let totalTodayCount = 0;
    let totalOverdueCount = 0;
    const staffSummaryLines: string[] = [];

    for (const [uId, uTasks] of tasksByUser.entries()) {
      const userProf = profileMap.get(uId);
      const staffName = userProf?.display_name || userProf?.username || "Operatore";

      const todayTasks: any[] = [];
      const overdueTasks: any[] = [];
      const otherTasks: any[] = [];

      for (const t of uTasks) {
        if (!t.deadline) {
          otherTasks.push(t);
          continue;
        }
        const dTime = new Date(t.deadline).getTime();
        if (dTime < todayStart) {
          overdueTasks.push(t);
        } else if (dTime >= todayStart && dTime <= todayEnd) {
          todayTasks.push(t);
        } else {
          otherTasks.push(t);
        }
      }

      totalTodayCount += todayTasks.length;
      totalOverdueCount += overdueTasks.length;

      // Sort otherTasks by priority
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      otherTasks.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

      const formatTaskLine = (t: any) => {
        const cat = catMap.get(t.category_id) || "Board";
        const sub = subcatMap.get(t.subcategory_id) || "Generale";
        const pIcon =
          t.priority === "urgent"
            ? "🔴"
            : t.priority === "high"
              ? "🟠"
              : t.priority === "medium"
                ? "🟡"
                : "🟢";
        const pName = t.priority?.toUpperCase() || "NORMALE";
        const timeStr = t.deadline
          ? new Date(t.deadline).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        return `• ${pIcon} <b>${t.title}</b> (${cat}/${sub})${timeStr ? ` — ⏰ <i>entro le ${timeStr}</i>` : ""} [${pName}]`;
      };

      let dmText = `🌅 <b>REPORT TASK GIORNALIERO (ORE 07:00)</b>\n\n`;
      dmText += `👤 <b>Operatore:</b> <b>${staffName}</b>\n`;
      dmText += `📅 <b>Data:</b> ${todayDateStr}\n\n`;

      if (todayTasks.length > 0) {
        dmText += `🚨 <b>TASK CHE SCADONO OGGI (${todayTasks.length}):</b>\n`;
        dmText += todayTasks.map((t) => formatTaskLine(t)).join("\n") + "\n\n";
      }

      if (overdueTasks.length > 0) {
        dmText += `⚠️ <b>TASK SCADUTE DA COMPLETARE (${overdueTasks.length}):</b>\n`;
        dmText += overdueTasks.map((t) => formatTaskLine(t)).join("\n") + "\n\n";
      }

      if (otherTasks.length > 0) {
        dmText += `📋 <b>ALTRE TASK ATTIVE IN CARICO (${otherTasks.length}):</b>\n`;
        dmText += otherTasks.map((t) => formatTaskLine(t)).join("\n") + "\n\n";
      }

      dmText += `📊 <i>Totale task attive assegnate: ${uTasks.length}. Ti auguriamo un buon lavoro!</i>`;

      const sent = await sendDirectTelegramNotificationToUser(supabaseAdmin, uId, dmText);
      if (sent) dmSentCount++;

      staffSummaryLines.push(
        `• <b>${staffName}</b>: ${uTasks.length} task (🚨 ${todayTasks.length} oggi, ⚠️ ${overdueTasks.length} scadute)`,
      );
    }

    // Consolidated group notification
    await dispatchTelegramNotification("board_daily_morning_briefing", {
      today_date: todayDateStr,
      today_count: totalTodayCount,
      overdue_count: totalOverdueCount,
      total_open: (activeTasks || []).length,
      summary_body:
        staffSummaryLines.length > 0
          ? `👥 <b>Ripartizione Operativa Staff:</b>\n${staffSummaryLines.join("\n")}`
          : "✅ <i>Nessuna task aperta o in scadenza per la giornata odierna.</i>",
    });

    return {
      success: true,
      dmSentCount,
      totalTodayCount,
      totalOverdueCount,
      totalOpen: (activeTasks || []).length,
    };
  });
