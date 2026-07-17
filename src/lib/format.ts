export const formatMoney = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
};

export const formatDobloni = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(v)} ⛃`;
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT");
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("it-IT");
};

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@revenge.local`;

export const emailToUsername = (email: string | null | undefined) => (email ?? "").split("@")[0];

export const MEMBERSHIP_LABEL: Record<string, string> = {
  standard: "Standard",
  exclusive: "Exclusive",
  elite: "Èlite",
  vip: "VIP",
};

export const PERMISSIONS: { key: string; label: string }[] = [
  { key: "cittadini.read", label: "Vedere cittadini" },
  { key: "cittadini.write", label: "Modificare cittadini" },
  { key: "serate.crea", label: "Creare nuove serate" },
  { key: "serate.gestisci", label: "Aggiungere cittadini e pass alle serate" },
  { key: "serate.consulta", label: "Consultare pass e membership di un cittadino in serata" },
  { key: "serate.incassi", label: "Vedere gli incassi totali delle serate" },
  { key: "servizi.read", label: "Vedere catalogo servizi" },
  { key: "servizi.write", label: "Modificare catalogo servizi" },
  { key: "corse.read", label: "Vedere corse dei cavalli" },
  { key: "corse.write", label: "Gestire corse dei cavalli" },
  { key: "cassette.read", label: "Vedere cassette di sicurezza" },
  { key: "cassette.write", label: "Gestire cassette di sicurezza" },
  { key: "badge.timbra", label: "Timbrare il cartellino" },
  { key: "badge.visualizza", label: "Vedere chi è attivo e lo storico timbrature" },
  { key: "badge.settimane", label: "Aprire e chiudere settimane di lavoro" },
  { key: "badge.gestisci", label: "Forzare apertura/chiusura badge altrui" },
  { key: "conversioni.esegui", label: "Eseguire conversioni Soldi/Dobloni" },
  { key: "conversioni.storico", label: "Vedere lo storico delle conversioni" },
  { key: "dipendenti.sanzioni", label: "Gestire sanzioni dei dipendenti" },
  { key: "congedi.gestisci", label: "Approvare o rifiutare richieste di congedo" },
];
