import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  FileSpreadsheet,
  Banknote,
  Copy,
  Info,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Trophy,
  CheckCircle2,
  Eye,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY_CSV_TEXT = "stipendi_cached_csv_text";
const STORAGE_KEY_CSV_FILENAME = "stipendi_cached_csv_filename";

export const Route = createFileRoute("/_authenticated/stipendi")({
  component: StipendiPage,
});

// Salary Matrix Base Rates according to Art. 6.2
const BASE_SALARIES: Record<string, number> = {
  Capitano: 5000,
  "Vice Capitano Exclusive": 4500,
  "Vice Capitano": 4500,
  Quartiermastro: 3800,
  Nostromo: 3200,
  "Caposala Exclusive": 2500,
  "Caposala VIP": 2130,
  "Caposala Sr.": 1750,
  "Caposala Jr.": 1470,
  Caposala: 1470, // Default generic Caposala
  "Croupier Exclusive": 1910,
  "Croupier VIP": 1620,
  "Croupier Sr.": 1370,
  "Croupier Jr.": 1130,
  Croupier: 1130, // Default generic Croupier
  "Barman Exclusive": 1810,
  "Barman VIP": 1520,
  "Barman Sr.": 1280,
  "Barman Jr.": 1080,
  Barman: 1080, // Default generic Barman
  "Dealer Sr.": 1200,
  "Dealer Jr.": 1000,
  Dealer: 1000, // Default generic Dealer
  Soubrette: 880,
  Mozzo: 750,
};

// PEX Bonuses (Art. 2.5)
const PEX_BONUSES: Record<string, number> = {
  master: 500,
  ge: 450,
  "gestore eventi": 450,
  gorilla: 350,
  sirena: 300,
  ra: 250,
  "responsabile antincendio": 250,
};

interface ParsedEmployeeCSV {
  username: string;
  nome: string;
  cognome: string;
  gradoPrincipale: string;
  ruoliSecondari: string;
  dataAssunzione: string;
  attivitaPassataStr: string;
  fatturatoPassato: number;
  scontriniPassati: number;
}

interface CalculatedSalaryRow extends ParsedEmployeeCSV {
  id: string;
  subLevelOverride?: string;
  totalMinutesPassati: number;
  hoursFormatted: string;
  minHoursRequired: number; // 4h for Direzione, 6h for others
  isEligible: boolean;
  baseSalary: number;
  provvigione: number;
  pexBonus: number;
  pexListDetected: string[];
  jokerScore: number;
  isJokerWinner: boolean;
  rawTotalSalary: number;
  reductionApplied: number;
  totalSalary: number;
  isDirezioneOrSottodirezione: boolean;
}

// Robust CSV Line Parser
function parseCSVRow(rowText: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Convert "3h 26m" or "43h 41m" or "0" into total minutes
function parseHoursToMinutes(str: string): number {
  if (!str) return 0;
  const match = str.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (match) {
    const hours = parseInt(match[1], 10) || 0;
    const mins = parseInt(match[2], 10) || 0;
    return hours * 60 + mins;
  }
  const justNum = parseFloat(str.replace(",", "."));
  return isNaN(justNum) ? 0 : Math.round(justNum * 60);
}

// Helper to format minutes as "Xh Ym"
function formatMinutes(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

export function StipendiPage() {
  const { isAdmin, permissions = [] } = useAuth();
  const canAccess =
    isAdmin ||
    permissions.includes("stipendi.visualizza") ||
    permissions.includes("stipendi.gestisci");

  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeCSV[]>([]);

  // Income, Expenses & Conversion Parameters for Payroll Calculation
  const [manualEntrateInput, setManualEntrateInput] = useState<number | null>(null);
  const [manualUsciteInput, setManualUsciteInput] = useState<number | null>(null);
  const [commissionCalcMode, setCommissionCalcMode] = useState<"gross" | "net" | "volume">(
    "volume",
  );

  // Fetch conversions from DB to auto-sync uscite/conversioni
  const {
    data: dbConversions = [],
    isLoading: isLoadingConversions,
    refetch: refetchConversions,
  } = useQuery({
    queryKey: ["all-conversions-stipendi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversions").select("*");
      if (error) return [];
      return data || [];
    },
  });

  // Calculate CSV total turnover (Entrate da fatturato)
  const csvFatturatoTotal = useMemo(() => {
    return parsedRows.reduce((acc, r) => acc + (r.fatturatoPassato || 0), 0);
  }, [parsedRows]);

  // Calculate DB conversions cash-in (Entrate da conversioni Cash->Dobloni)
  const dbConversionEntrateTotal = useMemo(() => {
    return dbConversions.reduce((acc, curr: any) => {
      if (curr.direction === "cash_to_dobloni") {
        return (
          acc +
          (Number(curr.eur_amount) || Number(curr.input_amount) || Number(curr.amount_cash) || 0)
        );
      }
      return acc;
    }, 0);
  }, [dbConversions]);

  // Calculate Uscite/Conversioni totals from DB records (direction: dobloni_to_cash)
  const dbUsciteTotal = useMemo(() => {
    return dbConversions.reduce((acc, curr: any) => {
      if (curr.direction === "dobloni_to_cash") {
        return (
          acc +
          (Number(curr.eur_amount) || Number(curr.amount_cash) || Number(curr.input_amount) || 0)
        );
      }
      return acc;
    }, 0);
  }, [dbConversions]);

  // Automatic Entrate & Uscite
  const autoEntrate = useMemo(() => {
    const total = csvFatturatoTotal + dbConversionEntrateTotal;
    return total > 0 ? total : 50000;
  }, [csvFatturatoTotal, dbConversionEntrateTotal]);

  const autoUscite = useMemo(() => {
    return dbUsciteTotal;
  }, [dbUsciteTotal]);

  // Active Entrate & Uscite (Auto or Manual Override)
  const totalEntrateInput = manualEntrateInput !== null ? manualEntrateInput : autoEntrate;
  const totalUsciteInput = manualUsciteInput !== null ? manualUsciteInput : autoUscite;

  // Net Margin = Entrate Totali - Uscite Totali & Conversioni
  const netMarginInput = useMemo(() => {
    return Math.max(0, totalEntrateInput - totalUsciteInput);
  }, [totalEntrateInput, totalUsciteInput]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterEligible, setFilterEligible] = useState<string>("all");
  const [selectedJokerUser, setSelectedJokerUser] = useState<string | null>(null);
  const [manualLevelOverrides, setManualLevelOverrides] = useState<Record<string, string>>({});
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<CalculatedSalaryRow | null>(null);
  const [showCalculationInfo, setShowCalculationInfo] = useState<boolean>(false);

  // Restore cached CSV from client memory on mount
  useEffect(() => {
    try {
      const savedText = localStorage.getItem(STORAGE_KEY_CSV_TEXT);
      const savedName = localStorage.getItem(STORAGE_KEY_CSV_FILENAME);
      if (savedText) {
        setCsvText(savedText);
        setFileName(savedName || "dipendenti_salvato.csv");
        processCSV(savedText, true);
      }
    } catch (e) {
      console.error("Errore durante il caricamento del CSV dalla memoria locale:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetAutoCalculations = () => {
    refetchConversions();
    setManualEntrateInput(null);
    setManualUsciteInput(null);
    toast.success("Ripristinato il calcolo automatico basato su Fatturato e Conversioni!");
  };

  // Handle local file upload & save to client cache (localStorage)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      try {
        localStorage.setItem(STORAGE_KEY_CSV_TEXT, text);
        localStorage.setItem(STORAGE_KEY_CSV_FILENAME, file.name);
      } catch (err) {
        console.warn("Impossibile salvare il CSV in localStorage:", err);
      }
      processCSV(text, false);
      toast.success(`File "${file.name}" caricato e salvato nella memoria locale!`);
    };
    reader.readAsText(file);
  };

  // Remove CSV from client cache & reset state
  const handleRemoveCSV = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CSV_TEXT);
      localStorage.removeItem(STORAGE_KEY_CSV_FILENAME);
    } catch (err) {
      console.warn("Impossibile rimuovere il CSV da localStorage:", err);
    }
    setCsvText("");
    setFileName("");
    setParsedRows([]);
    setSelectedJokerUser(null);
    setManualLevelOverrides({});
    setSelectedEmpDetail(null);
    toast.success("File CSV e dati in memoria locale rimossi con successo.");
  };

  // Parse raw CSV text
  const processCSV = (rawText: string, isFromCache = false) => {
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      if (!isFromCache) toast.error("Il file CSV sembra vuoto o privo di righe dati.");
      return;
    }

    const rows: ParsedEmployeeCSV[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      if (cols.length < 10) continue;

      const username = cols[0] || "";
      const nome = cols[1] || "";
      const cognome = cols[2] || "";
      const gradoPrincipale = cols[3] || "";
      const ruoliSecondari = cols[4] || "";
      const dataAssunzione = cols[5] || "";
      // Past week columns: idx 9 (Attività passata), idx 10 (Fatturato passato), idx 11 (Scontrini passati)
      const attivitaPassataStr = cols[9] || "0h 0m";
      const fatturatoPassato = parseFloat(cols[10]?.replace(/[^0-9.]/g, "") || "0") || 0;
      const scontriniPassati = parseInt(cols[11]?.replace(/[^0-9]/g, "") || "0", 10) || 0;

      rows.push({
        username,
        nome,
        cognome,
        gradoPrincipale,
        ruoliSecondari,
        dataAssunzione,
        attivitaPassataStr,
        fatturatoPassato,
        scontriniPassati,
      });
    }

    setParsedRows(rows);
    setManualEntrateInput(null);
    setManualUsciteInput(null);
    // Auto-detect top candidate for Joker
    autoSelectJokerCandidate(rows);
    if (isFromCache) {
      toast.info("Caricato il file CSV precedentemente salvato in memoria locale.");
    }
  };

  const autoSelectJokerCandidate = (rows: ParsedEmployeeCSV[]) => {
    let maxMins = 0;
    let maxFatt = 0;

    rows.forEach((r) => {
      const m = parseHoursToMinutes(r.attivitaPassataStr);
      if (m > maxMins) maxMins = m;
      if (r.fatturatoPassato > maxFatt) maxFatt = r.fatturatoPassato;
    });

    let topScore = -1;
    let topUser: string | null = null;

    rows.forEach((r) => {
      const isDirezione =
        r.gradoPrincipale.includes("Capitano") ||
        r.gradoPrincipale.includes("Quartiermastro") ||
        r.gradoPrincipale.includes("Nostromo");
      if (isDirezione) return;

      const mins = parseHoursToMinutes(r.attivitaPassataStr);
      if (mins < 360) return; // Must be eligible (>=6h)

      const oreScore = maxMins > 0 ? (mins / maxMins) * 40 : 0;
      const fattScore = maxFatt > 0 ? (r.fatturatoPassato / maxFatt) * 35 : 0;
      const impattoScore = 20; // Default 8/10
      const totalScore = oreScore + fattScore + impattoScore;

      if (totalScore > topScore) {
        topScore = totalScore;
        topUser = r.username;
      }
    });

    if (topUser) {
      setSelectedJokerUser(topUser);
    }
  };

  // Perform Calculations
  const calculatedRows = useMemo<CalculatedSalaryRow[]>(() => {
    if (parsedRows.length === 0) return [];

    let maxMinutesInList = 0;
    let maxFatturatoInList = 0;

    parsedRows.forEach((r) => {
      const mins = parseHoursToMinutes(r.attivitaPassataStr);
      if (mins > maxMinutesInList) maxMinutesInList = mins;
      if (r.fatturatoPassato > maxFatturatoInList) maxFatturatoInList = r.fatturatoPassato;
    });

    const rawRows = parsedRows.map((r, idx) => {
      const totalMins = parseHoursToMinutes(r.attivitaPassataStr);
      const isDirezione =
        r.gradoPrincipale.includes("Capitano") ||
        r.gradoPrincipale.includes("Vice Capitano") ||
        r.gradoPrincipale.includes("Quartiermastro") ||
        r.gradoPrincipale.includes("Nostromo");

      const isSottodirezione =
        r.gradoPrincipale.includes("Quartiermastro") || r.gradoPrincipale.includes("Nostromo");

      const isDirezioneOrSottodirezione = isDirezione || isSottodirezione;

      // Minimum Hours Threshold: 4h (240m) for Capitano/Vice, 6h (360m) for others
      const minHoursReq =
        r.gradoPrincipale.includes("Capitano") || r.gradoPrincipale.includes("Vice Capitano")
          ? 4
          : 6;
      const minMinsReq = minHoursReq * 60;
      const isEligible = totalMins >= minMinsReq;

      // Grade lookup (taking manual override if set)
      const effectiveGrade = manualLevelOverrides[r.username] || r.gradoPrincipale;
      const rawBaseSalary =
        BASE_SALARIES[effectiveGrade] ?? BASE_SALARIES[r.gradoPrincipale] ?? 750;
      // If ineligible (< min hours), base salary is 0 €
      const baseSalary = isEligible ? rawBaseSalary : 0;

      // Provvigione (2% capped at 800€, 0 for Direzione/Sottodirezione)
      let provvigione = 0;
      if (!isDirezioneOrSottodirezione && isEligible) {
        let baseAmount = r.fatturatoPassato;
        if (commissionCalcMode === "net") {
          // Deduct proportional share of total uscite/conversions
          const ratio = totalEntrateInput > 0 ? r.fatturatoPassato / totalEntrateInput : 0;
          const userUsciteShare = totalUsciteInput * ratio;
          baseAmount = Math.max(0, r.fatturatoPassato - userUsciteShare);
        } else if (commissionCalcMode === "volume") {
          // Add proportional share of total uscite/conversions handled
          const ratio = totalEntrateInput > 0 ? r.fatturatoPassato / totalEntrateInput : 0;
          const userUsciteShare = totalUsciteInput * ratio;
          baseAmount = r.fatturatoPassato + userUsciteShare;
        }
        provvigione = Math.min(800, baseAmount * 0.02);
      }

      // Pex Extra Bonuses
      let pexBonus = 0;
      const pexListDetected: string[] = [];

      if (r.ruoliSecondari) {
        const parts = r.ruoliSecondari.split(/[,/]/).map((p) => p.trim().toLowerCase());
        parts.forEach((p) => {
          if (PEX_BONUSES[p]) {
            pexBonus += PEX_BONUSES[p];
            pexListDetected.push(p.toUpperCase());
          }
        });
      }

      // Joker Calculation
      const isJokerCandidate = !isDirezioneOrSottodirezione && isEligible;
      const oreScore = maxMinutesInList > 0 ? (totalMins / maxMinutesInList) * 40 : 0;
      const fattScore = maxFatturatoInList > 0 ? (r.fatturatoPassato / maxFatturatoInList) * 35 : 0;
      const impattoScore = 20; // 8/10
      const jokerScore = isJokerCandidate ? oreScore + fattScore + impattoScore : 0;

      const isJokerWinner = selectedJokerUser === r.username && isJokerCandidate;
      const jokerBonusAmount = isJokerWinner ? 700 : 0;

      const rawTotalSalary = isEligible
        ? baseSalary + provvigione + pexBonus + jokerBonusAmount
        : 0;

      return {
        ...r,
        id: `emp-${idx}-${r.username}`,
        subLevelOverride: manualLevelOverrides[r.username],
        totalMinutesPassati: totalMins,
        hoursFormatted: formatMinutes(totalMins),
        minHoursRequired: minHoursReq,
        isEligible,
        baseSalary,
        provvigione,
        pexBonus,
        pexListDetected,
        jokerScore,
        isJokerWinner,
        rawTotalSalary,
        isDirezioneOrSottodirezione,
      };
    });

    // Step 2: Calculate overall budget cap reductions (Art. 6.5)
    const rawTotalPayroll = rawRows.reduce((acc, r) => acc + r.rawTotalSalary, 0);
    const maxAllowedPayroll = netMarginInput * 0.6;
    const isOverCap = rawTotalPayroll > maxAllowedPayroll && maxAllowedPayroll > 0;

    let variableScale = 1;
    let totalGuaranteedBase = 0;
    let rawVariablePool = 0;

    if (isOverCap) {
      // Paga base protetta al 100% per tutti i dipendenti idonei
      totalGuaranteedBase = rawRows.reduce((acc, r) => acc + (r.isEligible ? r.baseSalary : 0), 0);
      rawVariablePool = Math.max(0, rawTotalPayroll - totalGuaranteedBase);

      if (rawVariablePool > 0) {
        // Riduzione applicata ESCLUSIVAMENTE alle componenti variabili sopra la paga base
        const availableForVariable = Math.max(0, maxAllowedPayroll - totalGuaranteedBase);
        variableScale = Math.min(1, availableForVariable / rawVariablePool);
      } else {
        variableScale = 0;
      }
    }

    return rawRows.map((r) => {
      if (!r.isEligible) {
        return {
          ...r,
          reductionApplied: 0,
          totalSalary: 0,
        };
      }

      if (!isOverCap) {
        return {
          ...r,
          reductionApplied: 0,
          totalSalary: r.rawTotalSalary,
        };
      }

      // La paga base rimane intatta al 100%
      const guaranteedBase = r.baseSalary;
      const variablePart = Math.max(0, r.rawTotalSalary - guaranteedBase);
      const adjustedVariable = variablePart * variableScale;
      const totalSalary = Math.round((guaranteedBase + adjustedVariable) * 100) / 100;

      const reductionApplied = Math.max(
        0,
        Math.round((r.rawTotalSalary - totalSalary) * 100) / 100,
      );

      return {
        ...r,
        reductionApplied,
        totalSalary,
      };
    });
  }, [
    parsedRows,
    manualLevelOverrides,
    selectedJokerUser,
    netMarginInput,
    totalEntrateInput,
    totalUsciteInput,
    commissionCalcMode,
  ]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const rawTotalPayroll = calculatedRows.reduce((acc, r) => acc + r.rawTotalSalary, 0);
    const totalPayroll = calculatedRows.reduce((acc, r) => acc + r.totalSalary, 0);
    const totalReductionAmount = calculatedRows.reduce((acc, r) => acc + r.reductionApplied, 0);
    const totalEligible = calculatedRows.filter((r) => r.isEligible).length;
    const totalIneligible = calculatedRows.filter((r) => !r.isEligible).length;
    const totalFatturato = calculatedRows.reduce((acc, r) => acc + r.fatturatoPassato, 0);
    const totalScontrini = calculatedRows.reduce((acc, r) => acc + r.scontriniPassati, 0);
    const jokerWinnerRow = calculatedRows.find((r) => r.isJokerWinner);

    const maxAllowedPayroll = netMarginInput * 0.6; // Art. 6.5: Max 60% of net margin
    const isOverCap = rawTotalPayroll > maxAllowedPayroll && maxAllowedPayroll > 0;
    const excessAmount = Math.max(0, rawTotalPayroll - maxAllowedPayroll);
    const reductionPercent =
      rawTotalPayroll > 0 ? Math.round((totalReductionAmount / rawTotalPayroll) * 1000) / 10 : 0;

    return {
      rawTotalPayroll,
      totalPayroll,
      totalReductionAmount,
      totalEligible,
      totalIneligible,
      totalFatturato,
      totalScontrini,
      jokerWinnerRow,
      maxAllowedPayroll,
      isOverCap,
      excessAmount,
      reductionPercent,
    };
  }, [calculatedRows, netMarginInput]);

  // Filtered Rows for Display
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((r) => {
      const matchSearch =
        r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cognome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.gradoPrincipale.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterEligible === "eligible") return r.isEligible;
      if (filterEligible === "ineligible") return !r.isEligible;
      return true;
    });
  }, [calculatedRows, searchQuery, filterEligible]);

  // Copy Individual Bonifico / Stipendio Command
  const handleCopyBonifico = (r: CalculatedSalaryRow) => {
    const cleanUsername = r.username.replace(/^@/, "").trim();
    const cleanAmount = Math.round(r.totalSalary);
    const commandText = `/azienda stipendio Casino ${cleanUsername} ${cleanAmount}`;
    navigator.clipboard.writeText(commandText);
    toast.success(`Copiato: ${commandText}`);
  };

  // Copy Discord Summary Report
  const handleCopyDiscordReport = () => {
    if (calculatedRows.length === 0) return;

    let text = `⚓ **CASINÒ REVENGE — RENDICONTO STIPENDI E PAYROLL** ⚓\n`;
    text += `📅 *Calcolo Settimana Passata*\n`;
    text += `--------------------------------------------------\n`;
    text += `💰 **Monte Salari Totale:** ${formatMoney(metrics.totalPayroll)}\n`;
    text += `👥 **Dipendenti Totali:** ${calculatedRows.length} (${metrics.totalEligible} Idonei, ${metrics.totalIneligible} Sotto-soglia)\n`;
    text += `📊 **Fatturato Totale Settimana:** ${formatMoney(metrics.totalFatturato)} (${metrics.totalScontrini} scontrini)\n`;
    if (metrics.jokerWinnerRow) {
      text += `🃏 **Joker della Settimana (+700 €):** ${metrics.jokerWinnerRow.nome} ${metrics.jokerWinnerRow.cognome} (@${metrics.jokerWinnerRow.username})\n`;
    }
    text += `--------------------------------------------------\n\n`;
    text += `📋 **ELENCO BONIFICI DA EROGARE:**\n`;

    calculatedRows.forEach((r) => {
      if (r.isEligible) {
        text += `• **${r.nome} ${r.cognome}** (@${r.username}) - *${r.gradoPrincipale}*: **${formatMoney(r.totalSalary)}** (Ore: ${r.hoursFormatted} | Prov: ${formatMoney(r.provvigione)})\n`;
      } else {
        text += `• ~~${r.nome} ${r.cognome}~~ (@${r.username}) - *${r.gradoPrincipale}*: **0 €** (Inattivo: ${r.hoursFormatted} < ${r.minHoursRequired}h)\n`;
      }
    });

    text += `\n⚠️ *I pagamenti vanno eseguiti via bonifico entro martedì ore 23:59.*`;

    navigator.clipboard.writeText(text);
    toast.success("Report completo copiato negli appunti (Pronto per Discord/Telegram)!");
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full border-red-200/50 bg-red-50/5 dark:bg-red-950/5 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Accesso Negato</h2>
              <p className="text-sm text-muted-foreground">
                Non disponi dei permessi necessari per accedere alla sezione Stipendi & Payroll
                (richiesto: <strong>Vedere e calcolare gli stipendi</strong>).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2 pb-12">
      {/* Title Section (Roleplay Theme) */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
          GESTIONALE ROLEPLAY
        </h1>

        {/* Diamond Divider Symbol */}
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="h-[1px] w-12 bg-amber-500/40" />
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <div className="h-[1px] w-12 bg-amber-500/40" />
        </div>

        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-wider font-medium">
          CALCOLO BUSTE PAGA, PROVVIGIONI, BONUSA PEX E MARGINI AZIENDALI
        </p>
      </div>

      {/* Action Header Control Box */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] uppercase font-bold tracking-wider">
              REGOLAMENTO UFFICIALE CASINÒ
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculationInfo(true)}
              className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-[11px] font-bold h-6 px-2 rounded-lg"
            >
              <Info className="h-3.5 w-3.5 text-amber-400" />
              Info Calcoli
            </Button>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wider uppercase">
            ELABORAZIONE BUSTE PAGA & CSV
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-2 bg-[#0a0b10] border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-amber-300 shadow-inner">
              <FileSpreadsheet className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {fileName || "CSV memorizzato in cache"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCSV}
                title="Rimuovi CSV dalla memoria locale"
                className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1 border border-slate-800 rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Rimuovi</span>
              </Button>
            </div>
          )}
          <label htmlFor="csv-upload-input">
            <Button asChild className="gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10">
              <span>
                <Upload className="h-4 w-4" />{" "}
                {parsedRows.length > 0 ? "Sostituisci CSV" : "Carica CSV"}
              </span>
            </Button>
            <input
              id="csv-upload-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* CSV Status or Prompt */}
      {parsedRows.length === 0 ? (
        <Card className="border-dashed border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-lg font-semibold">Nessun file CSV caricato</h3>
            <p className="text-sm text-muted-foreground">
              Carica il file <code className="text-amber-500 font-mono">.csv</code> dei dipendenti
              per avviare l'elaborazione e il calcolo delle spettanze della settimana passata.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <label htmlFor="csv-upload-input-center">
              <Button asChild className="gap-2 cursor-pointer bg-amber-600 hover:bg-amber-700">
                <span>
                  <Upload className="h-4 w-4" /> Carica File CSV
                </span>
              </Button>
              <input
                id="csv-upload-input-center"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Metrics Bar */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-slate-950/60 border-amber-500/30">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                  <span>Monte Salari Totale</span>
                  <DollarSign className="h-4 w-4 text-amber-500" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-400">
                  {formatMoney(metrics.totalPayroll)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                {metrics.totalReductionAmount > 0 ? (
                  <span className="text-amber-300 font-mono text-[11px]">
                    Rientro 60%: -{formatMoney(metrics.totalReductionAmount)} (Lordo:{" "}
                    {formatMoney(metrics.rawTotalPayroll)})
                  </span>
                ) : (
                  "Spettanze totali calcolate per la settimana passata"
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950/60 border-border/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                  <span>Dipendenti Valutati</span>
                  <Users className="h-4 w-4 text-cyan-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {calculatedRows.length}{" "}
                  <span className="text-xs font-normal text-muted-foreground">persone</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0 flex gap-2">
                <span className="text-emerald-400 font-semibold">
                  {metrics.totalEligible} Presenza Maturata
                </span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  {metrics.totalIneligible} Presenza da Completare
                </span>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/60 border-border/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                  <span>Fatturato Sett. Passata</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-400">
                  {formatMoney(metrics.totalFatturato)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                Da {metrics.totalScontrini} scontrini registrati
              </CardContent>
            </Card>

            <Card className="bg-slate-950/60 border-amber-500/40 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-mono uppercase text-amber-400 flex items-center justify-between">
                  <span>Joker Settimana (+700 €)</span>
                  <Trophy className="h-4 w-4 text-yellow-400" />
                </CardDescription>
                <CardTitle className="text-lg font-bold text-yellow-300 truncate">
                  {metrics.jokerWinnerRow
                    ? `${metrics.jokerWinnerRow.nome} ${metrics.jokerWinnerRow.cognome}`
                    : "Non Assegnato"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                {metrics.jokerWinnerRow
                  ? `@${metrics.jokerWinnerRow.username} (${metrics.jokerWinnerRow.hoursFormatted})`
                  : "Seleziona vincitore in tabella"}
              </CardContent>
            </Card>
          </div>

          {/* Net Margin Limit, Expense & Conversion Control Card (Art. 6.5) */}
          <Card
            className={`border-border/60 ${metrics.isOverCap ? "bg-amber-950/20 border-amber-500/40" : "bg-slate-900/40"}`}
          >
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${metrics.isOverCap ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/10 text-cyan-400"}`}
                  >
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      REGOLAZIONE ENTRATE, USCITE & CONVERSIONI (ART. 6.5)
                    </div>
                    <p className="text-muted-foreground">
                      Il margine netto aziendale viene calcolato sottraendo le{" "}
                      <strong>Uscite Totali e Conversioni</strong> (inclusi i cambi da Dobloni a
                      Contanti e i pagamenti in sala) dalle <strong>Entrate Lorde</strong>. Il monte
                      salari totale è automaticamente vincolato al{" "}
                      <strong>60% del Margine Netto Calcolato</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(manualEntrateInput !== null || manualUsciteInput !== null) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAutoCalculations}
                      className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-9 font-mono"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Ripristina Calcoli Automatici
                    </Button>
                  )}
                  {manualEntrateInput === null && manualUsciteInput === null && (
                    <Badge
                      variant="outline"
                      className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-mono text-[10px] py-1"
                    >
                      ⚡ Auto-Calcolato da Fatturato + DB
                    </Badge>
                  )}
                </div>
              </div>

              {/* Financial Inputs & Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-border/80">
                {/* Entrate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <ArrowUpRight className="h-3 w-3" /> Incassi / Entrate Lorde (€)
                    </label>
                    {manualEntrateInput !== null && (
                      <span className="text-[9px] text-amber-400 font-mono">(Manuale)</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={totalEntrateInput}
                    onChange={(e) => setManualEntrateInput(Number(e.target.value) || 0)}
                    className="h-8 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                  <div className="text-[9px] text-muted-foreground font-mono">
                    CSV: {formatMoney(csvFatturatoTotal)} | DB:{" "}
                    {formatMoney(dbConversionEntrateTotal)}
                  </div>
                </div>

                {/* Uscite & Conversioni */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono text-red-400 flex items-center gap-1 font-semibold">
                      <ArrowDownRight className="h-3 w-3" /> Uscite & Conversioni (€)
                    </label>
                    {manualUsciteInput !== null && (
                      <span className="text-[9px] text-amber-400 font-mono">(Manuale)</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    value={totalUsciteInput}
                    onChange={(e) => setManualUsciteInput(Number(e.target.value) || 0)}
                    className="h-8 font-mono text-xs bg-slate-900 border-slate-700"
                  />
                  <div className="text-[9px] text-muted-foreground font-mono">
                    Conversioni Dobloni→Cash DB: {formatMoney(dbUsciteTotal)}
                  </div>
                </div>

                {/* Margine Netto Calcolato & Tetto 60% */}
                <div className="space-y-1 font-mono">
                  <label className="text-[10px] uppercase text-cyan-400 font-semibold block">
                    Margine Netto → Tetto 60%
                  </label>
                  <div className="text-xs font-bold text-white leading-tight">
                    Netto: {formatMoney(netMarginInput)}
                  </div>
                  <div className="text-[11px] text-amber-300 font-bold">
                    Tetto Salari: {formatMoney(metrics.maxAllowedPayroll)}
                  </div>
                </div>

                {/* Modalità Provvigioni */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">
                    Calcolo Provvigioni (2%)
                  </label>
                  <Select
                    value={commissionCalcMode}
                    onValueChange={(v: "gross" | "net" | "volume") => setCommissionCalcMode(v)}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono bg-slate-900 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent font-mono>
                      <SelectItem value="gross">Fatturato Lordo (2% su Incassi)</SelectItem>
                      <SelectItem value="net">Fatturato Netto (2% su Incassi - Uscite)</SelectItem>
                      <SelectItem value="volume">
                        ⭐ Volume Operativo (2% su Incassi + Uscite - Opzione Più Conveniente)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {metrics.isOverCap && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 font-mono text-[11px] space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-2">
                    <span>💡 DETTAGLIO RIDUZIONE PER RIENTRO BUDGET (ART. 6.5)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-300">
                    <div>
                      • Lordo Calcolato:{" "}
                      <span className="font-bold text-white">
                        {formatMoney(metrics.rawTotalPayroll)}
                      </span>
                    </div>
                    <div>
                      • Eccedenza da Rientrare:{" "}
                      <span className="font-bold text-red-400">
                        {formatMoney(metrics.excessAmount)}
                      </span>
                    </div>
                    <div>
                      • Riduzione Applicata:{" "}
                      <span className="font-bold text-amber-400">
                        -{formatMoney(metrics.totalReductionAmount)} (-{metrics.reductionPercent}%)
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    I compensi netti di ciascun collaboratore in tabella sono stati riproporzionati
                    pro-quota per far rientrare il totale esattamente nel tetto del 60% (
                    {formatMoney(metrics.maxAllowedPayroll)}), garantendo la tutela della paga base.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Controls Bar & Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca dipendente o ruolo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={filterEligible} onValueChange={setFilterEligible}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Stato Presenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti ({calculatedRows.length})</SelectItem>
                    <SelectItem value="eligible">
                      Presenza Maturata ({metrics.totalEligible})
                    </SelectItem>
                    <SelectItem value="ineligible">
                      In Completamento ({metrics.totalIneligible})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  onClick={handleCopyDiscordReport}
                  variant="outline"
                  className="gap-2 text-xs h-9"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copia Report per Discord
                </Button>
              </div>
            </div>

            {/* Calculated Salary Table */}
            <Card className="overflow-hidden border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-border/80 text-muted-foreground font-mono uppercase text-[10px]">
                      <th className="py-3 px-4">Dipendente</th>
                      <th className="py-3 px-4">Grado & Livello</th>
                      <th className="py-3 px-4 text-center">Ore Settimana Passata</th>
                      <th className="py-3 px-4 text-right">Valore Servizi (Sett. Passata)</th>
                      <th className="py-3 px-4 text-right">Fisso Ruolo</th>
                      <th className="py-3 px-4 text-right">Bonus Servizi (2%)</th>
                      <th className="py-3 px-4 text-right">Incarichi Pex</th>
                      <th className="py-3 px-4 text-center">Joker (+700€)</th>
                      <th className="py-3 px-4 text-right font-bold text-amber-400">
                        Compenso Totale
                      </th>
                      <th className="py-3 px-4 text-center">Prospetto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-muted-foreground">
                          Nessun dipendente trovato per i filtri impostati.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => {
                        const isGenericRole =
                          r.gradoPrincipale === "Barman" ||
                          r.gradoPrincipale === "Caposala" ||
                          r.gradoPrincipale === "Croupier" ||
                          r.gradoPrincipale === "Dealer";

                        return (
                          <tr
                            key={r.id}
                            className={`hover:bg-slate-900/50 transition-colors ${
                              !r.isEligible ? "opacity-60 bg-red-950/10" : ""
                            } ${r.isJokerWinner ? "bg-amber-500/5" : ""}`}
                          >
                            {/* Dipendente */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">
                                {r.nome} {r.cognome}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                @{r.username}
                              </div>
                            </td>

                            {/* Grado & Livello Selector */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-slate-200">
                                  {r.subLevelOverride || r.gradoPrincipale}
                                </span>
                                {isGenericRole && (
                                  <Select
                                    value={r.subLevelOverride || r.gradoPrincipale}
                                    onValueChange={(val) =>
                                      setManualLevelOverrides((prev) => ({
                                        ...prev,
                                        [r.username]: val,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-5 text-[9px] px-1 py-0 w-20 border-slate-700 bg-slate-900">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {r.gradoPrincipale.includes("Barman") && (
                                        <>
                                          <SelectItem value="Barman Jr.">Jr. (1080€)</SelectItem>
                                          <SelectItem value="Barman Sr.">Sr. (1280€)</SelectItem>
                                          <SelectItem value="Barman VIP">VIP (1520€)</SelectItem>
                                          <SelectItem value="Barman Exclusive">
                                            Exclusive (1810€)
                                          </SelectItem>
                                        </>
                                      )}
                                      {r.gradoPrincipale.includes("Caposala") && (
                                        <>
                                          <SelectItem value="Caposala Jr.">Jr. (1470€)</SelectItem>
                                          <SelectItem value="Caposala Sr.">Sr. (1750€)</SelectItem>
                                          <SelectItem value="Caposala VIP">VIP (2130€)</SelectItem>
                                          <SelectItem value="Caposala Exclusive">
                                            Exclusive (2500€)
                                          </SelectItem>
                                        </>
                                      )}
                                      {r.gradoPrincipale.includes("Croupier") && (
                                        <>
                                          <SelectItem value="Croupier Jr.">Jr. (1130€)</SelectItem>
                                          <SelectItem value="Croupier Sr.">Sr. (1370€)</SelectItem>
                                          <SelectItem value="Croupier VIP">VIP (1620€)</SelectItem>
                                          <SelectItem value="Croupier Exclusive">
                                            Exclusive (1910€)
                                          </SelectItem>
                                        </>
                                      )}
                                      {r.gradoPrincipale.includes("Dealer") && (
                                        <>
                                          <SelectItem value="Dealer Jr.">Jr. (1000€)</SelectItem>
                                          <SelectItem value="Dealer Sr.">Sr. (1200€)</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              {r.ruoliSecondari && (
                                <div className="text-[10px] text-amber-400 font-mono">
                                  Pex: {r.ruoliSecondari}
                                </div>
                              )}
                            </td>

                            {/* Hours & Target */}
                            <td className="py-3 px-4 text-center">
                              <div className="font-mono font-bold text-slate-100">
                                {r.hoursFormatted}
                              </div>
                              {r.isEligible ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5 py-0"
                                >
                                  ✓ Presenza {r.minHoursRequired}h OK
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5 py-0"
                                >
                                  ⚠️ In corso (&lt;{r.minHoursRequired}h)
                                </Badge>
                              )}
                            </td>

                            {/* Fatturato */}
                            <td className="py-3 px-4 text-right font-mono">
                              <div>{formatMoney(r.fatturatoPassato)}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {r.scontriniPassati} scontrini
                              </div>
                            </td>

                            {/* Base */}
                            <td className="py-3 px-4 text-right font-mono">
                              {r.isEligible ? (
                                <span className="font-semibold text-slate-200">
                                  {formatMoney(r.baseSalary)}
                                </span>
                              ) : (
                                <span className="text-red-400 font-bold">0 €</span>
                              )}
                            </td>

                            {/* Provvigione */}
                            <td className="py-3 px-4 text-right font-mono">
                              {r.isDirezioneOrSottodirezione ? (
                                <span className="text-muted-foreground text-[10px]">
                                  Ex Art. 6.3
                                </span>
                              ) : r.provvigione > 0 ? (
                                <span className="text-emerald-400 font-semibold">
                                  +{formatMoney(r.provvigione)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0 €</span>
                              )}
                            </td>

                            {/* Pex Extra */}
                            <td className="py-3 px-4 text-right font-mono">
                              {r.pexBonus > 0 ? (
                                <span className="text-amber-400 font-semibold">
                                  +{formatMoney(r.pexBonus)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0 €</span>
                              )}
                            </td>

                            {/* Joker Selection */}
                            <td className="py-3 px-4 text-center">
                              {!r.isDirezioneOrSottodirezione && r.isEligible ? (
                                <Button
                                  size="sm"
                                  variant={r.isJokerWinner ? "default" : "outline"}
                                  onClick={() => setSelectedJokerUser(r.username)}
                                  className={`h-6 text-[10px] px-2 font-mono ${
                                    r.isJokerWinner
                                      ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                      : "border-slate-700"
                                  }`}
                                >
                                  <Trophy className="h-3 w-3 mr-1" />
                                  {r.isJokerWinner ? "JOKER WINNER" : "Assegna"}
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  N/A
                                </span>
                              )}
                            </td>

                            {/* Totale Spettante */}
                            <td className="py-3 px-4 text-right font-mono text-sm font-bold text-amber-400">
                              <div>{formatMoney(r.totalSalary)}</div>
                              {r.reductionApplied > 0 && (
                                <div className="text-[10px] text-amber-300/80 font-normal">
                                  -{formatMoney(r.reductionApplied)} (Rientro 60%)
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Copia Bonifico Singolo"
                                  onClick={() => handleCopyBonifico(r)}
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Dettaglio Conteggio"
                                  onClick={() => setSelectedEmpDetail(r)}
                                  className="h-7 w-7 text-muted-foreground hover:text-white"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Employee Calculation Modal / Drawer */}
      <Dialog
        open={selectedEmpDetail !== null}
        onOpenChange={(open) => !open && setSelectedEmpDetail(null)}
      >
        <DialogContent className="max-w-md bg-slate-950 border-border text-white">
          {selectedEmpDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-amber-400" />
                  Prospetto Compenso: {selectedEmpDetail.nome} {selectedEmpDetail.cognome}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  @{selectedEmpDetail.username} • {selectedEmpDetail.gradoPrincipale}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs py-2">
                {/* Status Box */}
                <div
                  className={`p-3 rounded-xl border ${
                    selectedEmpDetail.isEligible
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>Monte Ore Concordato ({selectedEmpDetail.minHoursRequired}h min)</span>
                    <span className="font-mono">{selectedEmpDetail.hoursFormatted}</span>
                  </div>
                  <p className="text-[11px] mt-1 opacity-90">
                    {selectedEmpDetail.isEligible
                      ? "✓ Impegno orario maturato. Il collaboratore accede al compenso fisso e a tutti gli incentivi dedicati."
                      : "💡 Presenza parziale per la settimana corrente. Il compenso base rimane temporaneamente in pausa fino al completamento delle ore concordate."}
                  </p>
                </div>

                {/* Breakdown Table */}
                <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-border/80 font-mono">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Compenso Fisso di Ruolo:</span>
                    <span className="font-bold">{formatMoney(selectedEmpDetail.baseSalary)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">
                      Bonus Servizi (2% su {formatMoney(selectedEmpDetail.fatturatoPassato)}):
                    </span>
                    <span className="font-bold text-emerald-400">
                      +{formatMoney(selectedEmpDetail.provvigione)}
                    </span>
                  </div>

                  {selectedEmpDetail.pexBonus > 0 && (
                    <div className="flex justify-between py-1 border-b border-border/60">
                      <span className="text-muted-foreground">
                        Incarichi Pex ({selectedEmpDetail.pexListDetected.join(", ")}):
                      </span>
                      <span className="font-bold text-amber-400">
                        +{formatMoney(selectedEmpDetail.pexBonus)}
                      </span>
                    </div>
                  )}

                  {selectedEmpDetail.isJokerWinner && (
                    <div className="flex justify-between py-1 border-b border-border/60 text-yellow-400">
                      <span>Premio Eccellenza Joker:</span>
                      <span className="font-bold">+700 €</span>
                    </div>
                  )}

                  {selectedEmpDetail.reductionApplied > 0 && (
                    <>
                      <div className="flex justify-between py-1 border-b border-border/60 text-slate-300">
                        <span className="text-muted-foreground">Subtotale Lordo Calcolato:</span>
                        <span className="font-bold">
                          {formatMoney(selectedEmpDetail.rawTotalSalary)}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-border/60 text-amber-400">
                        <span>Adeguamento Tetto 60% Margine (Art. 6.5):</span>
                        <span className="font-bold">
                          -{formatMoney(selectedEmpDetail.reductionApplied)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-2 text-sm font-bold text-amber-400">
                    <span>COMPENSO TOTALE NETTO:</span>
                    <span>{formatMoney(selectedEmpDetail.totalSalary)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => handleCopyBonifico(selectedEmpDetail)}
                    className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                  >
                    <Copy className="h-4 w-4" /> Copia Comando Stipendio
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Calculation Info Modal / Dialog */}
      <Dialog open={showCalculationInfo} onOpenChange={setShowCalculationInfo}>
        <DialogContent className="max-w-2xl bg-slate-950 border-amber-500/30 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-400">
              <Info className="h-5 w-5 text-amber-400" />
              Guida alla Componibilità dei Compensi & Accordi Aziendali
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Panoramica sui criteri chiari, meritocratici e trasparenti adottati dal Casinò Revenge
              per la valorizzazione del lavoro e dei servizi di ogni collaboratore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-2">
            {/* 1. Presenza Minima */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
                <CheckCircle2 className="h-4 w-4" />
                1. Impegno di Presenza Settimanale (Art. 5.1)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Il compenso fisso base premia la continuità di presenza e la disponibilità della
                squadra durante le aperture di sala:
              </p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] pt-1 text-slate-200">
                <li>
                  <strong>Staff Operativo e Sotto-direzione:</strong> impegno di presenza pari a{" "}
                  <strong>6 ore</strong> settimanali.
                </li>
                <li>
                  <strong>Capitaneria e Direzione:</strong> impegno di presenza pari a{" "}
                  <strong>4 ore</strong> settimanali.
                </li>
              </ul>
              <p className="text-[11px] text-amber-300/90 pt-1">
                💡 <em>Nota di trasparenza:</em> Qualora nella settimana la presenza risulti
                parziale rispetto all'impegno concordato, la quota fissa base rimane temporaneamente
                in pausa per quella specifica settimana, fermi restando gli incentivi maturati.
              </p>
            </div>

            {/* 2. Retribuzione Base */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-cyan-400">
                <Banknote className="h-4 w-4" />
                2. Compenso Fisso di Grado e Ruolo (Art. 6.2)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Al completamento delle ore concordate, ciascun collaboratore riconosce la propria
                quota fissa garantita, stabilita dal livello di esperienza e di ruolo:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-border/60 text-slate-300">
                <div>• Mozzo: 750 €</div>
                <div>• Soubrette: 880 €</div>
                <div>• Dealer: 1.000 € (Jr) - 1.200 € (Sr)</div>
                <div>• Barman: 1.080 € - 1.810 €</div>
                <div>• Croupier: 1.130 € - 1.910 €</div>
                <div>• Caposala: 1.470 € - 2.500 €</div>
                <div>• Nostromo: 3.200 €</div>
                <div>• Quartiermastro: 3.800 €</div>
                <div>• Vice Capitano: 4.500 €</div>
                <div>• Capitano: 5.000 €</div>
              </div>
            </div>

            {/* 3. Provvigioni */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                3. Incentivo di Produttività e Cura del Cliente (Art. 6.3)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Il personale di sala e di accoglienza (Croupier, Barman, Caposala, Soubrette, Mozzi,
                Dealer) riceve un <strong>bonus valore del 2%</strong> sulla somma dei servizi e
                degli scontrini curati direttamente con la clientela.
              </p>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-border/60 text-[11px] font-mono text-emerald-300">
                • Bonus massimo erogabile: <strong>800 €</strong> settimanali per collaboratore.
                <br />• La Capitaneria e la Sotto-direzione si dedicano esclusivamente alla
                supervisione generale e non beneficiano degli incentivi singoli di sala (ex Art.
                6.3).
              </div>
            </div>

            {/* 4. Indennità PEX */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
                <Sparkles className="h-4 w-4" />
                4. Riconoscimento per Mansioni Speciali e Incarichi PEX (Art. 2.5)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Incarichi di cura, formazione e coordinamento aggiuntivi assegnati dalla Capitaneria
                che arricchiscono il compenso con bonus dedicati:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-border/60 text-slate-300">
                <div>• Master (Formazione): +500 €</div>
                <div>• Gestore Eventi (GE): +450 €</div>
                <div>• Gorilla (Sicurezza): +350 €</div>
                <div>• Sirena (Accoglienza): +300 €</div>
                <div>• Resp. Antincendio (RA): +250 €</div>
              </div>
            </div>

            {/* 5. Joker */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-yellow-400">
                <Trophy className="h-4 w-4" />
                5. Riconoscimento d'Eccellenza Settimanale (+700 €) (Art. 6.4)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Un premio speciale attribuito al collaboratore che si è maggiormente distinto per
                presenza, cortesia e spirito di squadra:
              </p>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-border/60 font-mono text-[11px] space-y-1 text-slate-300">
                <div>
                  • <strong>40% Costanza di presenza:</strong> disponibilità oraria in sala durante
                  la settimana.
                </div>
                <div>
                  • <strong>35% Cura dell'ospite:</strong> volume e qualità delle attività ed
                  incassi gestiti.
                </div>
                <div>
                  • <strong>25% Armonia di squadra:</strong> valutazione positiva del contributo al
                  clima aziendale.
                </div>
              </div>
            </div>

            {/* 6. Tetto 60% */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-border/80 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-cyan-400">
                <DollarSign className="h-4 w-4" />
                6. Sostenibilità ed Equità Aziendale - Meccanismo di Rientro Budget (Art. 6.5)
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                A garanzia della stabilità finanziaria, il monte salari totale non può superare il{" "}
                <strong>60% del margine netto</strong> della settimana precedente. Qualora il totale
                lordo calcolato ecceda tale tetto, il sistema applica automaticamente una{" "}
                <strong>Riduzione Armonizzata Pro-Quota</strong> sugli incentivi e compensi
                accessori per far rientrare il totale esattamente nei limiti stabiliti,
                salvaguardando la soglia di garanzia base di ciascun collaboratore.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
