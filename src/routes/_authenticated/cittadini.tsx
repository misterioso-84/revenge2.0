import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { MEMBERSHIP_LABEL, formatDate, formatMoney, formatDobloni } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/cittadini")({
  component: CitizensPage,
});

type Citizen = {
  id: string;
  full_name: string;
  nickname: string | null;
  membership: "standard" | "exclusive" | "elite" | "vip";
  membership_since: string | null;
  notes: string | null;
  created_at: string;
};

function CitizensPage() {
  const qc = useQueryClient();
  const { isAdmin, permissions = [] } = useAuth();
  const canRead = isAdmin || permissions.includes("cittadini.read");
  const canWrite = isAdmin || permissions.includes("cittadini.write");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Citizen | null>(null);
  const [open, setOpen] = useState(false);

  const [historyCitizen, setHistoryCitizen] = useState<Citizen | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*").order("full_name");
      if (error) throw error;
      return data as Citizen[];
    },
    enabled: canRead,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("citizens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      toast.success("Cittadino eliminato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = citizens.filter((c) => {
    const fn = c.full_name?.toLowerCase() || "";
    const nn = c.nickname?.toLowerCase() || "";
    const s = search.toLowerCase();
    return fn.includes(s) || nn.includes(s);
  });

  if (!canRead) {
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
                Non disponi dei permessi necessari per visualizzare questa sezione (richiesto:{" "}
                <strong>Vedere cittadini</strong>).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Cittadini</h1>
          <p className="text-muted-foreground">Anagrafica dei clienti del casinò</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuovo cittadino
          </Button>
        )}
      </div>

      <Input
        placeholder="Cerca per nome…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead className="w-36"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nessun cittadino
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell>
                    <MembershipBadge tier={c.membership} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setHistoryCitizen(c);
                            setHistoryOpen(true);
                          }}
                          title="Storico Operazioni"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                      {canWrite && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(c);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                title: "Elimina cittadino",
                                description: `Sei sicuro di voler eliminare DEFINITIVAMENTE il cittadino "${c.full_name}"? Tutti i dati e lo storico collegati verranno persi.`,
                                onConfirm: () => del.mutate(c.id),
                              })
                            }
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {open && <CitizenDialog open={open} onOpenChange={setOpen} citizen={editing} />}

      {historyOpen && historyCitizen && (
        <CitizenHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          citizen={historyCitizen}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onConfirm={deleteConfirm.onConfirm}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function MembershipBadge({ tier }: { tier: string }) {
  const cls =
    tier === "vip"
      ? "bg-amber-500 text-amber-950 font-bold border border-amber-400 shadow-md shadow-amber-500/10"
      : tier === "elite"
        ? "bg-primary text-primary-foreground"
        : tier === "exclusive"
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-muted-foreground";
  return <Badge className={cls}>{MEMBERSHIP_LABEL[tier]}</Badge>;
}

function CitizenDialog({
  open,
  onOpenChange,
  citizen,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!citizen;
  const [membership, setMembership] = useState<"standard" | "exclusive" | "elite" | "vip">(
    citizen?.membership ?? "standard",
  );

  const initial = citizen ?? {
    full_name: "",
    nickname: "",
    membership: "standard" as const,
    membership_since: null,
    notes: "",
  };

  const save = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit && citizen) {
        const { error } = await supabase.from("citizens").update(values).eq("id", citizen.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("citizens").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      qc.invalidateQueries({ queryKey: ["citizens-mini"] });
      toast.success(isEdit ? "Cittadino aggiornato" : "Cittadino creato");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica cittadino" : "Nuovo cittadino"}</DialogTitle>
        </DialogHeader>
        <form
          key={citizen?.id ?? "new"}
          id="citizen-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const v = Object.fromEntries(fd) as any;

            const trimmedName = v.full_name?.trim() || "";
            if (!trimmedName) {
              toast.error("Il nome completo è obbligatorio");
              return;
            }

            const existingCitizens = qc.getQueryData<Citizen[]>(["citizens"]) || [];
            const isDuplicate = existingCitizens.some((c) => {
              if (citizen && c.id === citizen.id) return false;
              return c.full_name?.trim().toLowerCase() === trimmedName.toLowerCase();
            });

            if (isDuplicate) {
              toast.error(`Esiste già un cittadino registrato con il nome "${trimmedName}"!`);
              return;
            }

            save.mutate(v);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="membership" value={membership} />

          <div>
            <Label>Nome completo *</Label>
            <Input name="full_name" required defaultValue={initial.full_name ?? ""} />
          </div>

          <div>
            <Label>Membership</Label>
            <Select value={membership} onValueChange={(val: any) => setMembership(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEMBERSHIP_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea name="notes" defaultValue={initial.notes ?? ""} rows={3} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button form="citizen-form" type="submit" disabled={save.isPending}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------ Citizen Operation History Dialog (Admin Only) ------------------ */

function CitizenHistoryDialog({
  open,
  onOpenChange,
  citizen,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen;
}) {
  const [selectedNightId, setSelectedNightId] = useState<string>("all");

  const { data: conversions = [] } = useQuery({
    queryKey: ["citizen-conversions", citizen.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversions")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: nightItems = [] } = useQuery({
    queryKey: ["citizen-night-items", citizen.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("night_items")
        .select("*, nights(night_date, title)")
        .eq("citizen_id", citizen.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name");
      return data ?? [];
    },
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  // Combine operations and group them by night
  // Key: night_id or "other"
  const groupedNights = useMemo(() => {
    const nightsObj: Record<
      string,
      {
        night_id: string;
        title: string;
        date: string;
        purchases: any[];
        conversions: any[];
      }
    > = {};

    // Helper to initialize grouping
    const initNightGroup = (nightId: string, rawNight: any) => {
      if (!nightsObj[nightId]) {
        const d = rawNight?.night_date ? new Date(rawNight.night_date) : null;
        const formattedDate = d ? d.toLocaleDateString("it-IT") : "Data non definita";
        nightsObj[nightId] = {
          night_id: nightId,
          title: rawNight?.title ?? `Serata del ${formattedDate}`,
          date: formattedDate,
          purchases: [],
          conversions: [],
        };
      }
    };

    // Add night items (purchases)
    nightItems.forEach((item: any) => {
      const nid = item.night_id || "other";
      initNightGroup(nid, item.nights);
      nightsObj[nid].purchases.push(item);
    });

    // Add conversions
    conversions.forEach((conv: any) => {
      const nid = conv.night_id || "other";
      initNightGroup(nid, conv.nights);
      nightsObj[nid].conversions.push(conv);
    });

    // Sort groups newest first (using dates or night_id)
    return Object.values(nightsObj).sort((a, b) => {
      if (a.night_id === "other") return 1;
      if (b.night_id === "other") return -1;
      return b.date.localeCompare(a.date);
    });
  }, [nightItems, conversions]);

  const hasOperations = groupedNights.length > 0;

  const filteredGroupedNights = useMemo(() => {
    if (selectedNightId === "all") return groupedNights;
    return groupedNights.filter((g) => g.night_id === selectedNightId);
  }, [groupedNights, selectedNightId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <History className="h-5 w-5 text-blue-500" /> Storico Operazioni:{" "}
            <span className="text-primary">{citizen.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {hasOperations && (
            <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border max-w-md">
              <Label htmlFor="night-filter" className="text-sm font-medium shrink-0">
                Filtra per serata:
              </Label>
              <Select value={selectedNightId} onValueChange={setSelectedNightId}>
                <SelectTrigger id="night-filter" className="bg-background">
                  <SelectValue placeholder="Tutte le serate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le serate</SelectItem>
                  {groupedNights.map((n) => (
                    <SelectItem key={n.night_id} value={n.night_id}>
                      {n.title} ({n.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!hasOperations ? (
            <div className="text-center text-muted-foreground py-12 border border-dashed rounded-lg">
              Nessuna operazione registrata per questo cittadino.
            </div>
          ) : filteredGroupedNights.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border border-dashed rounded-lg">
              Nessuna operazione registrata per la serata selezionata.
            </div>
          ) : (
            filteredGroupedNights.map((g) => (
              <div key={g.night_id} className="border rounded-lg overflow-hidden bg-card/40">
                {/* Night Header */}
                <div className="bg-muted px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">{g.title}</h3>
                  <Badge variant="outline" className="font-normal bg-background">
                    {g.date}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {/* Purchases Section */}
                  {g.purchases.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Acquisti / Servizi Usufruiti
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1">Prodotto/Servizio</TableHead>
                            <TableHead className="h-8 py-1 text-center">Quantità</TableHead>
                            <TableHead className="h-8 py-1 text-right">Prezzo Unitario</TableHead>
                            <TableHead className="h-8 py-1 text-right">Subtotale</TableHead>
                            <TableHead className="h-8 py-1 text-right">Operatore</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.purchases.map((p) => {
                            const op = p.created_by ? profileMap[p.created_by] : null;
                            const opName = op?.username ?? "-";
                            return (
                              <TableRow key={p.id} className="h-9">
                                <TableCell className="py-1.5 font-medium">
                                  {p.service_name}
                                </TableCell>
                                <TableCell className="py-1.5 text-center font-mono">
                                  {p.qty}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono">
                                  {formatMoney(p.unit_price)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-emerald-600">
                                  {formatMoney(p.subtotal)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-muted-foreground">
                                  {opName}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Conversions Section */}
                  {g.conversions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                        Conversioni Cassa
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1">Tipo Conversione</TableHead>
                            <TableHead className="h-8 py-1 text-right">Importo EUR</TableHead>
                            <TableHead className="h-8 py-1 text-right">Importo Dobloni</TableHead>
                            <TableHead className="h-8 py-1 text-right">Operatore</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.conversions.map((c) => {
                            const op = c.created_by ? profileMap[c.created_by] : null;
                            const opName = op?.username ?? "-";
                            const isCashToDobloni = c.direction === "cash_to_dobloni";
                            return (
                              <TableRow key={c.id} className="h-9">
                                <TableCell className="py-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] ${isCashToDobloni ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                                  >
                                    {isCashToDobloni ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono">
                                  {formatMoney(c.eur_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono">
                                  {formatDobloni(c.dobloni_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-muted-foreground">
                                  {opName}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
