import { ApplicationForm } from "./types";
import { Profile } from "@/hooks/useAuth";
import type { User } from "@supabase/supabase-js";

export interface UserAccessContext {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isStaff: boolean;
  canManageForms?: boolean;
  roles?: string[];
  customRoleNames?: string[];
}

/**
 * Validates if the given user context has permission to view/submit an application form.
 */
export function checkFormAccess(
  form: ApplicationForm,
  ctx: UserAccessContext,
): { allowed: boolean; reason?: string } {
  // Admins and form managers have full access
  if (ctx.isAdmin || ctx.canManageForms) {
    return { allowed: true };
  }

  // If user is the creator of the form
  if (ctx.user?.id && form.created_by === ctx.user.id) {
    return { allowed: true };
  }

  // Draft forms are strictly restricted to staff with form management privileges
  if (form.status === "draft") {
    return {
      allowed: false,
      reason:
        "Questo questionario è una bozza in lavorazione ed è accessibile solo allo Staff autorizzato.",
    };
  }

  // 1. PUBLIC VISIBILITY
  if (form.visibility === "public" || !form.visibility) {
    return { allowed: true };
  }

  // 2. INTERNAL STAFF VISIBILITY
  if (form.visibility === "internal_staff") {
    if (ctx.isStaff || ctx.isAdmin) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Questo bando è riservato esclusivamente ai membri dello Staff.",
    };
  }

  // 3. PRIVATE VISIBILITY (Fine-grained Role / Minecraft Nick / Telegram Whitelist)
  if (form.visibility === "private") {
    if (!ctx.user) {
      return {
        allowed: false,
        reason: "Accesso riservato. Effettua l'accesso per verificare le autorizzazioni.",
      };
    }

    const allowedRoles = (form.allowed_roles || []).map((r) => r.trim().toLowerCase());
    const allowedNicks = (form.allowed_minecraft_nicknames || []).map((n) =>
      n.trim().toLowerCase(),
    );
    const allowedTelegrams = (form.allowed_telegram_handles || []).map((t) =>
      t.trim().replace(/^@/, "").toLowerCase(),
    );

    // If empty whitelist, default to staff/admin access only
    if (allowedRoles.length === 0 && allowedNicks.length === 0 && allowedTelegrams.length === 0) {
      if (ctx.isStaff || ctx.isAdmin) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Modulo privato senza destinatari specificati (riservato agli amministratori).",
      };
    }

    // Check Role match
    if (allowedRoles.length > 0) {
      const userRoles = [
        ...(ctx.roles || []).map((r) => r.toLowerCase()),
        ...(ctx.customRoleNames || []).map((r) => r.toLowerCase()),
        ctx.isAdmin ? "admin" : null,
        ctx.isStaff ? "staff" : null,
      ].filter(Boolean) as string[];

      const hasRoleMatch = allowedRoles.some((role) => userRoles.includes(role));
      if (hasRoleMatch) {
        return { allowed: true };
      }
    }

    // Check Minecraft Nickname match
    if (allowedNicks.length > 0) {
      const userNicks = [
        ctx.profile?.username?.trim().toLowerCase(),
        ctx.profile?.display_name?.trim().toLowerCase(),
        (ctx.user.user_metadata?.minecraft_nick as string)?.trim().toLowerCase(),
      ].filter(Boolean) as string[];

      const hasNickMatch = allowedNicks.some((nick) => userNicks.includes(nick));
      if (hasNickMatch) {
        return { allowed: true };
      }
    }

    // Check Telegram Handle match
    if (allowedTelegrams.length > 0) {
      const rawTg =
        ctx.profile?.telegram_handle || (ctx.user.user_metadata?.telegram_handle as string) || "";
      const cleanUserTg = rawTg.trim().replace(/^@/, "").toLowerCase();

      if (cleanUserTg && allowedTelegrams.includes(cleanUserTg)) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason:
        "Modulo privato con accesso ristretto. Il tuo account non dispone dei ruoli, nickname Minecraft o username Telegram autorizzati.",
    };
  }

  return { allowed: true };
}
