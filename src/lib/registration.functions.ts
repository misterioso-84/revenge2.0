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

    // 2. Check if nickname is present in citizens or has existing roles/permissions in panel
    const [{ data: citizens }, { data: userRoles }, { data: userCustomRoles }] = await Promise.all([
      supabaseAdmin.from("citizens").select("*"),
      supabaseAdmin.from("user_roles").select("*"),
      supabaseAdmin.from("user_custom_roles").select("*"),
    ]);

    const citizenMatch = (citizens || []).find((c: any) => {
      const nickMatch = c.nickname && c.nickname.trim().toLowerCase() === cleanNick;
      const nameMatch = c.full_name && c.full_name.trim().toLowerCase() === cleanNick;
      return nickMatch || nameMatch;
    });

    const employeeMatch = (existingProfiles || []).find((p: any) => {
      const match =
        (p.username && p.username.trim().toLowerCase() === cleanNick) ||
        (p.display_name && p.display_name.trim().toLowerCase() === cleanNick);
      if (!match) return false;
      const hasRole = (userRoles || []).some((r: any) => r.user_id === p.id);
      const hasCustomRole = (userCustomRoles || []).some((ucr: any) => ucr.user_id === p.id);
      return hasRole || hasCustomRole || p.has_employee_access;
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

    // Fetch existing profiles, citizens, and roles
    const [
      { data: citizens },
      { data: existingProfiles },
      { data: userRoles },
      { data: userCustomRoles },
    ] = await Promise.all([
      supabaseAdmin.from("citizens").select("*"),
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, has_employee_access, ip_address, telegram_connected"),
      supabaseAdmin.from("user_roles").select("*"),
      supabaseAdmin.from("user_custom_roles").select("*"),
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
      if (!match) return false;
      const hasRole = (userRoles || []).some((r: any) => r.user_id === p.id);
      const hasCustomRole = (userCustomRoles || []).some((ucr: any) => ucr.user_id === p.id);
      return hasRole || hasCustomRole || p.has_employee_access;
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

    // Telegram Handle Uniqueness Check: Strict max 1 @ per user
    if (formattedTelegram) {
      const duplicateTelegram = (existingProfiles || []).find(
        (p: any) =>
          p.telegram_connected &&
          p.telegram_handle &&
          p.telegram_handle.trim().toLowerCase().replace("@", "") ===
            formattedTelegram.toLowerCase().replace("@", ""),
      );
      if (duplicateTelegram) {
        throw new Error(
          `Questo account Telegram (${formattedTelegram}) è già stato collegato all'account ${duplicateTelegram.display_name || duplicateTelegram.username}. Un utente può avere al massimo 1 solo account collegato a Telegram. Usa prima /scollega dal Bot Telegram.`,
        );
      }
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
  .inputValidator(
    (d: { userId?: string; telegramHandle?: string; forceNew?: boolean; code?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTelegramBotInfo, fetchTelegramUpdates, registerPendingCode } =
      await import("@/lib/telegram.server");

    // Flush any pending updates
    await fetchTelegramUpdates().catch(() => {});

    let generatedCode = "";

    // Reuse existing code if valid and forceNew was not explicitly requested
    if (data.code && data.code.length === 6 && !data.forceNew) {
      generatedCode = data.code;
    } else if (data.userId && !data.forceNew) {
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("telegram_code")
          .eq("id", data.userId)
          .maybeSingle();
        if (prof?.telegram_code && prof.telegram_code.length === 6) {
          generatedCode = prof.telegram_code;
        }
      } catch {
        // ignore
      }
    }

    if (!generatedCode) {
      // Generate random 6-digit verification PIN
      generatedCode = String(Math.floor(100000 + Math.random() * 900000));
    }

    const commandText = `/associa ${generatedCode}`;

    // Register code in server pending store
    await registerPendingCode(generatedCode, data.userId);

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
    const botUrl = `https://t.me/${botUsername}?start=${generatedCode}`;

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
      await cancelPendingCode(data.code);
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

    // 1. Look up cached verification in memory
    const verification = await getCachedCodeVerification(cleanCode);
    let realHandle = verification?.handle;

    // 2. Look up in telegram_pending_codes table in Firestore/Database
    if (!realHandle) {
      try {
        const { data: dbCode } = await supabaseAdmin
          .from("telegram_pending_codes")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();

        if (dbCode?.verified && dbCode?.handle) {
          realHandle = dbCode.handle;
        }
      } catch {
        // ignore
      }
    }

    // 3. Check if profile was updated with this telegram_code
    if (!realHandle) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id, telegram_handle, telegram_connected, username, display_name")
        .eq("telegram_code", cleanCode);

      if (existing && existing.length > 0 && existing[0].telegram_handle) {
        realHandle = existing[0].telegram_handle;
      }
    }

    // 4. If userId provided, check if user's profile already got connected by polling
    if (!realHandle && data.userId) {
      const { data: profUser } = await supabaseAdmin
        .from("profiles")
        .select("id, telegram_handle, telegram_connected, username, display_name")
        .eq("id", data.userId)
        .maybeSingle();

      if (profUser?.telegram_connected && profUser?.telegram_handle) {
        realHandle = profUser.telegram_handle;
      }
    }

    // 5. Fallback if user passed manual handle or testing
    if (!realHandle && data.telegramHandle) {
      realHandle = data.telegramHandle.trim();
      if (!realHandle.startsWith("@")) realHandle = `@${realHandle}`;
    }

    if (!realHandle) {
      throw new Error(
        `Invia il comando '/associa ${cleanCode}' in chat al Bot Telegram @CasinoRevengeBot per completare l'associazione.`,
      );
    }

    // Check if this Telegram handle is already connected to ANOTHER user
    const targetUserId = data.userId;
    const { data: duplicateProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .ilike("telegram_handle", realHandle)
      .eq("telegram_connected", true);

    if (duplicateProfiles && duplicateProfiles.length > 0) {
      const other = duplicateProfiles.find((p: any) => !targetUserId || p.id !== targetUserId);
      if (other) {
        throw new Error(
          `Questo account Telegram (${realHandle}) è già stato collegato all'account ${other.display_name || other.username}. Un utente può avere al massimo 1 solo account collegato a Telegram. Usa prima /scollega per liberare l'account.`,
        );
      }
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

      // Sync matching citizen
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("username, display_name")
        .eq("id", data.userId)
        .maybeSingle();
      if (prof?.username || prof?.display_name) {
        const nick = prof.username || prof.display_name;
        const { data: citList } = await supabaseAdmin
          .from("citizens")
          .select("id")
          .ilike("nickname", nick);
        if (citList && citList.length > 0) {
          await supabaseAdmin
            .from("citizens")
            .update({ telegram_handle: realHandle })
            .eq("id", citList[0].id);
        }
      }
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

        const nick = existing[0].username || existing[0].display_name;
        if (nick) {
          const { data: citList } = await supabaseAdmin
            .from("citizens")
            .select("id")
            .ilike("nickname", nick);
          if (citList && citList.length > 0) {
            await supabaseAdmin
              .from("citizens")
              .update({ telegram_handle: realHandle })
              .eq("id", citList[0].id);
          }
        }
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

    // Check duplicate handle
    const targetUserId = data.userId;
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
    const duplicate = (allProfiles || []).find(
      (p: any) =>
        p.telegram_connected &&
        p.id !== targetUserId &&
        p.telegram_handle &&
        p.telegram_handle.trim().toLowerCase().replace("@", "") ===
          formatted.toLowerCase().replace("@", ""),
    );
    if (duplicate) {
      throw new Error(
        `Questo account Telegram (${formatted}) è già stato collegato all'account ${duplicate.display_name || duplicate.username}. Un utente può avere al massimo 1 solo account collegato a Telegram.`,
      );
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

    // Separate base roles and reparti (extrapex)
    const baseRoles = assignedRoles.filter((r: any) => !r.is_reparto);
    const assignedReparti = assignedRoles.filter(
      (r: any) => r.is_reparto === true && r.show_in_staff_list === true,
    );

    // Filter by roles that have show_in_staff_list === true
    const visibleRoles = assignedRoles.filter((r: any) => r && r.show_in_staff_list === true);

    if (visibleRoles.length === 0) {
      // User has no assigned role with show_in_staff_list enabled -> exclude
      continue;
    }

    // Find the highest weight base role (or top role) for primary title
    const topRoleCandidates = baseRoles.filter((r: any) => r.show_in_staff_list === true);
    if (topRoleCandidates.length === 0) {
      topRoleCandidates.push(...visibleRoles);
    }
    topRoleCandidates.sort((a: any, b: any) => (b.staff_weight ?? 50) - (a.staff_weight ?? 50));
    const topRole = topRoleCandidates[0] || {
      name: "Staff",
      id: "default",
      staff_weight: 50,
      staff_color: "#3b82f6",
    };

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
      reparti: assignedReparti.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        staffColor: r.staff_color || "#8b5cf6",
        staffWeight: r.staff_weight ?? 50,
      })),
      assignedRoles: assignedRoles.map((r: any) => ({
        id: r.id,
        name: r.name,
        isReparto: !!r.is_reparto,
        showInStaffList: r.show_in_staff_list ?? true,
        staffColor: r.staff_color || "#3b82f6",
        staffWeight: r.staff_weight ?? 50,
      })),
    });
  }

  // Sort descending by staff weight (highest weight = top of hierarchy)
  const sortedStaff = staffMembers.sort((a, b) => b.staffWeight - a.staffWeight);

  // Group staff members by active Reparti (extrapex) with show_in_staff_list === true
  const repartiList = (allCustomRoles || [])
    .filter((cr: any) => cr && cr.is_reparto === true && cr.show_in_staff_list === true)
    .map((rep: any) => {
      const members = sortedStaff.filter((m: any) => m.reparti.some((r: any) => r.id === rep.id));
      return {
        id: rep.id,
        name: rep.name,
        description: rep.description,
        staffColor: rep.staff_color || "#8b5cf6",
        staffWeight: rep.staff_weight ?? 50,
        permissions: rep.permissions || [],
        members,
      };
    })
    .sort((a, b) => b.staffWeight - a.staffWeight);

  return {
    staffMembers: sortedStaff,
    repartiList,
  };
});

export const syncUserSession = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { userId: string; sessionId?: string; username?: string; displayName?: string }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { extractCloudflareInfo } = await import("@/lib/cloudflare.server");

      let req: Request | null = null;
      if (typeof window === "undefined") {
        try {
          const { getRequest } = await import("@tanstack/react-start/server");
          req = getRequest() || null;
        } catch (e) {
          // ignore
        }
      }

      const cfInfo = extractCloudflareInfo(req);

      const res = await supabaseAdmin.auth._proxy({
        action: "syncUserSession",
        payload: {
          userId: data.userId,
          sessionId: data.sessionId,
          username: data.username,
          displayName: data.displayName,
        },
      });

      return {
        isRevoked: res?.data?.isRevoked === true,
        sessionId: res?.data?.session?.id || data.sessionId,
        clientInfo: cfInfo,
      };
    } catch (err: any) {
      console.warn("[syncUserSession] Handled fallback:", err?.message || err);
      return {
        isRevoked: false,
        sessionId: data.sessionId,
        clientInfo: null,
      };
    }
  });

export const getConnectedDevices = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { extractCloudflareInfo, getCountryInfo } = await import("@/lib/cloudflare.server");

  let currentUserId: string | null = null;
  let req: Request | null = null;

  if (typeof window === "undefined") {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      req = getRequest() || null;
      if (req) {
        const cookie = req.headers.get("cookie") || "";
        const match = cookie.match(/casino_userId=([^;]+)/);
        if (match) {
          currentUserId = match[1];
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  const currentCfInfo = extractCloudflareInfo(req);

  // Retrieve user sessions from Supabase/Mock
  const authProxyRes = await supabaseAdmin.auth._proxy({
    action: "getUserSessions",
  });

  const rawSessions = (authProxyRes?.data || []) as any[];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, ip_address, created_at, updated_at");

  const profileMap = new Map<string, any>();
  (profiles || []).forEach((p: any) => {
    profileMap.set(p.id, p);
  });

  // If no sessions yet, build fallback devices from profiles
  if (rawSessions.length === 0) {
    return (profiles || []).map((p: any) => {
      const country = getCountryInfo(p.country_code || "IT");
      return {
        id: `sess-${p.id}`,
        userId: p.id,
        username: p.username || "Utente",
        displayName: p.display_name || p.username || "Utente",
        ipAddress: p.ip_address || currentCfInfo.ip,
        countryCode: p.country_code || "IT",
        countryName: country.name,
        countryFlag: country.flag,
        cfRay: currentCfInfo.cfRay,
        isCloudflare: currentCfInfo.isCloudflare,
        browser: currentCfInfo.browser,
        deviceType: currentCfInfo.deviceType,
        lastActive: p.updated_at || p.created_at || new Date().toISOString(),
        createdAt: p.created_at || new Date().toISOString(),
        isRevoked: false,
        isCurrent: p.id === currentUserId,
      };
    });
  }

  return rawSessions.map((s: any) => {
    const prof = profileMap.get(s.user_id);
    const country = getCountryInfo(s.country_code || "IT");
    const isCurrent = s.user_id === currentUserId && !s.is_revoked;

    return {
      id: s.id,
      userId: s.user_id,
      username: prof?.username || s.username || "Utente",
      displayName: prof?.display_name || s.display_name || prof?.username || "Utente",
      ipAddress: isCurrent ? currentCfInfo.ip : s.ip_address || currentCfInfo.ip,
      countryCode: s.country_code || (isCurrent ? currentCfInfo.countryCode : "IT"),
      countryName: country.name,
      countryFlag: country.flag,
      cfRay: s.cf_ray || (isCurrent ? currentCfInfo.cfRay : null),
      isCloudflare: s.is_cloudflare ?? currentCfInfo.isCloudflare,
      browser: s.browser || currentCfInfo.browser,
      deviceType: s.device_type || currentCfInfo.deviceType,
      lastActive: s.last_active || s.created_at || new Date().toISOString(),
      createdAt: s.created_at || new Date().toISOString(),
      isRevoked: s.is_revoked === true,
      isCurrent,
    };
  });
});

export const disconnectDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { userId?: string; deviceId?: string; sessionId?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetSessionId = data.sessionId || data.deviceId;

    await supabaseAdmin.auth._proxy({
      action: "revokeSession",
      sessionId: targetSessionId,
      userId: data.userId,
    });

    if (data.userId) {
      await supabaseAdmin
        .from("badge_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("user_id", data.userId)
        .is("ended_at", null);
    }

    return { ok: true, message: "Dispositivo/Sessione disconnessa con successo." };
  });

export const disconnectAllUserDevices = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.auth._proxy({
      action: "revokeAllSessions",
      userId: data.userId,
    });

    await supabaseAdmin
      .from("badge_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", data.userId)
      .is("ended_at", null);

    return { ok: true, message: "Tutte le sessioni dell'utente sono state revocate." };
  });
