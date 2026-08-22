import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { formatMoney, formatDobloni, formatDate } from "@/lib/format";

export interface MembershipPlan {
  id: string;
  name: string;
  code: string;
  cost_eur: number;
  cost_dobloni: number;
  renewal_currency: "EUR" | "DOBLONI" | "BOTH";
  renewal_cost: number;
  renewal_days: number;
  description: string;
  advantages?: string[];
  highlight_tag?: string;
  show_in_homepage?: boolean;
  display_order?: number;
  badge_color: string;
  is_active: boolean;
  is_permanent?: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface HomepageMembershipConfig {
  badge_text: string;
  section_title: string;
  section_subtitle: string;
  is_section_visible: boolean;
  show_dobloni_price: boolean;
  cta_button_text: string;
  cta_button_link: string;
}

export const DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG: HomepageMembershipConfig = {
  badge_text: "Livelli di Abbonamento",
  section_title: "Membership & Privilege Cards",
  section_subtitle:
    "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza.",
  is_section_visible: true,
  show_dobloni_price: true,
  cta_button_text: "Richiedi in Cassa",
  cta_button_link: "#valute",
};

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "plan-standard",
    name: "Standard",
    code: "standard",
    cost_eur: 0,
    cost_dobloni: 0,
    renewal_currency: "EUR",
    renewal_cost: 0,
    renewal_days: 0, // 0 = permanente e gratuita
    description:
      "Accesso base permanente e gratuito alle sale e ai tavoli da gioco del Casinò Revenge.",
    advantages: [
      "Accesso permanente e gratuito alle sale del Casinò",
      "Tavoli da gioco tradizionali (Blackjack, Roulette, Baccarat)",
      "Galleria Slot Machine Classic",
      "Assistenza e accoglienza base all'ingresso",
    ],
    highlight_tag: "Base Gratuita",
    show_in_homepage: true,
    display_order: 1,
    badge_color: "#64748b",
    is_active: true,
    is_permanent: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "plan-exclusive",
    name: "Exclusive",
    code: "exclusive",
    cost_eur: 10000,
    cost_dobloni: 1000,
    renewal_currency: "BOTH",
    renewal_cost: 10000,
    renewal_days: 30,
    description: "Ingresso prioritario, sconti dedicati su servizi e 1 consumazione omaggio.",
    advantages: [
      "Ingresso prioritario alla struttura senza code",
      "Sconti dedicati sui servizi interni",
      "1 Consumazione omaggio al bar per serata",
      "Priorità alle casse del Casinò per cambio fiche",
      "Supporto concierge e prenotazione rapida tavoli",
    ],
    highlight_tag: "Consigliata",
    show_in_homepage: true,
    display_order: 2,
    badge_color: "#38bdf8",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "plan-elite",
    name: "Èlite",
    code: "elite",
    cost_eur: 25000,
    cost_dobloni: 2500,
    renewal_currency: "BOTH",
    renewal_cost: 25000,
    renewal_days: 30,
    description:
      "Accesso Sala Privé, assistenza riservata e 5% cashback sulle conversioni Dobloni.",
    advantages: [
      "Accesso esclusivo alla prestigiosa Sala Privé",
      "Maggiordomo e cameriere privato riservato",
      "5% Cashback / Bonus sulle conversioni Dobloni",
      "Tavoli da gioco riservati ad alti limiti di puntata",
      "Invito prioritario ai tornei settimanali",
    ],
    highlight_tag: "Più Popolare",
    show_in_homepage: true,
    display_order: 3,
    badge_color: "#a855f7",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "plan-vip",
    name: "VIP",
    code: "vip",
    cost_eur: 50000,
    cost_dobloni: 5000,
    renewal_currency: "BOTH",
    renewal_cost: 50000,
    renewal_days: 30,
    description:
      "Trattamento VIP esclusivo, Cassetta di Sicurezza inclusa, tavolo riservato e hostess personale.",
    advantages: [
      "Trattamento VIP di massimo prestigio e riservatezza",
      "Cassetta di Sicurezza personale blindata inclusa",
      "Balconata panoramica e tavolo privato riservato",
      "Guardia del corpo e Hostess personale a disposizione",
      "Accesso illimitato a tutti gli eventi e serate di gala",
      "Linee di credito e massimali di gioco personalizzati",
    ],
    highlight_tag: "Massimo Prestigio",
    show_in_homepage: true,
    display_order: 4,
    badge_color: "#f59e0b",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function checkPermission(ctx: { supabase: any; userId: string }, permissionKey: string) {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("role, username")
    .eq("id", ctx.userId)
    .maybeSingle();

  const { data: userRoles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);

  const isRoleAdmin = (userRoles || []).some(
    (r: any) =>
      r.role === "admin" || r.role === "gestore" || r.role === "capitano" || r.role === "direzione",
  );
  const isProfileAdmin =
    profile?.role === "admin" ||
    profile?.role === "gestore" ||
    profile?.username?.toLowerCase() === "admin" ||
    profile?.username?.toLowerCase() === "giuse84pro";

  if (isRoleAdmin || isProfileAdmin) return true;

  // Check custom roles permissions
  const { data: customRoles } = await ctx.supabase
    .from("user_custom_roles")
    .select("custom_roles(permissions)")
    .eq("user_id", ctx.userId);

  const hasPerm = (customRoles || []).some((cr: any) => {
    const perms = cr.custom_roles?.permissions || [];
    return perms.includes(permissionKey) || perms.includes("cittadini.gestisci");
  });

  if (hasPerm) return true;

  throw new Error(`Permesso negato: manca l'autorizzazione '${permissionKey}'.`);
}

// 1. List Membership Plans (Authenticated)
export const listMembershipPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("membership_plans")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      // Check if table is uninitialized
      const { data: initCheck } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "membership_plans_initialized")
        .maybeSingle();

      if (!initCheck) {
        // Seed default plans into DB once
        for (const p of DEFAULT_MEMBERSHIP_PLANS) {
          await supabaseAdmin.from("membership_plans").upsert(p);
        }
        await supabaseAdmin.from("system_settings").upsert({
          key: "membership_plans_initialized",
          value: { initialized: true, at: new Date().toISOString() },
        });

        const { data: seeded } = await supabaseAdmin
          .from("membership_plans")
          .select("*")
          .order("display_order", { ascending: true });
        return (seeded || DEFAULT_MEMBERSHIP_PLANS) as MembershipPlan[];
      }

      // If user has intentionally deleted plans, return the empty or existing list
      return (data || []) as MembershipPlan[];
    }

    // Sort by display_order ascending
    return (data as MembershipPlan[]).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
  });

// 1b. Public List Membership Plans (For Homepage / Landing Page)
export const getPublicMembershipPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipPlan[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error || !data || data.length === 0) {
        const { data: initCheck } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", "membership_plans_initialized")
          .maybeSingle();

        if (!initCheck) {
          for (const p of DEFAULT_MEMBERSHIP_PLANS) {
            await supabaseAdmin.from("membership_plans").upsert(p);
          }
          await supabaseAdmin.from("system_settings").upsert({
            key: "membership_plans_initialized",
            value: { initialized: true, at: new Date().toISOString() },
          });
          return DEFAULT_MEMBERSHIP_PLANS.filter(
            (p) => p.is_active && p.show_in_homepage !== false,
          );
        }
        return (data || []).filter((p: any) => p.show_in_homepage !== false) as MembershipPlan[];
      }

      const activeAndVisible = (data as MembershipPlan[])
        .filter((p: any) => p.is_active !== false && p.show_in_homepage !== false)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      return activeAndVisible;
    } catch {
      return DEFAULT_MEMBERSHIP_PLANS;
    }
  },
);

// 1c. Get Homepage Membership Section Configuration
export const getHomepageMembershipConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageMembershipConfig> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", "homepage_membership_config")
        .maybeSingle();

      if (data && data.value) {
        return {
          ...DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG,
          ...data.value,
        };
      }
      return DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG;
    } catch {
      return DEFAULT_HOMEPAGE_MEMBERSHIP_CONFIG;
    }
  },
);

// 1d. Save Homepage Membership Section Configuration
export const saveHomepageMembershipConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    return z
      .object({
        badge_text: z.string().optional().default("Livelli di Abbonamento"),
        section_title: z.string().optional().default("Membership & Privilege Cards"),
        section_subtitle: z
          .string()
          .optional()
          .default(
            "Sblocca vantaggi esclusivi, accessi riservati, maggiordomo e cassetta di sicurezza.",
          ),
        is_section_visible: z.boolean().optional().default(true),
        show_dobloni_price: z.boolean().optional().default(true),
        cta_button_text: z.string().optional().default("Richiedi in Cassa"),
        cta_button_link: z.string().optional().default("#valute"),
      })
      .parse(data);
  })
  .handler(async ({ context, data }) => {
    await checkPermission(context, "membership.gestisci");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      key: "homepage_membership_config",
      value: data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("system_settings").upsert(payload);
    if (error) {
      throw new Error(`Errore salvataggio configurazione homepage: ${error.message}`);
    }

    return { success: true, config: data };
  });

// 1e. Reorder Membership Plans
export const reorderMembershipPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    return z
      .object({
        orderedIds: z.array(z.string()).min(1, "Lista di piani non valida"),
      })
      .parse(data);
  })
  .handler(async ({ context, data }) => {
    await checkPermission(context, "membership.gestisci");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (let i = 0; i < data.orderedIds.length; i++) {
      const planId = data.orderedIds[i];
      await supabaseAdmin
        .from("membership_plans")
        .update({
          display_order: i + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);
    }

    return { success: true };
  });

// 2. Save Membership Plan (Create / Update)
export const saveMembershipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    return z
      .object({
        id: z.string().optional(),
        name: z.string().min(2, "Il nome della membership deve avere almeno 2 caratteri"),
        code: z.string().min(2, "Il codice deve avere almeno 2 caratteri"),
        cost_eur: z.number().min(0, "Il costo in EUR deve essere >= 0").optional().default(0),
        cost_dobloni: z
          .number()
          .min(0, "Il costo in Dobloni deve essere >= 0")
          .optional()
          .default(0),
        renewal_currency: z.enum(["EUR", "DOBLONI", "BOTH"]).optional().default("BOTH"),
        renewal_cost: z.number().min(0).optional().default(0),
        renewal_days: z.number().min(0, "I giorni di rinnovo devono essere >= 0"),
        description: z.string().optional().default(""),
        advantages: z.array(z.string()).optional().default([]),
        highlight_tag: z.string().optional().default(""),
        show_in_homepage: z.boolean().optional().default(true),
        display_order: z.number().optional().default(0),
        badge_color: z.string().optional().default("#f59e0b"),
        is_active: z.boolean().optional().default(true),
      })
      .parse(data);
  })
  .handler(async ({ context, data }) => {
    await checkPermission(context, "membership.gestisci");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cleanCode = data.code.toLowerCase().trim().replace(/\s+/g, "_");
    const planId = data.id || `plan-${Date.now()}`;
    const costEur = Number(data.cost_eur ?? data.renewal_cost ?? 0);
    const costDobloni = Number(data.cost_dobloni ?? 0);

    const payload = {
      id: planId,
      name: data.name.trim(),
      code: cleanCode,
      cost_eur: costEur,
      cost_dobloni: costDobloni,
      renewal_currency: data.renewal_currency || "BOTH",
      renewal_cost: costEur, // Legacy fallback
      renewal_days: data.renewal_days,
      description: data.description?.trim() || "",
      advantages: (data.advantages || []).filter((a) => a.trim().length > 0),
      highlight_tag: data.highlight_tag?.trim() || "",
      show_in_homepage: data.show_in_homepage ?? true,
      display_order: data.display_order ?? 0,
      badge_color: data.badge_color || "#f59e0b",
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("membership_plans").upsert({
      ...payload,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Errore durante il salvataggio del piano: ${error.message}`);
    }

    return { success: true, plan: payload };
  });

// 3. Delete Membership Plan
export const deleteMembershipPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    await checkPermission(context, "membership.gestisci");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete by ID
    const { error } = await supabaseAdmin.from("membership_plans").delete().eq("id", data.id);
    if (error) {
      // Also try deleting by code if id didn't match
      await supabaseAdmin.from("membership_plans").delete().eq("code", data.id);
    }
    return { success: true };
  });

// 4. Assign / Renew Membership to Citizen with Telegram Notification & Sales Tracking
export const assignCitizenMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    return z
      .object({
        citizenId: z.string(),
        membershipCode: z.string(),
        planId: z.string().optional(),
        startDate: z.string().optional(),
        paymentMethod: z.enum(["EUR", "DOBLONI", "MISTO", "FREE"]).optional().default("EUR"),
        amountEur: z.number().optional().default(0),
        amountDobloni: z.number().optional().default(0),
        notes: z.string().optional(),
      })
      .parse(data);
  })
  .handler(async ({ context, data }) => {
    await checkPermission(context, "cittadini.membership");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTelegramMessage } = await import("@/lib/telegram.server");

    // 1. Fetch citizen
    const { data: citizen, error: citError } = await supabaseAdmin
      .from("citizens")
      .select("*")
      .eq("id", data.citizenId)
      .maybeSingle();

    if (citError || !citizen) {
      throw new Error("Cittadino non trovato");
    }

    // 2. Fetch operator profile
    const { data: operatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", context.userId)
      .maybeSingle();

    // 3. Fetch or resolve plan details and linked profile
    const [{ data: plans }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("membership_plans").select("*"),
      supabaseAdmin.from("profiles").select("*"),
    ]);

    const citName = (citizen.full_name || "").toLowerCase().trim();
    const citNick = (citizen.nickname || "").toLowerCase().trim();

    // Match citizen with registered user profile from site registration / /associa bot command
    const matchedProfile = (profiles || []).find((p: any) => {
      const pUser = (p.username || "").toLowerCase().trim();
      const pDisplay = (p.display_name || "").toLowerCase().trim();
      return (
        (pUser && (pUser === citName || pUser === citNick)) ||
        (pDisplay && (pDisplay === citName || pDisplay === citNick))
      );
    });

    let autoRegisteredHandle = "";
    let recipientChatId: number | string | null = null;

    if (matchedProfile && matchedProfile.telegram_connected) {
      if (matchedProfile.telegram_handle) {
        autoRegisteredHandle = matchedProfile.telegram_handle.trim().startsWith("@")
          ? matchedProfile.telegram_handle.trim()
          : `@${matchedProfile.telegram_handle.trim()}`;
      }
      recipientChatId = matchedProfile.telegram_chat_id || matchedProfile.telegram_user_id || null;
    }

    const allPlans: MembershipPlan[] = plans && plans.length > 0 ? plans : DEFAULT_MEMBERSHIP_PLANS;

    const selectedPlan =
      allPlans.find((p) => p.id === data.planId || p.code === data.membershipCode) ||
      DEFAULT_MEMBERSHIP_PLANS.find((p) => p.code === data.membershipCode) ||
      DEFAULT_MEMBERSHIP_PLANS[0];

    const isStandard =
      selectedPlan.code === "standard" ||
      selectedPlan.is_permanent ||
      selectedPlan.renewal_days === 0;

    const startDate = data.startDate || new Date().toISOString().slice(0, 10);
    const durationDays = isStandard ? 0 : selectedPlan.renewal_days || 30;

    // Expiration date is strictly calculated by the server (employees cannot modify it)
    let computedExpiresAt: string | null = null;
    if (!isStandard) {
      const expDate = new Date(startDate);
      expDate.setDate(expDate.getDate() + durationDays);
      computedExpiresAt = expDate.toISOString().slice(0, 10);
    }

    // Target handle for citizen
    const cleanHandle = autoRegisteredHandle || citizen.telegram_handle || null;

    // If recipientChatId was not found from the Minecraft name match, try matching by handle
    if (!recipientChatId && cleanHandle) {
      const rawClean = cleanHandle.toLowerCase().replace("@", "").trim();
      const handleMatchedProfile = (profiles || []).find((p: any) => {
        if (!p.telegram_connected) return false;
        const pHandle = p.telegram_handle?.toLowerCase().replace("@", "").trim();
        return pHandle && pHandle === rawClean;
      });
      if (handleMatchedProfile?.telegram_chat_id || handleMatchedProfile?.telegram_user_id) {
        recipientChatId =
          handleMatchedProfile.telegram_chat_id || handleMatchedProfile.telegram_user_id;
      }
    }

    // 4. Update citizen in database
    const updatePayload: any = {
      membership: selectedPlan.code,
      membership_plan_id: selectedPlan.id,
      membership_since: startDate,
      membership_expires_at: computedExpiresAt,
      telegram_handle: cleanHandle,
      updated_at: new Date().toISOString(),
    };
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }

    const { error: updErr } = await supabaseAdmin
      .from("citizens")
      .update(updatePayload)
      .eq("id", citizen.id);

    if (updErr) {
      throw new Error(`Errore aggiornamento cittadino: ${updErr.message}`);
    }

    // 5. Price is strictly determined by the plan config (employees cannot modify the amounts received)
    let amountEur = 0;
    let amountDobloni = 0;

    if (isStandard || data.paymentMethod === "FREE") {
      amountEur = 0;
      amountDobloni = 0;
    } else if (data.paymentMethod === "DOBLONI") {
      amountEur = 0;
      amountDobloni = Number(selectedPlan.cost_dobloni || 0);
    } else {
      // EUR
      amountEur = Number(selectedPlan.cost_eur || selectedPlan.renewal_cost || 0);
      amountDobloni = 0;
    }

    const opName = operatorProfile?.display_name || operatorProfile?.username || "Staff";

    const saleRecord = {
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      citizen_id: citizen.id,
      citizen_name: citizen.full_name || citizen.nickname || "Cittadino",
      plan_id: selectedPlan.id,
      plan_code: selectedPlan.code,
      plan_name: selectedPlan.name,
      payment_method: isStandard ? "FREE" : data.paymentMethod || "EUR",
      amount_eur: amountEur,
      amount_dobloni: amountDobloni,
      operator_id: context.userId,
      operator_username: opName,
      start_date: startDate,
      expires_at: computedExpiresAt,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from("membership_sales").insert(saleRecord);
    } catch (saleErr) {
      console.warn(
        "Avviso: salvataggio vendita membership in tabella separata non bloccante:",
        saleErr,
      );
    }

    // 6. Send Telegram Notification if @handle is present and recipientChatId is resolved
    let telegramSent = false;
    const targetHandle = cleanHandle || citizen.telegram_handle;

    if (recipientChatId) {
      let paymentSummary = "";
      if (data.paymentMethod === "EUR") {
        paymentSummary = `💶 <b>Pagamento Effettuato:</b> ${formatMoney(amountEur)} (in Soldi EUR)`;
      } else if (data.paymentMethod === "DOBLONI") {
        paymentSummary = `⛃ <b>Pagamento Effettuato:</b> ${formatDobloni(amountDobloni)} (in Dobloni)`;
      } else if (data.paymentMethod === "MISTO") {
        paymentSummary = `🔀 <b>Pagamento Misto Effettuato:</b> ${formatMoney(amountEur)} + ${formatDobloni(amountDobloni)}`;
      } else {
        paymentSummary = `🎁 <b>Attivazione Gratuita / Standard</b>`;
      }

      const expiryText = isStandard
        ? `⏳ <b>Validità:</b> Permanente (Accesso Base Gratuito Senza Scadenza)`
        : `⏳ <b>Scadenza:</b> ${formatDate(computedExpiresAt!)} (${durationDays} giorni)`;

      const messageText =
        `💎 <b>MEMBERSHIP CASINÒ REVENGE ATTIVATA!</b>\n\n` +
        `👋 Ciao <b>${citizen.full_name || citizen.nickname || "Cliente"}</b>!\n` +
        `È stata attivata/rinnovata con successo la tua tessera <b>${selectedPlan.name}</b>.\n\n` +
        `📅 <b>Data Inizio:</b> ${formatDate(startDate)}\n` +
        `${expiryText}\n` +
        `${paymentSummary}\n` +
        `👤 <b>Operatore Cassa:</b> ${opName}\n` +
        `✨ <b>Vantaggi:</b> ${selectedPlan.description || "Accesso ai servizi esclusivi del Casinò"}\n\n` +
        `👉 <i>Accedi alla tua Scheda Cittadino sul portale per visualizzare la tua tessera digitale ufficiale!</i>`;

      const tgRes = await sendTelegramMessage(recipientChatId, messageText);
      if (tgRes && tgRes.ok) {
        telegramSent = true;
      }
    }

    return {
      success: true,
      telegramSent,
      targetHandle: targetHandle || null,
      plan: selectedPlan,
      expiresAt: computedExpiresAt,
      sale: saleRecord,
    };
  });

// 5. Daily Telegram Expiration Reminders (Runs from 3 days before expiration)
export const checkMembershipExpirationsAndSendReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkPermission(context, "cittadini.membership");
    return await executeMembershipDailyReminders();
  });

export async function executeMembershipDailyReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTelegramMessage } = await import("@/lib/telegram.server");

  const [{ data: citizens }, { data: plans }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("citizens").select("*"),
    supabaseAdmin.from("membership_plans").select("*"),
    supabaseAdmin.from("profiles").select("*"),
  ]);

  const allPlans: MembershipPlan[] = plans && plans.length > 0 ? plans : DEFAULT_MEMBERSHIP_PLANS;
  const planMap = new Map<string, MembershipPlan>();
  allPlans.forEach((p) => {
    planMap.set(p.code, p);
    planMap.set(p.id, p);
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let remindedCount = 0;
  const logEntries: any[] = [];

  for (const cit of citizens || []) {
    // Skip standard or permanent memberships that never expire
    if (!cit.membership_expires_at || cit.membership === "standard") {
      continue;
    }

    const expDate = new Date(cit.membership_expires_at);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if expiring in 0, 1, 2, or 3 days (3 days before expiration)
    if (diffDays >= 0 && diffDays <= 3) {
      const plan = planMap.get(cit.membership) ||
        planMap.get(cit.membership_plan_id) || {
          name: cit.membership.toUpperCase(),
          cost_eur: 10000,
          cost_dobloni: 1000,
          renewal_currency: "BOTH",
          renewal_cost: 10000,
        };

      const citName = (cit.full_name || "").toLowerCase().trim();
      const citNick = (cit.nickname || "").toLowerCase().trim();
      const citHandleRaw = (cit.telegram_handle || "").toLowerCase().replace("@", "").trim();

      // Find matched profile from site registration / /associa bot command
      const matchedProfile = (profiles || []).find((p: any) => {
        if (!p.telegram_connected) return false;
        const pHandle = p.telegram_handle?.toLowerCase().replace("@", "").trim();
        const pUser = p.username?.toLowerCase().trim();
        const pDisplay = p.display_name?.toLowerCase().trim();

        return (
          (pUser && (pUser === citName || pUser === citNick)) ||
          (pDisplay && (pDisplay === citName || pDisplay === citNick)) ||
          (pHandle && citHandleRaw && pHandle === citHandleRaw)
        );
      });

      const targetHandle = matchedProfile?.telegram_handle || cit.telegram_handle || null;
      const targetChatId =
        matchedProfile?.telegram_chat_id || matchedProfile?.telegram_user_id || null;

      if (targetChatId) {
        const daysText =
          diffDays === 0 ? "OGGI" : diffDays === 1 ? "DOMANI (1 giorno)" : `tra ${diffDays} giorni`;

        const costEurStr = plan.cost_eur
          ? formatMoney(plan.cost_eur)
          : formatMoney(plan.renewal_cost || 0);
        const costDobloniStr = plan.cost_dobloni
          ? formatDobloni(plan.cost_dobloni)
          : formatDobloni(1000);

        const reminderText =
          `⚠️ <b>AVVISO SCADENZA MEMBERSHIP — CASINÒ REVENGE</b>\n\n` +
          `👋 Ciao <b>${cit.full_name || cit.nickname || "Cliente"}</b>!\n` +
          `Ti ricordiamo che la tua tessera <b>${plan.name}</b> scadrà <b>${daysText}</b> (il ${formatDate(cit.membership_expires_at)}).\n\n` +
          `💰 <b>Costo di Rinnovo:</b> ${costEurStr} oppure ${costDobloniStr} (accettati entrambi i metodi anche contemporaneamente!)\n` +
          `👉 <i>Recati presso la Cassa del Casinò Revenge o contatta un membro dello Staff per rinnovare la tua tessera ed evitare la sospensione dei tuoi vantaggi esclusivi!</i>`;

        try {
          const res = await sendTelegramMessage(targetChatId, reminderText);
          if (res && res.ok) {
            remindedCount++;
            logEntries.push({
              citizen: cit.full_name,
              handle: targetHandle,
              daysLeft: diffDays,
              success: true,
            });
          }
        } catch (err) {
          console.error(`Errore invio promemoria telegram a ${cit.full_name}:`, err);
        }
      }
    }
  }

  return {
    success: true,
    remindedCount,
    logEntries,
    timestamp: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*                 LIST MEMBERSHIP SALES (FOR SALARY & REPORTING)             */
/* -------------------------------------------------------------------------- */

export interface MembershipSaleRecord {
  id: string;
  citizen_id?: string;
  citizen_name?: string;
  plan_id?: string;
  plan_code?: string;
  plan_name?: string;
  payment_method?: "EUR" | "DOBLONI" | "MISTO" | "FREE";
  amount_eur?: number;
  amount_dobloni?: number;
  operator_id?: string;
  operator_username?: string;
  start_date?: string;
  expires_at?: string;
  created_at: string;
}

export const listMembershipSales = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipSaleRecord[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from("membership_sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        return [];
      }
      return data as MembershipSaleRecord[];
    } catch {
      return [];
    }
  },
);
