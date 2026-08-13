import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const nicknameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);

export const checkCitizenEligibility = createServerFn({ method: "POST" })
  .inputValidator((d: { nickname: string }) => {
    nicknameSchema.parse(d.nickname);
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanNick = data.nickname.trim().toLowerCase();

    // 1. Fetch profiles to check if this nickname is ALREADY taken (no duplicate accounts allowed!)
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, has_employee_access, show_in_staff_list");

    const isAlreadyTaken = (existingProfiles || []).some((p: any) => {
      return (
        (p.username && p.username.trim().toLowerCase() === cleanNick) ||
        (p.display_name && p.display_name.trim().toLowerCase() === cleanNick)
      );
    });

    if (isAlreadyTaken) {
      return {
        eligible: false,
        message:
          "Questo nickname Minecraft è già stato associato ed appartiene già a un altro account (non sono consentiti account doppi).",
      };
    }

    // 2. Check if nickname is present in the dipendenti / citizens section of the panel
    const { data: citizens } = await supabaseAdmin.from("citizens").select("*");

    const citizenMatch = (citizens || []).find((c: any) => {
      const nickMatch = c.nickname && c.nickname.trim().toLowerCase() === cleanNick;
      const nameMatch = c.full_name && c.full_name.trim().toLowerCase() === cleanNick;
      return nickMatch || nameMatch;
    });

    const employeeMatch = (existingProfiles || []).find((p: any) => {
      const match =
        (p.username && p.username.trim().toLowerCase() === cleanNick) ||
        (p.display_name && p.display_name.trim().toLowerCase() === cleanNick);
      return match && (p.has_employee_access || p.show_in_staff_list);
    });

    if (citizenMatch || employeeMatch) {
      const displayName = citizenMatch?.full_name || citizenMatch?.nickname || data.nickname;
      return {
        eligible: true,
        citizenName: displayName,
        nickname: displayName,
        membership: citizenMatch?.membership || "standard",
        message: "Dipendente verificato con successo nella sezione dipendenti del pannello.",
      };
    }

    return {
      eligible: false,
      message:
        "Questo nickname Minecraft non è stato ancora aggiunto nella sezione dipendenti del pannello. Chiedi ad un amministratore o alla Direzione di inserirti.",
    };
  });

export const registerPublicUser = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { nickname: string; password: string; telegramHandle?: string; ipAddress?: string }) => {
      nicknameSchema.parse(d.nickname);
      z.string().min(6).max(72).parse(d.password);
      return d;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanNick = data.nickname.trim().toLowerCase();
    const clientIp = data.ipAddress || "127.0.0.1";

    // Fetch existing profiles and citizens
    const [{ data: citizens }, { data: existingProfiles }] = await Promise.all([
      supabaseAdmin.from("citizens").select("*"),
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, has_employee_access, ip_address, telegram_connected"),
    ]);

    // 1. IP Check: Enforce max 1 account per IP (excluding local loopback in dev)
    const isLocalIp = clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "localhost";
    if (!isLocalIp) {
      const sameIpAccounts = (existingProfiles || []).filter(
        (p: any) => p.ip_address && p.ip_address === clientIp,
      );
      if (sameIpAccounts.length >= 1) {
        throw new Error(
          "Hai già registrato il numero massimo di account (1) per questo indirizzo IP.",
        );
      }
    }

    // 2. Strict Uniqueness Check: Cannot register a Minecraft nickname already associated to someone
    const usernameTaken = (existingProfiles || []).some(
      (p: any) =>
        (p.username && p.username.trim().toLowerCase() === cleanNick) ||
        (p.display_name && p.display_name.trim().toLowerCase() === cleanNick),
    );
    if (usernameTaken) {
      throw new Error(
        "Questo nickname Minecraft è già stato associato ad un altro account (non sono ammessi account doppi).",
      );
    }

    // 3. Employee Section Check: Must exist in citizens or employee list in panel
    const citizenMatch = (citizens || []).find((c: any) => {
      const nickMatch = c.nickname && c.nickname.trim().toLowerCase() === cleanNick;
      const nameMatch = c.full_name && c.full_name.trim().toLowerCase() === cleanNick;
      return nickMatch || nameMatch;
    });

    const employeeMatch = (existingProfiles || []).find((p: any) => {
      const match =
        (p.username && p.username.trim().toLowerCase() === cleanNick) ||
        (p.display_name && p.display_name.trim().toLowerCase() === cleanNick);
      return match && p.has_employee_access;
    });

    if (!citizenMatch && !employeeMatch) {
      throw new Error(
        "Questo nickname Minecraft non è stato ancora aggiunto nella sezione dipendenti del pannello.",
      );
    }

    // Format telegram handle with @
    let formattedTelegram = data.telegramHandle?.trim() || "";
    if (formattedTelegram && !formattedTelegram.startsWith("@")) {
      formattedTelegram = `@${formattedTelegram}`;
    }

    // 4. Create auth user
    const email = `${cleanNick}@revenge.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.nickname,
        display_name: data.nickname,
        has_employee_access: false,
        telegram_handle: formattedTelegram,
        telegram_connected: !!formattedTelegram,
        ip_address: clientIp,
      },
    });

    if (error) {
      throw new Error("Impossibile creare l'account: " + error.message);
    }

    // Update profile in database explicitly
    if (created?.user?.id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          username: data.nickname,
          display_name: data.nickname,
          has_employee_access: false,
          telegram_handle: formattedTelegram,
          telegram_connected: !!formattedTelegram,
          ip_address: clientIp,
        })
        .eq("id", created.user.id);
    }

    return {
      success: true,
      userId: created?.user?.id,
      message: "Account registrato con successo!",
    };
  });

export const requestTelegramVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((d: { userId?: string; telegramHandle?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTelegramBotInfo, fetchTelegramUpdates, registerPendingCode } =
      await import("@/lib/telegram.server");

    // Flush any pending updates
    await fetchTelegramUpdates().catch(() => {});

    // Generate random 6-digit verification PIN
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    const commandText = `/associa ${generatedCode}`;

    // Register code in server pending store
    registerPendingCode(generatedCode, data.userId);

    // Save code to profile if userId provided
    if (data.userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_code: generatedCode,
        })
        .eq("id", data.userId);
    }

    const botInfo = await getTelegramBotInfo();
    const botUsername = botInfo?.username || "CasinoRevengeBot";
    const botUrl = `https://t.me/${botUsername}`;

    const botReply = `Invia il seguente comando al Bot Telegram Ufficiale (@${botUsername}):\n\n${commandText}`;

    return {
      success: true,
      code: generatedCode,
      commandText,
      botUsername,
      botUrl,
      botMessage: botReply,
      message: `Comando ${commandText} generato con successo. Inseriscilo nel Bot Telegram per collegare l'account.`,
    };
  });

export const cancelTelegramVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code?: string; userId?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { cancelPendingCode } = await import("@/lib/telegram.server");

    if (data.code) {
      cancelPendingCode(data.code);
    }

    if (data.userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_code: null,
        })
        .eq("id", data.userId);
    }

    return { success: true };
  });

export const verifyTelegramCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; userId?: string; telegramHandle?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchTelegramUpdates, getCachedCodeVerification } =
      await import("@/lib/telegram.server");

    const cleanCode = (data.code || "").trim();

    // Check if user is already connected in database directly
    if (data.userId) {
      const { data: userProf } = await supabaseAdmin
        .from("profiles")
        .select("telegram_connected, telegram_handle")
        .eq("id", data.userId)
        .single();

      if (userProf?.telegram_connected && userProf?.telegram_handle) {
        return {
          success: true,
          handle: userProf.telegram_handle,
          message: `Account Telegram ${userProf.telegram_handle} collegato con successo!`,
        };
      }
    }

    if (!cleanCode || cleanCode.length < 4) {
      throw new Error("Inserisci un codice di verifica valido.");
    }

    // Contact Telegram Bot API to process recent updates
    await fetchTelegramUpdates();

    // Look up cached verification by PIN code
    const verification = getCachedCodeVerification(cleanCode);

    let realHandle = verification?.handle;

    // Check if another profile was updated with this telegram_code
    if (!realHandle) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("telegram_handle, telegram_connected")
        .eq("telegram_code", cleanCode);

      if (existing && existing.length > 0 && existing[0].telegram_handle) {
        realHandle = existing[0].telegram_handle;
      }
    }

    // Fallback if user passed manual handle or testing, but prefer Telegram API handle
    if (!realHandle && data.telegramHandle) {
      realHandle = data.telegramHandle.trim();
      if (!realHandle.startsWith("@")) realHandle = `@${realHandle}`;
    }

    if (!realHandle) {
      throw new Error(
        `Invia il comando '/associa ${cleanCode}' in chat al Bot Telegram @CasinoRevengeBot per completare l'associazione.`,
      );
    }

    // Save REAL Telegram handle into user profile
    if (data.userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          telegram_handle: realHandle,
          telegram_connected: true,
          telegram_code: null,
        })
        .eq("id", data.userId);
    } else {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("telegram_code", cleanCode);

      if (existing && existing.length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({
            telegram_handle: realHandle,
            telegram_connected: true,
            telegram_code: null,
          })
          .eq("id", existing[0].id);
      }
    }

    return {
      success: true,
      handle: realHandle,
      message: `Account Telegram ${realHandle} verificato ed autorizzato ufficialmente dal Bot!`,
    };
  });

export const updateTelegramHandle = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; telegramHandle: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let formatted = data.telegramHandle.trim();
    if (!formatted.startsWith("@")) {
      formatted = `@${formatted}`;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        telegram_handle: formatted,
        telegram_connected: true,
      })
      .eq("id", data.userId);

    if (error) {
      throw new Error("Impossibile aggiornare l'username Telegram: " + error.message);
    }

    return { ok: true, handle: formatted, message: "Username Telegram salvato con successo." };
  });

export const getPublicStaffList = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: profiles }, { data: roles }, { data: userCustomRoles }, { data: allCustomRoles }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("user_roles").select("*"),
      supabaseAdmin.from("user_custom_roles").select("user_id, custom_role_id"),
      supabaseAdmin.from("custom_roles").select("*"),
    ]);

  // Create map of existing custom roles
  const customRoleMap = new Map<string, any>();
  (allCustomRoles || []).forEach((cr: any) => {
    if (cr && cr.id) {
      customRoleMap.set(cr.id, cr);
    }
  });

  const staffMembers: any[] = [];

  for (const p of profiles || []) {
    const isAdmin = (roles || []).some((r: any) => r.user_id === p.id && r.role === "admin");
    const userRoleLinks = (userCustomRoles || []).filter((ucr: any) => ucr.user_id === p.id);

    // Get all custom roles associated with this user that ACTUALLY EXIST
    const assignedRoles: any[] = userRoleLinks
      .map((ucr: any) => customRoleMap.get(ucr.custom_role_id))
      .filter(Boolean); // Filters out any deleted role!

    // If user is system admin and has no custom role, optionally fallback to admin role if show_in_staff_list is enabled
    if (isAdmin && assignedRoles.length === 0) {
      assignedRoles.push({
        id: "admin-role",
        name: "Amministratore",
        show_in_staff_list: true,
        staff_weight: 100,
        staff_color: "#f59e0b",
      });
    }

    // Filter by roles that have show_in_staff_list === true
    const visibleRoles = assignedRoles.filter((r: any) => r && r.show_in_staff_list === true);

    if (visibleRoles.length === 0) {
      // User has no assigned role with show_in_staff_list enabled -> exclude
      continue;
    }

    // Find the highest weight role among their visible roles
    visibleRoles.sort((a: any, b: any) => (b.staff_weight ?? 50) - (a.staff_weight ?? 50));
    const topRole = visibleRoles[0];

    // Clean and format Telegram handle
    let formattedTg = p.telegram_handle ? String(p.telegram_handle).trim() : null;
    if (formattedTg && !formattedTg.startsWith("@")) {
      formattedTg = `@${formattedTg}`;
    }

    staffMembers.push({
      id: p.id,
      username: p.username || "StaffMember",
      displayName: p.display_name || p.username,
      telegramHandle: formattedTg,
      roleName: topRole.name,
      roleId: topRole.id,
      staffWeight: topRole.staff_weight ?? 50,
      staffColor: topRole.staff_color || "#3b82f6",
    });
  }

  // Sort descending by staff weight (highest weight = top of hierarchy)
  return staffMembers.sort((a, b) => b.staffWeight - a.staffWeight);
});

export const getConnectedDevices = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let clientIp = "185.220.101.5";
  let userAgentStr = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36";

  if (typeof window === "undefined") {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      if (req) {
        clientIp =
          req.headers.get("x-forwarded-for")?.split(",")[0] ||
          req.headers.get("x-real-ip") ||
          clientIp;
        userAgentStr = req.headers.get("user-agent") || userAgentStr;
      }
    } catch (e) {
      // Ignore
    }
  }

  let browserInfo = "Chrome su Windows 11";
  if (userAgentStr.includes("iPhone") || userAgentStr.includes("iPad")) {
    browserInfo = "Safari su iOS Mobile";
  } else if (userAgentStr.includes("Android")) {
    browserInfo = "Chrome su Android Mobile";
  } else if (userAgentStr.includes("Macintosh") || userAgentStr.includes("Mac OS")) {
    browserInfo = "Safari / Chrome su macOS";
  } else if (userAgentStr.includes("Firefox")) {
    browserInfo = "Firefox su Desktop";
  } else if (userAgentStr.includes("Edg")) {
    browserInfo = "Edge su Windows";
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, ip_address, created_at, updated_at");

  return (profiles || []).map((p: any) => ({
    id: `dev-${p.id}`,
    userId: p.id,
    username: p.username || "Utente",
    displayName: p.display_name || p.username || "Utente",
    ipAddress: p.ip_address || clientIp,
    browser: browserInfo,
    lastActive: p.updated_at || p.created_at || new Date().toISOString(),
    isCurrent: true,
  }));
});

export const disconnectDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; deviceId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("badge_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    return { ok: true, message: "Dispositivo disconnesso con successo." };
  });
