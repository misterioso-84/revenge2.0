import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  RotateCcw,
  Save,
  Coins,
  Euro,
  Plus,
  User,
  Users,
  Pencil,
  Search,
  Check,
  Filter,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { formatDateTime, formatDate, formatMoney, formatDobloni } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conversioni")({
  component: ConversionsPage,
});

type Direction = "cash_to_dobloni" | "dobloni_to_cash";
type Citizen = { id: string; full_name: string };
type Night = { id: string; night_date: string; title: string | null; is_closed?: boolean };
type Settings = { id: boolean; max_dobloni_per_day: number; max_eur_per_day: number };
type Conversion = {
  id: string;
  citizen_id: string;
  night_id: string;
  direction: Direction;
  input_amount: number;
  eur_amount: number;
  dobloni_amount: number;
  created_by: string | null;
  created_at: string;
};

function ConversionsPage() {
  const { isAdmin, permissions = [] } = useAuth();
  const can = (p: string) => isAdmin || permissions.includes(p);
  const canExec = can("conversioni.esegui");
  const canHist = can("conversioni.storico");

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (activeTab === "" && (permissions.length > 0 || isAdmin)) {
      if (canExec) setActiveTab("convert");
      else if (canHist) setActiveTab("history");
      else setActiveTab("limits");
    }
  }, [permissions, isAdmin, canExec, canHist, activeTab]);

  if (!canExec && !canHist) {
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
                Non disponi dei permessi necessari per visualizzare questa sezione (richiesto almeno
                uno tra: <strong>Eseguire conversioni Soldi/Dobloni</strong>,{" "}
                <strong>Vedere lo storico delle conversioni</strong>).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
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
          CONVERSIONI VALUTA EURO ⇄ DOBLONI E LIMITI DI CASSA
        </p>
      </div>

      <Tabs
        value={activeTab || (canExec ? "convert" : canHist ? "history" : "limits")}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-3 shadow-xl">
          <TabsList className="bg-[#0a0b10] border border-slate-800 p-1 rounded-xl w-full flex flex-wrap h-auto gap-1">
            {canExec && (
              <TabsTrigger
                value="convert"
                className="flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider text-slate-400 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-md transition-all"
              >
                Nuova conversione
              </TabsTrigger>
            )}
            {canHist && (
              <TabsTrigger
                value="history"
                className="flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider text-slate-400 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-md transition-all"
              >
                Storico
              </TabsTrigger>
            )}
            <TabsTrigger
              value="limits"
              className="flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider text-slate-400 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-md transition-all"
            >
              Limiti {isAdmin ? "(modifica)" : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        {canExec && (
          <TabsContent value="convert" className="mt-6">
            <ConvertPanel />
          </TabsContent>
        )}
        {canHist && (
          <TabsContent value="history" className="mt-6">
            <HistoryPanel />
          </TabsContent>
        )}
        <TabsContent value="limits" className="mt-6">
          <LimitsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------- Convert -------------------- */

function ConvertPanel() {
  const qc = useQueryClient();
  const { user, profile, isAdmin } = useAuth();

  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens-mini"],
    queryFn: async () =>
      ((await supabase.from("citizens").select("id, full_name, created_at").order("full_name"))
        .data as Citizen[]) ?? [],
  });
  const { data: nights = [] } = useQuery({
    queryKey: ["nights-mini-open"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nights")
        .select("id, night_date, title, is_closed")
        .eq("is_closed", false)
        .order("night_date", { ascending: false })
        .limit(50);
      return (data ?? []) as Night[];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["conv-settings"],
    queryFn: async () =>
      (await (supabase as any).from("conversion_settings").select("*").maybeSingle())
        .data as Settings,
  });
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, username, display_name")).data ?? [],
  });

  const [citizenId, setCitizenId] = useState<string>("");
  const [citizenSearch, setCitizenSearch] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [nightId, setNightId] = useState<string>("");
  const [direction, setDirection] = useState<Direction>("cash_to_dobloni");
  const [input, setInput] = useState<string>("");
  const activeOperatorId = profile?.id || user?.id || "";
  const currentOperatorName = profile?.display_name || profile?.username || "Tu";

  const filteredCitizens = useMemo(() => {
    if (!citizenSearch) return citizens;
    return citizens.filter((c) => c.full_name.toLowerCase().includes(citizenSearch.toLowerCase()));
  }, [citizens, citizenSearch]);

  const exactExists = useMemo(() => {
    const t = citizenSearch.trim().toLowerCase();
    return !!citizens.find((c) => c.full_name.toLowerCase() === t);
  }, [citizens, citizenSearch]);

  const createCitizen = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("citizens")
        .insert({ full_name: name.trim(), membership: "standard" })
        .select("id, full_name, created_at")
        .single();
      if (error) throw error;
      return data as Citizen;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["citizens-mini"] });
      qc.invalidateQueries({ queryKey: ["citizens"] });
      setCitizenId(data.id);
      setCitizenSearch(data.full_name);
      setIsOpen(false);
      toast.success(`Cittadino "${data.full_name}" creato`);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const createdTodayCount =
        citizens.filter((c: any) => c.created_at && new Date(c.created_at) >= startOfDay).length +
        1;

      if (createdTodayCount >= 5) {
        toast.warning(
          `⚠️ Attenzione: stai creando un numero elevato di cittadini oggi (${createdTodayCount} creati oggi).`,
          { duration: 5000 },
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSelectCitizen = (c: Citizen) => {
    setCitizenId(c.id);
    setCitizenSearch(c.full_name);
    setIsOpen(false);
  };

  const handleSearchChange = (val: string) => {
    setCitizenSearch(val);
    if (!val) {
      setCitizenId("");
    }
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
    const selected = citizens.find((c) => c.id === citizenId);
    setCitizenSearch(selected ? selected.full_name : "");
  };

  const currentNightId = nightId || nights[0]?.id || "";

  const usageKey = ["conv-usage", citizenId, currentNightId, direction] as const;
  const { data: usage = 0, refetch: refetchUsage } = useQuery({
    queryKey: usageKey,
    enabled: !!citizenId && !!currentNightId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("conversion_usage", {
        _citizen: citizenId,
        _night: currentNightId,
        _direction: direction,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });

  const limit = useMemo(() => {
    if (direction === "cash_to_dobloni") {
      return Number(settings?.max_eur_per_day ?? 2000);
    } else {
      return Number(settings?.max_dobloni_per_day ?? 10000);
    }
  }, [direction, settings]);

  const remaining = Math.max(0, limit - Number(usage));

  const inputNum = Number(input) || 0;

  const isInvalidMultipleOf40 = useMemo(() => {
    if (direction === "dobloni_to_cash" && inputNum > 0) {
      return inputNum < 40 || inputNum % 40 !== 0;
    }
    return false;
  }, [direction, inputNum]);

  const roundingSuggestions = useMemo(() => {
    if (direction === "dobloni_to_cash" && inputNum > 0 && isInvalidMultipleOf40) {
      if (inputNum < 40) {
        return { lower: null, upper: 40 };
      }
      const lower = Math.floor(inputNum / 40) * 40;
      const upper = Math.ceil(inputNum / 40) * 40;
      return { lower, upper };
    }
    return null;
  }, [direction, inputNum, isInvalidMultipleOf40]);

  // Calcolo pulito dell'anteprima basato sul valore inserito nell'input
  const preview = useMemo(() => {
    if (inputNum <= 0)
      return {
        inStr: direction === "cash_to_dobloni" ? formatMoney(0) : formatDobloni(0),
        outStr: direction === "cash_to_dobloni" ? formatDobloni(0) : formatMoney(0),
      };

    if (direction === "cash_to_dobloni") {
      // Ricevi Euro, Consegni Dobloni (1€ = 10 Dobloni)
      return {
        inStr: formatMoney(inputNum),
        outStr: formatDobloni(inputNum * 10),
      };
    } else {
      // Ricevi Dobloni, Consegni Euro (Cambio al 75%: 10 Dobloni = 0.75€ -> Formula: Dobloni * 0.075)
      return {
        inStr: formatDobloni(inputNum),
        outStr: formatMoney(inputNum * 0.075),
      };
    }
  }, [inputNum, direction]);

  const exceeds = inputNum > remaining;

  // Calcolo dati di riepilogo giornaliero:
  // - Da soldi a dobloni: soldi in grande, dobloni in piccolo sotto
  // - Da dobloni a soldi: dobloni in grande, soldi in piccolo sotto
  const summaryData = useMemo(() => {
    if (direction === "cash_to_dobloni") {
      return {
        usedBig: formatMoney(usage),
        usedSmall: formatDobloni(usage * 10),
        availBig: formatMoney(remaining),
        availSmall: formatDobloni(remaining * 10),
        limitBig: formatMoney(limit),
        limitSmall: formatDobloni(limit * 10),
      };
    } else {
      return {
        usedBig: formatDobloni(usage),
        usedSmall: formatMoney(usage * 0.075),
        availBig: formatDobloni(remaining),
        availSmall: formatMoney(remaining * 0.075),
        limitBig: formatDobloni(limit),
        limitSmall: formatMoney(limit * 0.075),
      };
    }
  }, [direction, usage, remaining, limit]);

  const doConvert = useMutation({
    mutationFn: async () => {
      if (!citizenId || !currentNightId) throw new Error("Seleziona cittadino e serata");
      if (inputNum <= 0) throw new Error("Importo non valido");
      if (isInvalidMultipleOf40)
        throw new Error("L'importo dei dobloni deve essere un multiplo di 40");
      if (exceeds) throw new Error("Limite giornaliero superato — un amministratore può azzerarlo");
      const activeOperator = activeOperatorId || profile?.id || user?.id;
      const { data, error } = await (supabase as any).rpc("perform_conversion", {
        _citizen: citizenId,
        _night: currentNightId,
        _direction: direction,
        _input: inputNum,
        _operator_id: activeOperator,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conversione registrata");
      setInput("");
      qc.invalidateQueries({ queryKey: ["conv-usage"] });
      qc.invalidateQueries({ queryKey: ["conversions-history"] });
      qc.invalidateQueries({ queryKey: ["all-conversions-stipendi"] });
      refetchUsage();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReset = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("conversion_resets").insert({
        citizen_id: citizenId,
        night_id: currentNightId,
        direction,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Limite azzerato per questa serata");
      qc.invalidateQueries({ queryKey: ["conv-usage"] });
      refetchUsage();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeOpObj = staffProfiles.find((p: any) => p.id === (activeOperatorId || profile?.id));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Esegui conversione</CardTitle>
          <CardDescription>Registra una transazione di acquisto o riscatto dobloni</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Cittadino
              </Label>
              <div className="flex gap-1 relative mt-1">
                <Input
                  placeholder="Cerca cittadino…"
                  value={citizenSearch}
                  onChange={(e) => {
                    handleSearchChange(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  className="w-full"
                />
                {citizenId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCitizenId("");
                      setCitizenSearch("");
                    }}
                  >
                    ×
                  </Button>
                )}
              </div>
              {isOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={handleCloseDropdown} />
                  <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {filteredCitizens.length === 0 && !citizenSearch.trim() ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nessun cittadino trovato
                      </div>
                    ) : (
                      <>
                        {filteredCitizens.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between border-b last:border-0 border-border/40"
                            onClick={() => handleSelectCitizen(c)}
                          >
                            <span className="font-medium">{c.full_name}</span>
                            {c.id === citizenId && (
                              <Badge variant="secondary" className="text-[10px]">
                                Selezionato
                              </Badge>
                            )}
                          </button>
                        ))}
                        {citizenSearch.trim() && !exactExists && (
                          <div className="p-2 border-t border-border/60 bg-muted/20">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start text-xs h-8 text-primary"
                              onClick={() => createCitizen.mutate(citizenSearch)}
                              disabled={createCitizen.isPending}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Crea cittadino "{citizenSearch.trim()}"
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Serata Aperta
              </Label>
              <div className="mt-1">
                {nights.length === 0 ? (
                  <div className="text-xs text-amber-500 border border-amber-500/30 rounded-md p-2 bg-amber-500/10">
                    Nessuna serata aperta. Apri una serata in "Serate".
                  </div>
                ) : (
                  <Select value={currentNightId} onValueChange={setNightId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona serata" />
                    </SelectTrigger>
                    <SelectContent>
                      {nights.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {new Date(n.night_date).toLocaleDateString("it-IT")}
                          {n.title ? ` - ${n.title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Operatore Cassa automatico */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                    Operatore Cassa Responsabile
                  </div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{profile?.display_name || profile?.username || "Utente Collegato"}</span>
                  </div>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] py-0.5 px-2 bg-amber-500/10 border-amber-500/40 text-amber-400 font-medium"
              >
                🔒 Registrato a tuo nome
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "cash_to_dobloni" ? "default" : "outline"}
              onClick={() => {
                setDirection("cash_to_dobloni");
                setInput("");
              }}
              className={`h-16 flex flex-col items-center justify-center gap-1 transition-all ${
                direction === "cash_to_dobloni"
                  ? "bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "hover:border-emerald-500/40 hover:text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Euro className="h-4 w-4 text-emerald-400" /> <ArrowRight className="h-3.5 w-3.5" />{" "}
                <Coins className="h-4 w-4 text-amber-400" />
                <span>Soldi → Dobloni</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🟢 Entrata Cassa (+ Guadagno)
              </span>
            </Button>
            <Button
              type="button"
              variant={direction === "dobloni_to_cash" ? "default" : "outline"}
              onClick={() => {
                setDirection("dobloni_to_cash");
                setInput("");
              }}
              className={`h-16 flex flex-col items-center justify-center gap-1 transition-all ${
                direction === "dobloni_to_cash"
                  ? "bg-rose-500/20 text-rose-300 border-2 border-rose-500 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  : "hover:border-rose-500/40 hover:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Coins className="h-4 w-4 text-amber-400" /> <ArrowRight className="h-3.5 w-3.5" />{" "}
                <Euro className="h-4 w-4 text-rose-400" />
                <span>Dobloni → Soldi</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                🔴 Uscita Cassa (- Esborso Euro)
              </span>
            </Button>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {direction === "cash_to_dobloni"
                ? "Importo in € (soldi ricevuti dal cittadino)"
                : "Importo in ⛃ (dobloni ricevuti dal cittadino)"}
            </Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
            {direction === "dobloni_to_cash" && (
              <div className="mt-2 space-y-2">
                {isInvalidMultipleOf40 ? (
                  <div className="text-xs text-amber-500 font-medium">
                    ⚠️ L'importo deve essere un multiplo di 40 dobloni (minimo 40 ⛃) per evitare
                    perdite di denaro.
                    {roundingSuggestions && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {roundingSuggestions.lower && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setInput(roundingSuggestions.lower!.toString())}
                          >
                            Arrotonda a {roundingSuggestions.lower} ⛃
                          </Button>
                        )}
                        {roundingSuggestions.upper && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setInput(roundingSuggestions.upper!.toString())}
                          >
                            Arrotonda a {roundingSuggestions.upper} ⛃
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Minimo 40 ⛃, a multipli di 40.
                  </div>
                )}

                {/* Opzioni rapide a multipli di 40 */}
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {[40, 120, 200, 400, 1000, 2000].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      onClick={() => setInput(val.toString())}
                    >
                      {val} ⛃
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {citizenId ? (
            <div className="p-4 rounded-lg border border-border bg-card/40 space-y-3 mt-4">
              <div className="text-sm font-semibold flex items-center justify-between text-muted-foreground border-b pb-2">
                <span>Riepilogo Limite Giornaliero</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {direction === "cash_to_dobloni" ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/20 p-2 border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Già Convertito
                  </div>
                  <div className="font-bold text-foreground text-sm mt-1">
                    {summaryData.usedBig}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {summaryData.usedSmall}
                  </div>
                </div>

                <div className="rounded-md bg-emerald-500/5 p-2 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">
                    Disponibile
                  </div>
                  <div className="font-bold text-emerald-500 text-sm mt-1">
                    {summaryData.availBig}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5 font-mono">
                    {summaryData.availSmall}
                  </div>
                </div>

                <div className="rounded-md bg-muted/20 p-2 border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Limite Totale
                  </div>
                  <div className="font-bold text-foreground text-sm mt-1">
                    {summaryData.limitBig}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {summaryData.limitSmall}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/5 text-center text-xs text-muted-foreground mt-4">
              Seleziona un cittadino per visualizzare lo stato del suo limite giornaliero.
            </div>
          )}
        </CardContent>
      </Card>

      <Card
        className={`transition-colors ${
          exceeds
            ? "border-destructive/60 bg-destructive/5"
            : direction === "cash_to_dobloni"
              ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/15 via-slate-900/40 to-slate-950"
              : "border-rose-500/40 bg-gradient-to-b from-rose-950/15 via-slate-900/40 to-slate-950"
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Anteprima Transazione</CardTitle>
            <Badge
              className={`text-xs font-bold px-2.5 py-1 ${
                direction === "cash_to_dobloni"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              {direction === "cash_to_dobloni"
                ? "🟢 ENTRATA (+ Guadagno Cassa)"
                : "🔴 USCITA (- Esborso Euro)"}
            </Badge>
          </div>
          <CardDescription>
            {direction === "cash_to_dobloni"
              ? "Il cliente versa euro in cassa e riceve dobloni di gioco"
              : "Il cliente riconverte i dobloni e la cassa deve erogare euro"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div
              className={`rounded-lg border p-4 transition-colors ${
                direction === "cash_to_dobloni"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div
                className={`text-xs uppercase tracking-wider font-semibold ${
                  direction === "cash_to_dobloni" ? "text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {direction === "cash_to_dobloni" ? "Euro Ricevuti (Incasso)" : "Dobloni Ricevuti"}
              </div>
              <div
                className={`mt-1 text-xl font-bold font-mono ${
                  direction === "cash_to_dobloni" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {direction === "cash_to_dobloni" ? `+${preview.inStr}` : preview.inStr}
              </div>
            </div>
            <div
              className={`rounded-lg border p-4 transition-colors ${
                direction === "dobloni_to_cash"
                  ? "border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                  : "border-primary/40 bg-primary/5"
              }`}
            >
              <div
                className={`text-xs uppercase tracking-wider font-semibold ${
                  direction === "dobloni_to_cash" ? "text-rose-400" : "text-primary"
                }`}
              >
                {direction === "dobloni_to_cash"
                  ? "Euro da Pagare al Cliente"
                  : "Dobloni da Consegnare"}
              </div>
              <div
                className={`mt-1 text-2xl font-bold font-mono ${
                  direction === "dobloni_to_cash" ? "text-rose-400 font-extrabold" : "text-primary"
                }`}
              >
                {direction === "dobloni_to_cash" ? `-${preview.outStr}` : preview.outStr}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Registrata a nome di:</span>
            <span className="font-semibold text-amber-400">{currentOperatorName}</span>
          </div>

          {exceeds && (
            <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded-md p-3">
              Il limite giornaliero verrà superato.{" "}
              {isAdmin
                ? "Puoi azzerarlo qui sotto."
                : "Il cliente deve aspettare la prossima serata."}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 h-12 text-base"
              disabled={
                !citizenId ||
                !currentNightId ||
                inputNum <= 0 ||
                exceeds ||
                isInvalidMultipleOf40 ||
                doConvert.isPending
              }
              onClick={() => doConvert.mutate()}
            >
              <Save className="h-4 w-4 mr-2" /> Conferma conversione
            </Button>
            {isAdmin && citizenId && currentNightId && (
              <Button
                variant="outline"
                onClick={() => doReset.mutate()}
                disabled={doReset.isPending}
                title="Azzera limite per questo cittadino in questa serata"
              >
                <RotateCcw className="h-4 w-4" /> Azzera limite
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- History -------------------- */

function HistoryPanel() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterNightId, setFilterNightId] = useState<string>("all");
  const [filterOperatorId, setFilterOperatorId] = useState<string>("all");

  // Single edit modal state
  const [editingConversion, setEditingConversion] = useState<any | null>(null);
  const [selectedNewOperator, setSelectedNewOperator] = useState<string>("");

  // Batch reassign modal state
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchSourceOp, setBatchSourceOp] = useState<string>("all");
  const [batchTargetOp, setBatchTargetOp] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: rows = [] } = useQuery({
    queryKey: ["conversions-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("conversions")
        .select("*, citizens(full_name), nights(night_date, title)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as (Conversion & {
        citizens: { full_name: string } | null;
        nights: { night_date: string; title: string | null } | null;
      })[];
    },
    refetchInterval: 10000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id, username, display_name")).data ?? [],
    refetchInterval: 10000,
  });

  const { data: allNights = [] } = useQuery({
    queryKey: ["all-nights-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nights")
        .select("id, night_date, title")
        .order("night_date", { ascending: false })
        .limit(50);
      return (data ?? []) as Night[];
    },
  });

  const profBy = useMemo(() => {
    return Object.fromEntries((profiles as any[]).map((p) => [p.id, p]));
  }, [profiles]);

  // Mutations
  const updateSingleOperator = useMutation({
    mutationFn: async ({
      conversionId,
      newOperatorId,
    }: {
      conversionId: string;
      newOperatorId: string;
    }) => {
      const { error } = await supabase
        .from("conversions")
        .update({ created_by: newOperatorId })
        .eq("id", conversionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Operatore cassa aggiornato correttamente");
      qc.invalidateQueries({ queryKey: ["conversions-history"] });
      qc.invalidateQueries({ queryKey: ["all-conversions-stipendi"] });
      setEditingConversion(null);
    },
    onError: (e: any) => toast.error(e.message || "Errore durante l'aggiornamento"),
  });

  const batchReassign = useMutation({
    mutationFn: async ({
      targetIds,
      newOperatorId,
    }: {
      targetIds: string[];
      newOperatorId: string;
    }) => {
      if (targetIds.length === 0) throw new Error("Nessuna conversione selezionata");
      if (!newOperatorId) throw new Error("Seleziona il nuovo operatore");

      for (const id of targetIds) {
        const { error } = await supabase
          .from("conversions")
          .update({ created_by: newOperatorId })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.targetIds.length} conversioni riassegnate con successo`);
      qc.invalidateQueries({ queryKey: ["conversions-history"] });
      qc.invalidateQueries({ queryKey: ["all-conversions-stipendi"] });
      setIsBatchOpen(false);
      setSelectedIds([]);
    },
    onError: (e: any) => toast.error(e.message || "Errore durante la riassegnazione"),
  });

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const citName = (r.citizens?.full_name || "").toLowerCase();
        const op = r.created_by ? profBy[r.created_by] : null;
        const opName = (op?.display_name || op?.username || "").toLowerCase();
        if (!citName.includes(term) && !opName.includes(term)) {
          return false;
        }
      }
      // Direction
      if (filterDirection !== "all" && r.direction !== filterDirection) {
        return false;
      }
      // Night
      if (filterNightId !== "all" && r.night_id !== filterNightId) {
        return false;
      }
      // Operator
      if (filterOperatorId !== "all" && r.created_by !== filterOperatorId) {
        return false;
      }
      return true;
    });
  }, [rows, searchTerm, filterDirection, filterNightId, filterOperatorId, profBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Storico Conversioni Cassa</CardTitle>
            <CardDescription>
              Monitora tutte le conversioni effettuate e gestisci l'operatore assegnato
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-500/40 hover:bg-amber-500/10 text-amber-400"
              onClick={() => {
                setIsBatchOpen(true);
                setBatchSourceOp(filterOperatorId !== "all" ? filterOperatorId : "all");
              }}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Correggi / Riassegna in blocco
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["conversions-history"] });
                toast.info("Storico aggiornato");
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca cittadino o operatore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9 bg-background"
              />
            </div>

            <div>
              <Select value={filterDirection} onValueChange={setFilterDirection}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Direzione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le direzioni</SelectItem>
                  <SelectItem value="cash_to_dobloni">Soldi → Dobloni</SelectItem>
                  <SelectItem value="dobloni_to_cash">Dobloni → Soldi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterNightId} onValueChange={setFilterNightId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Tutte le serate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le serate</SelectItem>
                  {allNights.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {new Date(n.night_date).toLocaleDateString("it-IT")}
                      {n.title ? ` - ${n.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterOperatorId} onValueChange={setFilterOperatorId}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Tutti gli operatori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli operatori</SelectItem>
                  {profiles.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || p.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection indicator */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              <span>
                <strong>{selectedIds.length}</strong> conversioni selezionate
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
                  onClick={() => setIsBatchOpen(true)}
                >
                  Riassegna Selezionate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds([])}
                >
                  Deseleziona
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={
                        filteredRows.length > 0 && selectedIds.length === filteredRows.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Data & Ora</TableHead>
                  <TableHead>Cittadino</TableHead>
                  <TableHead>Serata</TableHead>
                  <TableHead>Direzione</TableHead>
                  <TableHead className="text-right">Soldi</TableHead>
                  <TableHead className="text-right">Dobloni</TableHead>
                  <TableHead>Operatore Cassa</TableHead>
                  <TableHead className="text-right w-20">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Nessuna conversione trovata con i filtri applicati
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r) => {
                    const op = r.created_by ? profBy[r.created_by] : null;
                    const isSelected = selectedIds.includes(r.id);
                    return (
                      <TableRow
                        key={r.id}
                        className={isSelected ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(r.id)}
                          />
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatDateTime(r.created_at)}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {r.citizens?.full_name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.nights
                            ? new Date(r.nights.night_date).toLocaleDateString("it-IT")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-semibold px-2 py-0.5 inline-flex items-center gap-1.5 ${
                              r.direction === "cash_to_dobloni"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.direction === "cash_to_dobloni" ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            {r.direction === "cash_to_dobloni"
                              ? "Soldi → Dobloni (+€)"
                              : "Dobloni → Soldi (-€)"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            r.direction === "cash_to_dobloni" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {r.direction === "cash_to_dobloni" ? "+" : "-"}
                          {formatMoney(r.eur_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-amber-400">
                          {r.direction === "cash_to_dobloni" ? "+" : "-"}
                          {formatDobloni(r.dobloni_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                              {(op?.display_name || op?.username || "?")[0]?.toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-200">
                              {op?.display_name || op?.username || "Non assegnato"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                            title="Modifica operatore per questa transazione"
                            onClick={() => {
                              setEditingConversion(r);
                              setSelectedNewOperator(r.created_by || "");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Single Operator Edit Dialog */}
      <Dialog
        open={!!editingConversion}
        onOpenChange={(open) => {
          if (!open) setEditingConversion(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#12141c] border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserCheck className="h-5 w-5 text-amber-400" />
              Modifica Operatore Cassa
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Assegna la conversione all'effettivo operatore che ha gestito la cassa.
            </DialogDescription>
          </DialogHeader>

          {editingConversion && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cittadino:</span>
                  <span className="font-semibold text-white">
                    {editingConversion.citizens?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data/Ora:</span>
                  <span>{formatDateTime(editingConversion.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importi:</span>
                  <span className="font-mono text-amber-400">
                    {formatMoney(editingConversion.eur_amount)} ⇄{" "}
                    {formatDobloni(editingConversion.dobloni_amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Nuovo Operatore
                </Label>
                <Select value={selectedNewOperator} onValueChange={setSelectedNewOperator}>
                  <SelectTrigger className="w-full bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Seleziona operatore" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {profiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name || p.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingConversion(null)} className="text-xs">
              Annulla
            </Button>
            <Button
              variant="default"
              disabled={!selectedNewOperator || updateSingleOperator.isPending}
              onClick={() => {
                if (editingConversion && selectedNewOperator) {
                  updateSingleOperator.mutate({
                    conversionId: editingConversion.id,
                    newOperatorId: selectedNewOperator,
                  });
                }
              }}
              className="text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
            >
              Salva Operatore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Reassign Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="sm:max-w-lg bg-[#12141c] border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-amber-400" />
              Riassegna Conversioni in Blocco
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Correggi lo storico riassegnando le conversioni selezionate o tutte quelle di un
              operatore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedIds.length > 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                Hai selezionato manualmente <strong>{selectedIds.length}</strong> conversioni.
                Verranno tutte aggiornate con l'operatore scelto di seguito.
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Da quale operatore trasferire?
                </Label>
                <Select value={batchSourceOp} onValueChange={setBatchSourceOp}>
                  <SelectTrigger className="w-full bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Seleziona operatore origine" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">
                      Tutte le conversioni attualmente visibili ({filteredRows.length})
                    </SelectItem>
                    {profiles.map((p: any) => {
                      const count = rows.filter((r) => r.created_by === p.id).length;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name || p.username} ({count} conversioni)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Assegna al nuovo operatore:
              </Label>
              <Select value={batchTargetOp} onValueChange={setBatchTargetOp}>
                <SelectTrigger className="w-full bg-slate-900 border-slate-800">
                  <SelectValue placeholder="Seleziona nuovo operatore" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {profiles.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || p.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsBatchOpen(false)} className="text-xs">
              Annulla
            </Button>
            <Button
              variant="default"
              disabled={!batchTargetOp || batchReassign.isPending}
              onClick={() => {
                const targetIds =
                  selectedIds.length > 0
                    ? selectedIds
                    : batchSourceOp === "all"
                      ? filteredRows.map((r) => r.id)
                      : rows.filter((r) => r.created_by === batchSourceOp).map((r) => r.id);

                batchReassign.mutate({
                  targetIds,
                  newOperatorId: batchTargetOp,
                });
              }}
              className="text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
            >
              Conferma Riassegnazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Limits -------------------- */

function LimitsPanel() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Limiti giornalieri per cittadino</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Soldi → Dobloni
            </div>
            <div className="text-2xl font-bold mt-1 text-primary">{formatMoney(2000)}</div>
            <div className="text-xs text-muted-foreground">massimo inseribile al giorno</div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Dobloni → Soldi
            </div>
            <div className="text-2xl font-bold mt-1 text-primary">{formatDobloni(10000)}</div>
            <div className="text-xs text-muted-foreground">massimo inseribile al giorno</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground border-t pt-4">
          I limiti di conversione sono bloccati dal sistema (Max 2.000€ in ingresso per l'acquisto
          di dobloni e Max 10.000⛃ in ingresso per il riscatto in contanti).
        </p>
      </CardContent>
    </Card>
  );
}
