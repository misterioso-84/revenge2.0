import initialDbStatic from "../../../mock-db.json";
import * as neonModuleStatic from "../../lib/neon.server";
import * as firestoreModuleStatic from "../../lib/firebase.server";

let getRequestModule: any = null;
async function getGetRequest() {
  if (getRequestModule) return getRequestModule;
  if (typeof window === "undefined") {
    try {
      const mod = await import(/* @vite-ignore */ "@tanstack/react-start/server");
      getRequestModule = mod.getRequest;
      return getRequestModule;
    } catch (e) {
      // Ignore
    }
  }
  return null;
}

async function getNeon() {
  return neonModuleStatic;
}

async function getFirestore() {
  return null;
}

let fsModule: any = null;
let pathModule: any = null;

async function getFsAndPath() {
  if (fsModule && pathModule) return { fs: fsModule, path: pathModule };
  if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
    try {
      fsModule = await import(/* @vite-ignore */ "fs");
      pathModule = await import(/* @vite-ignore */ "path");
      return { fs: fsModule, path: pathModule };
    } catch (e) {
      // Ignore
    }
  }
  return { fs: null, path: null };
}

function getInitialDb() {
  const defaultUser = {
    id: "mock-user-id-1234",
    email: "beppemonti84@gmail.com",
    user_metadata: { username: "admin", display_name: "Amministratore" },
    created_at: new Date().toISOString(),
  };

  const db: Record<string, any[]> = {
    profiles: [
      {
        id: "mock-user-id-1234",
        username: "admin",
        display_name: "Amministratore",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    user_roles: [
      {
        id: "role-1",
        user_id: "mock-user-id-1234",
        role: "admin",
      },
    ],
    custom_roles: [
      {
        id: "crole-admin",
        name: "Amministratore / Capitano",
        description: "Direzione del Casinò e Amministrazione generale",
        permissions: ["utenti.visualizza", "utenti.gestisci", "ruoli.gestisci"],
        show_in_staff_list: true,
        staff_weight: 100,
        staff_color: "#f59e0b",
        created_at: new Date().toISOString(),
      },
      {
        id: "crole-gestore",
        name: "Gestore Casinò",
        description: "Coordinatore della Ciurma e supervisore sale",
        permissions: ["dipendenti.visualizza", "serate.crea", "eventi.crea"],
        show_in_staff_list: true,
        staff_weight: 80,
        staff_color: "#10b981",
        created_at: new Date().toISOString(),
      },
      {
        id: "crole-1",
        name: "Cassiere",
        description: "Gestione conversioni e incassi",
        permissions: ["conversioni.visualizza", "conversioni.crea", "conversioni.azzera"],
        show_in_staff_list: true,
        staff_weight: 60,
        staff_color: "#ec4899",
        created_at: new Date().toISOString(),
      },
      {
        id: "crole-2",
        name: "Croupier",
        description: "Gestione tavoli e corse cavalli",
        permissions: ["corse.visualizza", "corse.gestisci"],
        show_in_staff_list: true,
        staff_weight: 50,
        staff_color: "#3b82f6",
        created_at: new Date().toISOString(),
      },
      {
        id: "crole-3",
        name: "Cittadino / Cliente",
        description: "Ruolo predefinito per i clienti del Casinò",
        permissions: [],
        show_in_staff_list: false,
        staff_weight: 0,
        staff_color: "#94a3b8",
        created_at: new Date().toISOString(),
      },
      {
        id: "reparto-sicurezza",
        name: "Reparto Sicurezza",
        description: "Incaricati di sicurezza, ordine pubblico e gestione sanzioni",
        permissions: ["dipendenti.sanzioni", "badge.visualizza"],
        show_in_staff_list: true,
        staff_weight: 75,
        staff_color: "#ef4444",
        is_reparto: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "reparto-eventi",
        name: "Reparto Eventi & Promozione",
        description: "Organizzazione tornei, serate speciali e pubbliche relazioni",
        permissions: ["eventi.crea", "eventi.gestisci", "serate.crea"],
        show_in_staff_list: true,
        staff_weight: 70,
        staff_color: "#8b5cf6",
        is_reparto: true,
        created_at: new Date().toISOString(),
      },
      {
        id: "reparto-cassa",
        name: "Reparto Cassa & Finanze",
        description: "Supervisione delle conversioni di valuta, contabilità e stipendi",
        permissions: ["conversioni.visualizza", "conversioni.crea", "stipendi.visualizza"],
        show_in_staff_list: true,
        staff_weight: 65,
        staff_color: "#10b981",
        is_reparto: true,
        created_at: new Date().toISOString(),
      },
    ],
    user_custom_roles: [
      { id: "ucr-1", user_id: "mock-user-id-1234", custom_role_id: "crole-admin" },
      { id: "ucr-2", user_id: "mock-user-id-1234", custom_role_id: "reparto-sicurezza" },
      { id: "ucr-3", user_id: "mock-user-id-1234", custom_role_id: "reparto-eventi" },
    ],
    citizens: [
      {
        id: "citizen-1",
        full_name: "Mario Rossi",
        nickname: "Il Capo",
        membership: "elite",
        membership_since: "2026-01-01",
        notes: "Cliente abituale di alta fascia.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "citizen-2",
        full_name: "Giuseppe Bianchi",
        nickname: "Pino",
        membership: "standard",
        membership_since: "2026-02-15",
        notes: "Giocatore serale.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    safe_boxes: Array.from({ length: 10 }, (_, i) => ({
      id: `safe-${i + 1}`,
      box_number: i + 1,
      citizen_id: i === 0 ? "citizen-1" : null,
      activated_at: i === 0 ? "2026-01-01" : null,
      expires_at: i === 0 ? "2026-12-31" : null,
      active: i === 0,
      notes: i === 0 ? "Cassetta vip" : null,
    })),
    badge_weeks: [
      {
        id: "week-1",
        label: "Settimana 1",
        active: true,
        started_at: "2026-07-01",
        ended_at: null,
        created_at: new Date().toISOString(),
      },
    ],
    badge_sessions: [],
    nights: [
      {
        id: "night-1",
        night_date: "2026-07-09",
        title: "Serata di Gala",
        total: 3500,
        notes: "Ottima affluenza.",
        is_closed: false,
        created_at: new Date().toISOString(),
      },
    ],
    conversion_settings: [
      {
        id: true as any,
        max_dobloni_per_day: 10000,
        max_eur_per_day: 2000,
        updated_at: new Date().toISOString(),
      },
    ],
    conversions: [],
    conversion_resets: [],
    stables: [
      {
        id: "stable-1",
        name: "Scuderia San Siro",
        owner_citizen_id: "citizen-1",
      },
    ],
    horses: [
      {
        id: "horse-1",
        name: "Vento di Ponente",
        stable_id: "stable-1",
        sponsor: "Rolex",
      },
      {
        id: "horse-2",
        name: "Saetta",
        stable_id: null,
        sponsor: null,
      },
    ],
    services: [
      {
        id: "srv-1",
        name: "Cena Gourmet",
        billing: "per_night",
        price: 150,
        category_id: "cat-1",
        include_in_nights: true,
        is_qty_editable: false,
        active: true,
      },
      {
        id: "srv-2",
        name: "Guardia del corpo",
        billing: "per_night",
        price: 300,
        category_id: "cat-2",
        include_in_nights: true,
        is_qty_editable: true,
        active: true,
      },
    ],
    service_categories: [
      {
        id: "cat-1",
        name: "Ristorazione",
        sort_order: 1,
      },
      {
        id: "cat-2",
        name: "Sicurezza",
        sort_order: 2,
      },
    ],
    purchased_services: [],
    sanctions: [],
    leave_requests: [],
    night_items: [],
    audit_logs: [],
    eventi_tickets: [
      {
        id: "ticket-1",
        citizen_id: "citizen-1",
        citizen_name: "Mario Rossi",
        category: "Ticket Fantino - Qualificazioni",
        price: 2500,
        event_phase: "Qualificazioni",
        issued_by: "Amministratore",
        created_at: new Date().toISOString(),
      },
      {
        id: "ticket-2",
        citizen_id: "citizen-2",
        citizen_name: "Giuseppe Bianchi",
        category: "Spettatore VIP - Qualificazioni",
        price: 750,
        event_phase: "Qualificazioni",
        issued_by: "Amministratore",
        created_at: new Date().toISOString(),
      },
    ],
    eventi_qualificazioni: [
      {
        id: "qual-1",
        citizen_id: "citizen-1",
        citizen_name: "Mario Rossi",
        minutes: 1,
        seconds: 21,
        milliseconds: 340,
        time_formatted: "01:21.340",
        time_ms: 81340,
        laps: 10,
        attempt_number: 1,
        notes: "Batteria #1 - Pista asciutta",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: "qual-2",
        citizen_id: "citizen-2",
        citizen_name: "Giuseppe Bianchi",
        minutes: 1,
        seconds: 23,
        milliseconds: 110,
        time_formatted: "01:23.110",
        time_ms: 83110,
        laps: 10,
        attempt_number: 1,
        notes: "Batteria #1",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ],
    eventi_scommesse: [],
    eventi_finalisti: [],
    application_forms: [
      {
        id: "form-croupier-1",
        title: "Candidatura Staff Casinò (Croupier & Addetto Tavoli)",
        description:
          "Modulo ufficiale di candidatura per entrare nello Staff Operativo del Casinò Revenge. Cerchiamo persone motivate, affidabili e con buone doti comunicative per la conduzione dei tavoli da gioco e animazione delle serate.",
        role_target: "Croupier / Staff Tavoli",
        status: "open",
        visibility: "public",
        created_by: "mock-user-id-1234",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        expires_at: null,
        fields: [
          {
            id: "f_mc_nick",
            label: "Nickname Minecraft",
            description: "Il tuo nickname esatto su Minecraft",
            type: "text",
            placeholder: "Es: Notch",
            required: true,
          },
          {
            id: "f_age",
            label: "Età Anagrafica",
            description: "Inserisci la tua età",
            type: "number",
            placeholder: "Es: 18",
            required: true,
          },
          {
            id: "f_discord",
            label: "Tag Discord & Telegram",
            description: "Contatto per fissare il colloquio di selezione",
            type: "text",
            placeholder: "Es: mario_rossi#1234",
            required: true,
          },
          {
            id: "f_hours",
            label: "Disponibilità oraria settimanale",
            description: "Quante ore puoi dedicare al Casinò a settimana?",
            type: "select",
            options: ["Meno di 5 ore", "5 - 10 ore", "10 - 20 ore", "Oltre 20 ore"],
            required: true,
          },
          {
            id: "f_availability_slots",
            label: "Fasce orarie di maggiore presenza",
            description: "Seleziona i momenti in cui sei più attivo",
            type: "checkbox",
            options: [
              "Pomeriggio (15:00 - 19:00)",
              "Serale Infrasettimanale (20:30 - 23:30)",
              "Tarda Notte (23:30 - 02:00)",
              "Weekend (Sabato & Domenica)",
            ],
            required: true,
          },
          {
            id: "f_experience",
            label: "Esperienza pregressa in Ruoli Staff / RP",
            description: "Hai già avuto esperienze simili in altri server o contesti RP?",
            type: "radio",
            options: [
              "Sì, notevole esperienza nella gestione tavoli/staff",
              "Sì, qualche esperienza base",
              "No, ma ho tanta voglia di imparare",
            ],
            required: true,
          },
          {
            id: "f_motivation",
            label: "Perché vorresti entrare nello Staff del Casinò Revenge?",
            description: "Descrivi le tue motivazioni e cosa puoi portare al gruppo",
            type: "textarea",
            placeholder: "Scrivi qui la tua motivazione...",
            required: true,
          },
          {
            id: "f_scenario",
            label: "Situazione RP: Gestione contestazioni al tavolo",
            description:
              "Un giocatore contesta una puntata e crea disturbo in sala insultando gli altri clienti. Come ti comporti?",
            type: "textarea",
            placeholder: "Descrivi il tuo approccio e le azioni da intraprendere...",
            required: true,
          },
        ],
      },
      {
        id: "form-security-1",
        title: "Candidatura Servizio Sicurezza & Vigilanza Caveau",
        description:
          "Selezioniamo personale per il servizio d'ordine, controllo accessi sala VIP e scorta valori/dobloni durante le serate ufficiali del Casinò.",
        role_target: "Addetto alla Sicurezza",
        status: "open",
        visibility: "public",
        created_by: "mock-user-id-1234",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        expires_at: null,
        fields: [
          {
            id: "f_mc_nick",
            label: "Nickname Minecraft",
            description: "Il tuo nickname esatto in gioco",
            type: "text",
            placeholder: "Es: Steve",
            required: true,
          },
          {
            id: "f_age",
            label: "Età Anagrafica",
            type: "number",
            placeholder: "Es: 19",
            required: true,
          },
          {
            id: "f_discord",
            label: "Tag Discord",
            type: "text",
            placeholder: "Es: sicurezza_99",
            required: true,
          },
          {
            id: "f_pvp_knowledge",
            label: "Livello di familiarità con regole di ingaggio RP & Polizia",
            type: "radio",
            options: [
              "Alto (Conosco perfettamente le regole di perquisizione e fermo)",
              "Medio",
              "Base (Necessito di breve addestramento)",
            ],
            required: true,
          },
          {
            id: "f_why_security",
            label: "Cosa rende un buttafuori del Casinò professionale ed efficace?",
            type: "textarea",
            placeholder: "Spiega la tua visione del ruolo...",
            required: true,
          },
        ],
      },
      {
        id: "form-internal-promotions",
        title: "[CONCORSO INTERNO] Selezione Responsabile di Turno & Cassa",
        description:
          "Bando interno riservato esclusivamente ai membri dello staff attuale per la posizione di Responsabile di Turno e gestione operativa della cassa e del caveau.",
        role_target: "Responsabile Staff",
        status: "open",
        visibility: "internal_staff",
        created_by: "mock-user-id-1234",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        expires_at: null,
        fields: [
          {
            id: "f_current_role",
            label: "Ruolo attuale nello Staff del Casinò",
            type: "text",
            placeholder: "Es: Croupier Senior",
            required: true,
          },
          {
            id: "f_service_months",
            label: "Da quanti mesi sei in servizio attivo nel Casinò?",
            type: "select",
            options: ["Meno di 1 mese", "1 - 3 mesi", "3 - 6 mesi", "Oltre 6 mesi"],
            required: true,
          },
          {
            id: "f_project_proposal",
            label: "Proposte di miglioramento per l'organizzazione dei turni o serate",
            type: "textarea",
            placeholder: "Descrivi una o più idee concrete per efficientare le serate...",
            required: true,
          },
          {
            id: "f_leadership_skills",
            label: "Perché ritieni di meritare questa promozione interna?",
            type: "textarea",
            placeholder: "Spiega i tuoi punti di forza...",
            required: true,
          },
        ],
      },
    ],
    applications: [
      {
        id: "app-sample-1",
        form_id: "form-croupier-1",
        user_id: "mock-user-id-1234",
        citizen_id: "citizen-1",
        applicant_name: "Mario Rossi",
        applicant_nickname: "Il Capo",
        applicant_email: "mario@revenge.local",
        applicant_discord: "mariorossi#4321",
        status: "pending",
        answers: {
          f_mc_nick: "Il Capo",
          f_age: 22,
          f_discord: "mariorossi#4321",
          f_hours: "10 - 20 ore",
          f_availability_slots: [
            "Serale Infrasettimanale (20:30 - 23:30)",
            "Weekend (Sabato & Domenica)",
          ],
          f_experience: "Sì, notevole esperienza nella gestione tavoli/staff",
          f_motivation:
            "Sono un assiduo frequentatore del Casinò e vorrei contribuire attivamente a rendere le serate ancora più coinvolgenti e fluide per tutti i cittadini.",
          f_scenario:
            "Mantenere sempre la calma senza alzare i toni. Chiamare tempestivamente la sicurezza per isolare l'individuo se diventa aggressivo e verificare con il responsabile di cassa i registri per chiarire l'eventuale fraintendimento in modo trasparente.",
        },
        reviewer_id: null,
        reviewer_notes: null,
        reviewed_at: null,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    user_sessions: [
      {
        id: "sess-mock-admin-1",
        user_id: "mock-user-id-1234",
        username: "admin",
        display_name: "Amministratore",
        ip_address: "185.220.101.5",
        browser: "Chrome su Windows 11",
        device_type: "desktop",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        last_active: new Date().toISOString(),
        is_revoked: false,
      },
    ],
    telegram_groups: [],
    telegram_group_members: [],
    telegram_pending_codes: [],
    telegram_chat_messages: [],
    telegram_notification_rules: [],
    membership_plans: [
      {
        id: "plan-standard",
        name: "Standard",
        code: "standard",
        cost_eur: 0,
        cost_dobloni: 0,
        renewal_currency: "BOTH",
        renewal_cost: 0,
        renewal_days: 0,
        is_permanent: true,
        description: "Accesso base permanente alle sale da gioco e servizi del Casinò.",
        advantages: [
          "Accesso libero al casinò e tavoli da gioco",
          "Possibilità di convertire Dobloni in cassa",
          "Supporto assistenza clienti",
        ],
        highlight_tag: "",
        show_in_homepage: true,
        display_order: 1,
        badge_color: "#64748b",
        is_active: true,
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
    ],
    maintenance_settings: [
      {
        id: "global",
        is_maintenance: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    master_explanations: [],
    master_settings: [
      {
        id: "global",
        explanation_group_id: null,
        auto_kick_on_done: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  return db;
}

function parseClientInfo() {
  let clientIp = "185.220.101.5";
  let userAgentStr = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36";
  let countryCode = "IT";
  let cfRay: string | null = null;
  let isCloudflare = false;

  if (typeof window !== "undefined") {
    userAgentStr = navigator?.userAgent || userAgentStr;
  } else if (getRequestModule) {
    try {
      const req = getRequestModule();
      if (req) {
        const cfIp = req.headers.get("cf-connecting-ip");
        const cfCountry = req.headers.get("cf-ipcountry");
        const cfRayHdr = req.headers.get("cf-ray");
        const xForwardedFor = req.headers.get("x-forwarded-for");
        const xRealIp = req.headers.get("x-real-ip");

        if (cfIp) {
          clientIp = cfIp.trim();
          isCloudflare = true;
        } else if (xForwardedFor) {
          clientIp = xForwardedFor.split(",")[0].trim();
        } else if (xRealIp) {
          clientIp = xRealIp.trim();
        }

        if (cfCountry) {
          countryCode = cfCountry.trim().toUpperCase();
          isCloudflare = true;
        }

        if (cfRayHdr) {
          cfRay = cfRayHdr.trim();
          isCloudflare = true;
        }

        userAgentStr = req.headers.get("user-agent") || userAgentStr;
      }
    } catch (e) {
      // ignore
    }
  }

  let browser = "Google Chrome";
  let os = "Windows 11";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  const ua = userAgentStr.toLowerCase();

  // OS detection
  if (ua.includes("windows nt 10.0") || ua.includes("win64") || ua.includes("windows"))
    os = "Windows 11";
  else if (ua.includes("macintosh") || ua.includes("mac os x")) os = "macOS";
  else if (ua.includes("iphone")) os = "iOS (iPhone)";
  else if (ua.includes("ipad")) os = "iPadOS";
  else if (ua.includes("android")) os = ua.includes("mobile") ? "Android" : "Android Tablet";
  else if (ua.includes("linux")) os = "Linux";

  // Browser detection
  if (ua.includes("edg/")) browser = "Microsoft Edge";
  else if (ua.includes("opr/") || ua.includes("opera")) browser = "Opera";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Google Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Apple Safari";
  else if (ua.includes("firefox/")) browser = "Mozilla Firefox";

  // Device type detection
  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    (ua.includes("android") && !ua.includes("tablet"))
  ) {
    deviceType = "mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    deviceType = "tablet";
  } else {
    deviceType = "desktop";
  }

  const countryFlags: Record<string, { name: string; flag: string }> = {
    IT: { name: "Italia", flag: "🇮🇹" },
    SM: { name: "San Marino", flag: "🇸🇲" },
    CH: { name: "Svizzera", flag: "🇨🇭" },
    FR: { name: "Francia", flag: "🇫🇷" },
    DE: { name: "Germania", flag: "🇩🇪" },
    ES: { name: "Spagna", flag: "🇪🇸" },
    GB: { name: "Regno Unito", flag: "🇬🇧" },
    US: { name: "Stati Uniti", flag: "🇺🇸" },
    AT: { name: "Austria", flag: "🇦🇹" },
    BE: { name: "Belgio", flag: "🇧🇪" },
    NL: { name: "Paesi Bassi", flag: "🇳🇱" },
  };

  const countryInfo = countryFlags[countryCode] || { name: countryCode, flag: "🌐" };

  return {
    clientIp,
    countryCode,
    countryName: countryInfo.name,
    countryFlag: countryInfo.flag,
    cfRay,
    isCloudflare,
    userAgentStr,
    browser: `${browser} su ${os}`,
    deviceType,
  };
}

function ensureDbTables(db: Record<string, any[]>) {
  if (!db || typeof db !== "object") return db;
  const initial = getInitialDb();
  for (const table of Object.keys(initial)) {
    if (!db[table] || !Array.isArray(db[table])) {
      db[table] = initial[table];
    }
  }
  db.audit_logs = db.audit_logs || [];
  db.user_sessions = db.user_sessions || [];

  if (
    !db.maintenance_settings ||
    !Array.isArray(db.maintenance_settings) ||
    db.maintenance_settings.length === 0
  ) {
    db.maintenance_settings = [
      {
        id: "global",
        is_maintenance: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  // Remove test mock groups if present
  if (Array.isArray(db.telegram_groups)) {
    db.telegram_groups = db.telegram_groups.filter(
      (g: any) =>
        g.id !== "tgroup-staff-generale" &&
        g.id !== "tgroup-direzione" &&
        g.id !== "tgroup-croupier-tavoli",
    );
  }
  if (Array.isArray(db.telegram_group_members)) {
    db.telegram_group_members = db.telegram_group_members.filter(
      (m: any) => m.id !== "tgm-admin-1" && m.group_id !== "tgroup-staff-generale",
    );
  }

  return db;
}

let cachedDb: Record<string, any[]> | null = null;
let lastLoadedTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds Cache TTL to prevent serving stale data in serverless environments
let isInitializing = false;
let initPromise: Promise<Record<string, any[]>> | null = null;

async function loadDb(): Promise<Record<string, any[]>> {
  const now = Date.now();
  if (cachedDb && now - lastLoadedTime < CACHE_TTL_MS) {
    return ensureDbTables(cachedDb);
  }

  // 0. If in browser, load from localStorage first (for zero-loss static hosting like Cloudflare Pages!)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("casinorevenge_db");
      if (stored) {
        console.log("[Local Storage Sync] Loaded database from localStorage.");
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          cachedDb = ensureDbTables(parsed);
          lastLoadedTime = Date.now();
          return cachedDb;
        }
      }
    } catch (e) {
      console.error("Error loading db from localStorage:", e);
    }
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  let neonFailed = false;
  let firestoreFailed = false;

  isInitializing = true;
  initPromise = (async () => {
    // 1. Attempt Neon Postgres
    const neonMod = await getNeon();
    if (neonMod && neonMod.loadDbFromNeon) {
      try {
        console.log("[Neon Sync] Attempting to load database from Neon Postgres...");
        const pgData = await neonMod.loadDbFromNeon();
        if (pgData) {
          console.log(
            "[Neon Sync] Successfully loaded database from Neon. Merging with initial DB and updating local cache...",
          );
          const initialDb = getInitialDb();
          const mergedDb = { ...initialDb, ...pgData };
          mergedDb.audit_logs = mergedDb.audit_logs || [];
          cachedDb = mergedDb;
          lastLoadedTime = Date.now();
          try {
            const { fs, path } = await getFsAndPath();
            if (fs && path) {
              const dbFile = path.join(process.cwd(), "mock-db.json");
              fs.writeFileSync(dbFile, JSON.stringify(cachedDb, null, 2), "utf-8");
            }
          } catch (e) {
            console.error("Error saving local DB cache:", e);
          }
          return cachedDb;
        }
      } catch (err) {
        console.error("[Neon Sync] Failed to load from Neon Postgres:", err);
        neonFailed = true;
      }
    }

    // 2. Attempt Firestore (Ultra robust for Cloudflare Pages!)
    const firestoreMod = await getFirestore();
    if (firestoreMod && firestoreMod.loadDbFromFirestore) {
      try {
        console.log("[Firestore Sync] Attempting to load database from Firestore...");
        const firestoreData = await firestoreMod.loadDbFromFirestore();
        if (firestoreData) {
          console.log(
            "[Firestore Sync] Successfully loaded database from Firestore. Merging with initial DB and updating local cache...",
          );
          const initialDb = getInitialDb();
          const mergedDb = { ...initialDb, ...firestoreData };
          mergedDb.audit_logs = mergedDb.audit_logs || [];
          cachedDb = mergedDb;
          lastLoadedTime = Date.now();
          try {
            const { fs, path } = await getFsAndPath();
            if (fs && path) {
              const dbFile = path.join(process.cwd(), "mock-db.json");
              fs.writeFileSync(dbFile, JSON.stringify(cachedDb, null, 2), "utf-8");
            }
          } catch (e) {
            console.error("Error saving local DB cache:", e);
          }
          return cachedDb;
        }
      } catch (err) {
        console.error("[Firestore Sync] Failed to load from Firestore:", err);
        firestoreFailed = true;
      }
    }

    // 3. Attempt Local File (fs fallback, mainly for local dev without cloud connection)
    console.log("[Sync Fallback] Falling back to local mock-db.json...");
    let localDb: Record<string, any[]> | null = null;
    try {
      const { fs, path } = await getFsAndPath();
      if (fs && path) {
        const dbFile = path.join(process.cwd(), "mock-db.json");
        if (fs.existsSync(dbFile)) {
          const raw = fs.readFileSync(dbFile, "utf-8");
          localDb = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.error("Error loading mock db from file:", e);
    }

    // 4. Statically imported fallback (Perfect for zero-setup static or serverless deploys!)
    if (!localDb) {
      console.log(
        "[Sync Fallback] No local mock DB found on disk. Falling back to statically imported mock-db.json...",
      );
      try {
        localDb = JSON.parse(JSON.stringify(initialDbStatic));
      } catch (err) {
        console.error("Error loading statically imported mock db:", err);
      }
    }

    if (!localDb) {
      console.log("[Sync Fallback] Falling back to generating initial DB...");
      localDb = getInitialDb();
    }

    ensureDbTables(localDb);
    cachedDb = localDb;
    lastLoadedTime = Date.now();

    // Seed backends with initial/local state if we had to fall back to files/static and we are absolutely sure the load didn't just fail!
    console.log("[Sync Fallback] Seeding backends with database state...");
    if (!neonFailed && neonMod && neonMod.saveDbToNeon) {
      try {
        await neonMod.saveDbToNeon(localDb);
        console.log("[Neon Sync] Database state successfully seeded to Neon Postgres.");
      } catch (err) {
        console.error("[Neon Sync] Failed to seed Neon Postgres:", err);
      }
    }

    if (!firestoreFailed && firestoreMod && firestoreMod.saveDbToFirestore) {
      try {
        await firestoreMod.saveDbToFirestore(localDb);
        console.log("[Firestore Sync] Database state successfully seeded to Firestore.");
      } catch (err) {
        console.error("[Firestore Sync] Failed to seed Firestore:", err);
      }
    }

    return cachedDb;
  })();

  const result = await initPromise;
  isInitializing = false;
  initPromise = null;
  return result;
}

async function saveDb(db: Record<string, any[]>) {
  db.audit_logs = db.audit_logs || [];
  cachedDb = db;
  lastLoadedTime = Date.now();

  // 0. If in browser, save to localStorage (for zero-loss static hosting like Cloudflare Pages!)
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("casinorevenge_db", JSON.stringify(db));
      console.log("[Local Storage Sync] Saved database to localStorage.");
    } catch (e) {
      console.error("Error saving db to localStorage:", e);
    }
  }

  // 1. Save to local file system
  try {
    const { fs, path } = await getFsAndPath();
    if (fs && path) {
      const dbFile = path.join(process.cwd(), "mock-db.json");
      fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
    }
  } catch (e) {
    console.error("Error saving mock db locally:", e);
  }

  // 2. Save to Neon Postgres
  const neonMod = await getNeon();
  if (neonMod && neonMod.saveDbToNeon) {
    console.log("[Neon Sync] Saving database state to Neon Postgres...");
    try {
      await neonMod.saveDbToNeon(db);
      console.log("[Neon Sync] Database state successfully saved to Neon Postgres.");
    } catch (err) {
      console.error("[Neon Sync] Failed to save database state to Neon Postgres:", err);
    }
  }

  // 3. Save to Firestore
  const firestoreMod = await getFirestore();
  if (firestoreMod && firestoreMod.saveDbToFirestore) {
    console.log("[Firestore Sync] Saving database state to Firestore...");
    try {
      await firestoreMod.saveDbToFirestore(db);
      console.log("[Firestore Sync] Database state successfully saved to Firestore.");
    } catch (err) {
      console.error("[Firestore Sync] Failed to save database state to Firestore:", err);
    }
  }
}

function logOperation(
  db: any,
  operation: string,
  table: string | undefined,
  query: any,
  result: any,
) {
  // Only log write actions or important RPC calls
  const isWrite =
    ["insert", "update", "delete", "upsert"].includes(operation) ||
    (operation === "rpc" && ["perform_conversion"].includes(query.name));

  if (!isWrite) return;

  db.audit_logs = db.audit_logs || [];

  const session = getActiveSessionSync(db);
  const userId = session?.user?.id || "system";
  const username = session?.user?.user_metadata?.username || "sistema";
  const userDisplayName = session?.user?.user_metadata?.display_name || "Sistema";

  let details = "";
  const tableLabel = table || query.name || "sistema";

  if (operation === "rpc") {
    if (query.name === "perform_conversion") {
      const dir =
        query.args?._direction === "cash_to_dobloni" ? "Euro ➔ Dobloni" : "Dobloni ➔ Euro";
      const amtStr =
        query.args?._direction === "cash_to_dobloni"
          ? `${query.args?._input} €`
          : `${query.args?._input} Dobloni`;
      details = `Eseguita conversione valuta (${dir}) di ${amtStr}`;
    } else {
      details = `Eseguita operazione di sistema: ${query.name}`;
    }
  } else if (table === "citizens") {
    if (operation === "insert") {
      const name = Array.isArray(query.insertData)
        ? query.insertData.map((x: any) => x.full_name).join(", ")
        : query.insertData?.full_name;
      details = `Registrato nuovo cittadino: ${name}`;
    } else if (operation === "update") {
      const name = query.updateData?.full_name || "";
      const extra = name ? `: ${name}` : "";
      details = `Aggiornato cittadino${extra}`;
    } else if (operation === "delete") {
      details = `Eliminato cittadino dal database`;
    } else {
      details = `Modificata anagrafica cittadini`;
    }
  } else if (table === "leave_requests") {
    if (operation === "insert") {
      const start = query.insertData?.start_date;
      const end = query.insertData?.end_date;
      details = `Inviata richiesta di congedo dal ${start} al ${end}`;
    } else if (operation === "update") {
      const status = query.updateData?.status;
      const statusLabel =
        status === "approved" ? "APPROVATO" : status === "rejected" ? "RIFIUTATO" : status;
      const userStr = result?.data?.[0]?.display_name || result?.data?.[0]?.username || "";
      const extra = userStr ? ` per ${userStr}` : "";
      details = `Congedo ${statusLabel}${extra}`;
    } else if (operation === "delete") {
      details = `Annullato congedo`;
    } else {
      details = `Gestito congedo`;
    }
  } else if (table === "conversions") {
    if (operation === "insert") {
      const dir =
        query.insertData?.direction === "cash_to_dobloni" ? "Euro ➔ Dobloni" : "Dobloni ➔ Euro";
      details = `Registrata conversione valuta (${dir})`;
    } else {
      details = `Modificato record di conversione`;
    }
  } else if (table === "nights") {
    if (operation === "insert") {
      details = `Creata nuova serata: ${query.insertData?.title || query.insertData?.night_date}`;
    } else if (operation === "update") {
      const isClosed = query.updateData?.is_closed;
      if (isClosed === true) {
        details = `Chiusa serata: ${result?.data?.[0]?.title || result?.data?.[0]?.night_date || "ID " + query.filters?.[0]?.value}`;
      } else {
        details = `Aggiornata serata: ${query.updateData?.title || "ID " + query.filters?.[0]?.value}`;
      }
    } else if (operation === "delete") {
      details = `Eliminata serata dal database`;
    } else {
      details = `Gestito record serata`;
    }
  } else if (table === "services") {
    if (operation === "insert") {
      details = `Aggiunto servizio a catalogo: ${query.insertData?.name}`;
    } else if (operation === "update") {
      details = `Aggiornato servizio: ${query.updateData?.name || "ID " + query.filters?.[0]?.value}`;
    } else if (operation === "delete") {
      details = `Eliminato servizio dal catalogo`;
    }
  } else if (table === "badge_sessions") {
    if (operation === "insert") {
      details = `Iniziata sessione di lavoro (timbratura ingresso)`;
    } else if (operation === "update") {
      const endedAt = query.updateData?.ended_at;
      details = endedAt ? `Chiusa sessione di lavoro (timbratura uscita)` : `Aggiornata timbratura`;
    } else if (operation === "delete") {
      details = `Eliminata timbratura`;
    }
  } else if (table === "sanctions") {
    if (operation === "insert") {
      const type = query.insertData?.type;
      const typeLabel =
        type === "richiamo_verbale"
          ? "Richiamo Verbale"
          : type === "warn"
            ? "Warn"
            : type === "sospensione"
              ? "Sospensione"
              : type === "espulsione"
                ? "Espulsione"
                : type;
      details = `Assegnato provvedimento disciplinare (${typeLabel})`;
    } else if (operation === "update") {
      details = `Aggiornato provvedimento disciplinare`;
    } else if (operation === "delete") {
      details = `Eliminato provvedimento disciplinare`;
    }
  } else if (table === "safe_boxes") {
    details = `Aggiornato stato cassette di sicurezza`;
  } else if (table === "custom_roles") {
    details = `Modificato ruolo personalizzato: ${query.insertData?.name || query.updateData?.name || ""}`;
  } else if (table === "profiles") {
    details = `Aggiornato profilo utente: ${query.updateData?.display_name || ""}`;
  } else {
    details = `${operation.toUpperCase()} su tabella ${tableLabel}`;
  }

  const logEntry = {
    id: "log-" + Math.random().toString(36).substring(2, 15),
    user_id: userId,
    username: username,
    user_display_name: userDisplayName,
    action: operation,
    table_name: tableLabel,
    details: details,
    created_at: new Date().toISOString(),
  };

  db.audit_logs.unshift(logEntry); // Add to beginning of array

  // Keep last 1000 logs to prevent infinite size growth
  if (db.audit_logs.length > 1000) {
    db.audit_logs = db.audit_logs.slice(0, 1000);
  }
}

function recalculateNightsTotals(db: Record<string, any[]>) {
  const nights = db.nights || [];
  const nightItems = db.night_items || [];
  const totals: Record<string, number> = {};

  nightItems.forEach((item) => {
    if (item.night_id) {
      totals[item.night_id] = (totals[item.night_id] || 0) + Number(item.subtotal || 0);
    }
  });

  db.nights = nights.map((night) => ({
    ...night,
    total: totals[night.id] || 0,
  }));
}

function runAutoCloseActiveSessions(db: any): boolean {
  let modified = false;
  db.badge_sessions = db.badge_sessions || [];
  const now = new Date();

  db.badge_sessions = db.badge_sessions.map((s: any) => {
    if (!s.ended_at && s.started_at) {
      const startTime = new Date(s.started_at);
      const diffMs = now.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Auto-close sessions that exceed 12 hours of continuous run
      if (diffHours >= 12) {
        modified = true;
        const autoEndTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000).toISOString();

        // Clear badge_start_time for the user in profiles so they can start fresh
        const prof = (db.profiles || []).find((p: any) => p.id === s.user_id);
        if (prof) {
          prof.badge_start_time = null;
        }

        return {
          ...s,
          ended_at: autoEndTime,
          updated_at: now.toISOString(),
        };
      }
    }
    return s;
  });

  return modified;
}

function runAutoCreateJobs(db: Record<string, any[]>): boolean {
  let modified = false;
  try {
    const now = new Date();

    // Auto-close active sessions exceeding 12 hours
    if (runAutoCloseActiveSessions(db)) {
      modified = true;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const dateMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const year = parseInt(dateMap.year);
    const month = parseInt(dateMap.month);
    const day = parseInt(dateMap.day);
    const hour = parseInt(dateMap.hour);

    const businessDate = new Date(
      year,
      month - 1,
      day,
      hour,
      parseInt(dateMap.minute ?? "0"),
      parseInt(dateMap.second ?? "0"),
    );
    if (hour < 3) {
      businessDate.setDate(businessDate.getDate() - 1);
    }

    const busYear = businessDate.getFullYear();
    const busMonth = String(businessDate.getMonth() + 1).padStart(2, "0");
    const busDay = String(businessDate.getDate()).padStart(2, "0");
    const targetNightDate = `${busYear}-${busMonth}-${busDay}`;

    db.nights = db.nights || [];
    const nightExists = db.nights.some((n: any) => n.night_date === targetNightDate);

    if (!nightExists) {
      console.log(`[Auto Job] Creating new business day (giornata) for date: ${targetNightDate}`);

      db.nights = db.nights.map((n: any) => {
        if (!n.is_closed) {
          modified = true;
          return { ...n, is_closed: true, updated_at: new Date().toISOString() };
        }
        return n;
      });

      const newNight = {
        id: "night-" + Math.random().toString(36).substring(2, 12),
        night_date: targetNightDate,
        title: `Giornata del ${busDay}/${busMonth}/${busYear}`,
        total: 0,
        is_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: "Creata automaticamente dal sistema",
      };
      db.nights.push(newNight);
      modified = true;
    }

    // Super-robust Europe/Rome calculation to find current week's Monday
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      weekday: "short",
    }).format(now); // "Mon", "Tue", etc.
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDay = weekdays.indexOf(weekdayShort);
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;

    const romeMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const mondayDate = new Date(romeMidnight.getTime() + mondayDiff * 24 * 60 * 60 * 1000);

    const monYear = mondayDate.getUTCFullYear();
    const monMonth = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
    const monDay = String(mondayDate.getUTCDate()).padStart(2, "0");
    const currentMondayStr = `${monYear}-${monMonth}-${monDay}`;

    db.badge_weeks = db.badge_weeks || [];
    db.badge_sessions = db.badge_sessions || [];

    const activeWeek = db.badge_weeks.find((w: any) => w.active);
    const needsNewWeek =
      !activeWeek || (activeWeek.started_at && activeWeek.started_at < currentMondayStr);

    if (needsNewWeek) {
      console.log(`[Auto Job] Creating new badge week starting on Monday: ${currentMondayStr}`);

      if (activeWeek) {
        db.badge_weeks = db.badge_weeks.map((w: any) => {
          if (w.id === activeWeek.id) {
            modified = true;
            return {
              ...w,
              active: false,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return w;
        });

        // Automatically close all active badge sessions from the old week
        db.badge_sessions = db.badge_sessions.map((s: any) => {
          if (s.week_id === activeWeek.id && !s.ended_at) {
            modified = true;
            // Clear badge_start_time for the user in profiles so they can start fresh
            const prof = (db.profiles || []).find((p: any) => p.id === s.user_id);
            if (prof) {
              prof.badge_start_time = null;
            }
            return {
              ...s,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });
      }

      const monYearTwo = String(monYear).slice(-2);
      const monMonthStr = String(monMonth).padStart(2, "0");
      const monDayStr = String(monDay).padStart(2, "0");

      const sundayDate = new Date(mondayDate);
      sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
      const sunYearTwo = String(sundayDate.getUTCFullYear()).slice(-2);
      const sunMonthStr = String(sundayDate.getUTCMonth() + 1).padStart(2, "0");
      const sunDayStr = String(sundayDate.getUTCDate()).padStart(2, "0");

      const weekLabel = `Settimana dal ${monDayStr}/${monMonthStr}/${monYearTwo} - ${sunDayStr}/${sunMonthStr}/${sunYearTwo}`;

      const newWeekId = "week-" + Math.random().toString(36).substring(2, 12);
      const newWeek = {
        id: newWeekId,
        label: weekLabel,
        active: true,
        started_at: currentMondayStr,
        ended_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "system",
      };
      db.badge_weeks.push(newWeek);
      modified = true;
    }
  } catch (error) {
    console.error("Error in runAutoCreateJobs:", error);
  }
  return modified;
}

function matchFilters(item: any, table: string, filters: any[]): boolean {
  for (const filter of filters) {
    const { column, value, op } = filter;
    let itemVal = item[column];
    if (column === "active" && table === "services" && itemVal === undefined) {
      itemVal = true;
    }

    if (op === "eq") {
      if (itemVal !== value) {
        if (
          itemVal !== undefined &&
          itemVal !== null &&
          value !== undefined &&
          value !== null &&
          String(itemVal).trim().toLowerCase() === String(value).trim().toLowerCase()
        ) {
          // match despite string/number format
        } else {
          return false;
        }
      }
    } else if (op === "neq") {
      if (itemVal === value) return false;
      if (
        itemVal !== undefined &&
        itemVal !== null &&
        value !== undefined &&
        value !== null &&
        String(itemVal).trim().toLowerCase() === String(value).trim().toLowerCase()
      ) {
        return false;
      }
    } else if (op === "is") {
      if (value === null) {
        if (itemVal !== null && itemVal !== undefined) return false;
      } else {
        if (itemVal !== value) return false;
      }
    } else if (op === "in") {
      if (!Array.isArray(value) || !value.includes(itemVal)) return false;
    } else if (op === "ilike") {
      if (typeof itemVal !== "string" || typeof value !== "string") {
        if (String(itemVal).toLowerCase() !== String(value).toLowerCase()) return false;
      } else {
        const cleanValue = value.replace(/%/g, ".*");
        const regex = new RegExp(`^${cleanValue}$`, "i");
        if (!regex.test(itemVal)) return false;
      }
    }
  }
  return true;
}

export async function queryMockDb(query: any): Promise<{ data: any; error: any }> {
  const db = await loadDb();

  const modified = runAutoCreateJobs(db);
  if (modified) {
    await saveDb(db);
  }

  const {
    table,
    operation,
    selectColumns,
    filters = [],
    orderBy,
    limitCount,
    insertData,
    updateData,
    isMaybeSingle,
    isSingle,
    name,
    args,
  } = query;

  // Check if maintenance mode is active (exclude changes to maintenance_settings itself, so admins can turn it off)
  const isMaintenanceActive =
    db.maintenance_settings?.some((s: any) => s.id === "global" && s.is_maintenance) || false;
  if (isMaintenanceActive && table !== "maintenance_settings") {
    let isAdmin = false;
    const session = await getActiveSession(db);
    if (session && session.user) {
      const userId = session.user.id;
      const userRoles = db.user_roles || [];
      const profiles = db.profiles || [];
      const profile = profiles.find((p: any) => p.id === userId);
      const userCustomRoles = db.user_custom_roles || [];
      const customRoles = db.custom_roles || [];

      const isUserRoleAdmin = userRoles.some(
        (ur: any) =>
          ur.user_id === userId &&
          (ur.role === "admin" || ur.role === "gestore" || ur.role === "capitano"),
      );
      const isCustomRoleAdmin =
        userCustomRoles.some(
          (ucr: any) =>
            ucr.user_id === userId &&
            (ucr.custom_role_id === "crole-admin" ||
              ucr.custom_role_id === "crole-gestore" ||
              ucr.custom_role_id === "crole-1" ||
              ucr.custom_role_id === "5d7eafafjmu"),
        ) ||
        userCustomRoles.some((ucr: any) => {
          if (ucr.user_id !== userId) return false;
          const cr = customRoles.find((c: any) => c.id === ucr.custom_role_id);
          if (!cr) return false;
          const name = (cr.name || "").toLowerCase();
          return (
            name.includes("admin") ||
            name.includes("capitano") ||
            name.includes("direzione") ||
            name.includes("gestore") ||
            (cr.permissions &&
              (cr.permissions.includes("utenti.gestisci") ||
                cr.permissions.includes("ruoli.gestisci")))
          );
        });

      isAdmin =
        profile?.role === "admin" ||
        profile?.username?.toLowerCase() === "admin" ||
        profile?.username?.toLowerCase() === "giuse84pro" ||
        isUserRoleAdmin ||
        isCustomRoleAdmin;
    }

    // Block write operations for non-admins
    const isWrite =
      ["insert", "update", "delete", "upsert"].includes(operation) ||
      (operation === "rpc" && !["is_admin", "user_permissions", "has_permission"].includes(name));
    if (isWrite && !isAdmin && !query.isServiceRole) {
      return {
        data: null,
        error: {
          message:
            "Il sistema è attualmente in manutenzione. Tutte le operazioni di scrittura sono bloccate.",
        },
      };
    }
  }

  // Handle RPCs
  if (operation === "rpc") {
    if (name === "force_db_reload") {
      lastLoadedTime = 0; // Expire cache TTL
      isInitializing = false; // Force re-fetch
      return { data: null, error: null };
    }

    if (name === "user_permissions") {
      const userId = args._user_id;
      // Get custom roles for user
      const userCustomRoles = db.user_custom_roles || [];
      const customRoles = db.custom_roles || [];
      const assignedRoleIds = userCustomRoles
        .filter((ucr: any) => ucr.user_id === userId)
        .map((ucr: any) => ucr.custom_role_id);

      const permissionsSet = new Set<string>();
      customRoles
        .filter((cr: any) => assignedRoleIds.includes(cr.id))
        .forEach((cr: any) => {
          (cr.permissions || []).forEach((p: string) => permissionsSet.add(p));
        });

      return { data: Array.from(permissionsSet), error: null };
    }
    if (name === "is_admin") {
      const userId = args._user_id;
      const userRoles = db.user_roles || [];
      const profiles = db.profiles || [];
      const userCustomRoles = db.user_custom_roles || [];
      const prof = profiles.find((p: any) => p.id === userId);
      const isUserRoleAdmin = userRoles.some(
        (ur: any) =>
          ur.user_id === userId &&
          (ur.role === "admin" || ur.role === "gestore" || ur.role === "capitano"),
      );
      const isCustomRoleAdmin =
        userCustomRoles.some(
          (ucr: any) =>
            ucr.user_id === userId &&
            (ucr.custom_role_id === "crole-admin" ||
              ucr.custom_role_id === "crole-gestore" ||
              ucr.custom_role_id === "crole-1" ||
              ucr.custom_role_id === "5d7eafafjmu"),
        ) ||
        userCustomRoles.some((ucr: any) => {
          if (ucr.user_id !== userId) return false;
          const cr = (db.custom_roles || []).find((c: any) => c.id === ucr.custom_role_id);
          if (!cr) return false;
          const name = (cr.name || "").toLowerCase();
          return (
            name.includes("admin") ||
            name.includes("capitano") ||
            name.includes("direzione") ||
            name.includes("gestore") ||
            (cr.permissions &&
              (cr.permissions.includes("utenti.gestisci") ||
                cr.permissions.includes("ruoli.gestisci")))
          );
        });
      const isAdmin =
        isUserRoleAdmin ||
        isCustomRoleAdmin ||
        prof?.role === "admin" ||
        prof?.role === "gestore" ||
        prof?.username?.toLowerCase() === "admin" ||
        prof?.username?.toLowerCase() === "giuse84pro";
      return { data: !!isAdmin, error: null };
    }
    if (name === "has_permission") {
      const userId = args._user_id;
      const perm = args._perm;
      const userRoles = db.user_roles || [];
      const profiles = db.profiles || [];
      const prof = profiles.find((p: any) => p.id === userId);
      const isUserRoleAdmin = userRoles.some(
        (ur: any) =>
          ur.user_id === userId &&
          (ur.role === "admin" || ur.role === "gestore" || ur.role === "capitano"),
      );
      if (isUserRoleAdmin || prof?.role === "admin" || prof?.username?.toLowerCase() === "admin") {
        return { data: true, error: null };
      }

      const userCustomRoles = db.user_custom_roles || [];
      const customRoles = db.custom_roles || [];
      const assignedRoleIds = userCustomRoles
        .filter((ucr: any) => ucr.user_id === userId)
        .map((ucr: any) => ucr.custom_role_id);

      const hasPerm = customRoles
        .filter((cr: any) => assignedRoleIds.includes(cr.id))
        .some((cr: any) => (cr.permissions || []).includes(perm));

      return { data: hasPerm, error: null };
    }
    if (name === "conversion_usage") {
      const citizenId = args._citizen;
      const nightId = args._night;
      const direction = args._direction;

      const resets = db.conversion_resets || [];
      const resetsForDir = resets.filter(
        (r: any) =>
          r.citizen_id === citizenId && r.night_id === nightId && r.direction === direction,
      );
      let lastResetTime = 0;
      if (resetsForDir.length > 0) {
        lastResetTime = Math.max(
          ...resetsForDir.map((r: any) => new Date(r.reset_at || r.created_at).getTime()),
        );
      }

      const conversions = db.conversions || [];
      const relevantConversions = conversions.filter(
        (c: any) =>
          c.citizen_id === citizenId &&
          c.night_id === nightId &&
          c.direction === direction &&
          new Date(c.created_at).getTime() > lastResetTime,
      );

      const total = relevantConversions.reduce((sum: number, c: any) => {
        if (direction === "cash_to_dobloni") {
          return sum + Number(c.eur_amount || 0);
        } else {
          return sum + Number(c.dobloni_amount || 0);
        }
      }, 0);

      return { data: total, error: null };
    }
    if (name === "perform_conversion") {
      const citizenId = args._citizen;
      const nightId = args._night;
      const direction = args._direction;
      const input = Number(args._input);

      if (!citizenId || !nightId) {
        return { data: null, error: { message: "Seleziona cittadino e serata" } };
      }
      if (isNaN(input) || input <= 0) {
        return { data: null, error: { message: "Importo non valido" } };
      }

      const settingsList = db.conversion_settings || [];
      const settings = settingsList[0] || { max_dobloni_per_day: 10000, max_eur_per_day: 2000 };
      const maxEur = Number(settings.max_eur_per_day ?? 2000);
      const maxDob = Number(settings.max_dobloni_per_day ?? 10000);

      let eur = 0;
      let dob = 0;
      let limit = 0;
      let requested = 0;

      if (direction === "cash_to_dobloni") {
        eur = input;
        dob = input * 10;
        requested = eur;
        limit = maxEur;
      } else {
        dob = input;
        eur = input * 0.075; // 75% rate
        requested = dob;
        limit = maxDob;

        if (dob < 40) {
          return { data: null, error: { message: "Minimo 40 dobloni per la conversione" } };
        }
        if (dob % 40 !== 0) {
          return {
            data: null,
            error: { message: "L'importo deve essere un multiplo di 40 dobloni" },
          };
        }
      }

      const resets = db.conversion_resets || [];
      const resetsForDir = resets.filter(
        (r: any) =>
          r.citizen_id === citizenId && r.night_id === nightId && r.direction === direction,
      );
      let lastResetTime = 0;
      if (resetsForDir.length > 0) {
        lastResetTime = Math.max(
          ...resetsForDir.map((r: any) => new Date(r.reset_at || r.created_at).getTime()),
        );
      }

      const conversions = db.conversions || [];
      const relevantConversions = conversions.filter(
        (c: any) =>
          c.citizen_id === citizenId &&
          c.night_id === nightId &&
          c.direction === direction &&
          new Date(c.created_at).getTime() > lastResetTime,
      );

      const usage = relevantConversions.reduce((sum: number, c: any) => {
        if (direction === "cash_to_dobloni") {
          return sum + Number(c.eur_amount || 0);
        } else {
          return sum + Number(c.dobloni_amount || 0);
        }
      }, 0);

      if (usage + requested > limit) {
        return {
          data: null,
          error: {
            message: `Limite giornaliero superato: rimasti ${Math.max(0, limit - usage)} (richiesti ${requested})`,
          },
        };
      }

      const session = await getActiveSession(db);
      const creatorId = session?.user?.id || "mock-user-id-1234";

      const newConversion = {
        id: "conv-" + Math.random().toString(36).substring(2, 15),
        citizen_id: citizenId,
        night_id: nightId,
        direction,
        input_amount: input,
        eur_amount: eur,
        dobloni_amount: dob,
        created_by: creatorId,
        created_at: new Date().toISOString(),
      };

      db.conversions = [...conversions, newConversion];
      logOperation(db, "rpc", undefined, query, { data: newConversion });
      await saveDb(db);

      return { data: newConversion, error: null };
    }
    return { data: null, error: { message: `RPC ${name} not implemented in mock` } };
  }

  if (!table) {
    return { data: null, error: { message: "No table specified" } };
  }

  if (!db[table]) {
    db[table] = [];
  }

  const items = db[table];

  if (operation === "select") {
    let filtered = [...items];

    if (table === "badge_sessions") {
      filtered = filtered.map((item) => ({
        ...item,
        started_at: item.started_at || item.created_at || new Date().toISOString(),
      }));
    }
    if (table === "badge_weeks") {
      filtered = filtered.map((item) => ({
        ...item,
        started_at: item.started_at || item.created_at || new Date().toISOString(),
      }));
    }

    // Apply filters
    filtered = filtered.filter((item) => matchFilters(item, table, filters));

    // Apply sorting
    if (orderBy) {
      const { column, ascending } = orderBy;
      filtered.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const cmp = valA < valB ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }

    // Apply limit
    if (limitCount !== null && limitCount !== undefined) {
      filtered = filtered.slice(0, limitCount);
    }

    // Handle nested joins
    // e.g. select("*, citizens(full_name)") or select("*, custom_roles(name)")
    const cleanSelect = selectColumns ? selectColumns.replace(/\s+/g, "") : "";
    if (
      cleanSelect &&
      (cleanSelect.includes("citizens(") ||
        cleanSelect.includes("custom_roles(") ||
        cleanSelect.includes("user_roles(") ||
        cleanSelect.includes("nights(") ||
        cleanSelect.includes("application_forms(") ||
        cleanSelect.includes("service_categories("))
    ) {
      filtered = filtered.map((item) => {
        const newItem = { ...item };
        if (table === "applications") {
          const forms = db.application_forms || [];
          const form = forms.find((f: any) => f.id === item.form_id);
          newItem.application_forms = form ? { ...form } : null;
        }
        if (table === "profiles") {
          const userRoles = db.user_roles || [];
          const customRoles = db.custom_roles || [];
          const userCustomRoles = db.user_custom_roles || [];

          newItem.user_roles = userRoles
            .filter((ur: any) => ur.user_id === item.id)
            .map((ur: any) => ({ role: ur.role }));

          const assignedRoleIds = userCustomRoles
            .filter((ucr: any) => ucr.user_id === item.id)
            .map((ucr: any) => ucr.custom_role_id);

          newItem.custom_roles = customRoles
            .filter((cr: any) => assignedRoleIds.includes(cr.id))
            .map((cr: any) => ({ id: cr.id, name: cr.name }));

          const activeSess = (db.badge_sessions || []).find(
            (s: any) => s.user_id === item.id && !s.ended_at,
          );
          newItem.badge_start_time = item.badge_start_time || activeSess?.started_at || null;
        }
        if (
          table === "safe_boxes" ||
          table === "stables" ||
          table === "conversions" ||
          table === "conversion_resets" ||
          table === "purchased_services" ||
          table === "night_items"
        ) {
          const citizens = db.citizens || [];
          const citizen = citizens.find((c: any) => c.id === item.citizen_id);
          newItem.citizens = citizen ? { ...citizen } : null;
        }
        if (
          table === "conversions" ||
          table === "conversion_resets" ||
          table === "purchased_services" ||
          table === "night_items"
        ) {
          const nights = db.nights || [];
          const night = nights.find((n: any) => n.id === item.night_id);
          newItem.nights = night ? { night_date: night.night_date, title: night.title } : null;
        }
        if (table === "user_custom_roles") {
          const customRoles = db.custom_roles || [];
          const customRole = customRoles.find((r: any) => r.id === item.custom_role_id);
          newItem.custom_roles = customRole ? { ...customRole } : null;
        }
        if (table === "services") {
          const categories = db.service_categories || [];
          const category = categories.find((c: any) => c.id === item.category_id);
          newItem.service_categories = category
            ? { name: category.name, sort_order: category.sort_order }
            : null;
        }
        return newItem;
      });
    }

    if (isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { message: "No rows found", code: "PGRST116" } };
      }
      return { data: filtered[0], error: null };
    }

    if (isMaybeSingle) {
      return { data: filtered[0] || null, error: null };
    }

    return { data: filtered, error: null };
  }

  if (operation === "insert") {
    const rowsToInsert = Array.isArray(insertData) ? insertData : [insertData];

    // Block duplicate citizens based on trimmed, case-insensitive full_name
    if (table === "citizens") {
      for (const row of rowsToInsert) {
        const fullName = (row.full_name || "").trim();
        const existingCitizen = (db.citizens || []).find(
          (c: any) => c.full_name?.trim().toLowerCase() === fullName.toLowerCase(),
        );
        if (existingCitizen) {
          return {
            data: null,
            error: { message: `Un cittadino con il nome "${fullName}" è già registrato.` },
          };
        }
      }
    }

    const insertedRows = rowsToInsert.map((row) => {
      const base: any = {
        id: row.id || Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(table === "services" ? { active: true } : {}),
        ...row,
      };

      if (table === "badge_sessions") {
        base.started_at = row.started_at || base.created_at;
        if (row.ended_at === undefined) {
          base.ended_at = null;
        }
        // Auto-close any existing active badge sessions for this user to prevent overlaps
        if (!base.ended_at) {
          db.badge_sessions = db.badge_sessions || [];
          db.badge_sessions.forEach((s: any) => {
            if (s.user_id === base.user_id && !s.ended_at) {
              s.ended_at = base.started_at || new Date().toISOString();
              s.updated_at = new Date().toISOString();
            }
          });
        }
        const prof = (db.profiles || []).find((p: any) => p.id === base.user_id);
        if (prof) {
          prof.badge_start_time = base.started_at;
        }
      }

      if (table === "badge_weeks") {
        base.started_at = row.started_at || base.created_at;
        base.active = row.active !== undefined ? row.active : true;
        if (row.ended_at === undefined) {
          base.ended_at = null;
        }
      }

      return base;
    });

    db[table] = [...db[table], ...insertedRows];
    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    if (table === "sanctions" || table === "leave_requests") {
      insertedRows.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
    }
    logOperation(db, operation, table, query, { data: insertedRows });
    await saveDb(db);

    // Asynchronously dispatch any active Telegram Notification rules without blocking DB response
    if (typeof window === "undefined") {
      import("../../lib/telegram.server")
        .then(({ dispatchDbEventNotifications }) => {
          dispatchDbEventNotifications(operation, table, insertedRows, db).catch(() => {});
        })
        .catch(() => {});
    }

    return { data: Array.isArray(insertData) ? insertedRows : insertedRows[0], error: null };
  }

  if (operation === "upsert") {
    const rowsToUpsert = Array.isArray(insertData) ? insertData : [insertData];
    const results: any[] = [];

    db[table] = db[table] || [];

    for (const row of rowsToUpsert) {
      let existingIndex = -1;
      if (row.id) {
        existingIndex = db[table].findIndex((item: any) => item.id === row.id);
      }
      if (existingIndex === -1 && table === "telegram_groups" && row.chat_id) {
        existingIndex = db[table].findIndex(
          (item: any) => String(item.chat_id) === String(row.chat_id),
        );
      } else if (existingIndex === -1 && table === "telegram_group_members") {
        existingIndex = db[table].findIndex(
          (item: any) =>
            (String(item.chat_id) === String(row.chat_id) ||
              (row.group_id && item.group_id === row.group_id)) &&
            String(item.telegram_user_id) === String(row.telegram_user_id),
        );
      } else if (table === "user_roles") {
        existingIndex = db[table].findIndex(
          (item: any) => item.user_id === row.user_id && item.role === row.role,
        );
      } else if (table === "user_custom_roles") {
        existingIndex = db[table].findIndex(
          (item: any) => item.user_id === row.user_id && item.custom_role_id === row.custom_role_id,
        );
      } else if (table === "maintenance_settings") {
        existingIndex = db[table].findIndex((item: any) => item.id === row.id);
      } else if (table === "telegram_pending_codes") {
        const targetCode = String(row.code || row.id || "").trim();
        existingIndex = db[table].findIndex(
          (item: any) =>
            String(item.code || item.id || "").trim() === targetCode ||
            (row.id && String(item.id).trim() === String(row.id).trim()),
        );
      } else if (table === "telegram_chat_messages") {
        existingIndex = db[table].findIndex(
          (item: any) =>
            item.id === row.id ||
            (String(item.chat_id) === String(row.chat_id) &&
              item.message_id !== undefined &&
              item.message_id === row.message_id),
        );
      } else if (table === "telegram_notification_rules") {
        existingIndex = db[table].findIndex(
          (item: any) =>
            item.id === row.id || (row.event_type && item.event_type === row.event_type),
        );
      }

      if (existingIndex !== -1) {
        const updated = {
          ...db[table][existingIndex],
          ...row,
          updated_at: new Date().toISOString(),
        };
        db[table][existingIndex] = updated;
        results.push(updated);
      } else {
        const inserted = {
          id: row.id || Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row,
        };
        db[table].push(inserted);
        results.push(inserted);
      }
    }

    if (table === "telegram_chat_messages" && Array.isArray(db.telegram_chat_messages)) {
      // Auto-prune per chat to maintain max 150 recent messages per chat to keep db ultra lightweight
      const chatBuckets: Record<string, any[]> = {};
      for (const m of db.telegram_chat_messages) {
        const cKey = String(m.chat_id || "");
        if (!chatBuckets[cKey]) chatBuckets[cKey] = [];
        chatBuckets[cKey].push(m);
      }
      const prunedList: any[] = [];
      for (const cKey in chatBuckets) {
        chatBuckets[cKey].sort((a: any, b: any) => (a.date || 0) - (b.date || 0));
        prunedList.push(...chatBuckets[cKey].slice(-150));
      }
      db.telegram_chat_messages = prunedList;
    }

    if (table === "sanctions" || table === "leave_requests") {
      results.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
    }
    logOperation(db, operation, table, query, { data: results });
    await saveDb(db);

    if (typeof window === "undefined") {
      import("../../lib/telegram.server")
        .then(({ dispatchDbEventNotifications }) => {
          dispatchDbEventNotifications(operation, table, results, db).catch(() => {});
        })
        .catch(() => {});
    }

    return { data: Array.isArray(insertData) ? results : results[0], error: null };
  }

  if (operation === "update") {
    // Block duplicate citizens based on trimmed, case-insensitive full_name upon updating
    if (table === "citizens" && updateData && updateData.full_name !== undefined) {
      const newName = (updateData.full_name || "").trim();
      const matches = (db.citizens || []).filter((item: any) => matchFilters(item, table, filters));
      for (const m of matches) {
        const duplicate = (db.citizens || []).find(
          (c: any) => c.id !== m.id && c.full_name?.trim().toLowerCase() === newName.toLowerCase(),
        );
        if (duplicate) {
          return {
            data: null,
            error: { message: `Un cittadino con il nome "${newName}" è già registrato.` },
          };
        }
      }
    }

    const updatedRows: any[] = [];
    db[table] = (db[table] || []).map((item: any) => {
      if (matchFilters(item, table, filters)) {
        const updated = { ...item, ...updateData, updated_at: new Date().toISOString() };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    if (table === "maintenance_settings" && updatedRows.length === 0) {
      const created = {
        id: "global",
        is_maintenance: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updateData,
      };
      db.maintenance_settings = [created];
      updatedRows.push(created);
    }

    if (table === "badge_sessions") {
      updatedRows.forEach((row) => {
        if (row.ended_at) {
          const prof = (db.profiles || []).find((p: any) => p.id === row.user_id);
          if (prof) {
            prof.badge_start_time = null;
          }
        }
      });
    }

    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    if (table === "sanctions" || table === "leave_requests") {
      updatedRows.forEach((row) => checkAndTerminateActiveSessionsForUser(db, row.user_id));
    }
    logOperation(db, operation, table, query, { data: updatedRows });
    await saveDb(db);

    if (typeof window === "undefined") {
      import("../../lib/telegram.server")
        .then(({ dispatchDbEventNotifications }) => {
          dispatchDbEventNotifications(operation, table, updatedRows, db).catch(() => {});
        })
        .catch(() => {});
    }

    return { data: updatedRows, error: null };
  }

  if (operation === "delete") {
    const deletedRows: any[] = [];
    db[table] = db[table].filter((item) => {
      if (matchFilters(item, table, filters)) {
        deletedRows.push(item);
        return false;
      }
      return true;
    });

    if (table === "night_items") {
      recalculateNightsTotals(db);
    }
    logOperation(db, operation, table, query, { data: deletedRows });
    await saveDb(db);
    return { data: deletedRows, error: null };
  }

  return { data: null, error: { message: `Operation ${operation} not implemented` } };
}

export async function handleMockAuth(query: any): Promise<any> {
  const db = await loadDb();
  const { action, payload } = query;

  if (action === "getSession") {
    const session = await getActiveSession(db);
    return { data: { session }, error: null };
  }

  if (action === "getUser") {
    const session = await getActiveSession(db);
    return { data: { user: session?.user ?? null }, error: null };
  }

  if (action === "signUp") {
    const { email, password, options } = payload;
    // Safely check both options (standard auth) and direct user_metadata (admin.createUser auth)
    const username =
      payload.user_metadata?.username || options?.data?.username || email.split("@")[0];
    const display_name =
      payload.user_metadata?.display_name || options?.data?.display_name || username;

    const existingUser = db.profiles.find(
      (p) => p.username && p.username.toLowerCase() === username.toLowerCase(),
    );
    if (existingUser) {
      return { data: { user: null }, error: { message: "Utente già esistente." } };
    }

    const newUserId = "user-" + Math.random().toString(36).substring(2, 15);
    const newProfile = {
      id: newUserId,
      username,
      display_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // Auto-role assignment: first is admin, others are staff
    const role = db.profiles.length === 1 ? "admin" : "staff";
    db.user_roles.push({
      id: "role-" + Math.random().toString(36).substring(2, 15),
      user_id: newUserId,
      role,
    });

    const { clientIp, userAgentStr, browser, deviceType } = parseClientInfo();
    const sessionId = `sess-${newUserId}-${Date.now()}`;
    db.user_sessions = db.user_sessions || [];
    db.user_sessions.push({
      id: sessionId,
      user_id: newUserId,
      username,
      display_name,
      ip_address: clientIp,
      browser,
      device_type: deviceType,
      user_agent: userAgentStr,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      is_revoked: false,
    });

    await saveDb(db);

    // Save as current active mock session
    const mockUser = {
      id: newUserId,
      email,
      user_metadata: { username, display_name },
    };
    // Return session
    const session = {
      access_token: `mock-token-${newUserId}`,
      session_id: sessionId,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    };

    return { data: { user: mockUser, session }, error: null };
  }

  if (action === "signInWithPassword") {
    const { email, password } = payload;
    // Safe username extraction that handles emails properly by removing the @revenge.local suffix instead of just splitting
    const rawUsername = email
      .replace(/@revenge\.local$/i, "")
      .trim()
      .toLowerCase();

    // Map common admin/user aliases to the actual database admin username
    const username =
      rawUsername === "admin" || rawUsername === "beppemonti84" ? "giuse84pro" : rawUsername;
    // Super robust trimming and case-insensitive check
    let profile = db.profiles.find(
      (p) => p.username && p.username.trim().toLowerCase() === username.trim().toLowerCase(),
    );

    // Dynamic robust fallback: If we look for the main administrator and "giuse84pro" profile
    // doesn't exist yet, fallback to finding "admin" or the first profile in the database
    if (
      !profile &&
      (username === "giuse84pro" || rawUsername === "admin" || rawUsername === "beppemonti84")
    ) {
      profile =
        db.profiles.find((p) => p.username && p.username.trim().toLowerCase() === "admin") ||
        db.profiles[0];
    }

    if (!profile) {
      return { data: { session: null }, error: { message: "Credenziali non valide." } };
    }

    const clientInfo = parseClientInfo();
    const sessionId = `sess-${profile.id}-${Date.now()}`;
    db.user_sessions = db.user_sessions || [];

    // Check if there is an active session for this user/ip/browser or create new
    db.user_sessions.push({
      id: sessionId,
      user_id: profile.id,
      username: profile.username || "user",
      display_name: profile.display_name || profile.username || "Utente",
      ip_address: clientInfo.clientIp,
      country_code: clientInfo.countryCode,
      country_name: clientInfo.countryName,
      country_flag: clientInfo.countryFlag,
      cf_ray: clientInfo.cfRay,
      is_cloudflare: clientInfo.isCloudflare,
      browser: clientInfo.browser,
      device_type: clientInfo.deviceType,
      user_agent: clientInfo.userAgentStr,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      is_revoked: false,
    });

    await saveDb(db);

    const mockUser = {
      id: profile.id,
      email,
      user_metadata: {
        username: profile.username || "user",
        display_name: profile.display_name || profile.username || "Collaboratore",
      },
    };

    const session = {
      access_token: `mock-token-${profile.id}`,
      session_id: sessionId,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockUser,
    };

    return { data: { user: mockUser, session }, error: null };
  }

  if (action === "syncUserSession") {
    const { userId, username, displayName, sessionId } = payload || {};
    if (!userId) {
      return { data: null, error: { message: "UserId required" } };
    }

    const clientInfo = parseClientInfo();
    db.user_sessions = db.user_sessions || [];

    // Check if there is an existing session by ID or matching active session for this user
    let existingSession = sessionId ? db.user_sessions.find((s: any) => s.id === sessionId) : null;

    if (!existingSession) {
      existingSession = db.user_sessions.find(
        (s: any) => s.user_id === userId && !s.is_revoked && s.ip_address === clientInfo.clientIp,
      );
    }

    const profile = db.profiles?.find((p: any) => p.id === userId);
    const resolvedUsername = username || profile?.username || "Utente";
    const resolvedDisplayName = displayName || profile?.display_name || resolvedUsername;

    if (existingSession) {
      if (existingSession.is_revoked) {
        return { data: { isRevoked: true, session: existingSession }, error: null };
      }
      existingSession.last_active = new Date().toISOString();
      existingSession.ip_address = clientInfo.clientIp;
      existingSession.country_code = clientInfo.countryCode;
      existingSession.country_name = clientInfo.countryName;
      existingSession.country_flag = clientInfo.countryFlag;
      existingSession.cf_ray = clientInfo.cfRay || existingSession.cf_ray;
      existingSession.is_cloudflare = clientInfo.isCloudflare;
      existingSession.browser = clientInfo.browser;
      existingSession.device_type = clientInfo.deviceType;
      existingSession.user_agent = clientInfo.userAgentStr;
      existingSession.username = resolvedUsername;
      existingSession.display_name = resolvedDisplayName;
    } else {
      const newSessionId = sessionId || `sess-${userId}-${Date.now()}`;
      existingSession = {
        id: newSessionId,
        user_id: userId,
        username: resolvedUsername,
        display_name: resolvedDisplayName,
        ip_address: clientInfo.clientIp,
        country_code: clientInfo.countryCode,
        country_name: clientInfo.countryName,
        country_flag: clientInfo.countryFlag,
        cf_ray: clientInfo.cfRay,
        is_cloudflare: clientInfo.isCloudflare,
        browser: clientInfo.browser,
        device_type: clientInfo.deviceType,
        user_agent: clientInfo.userAgentStr,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        is_revoked: false,
      };
      db.user_sessions.push(existingSession);
    }

    await saveDb(db);
    return { data: { isRevoked: false, session: existingSession }, error: null };
  }

  if (action === "getUserSessions") {
    const sessions = (db.user_sessions || []).map((s: any) => {
      const prof = db.profiles?.find((p: any) => p.id === s.user_id);
      return {
        ...s,
        username: prof?.username || s.username || "Utente",
        display_name: prof?.display_name || s.display_name || prof?.username || "Utente",
      };
    });
    return { data: sessions, error: null };
  }

  if (action === "revokeSession") {
    const { sessionId, userId } = payload || {};
    db.user_sessions = db.user_sessions || [];
    let modified = false;
    db.user_sessions.forEach((s: any) => {
      if (s.id === sessionId || (userId && s.user_id === userId && !sessionId)) {
        s.is_revoked = true;
        modified = true;
      }
    });
    if (modified) {
      await saveDb(db);
    }
    return { data: { success: true }, error: null };
  }

  if (action === "revokeAllSessions") {
    const { userId } = payload || {};
    db.user_sessions = db.user_sessions || [];
    let modified = false;
    db.user_sessions.forEach((s: any) => {
      if (!userId || s.user_id === userId) {
        s.is_revoked = true;
        modified = true;
      }
    });
    if (modified) {
      await saveDb(db);
    }
    return { data: { success: true }, error: null };
  }

  if (action === "signOut") {
    return { error: null };
  }

  return { data: null, error: { message: `Auth action ${action} not implemented` } };
}

function getActiveSessionSync(db: any) {
  try {
    let cookieHeader = "";
    if (typeof window !== "undefined") {
      cookieHeader = document.cookie || "";
    } else {
      try {
        if (getRequestModule) {
          const req = getRequestModule();
          cookieHeader = req?.headers?.get("cookie") || "";
        }
      } catch (err) {
        // ignore
      }
    }
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c: string) => {
        const parts = c.trim().split("=");
        return [parts[0], parts.slice(1).join("=")];
      }),
    );
    let userId = cookies["casino_userId"];
    if (!userId && typeof window !== "undefined") {
      const storedStr = localStorage.getItem("casinorevenge_session");
      if (storedStr) {
        try {
          const parsed = JSON.parse(storedStr);
          userId = parsed.session?.user?.id;
        } catch (e) {
          // ignore
        }
      }
    }
    if (userId) {
      const profile = db.profiles.find((p: any) => p.id === userId);
      if (profile) {
        db.user_sessions = db.user_sessions || [];
        // Ensure user has at least one active session recorded
        let activeSession = db.user_sessions.find(
          (s: any) => s.user_id === userId && !s.is_revoked,
        );
        if (!activeSession) {
          const { clientIp, userAgentStr, browser, deviceType } = parseClientInfo();
          activeSession = {
            id: `sess-${profile.id}-${Date.now()}`,
            user_id: profile.id,
            username: profile.username || "user",
            display_name: profile.display_name || profile.username || "Utente",
            ip_address: clientIp,
            browser,
            device_type: deviceType,
            user_agent: userAgentStr,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            is_revoked: false,
          };
          db.user_sessions.push(activeSession);
        } else {
          activeSession.last_active = new Date().toISOString();
        }

        return {
          access_token: `mock-token-${profile.id}`,
          session_id: activeSession.id,
          token_type: "bearer",
          expires_in: 86400,
          refresh_token: "mock-refresh",
          user: {
            id: profile.id,
            email: `${profile.username || "user"}@revenge.local`,
            user_metadata: {
              username: profile.username || "user",
              display_name: profile.display_name || profile.username || "Collaboratore",
            },
          },
        };
      }
    }
  } catch (e) {
    console.error("[Supabase Mock Server] Error reading session cookie synchronously:", e);
  }
  return null;
}

async function getActiveSession(db: any) {
  if (typeof window !== "undefined") {
    return getActiveSessionSync(db);
  }
  await getGetRequest();
  return getActiveSessionSync(db);
}

function checkAndTerminateActiveSessionsForUser(db: any, userId: string) {
  if (!userId) return false;
  const activeSanc = (db.sanctions || []).find((s: any) => {
    if (s.user_id !== userId || !s.is_active) return false;
    if (s.type === "espulsione") return true;
    if (s.type === "sospensione") {
      if (!s.expires_at) return true;
      return new Date(s.expires_at) > new Date();
    }
    return false;
  });

  const activeLv = (db.leave_requests || []).find((l: any) => {
    if (l.user_id !== userId || l.status !== "approved") return false;
    const todayStr = new Date().toISOString().split("T")[0];
    return todayStr >= l.start_date && todayStr <= l.end_date;
  });

  if (activeSanc || activeLv) {
    let closedAny = false;
    (db.badge_sessions || []).forEach((sess: any) => {
      if (sess.user_id === userId && sess.ended_at === null) {
        sess.ended_at = new Date().toISOString();
        closedAny = true;
      }
    });
    if (closedAny) {
      const prof = (db.profiles || []).find((p: any) => p.id === userId);
      if (prof) {
        prof.badge_start_time = null;
      }
    }
    return closedAny;
  }
  return false;
}
