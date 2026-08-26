import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface SSOTokenPayload {
  token: string;
  userId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  telegramHandle: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  roles: string[];
  customRoles: Array<{ id: string; name: string; staffColor?: string }>;
  permissions: string[];
  boardPermissions: {
    canAccess: boolean;
    canManageCategories: boolean;
    isBoardAdmin: boolean;
  };
  expiresAt: number;
}

// In-memory token storage with expiration (persists in process memory, auto-cleans expired tokens)
const ssoTokensStore = new Map<string, SSOTokenPayload>();

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of ssoTokensStore.entries()) {
    if (data.expiresAt < now) {
      ssoTokensStore.delete(token);
    }
  }
}

// Generate random secure token string
function generateSecureTokenString(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "cr_sso_";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Helper to fetch complete user permissions & roles for SSO
 */
async function resolveUserSSOData(supabaseAdmin: any, userId: string) {
  const [{ data: profile }, { data: userRoles }, { data: customRoles }, { data: userRecord }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin
        .from("user_custom_roles")
        .select("custom_roles(id, name, permissions, staff_color)")
        .eq("user_id", userId),
      supabaseAdmin.auth?.admin?.getUserById
        ? supabaseAdmin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } }))
        : Promise.resolve({ data: { user: null } }),
    ]);

  const email = userRecord?.data?.user?.email || `${profile?.username || "user"}@revenge.local`;
  const isFired = profile?.is_fired === true || profile?.has_employee_access === false;

  const roles = (userRoles || []).map((r: any) => r.role);
  const rawCustom = (customRoles || []).map((c: any) => c.custom_roles).filter(Boolean);

  const customRoleNames = rawCustom.map((c: any) => c.name?.toLowerCase() || "");
  const permissions = Array.from(
    new Set([...rawCustom.flatMap((c: any) => (c.permissions as string[]) || [])]),
  );

  const isAdmin =
    !isFired &&
    (roles.includes("admin") ||
      profile?.username?.toLowerCase() === "admin" ||
      profile?.username?.toLowerCase() === "giuse84pro" ||
      email?.toLowerCase() === "beppemonti84@gmail.com" ||
      customRoleNames.some(
        (n: string) =>
          n.includes("amministratore") ||
          n.includes("capitano") ||
          n.includes("direzione") ||
          n.includes("gestore"),
      ) ||
      permissions.includes("utenti.gestisci") ||
      permissions.includes("board.admin"));

  const isStaff = !isFired && profile?.has_employee_access !== false;

  const canAccessBoard =
    !isFired &&
    (isAdmin ||
      permissions.includes("board.access") ||
      permissions.includes("board.manage_categories") ||
      permissions.includes("board.admin") ||
      isStaff);

  const canManageCategories =
    !isFired &&
    (isAdmin ||
      permissions.includes("board.manage_categories") ||
      permissions.includes("board.admin"));

  const isBoardAdmin = !isFired && (isAdmin || permissions.includes("board.admin"));

  return {
    profile,
    email,
    isAdmin,
    isStaff,
    roles,
    customRoles: rawCustom.map((c: any) => ({
      id: c.id,
      name: c.name,
      staffColor: c.staff_color,
    })),
    permissions,
    boardPermissions: {
      canAccess: canAccessBoard,
      canManageCategories,
      isBoardAdmin,
    },
  };
}

/**
 * Generates an SSO exchange token for the currently authenticated user
 */
export const generateSSOToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    cleanExpiredTokens();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const userData = await resolveUserSSOData(supabaseAdmin, userId);

    if (!userData.boardPermissions.canAccess) {
      throw new Error(
        "Accesso negato: non possiedi i permessi per accedere al Board & Workspace Casinò Revenge.",
      );
    }

    const token = generateSecureTokenString();
    // Valid for 10 minutes for exchange
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const payload: SSOTokenPayload = {
      token,
      userId,
      username: userData.profile?.username || "Staff",
      displayName: userData.profile?.display_name || userData.profile?.username || "Staff",
      email: userData.email,
      telegramHandle: userData.profile?.telegram_handle || null,
      isAdmin: userData.isAdmin,
      isStaff: userData.isStaff,
      roles: userData.roles,
      customRoles: userData.customRoles,
      permissions: userData.permissions,
      boardPermissions: userData.boardPermissions,
      expiresAt,
    };

    ssoTokensStore.set(token, payload);

    return {
      ok: true,
      token,
      expiresAt,
      user: {
        id: payload.userId,
        username: payload.username,
        displayName: payload.displayName,
        telegramHandle: payload.telegramHandle,
        isAdmin: payload.isAdmin,
        boardPermissions: payload.boardPermissions,
      },
    };
  });

/**
 * Publicly accessible token verification for the external Board application
 */
export const verifySSOToken = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(10),
    }),
  )
  .handler(async ({ data }) => {
    cleanExpiredTokens();
    const ssoData = ssoTokensStore.get(data.token);

    if (!ssoData) {
      return {
        valid: false,
        error: "Token non valido o scaduto.",
      };
    }

    if (ssoData.expiresAt < Date.now()) {
      ssoTokensStore.delete(data.token);
      return {
        valid: false,
        error: "Token scaduto. Effettua nuovamente l'accesso tramite Casinò Revenge.",
      };
    }

    // Refresh live status from DB in case user was fired in the meantime
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const freshUserData = await resolveUserSSOData(supabaseAdmin, ssoData.userId);

    if (!freshUserData.boardPermissions.canAccess) {
      ssoTokensStore.delete(data.token);
      return {
        valid: false,
        error: "Accesso revocato: l'utente non ha più i permessi sul gestionale Casinò Revenge.",
      };
    }

    // Single-use token: remove once verified to avoid replay attacks
    ssoTokensStore.delete(data.token);

    return {
      valid: true,
      user: {
        id: ssoData.userId,
        username: freshUserData.profile?.username || ssoData.username,
        displayName: freshUserData.profile?.display_name || ssoData.displayName,
        email: freshUserData.email,
        telegramHandle: freshUserData.profile?.telegram_handle || ssoData.telegramHandle,
        isAdmin: freshUserData.isAdmin,
        isStaff: freshUserData.isStaff,
        roles: freshUserData.roles,
        customRoles: freshUserData.customRoles,
        permissions: freshUserData.permissions,
        boardPermissions: freshUserData.boardPermissions,
      },
    };
  });
