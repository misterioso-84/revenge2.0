import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowRight, RotateCcw, Save, Coins, Euro, Plus } from "lucide-react";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Conversioni</h1>
        <p className="text-muted-foreground mt-1">
          Soldi ⇄ Dobloni · 1€ = 10 ⛃ · da Dobloni si applica il 75%
        </p>
      </div>

      <Tabs
        value={activeTab || (canExec ? "convert" : canHist ? "history" : "limits")}
        onValueChange={setActiveTab}
      >
        <TabsList>
          {canExec && <TabsTrigger value="convert">Nuova conversione</TabsTrigger>}
          {canHist && <TabsTrigger value="history">Storico</TabsTrigger>}
          <TabsTrigger value="limits">Limiti {isAdmin ? "(modifica)" : ""}</TabsTrigger>
        </TabsList>

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
  const { isAdmin } = useAuth();

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

  const [citizenId, setCitizenId] = useState<string>("");
  const [citizenSearch, setCitizenSearch] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [nightId, setNightId] = useState<string>("");
  const [direction, setDirection] = useState<Direction>("cash_to_dobloni");
  const [input, setInput] = useState<string>("");

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
      const { data, error } = await (supabase as any).rpc("perform_conversion", {
        _citizen: citizenId,
        _night: currentNightId,
        _direction: direction,
        _input: inputNum,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Conversione registrata");
      setInput("");
      qc.invalidateQueries({ queryKey: ["conv-usage"] });
      qc.invalidateQueries({ queryKey: ["conversions-history"] });
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

  // Formatta i limiti coerentemente con la valuta inserita nell'input
  const formatByDirection = (val: number) => {
    return direction === "cash_to_dobloni" ? formatMoney(val) : formatDobloni(val);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Esegui conversione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Label>Cittadino</Label>
              <div className="flex gap-1 relative">
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
                          <div
                            key={c.id}
                            className={`p-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                              c.id === citizenId ? "bg-accent/50" : ""
                            }`}
                            onClick={() => handleSelectCitizen(c)}
                          >
                            {c.full_name}
                          </div>
                        ))}
                        {citizenSearch.trim() && !exactExists && (
                          <div
                            className="p-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-primary border-t flex items-center gap-2 font-medium"
                            onClick={() => createCitizen.mutate(citizenSearch)}
                          >
                            <Plus className="h-4 w-4" />
                            Crea cittadino: <strong>{citizenSearch.trim()}</strong>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <Label>Serata APERTA (giornata)</Label>
              {nights.length === 0 ? (
                <div className="p-2.5 border border-amber-500/30 rounded-md text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 mt-1 flex items-center gap-1.5">
                  <span>
                    ⚠️ Nessuna serata APERTA al momento. Apri una serata per poter convertire.
                  </span>
                </div>
              ) : (
                <Select value={currentNightId} onValueChange={setNightId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona serata aperta…" />
                  </SelectTrigger>
                  <SelectContent>
                    {nights.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {formatDate(n.night_date)}
                        {n.title ? ` · ${n.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
              className="h-14"
            >
              <Euro className="h-4 w-4" /> <ArrowRight className="h-4 w-4" />{" "}
              <Coins className="h-4 w-4" />
              <span className="ml-1">Soldi → Dobloni</span>
            </Button>
            <Button
              type="button"
              variant={direction === "dobloni_to_cash" ? "default" : "outline"}
              onClick={() => {
                setDirection("dobloni_to_cash");
                setInput("");
              }}
              className="h-14"
            >
              <Coins className="h-4 w-4" /> <ArrowRight className="h-4 w-4" />{" "}
              <Euro className="h-4 w-4" />
              <span className="ml-1">Dobloni → Soldi</span>
            </Button>
          </div>

          <div>
            <Label>
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

      <Card className={exceeds ? "border-destructive/50" : "border-primary/30"}>
        <CardHeader>
          <CardTitle>Anteprima</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-border p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                In entrata
              </div>
              <div className="mt-1 text-xl font-bold">{preview.inStr}</div>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
              <div className="text-xs text-primary uppercase tracking-wider">Da consegnare</div>
              <div className="mt-1 text-2xl font-bold text-primary">{preview.outStr}</div>
            </div>
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
              <Save className="h-4 w-4" /> Conferma conversione
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
  const { data: rows = [] } = useQuery({
    queryKey: ["conversions-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("conversions")
        .select("*, citizens(full_name), nights(night_date, title)")
        .order("created_at", { ascending: false })
        .limit(200);
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
  const profBy = Object.fromEntries((profiles as any[]).map((p) => [p.id, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico conversioni</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cittadino</TableHead>
              <TableHead>Serata</TableHead>
              <TableHead>Direzione</TableHead>
              <TableHead className="text-right">Soldi</TableHead>
              <TableHead className="text-right">Dobloni</TableHead>
              <TableHead>Operatore</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nessuna conversione
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const op = r.created_by ? profBy[r.created_by] : null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.citizens?.full_name ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.nights ? new Date(r.nights.night_date).toLocaleDateString("it-IT") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.direction === "cash_to_dobloni" ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(r.eur_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDobloni(r.dobloni_amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {op?.display_name ?? op?.username ?? "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
