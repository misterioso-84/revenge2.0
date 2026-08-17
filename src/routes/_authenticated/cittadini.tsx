import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Plus,
  Pencil,
  Trash2,
  History,
  Users,
  Search,
  ShieldCheck,
  ChevronRight,
  User,
} from "lucide-react";
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
  const { profile, isAdmin, permissions = [] } = useAuth();

  const isStaff =
    isAdmin ||
    permissions.includes("cittadini.read") ||
    permissions.includes("cittadini.visualizza") ||
    permissions.includes("cittadini.gestisci") ||
    permissions.includes("cittadini.write") ||
    profile?.has_employee_access === true ||
    profile?.show_in_staff_list === true;

  const canWrite =
    isAdmin ||
    permissions.includes("cittadini.write") ||
    permissions.includes("cittadini.gestisci");

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

  // Fetch all citizens
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*").order("full_name");
      if (error) throw error;
      return (data || []) as Citizen[];
    },
  });

  // Fetch all profiles for operator lookup
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name");
      return (data || []) as any[];
    },
  });

  const profileMap = useMemo(() => {
    return Object.fromEntries(profiles.map((p) => [p.id, p]));
  }, [profiles]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("citizens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citizens"] });
      toast.success("Cittadino eliminato dal registro");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredCitizens = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return citizens;
    return citizens.filter((c) => {
      const fn = c.full_name?.toLowerCase() || "";
      const nn = c.nickname?.toLowerCase() || "";
      return fn.includes(s) || nn.includes(s);
    });
  }, [citizens, search]);

  const createdTodayCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return citizens.filter((c) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= startOfDay;
    }).length;
  }, [citizens]);

  if (!isStaff) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Accesso Riservato allo Staff
          </h2>
          <p className="text-slate-400 text-sm">
            Il registro clienti del gestionale è riservato esclusivamente al personale autorizzato
            del Casinò Revenge. La tua Scheda Cittadino personale è disponibile sul sito principale.
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl px-6"
          >
            <Link to="/scheda-cittadino">
              <User className="h-4 w-4 mr-2" />
              Apri La Mia Scheda Cittadino
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
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
          ANAGRAFICA CITTAGINI, MEMBERSHIP E STORICO OPERAZIONI
        </p>
      </div>

      {/* REGISTRO GENERALE CITTAGINI */}
      <div className="space-y-6">
        {/* Control Header Box */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                REGISTRO GENERALE CLIENTI ({citizens.length})
              </h2>
              <p className="text-xs text-slate-400">
                Gestione anagrafica generale, assegnazione membership e storico transazioni
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#0a0b10] border border-slate-800 rounded-xl px-3.5 py-2 w-full sm:w-64 shadow-inner">
              <Search className="h-4 w-4 text-amber-400 shrink-0" />
              <Input
                placeholder="Cerca cittadino o nickname…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500 text-xs font-medium"
              />
            </div>

            {canWrite && (
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 shrink-0"
                onClick={() => {
                  if (createdTodayCount >= 5) {
                    toast.error(
                      "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
                      { duration: 5000 },
                    );
                    return;
                  }
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nuovo cittadino
              </Button>
            )}
          </div>
        </div>

        {/* TABLE OF CITIZENS */}
        <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-[#0a0b10] border-b border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Cittadino / Nickname Minecraft
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Livello Membership
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Membro Dal
                </TableHead>
                <TableHead className="text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Note & Informazioni
                </TableHead>
                <TableHead className="text-right text-slate-400 font-bold uppercase text-[11px] tracking-wider py-3.5">
                  Azioni
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCitizens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                    {search
                      ? "Nessun cittadino corrisponde ai criteri di ricerca."
                      : "Nessun cittadino registrato nel sistema."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCitizens.map((c) => {
                  const mcNick = c.nickname || c.full_name;
                  return (
                    <TableRow
                      key={c.id}
                      className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(mcNick)}/36`}
                            alt="Minecraft Avatar"
                            className="h-9 w-9 rounded-xl border border-amber-500/30 bg-[#0a0b10] object-cover shadow-sm shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://minotar.net/helm/Steve/36.png";
                            }}
                          />
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-white text-sm">{c.full_name}</div>
                            <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>🎮</span>
                              <span>{c.nickname || "Nessun nickname"}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <MembershipBadge tier={c.membership} />
                      </TableCell>

                      <TableCell className="py-4 font-mono text-xs text-slate-300">
                        {c.membership_since
                          ? formatDate(c.membership_since)
                          : formatDate(c.created_at)}
                      </TableCell>

                      <TableCell className="py-4 text-xs text-slate-400 max-w-xs truncate">
                        {c.notes || <span className="text-slate-600 italic">Nessuna nota</span>}
                      </TableCell>

                      <TableCell className="text-right py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold"
                            onClick={() => {
                              setHistoryCitizen(c);
                              setHistoryOpen(true);
                            }}
                          >
                            <History className="h-3.5 w-3.5 mr-1" /> Storico
                          </Button>

                          {canWrite && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl"
                                onClick={() => {
                                  setEditing(c);
                                  setOpen(true);
                                }}
                                title="Modifica"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl"
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    title: "Elimina Cittadino",
                                    description: `Sei sicuro di voler eliminare dal registro il cittadino "${c.full_name}"? L'azione non è reversibile.`,
                                    onConfirm: () => del.mutate(c.id),
                                  });
                                }}
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL CREAZIONE / MODIFICA CITTADINO */}
      {open && (
        <CitizenDialog
          open={open}
          onOpenChange={setOpen}
          citizen={editing}
          createdTodayCount={createdTodayCount}
        />
      )}

      {/* MODAL STORICO OPERAZIONI CITTADINO */}
      {historyOpen && historyCitizen && (
        <CitizenHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          citizen={historyCitizen}
          profileMap={profileMap}
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

/* -------------------------------------------------------------------------- */
/*                            MEMBERSHIP BADGE                                */
/* -------------------------------------------------------------------------- */

function MembershipBadge({ tier }: { tier: string }) {
  const cls =
    tier === "vip"
      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black border border-amber-300 shadow-md shadow-amber-500/20"
      : tier === "elite"
        ? "bg-purple-600/90 text-white font-bold border border-purple-400"
        : tier === "exclusive"
          ? "bg-sky-600/90 text-white font-bold border border-sky-400"
          : "bg-slate-800 text-slate-300 font-medium border border-slate-700";

  return (
    <Badge className={`${cls} text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5`}>
      {MEMBERSHIP_LABEL[tier] || tier}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*                            CITIZEN EDIT DIALOG                             */
/* -------------------------------------------------------------------------- */

function CitizenDialog({
  open,
  onOpenChange,
  citizen,
  createdTodayCount,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen | null;
  createdTodayCount: number;
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
        if (createdTodayCount >= 5) {
          throw new Error(
            "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
          );
        }
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
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">
            {isEdit ? "Modifica Cittadino" : "Nuovo Cittadino"}
          </DialogTitle>
        </DialogHeader>
        {!isEdit && createdTodayCount >= 5 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
            <span>
              ⚠️ Limite giornaliero raggiunto: sono già stati creati {createdTodayCount} cittadini
              oggi.
            </span>
          </div>
        )}
        <form
          key={citizen?.id ?? "new"}
          id="citizen-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isEdit && createdTodayCount >= 5) {
              toast.error(
                "Limite giornaliero raggiunto: non puoi creare più di 5 cittadini al giorno nella sezione Cittadini!",
              );
              return;
            }
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
          className="space-y-4"
        >
          <input type="hidden" name="membership" value={membership} />

          <div>
            <Label className="text-xs font-bold text-slate-300">Nome Completo / Ruolo *</Label>
            <Input
              name="full_name"
              required
              defaultValue={initial.full_name ?? ""}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Es: Mario Rossi o Nickname Giocatore"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Nickname Minecraft</Label>
            <Input
              name="nickname"
              defaultValue={initial.nickname ?? ""}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Es: Steve123"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Livello Membership</Label>
            <Select value={membership} onValueChange={(val: any) => setMembership(val)}>
              <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white">
                {Object.entries(MEMBERSHIP_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Note Speciali</Label>
            <Textarea
              name="notes"
              defaultValue={initial.notes ?? ""}
              rows={3}
              className="bg-[#0a0b10] border-slate-800 text-white rounded-xl mt-1.5"
              placeholder="Informazioni o preferenze del cliente..."
            />
          </div>
        </form>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Annulla
          </Button>
          <Button
            form="citizen-form"
            type="submit"
            disabled={save.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
          >
            {isEdit ? "Salva Modifiche" : "Crea Cittadino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                    CITIZEN OPERATION HISTORY (ADMIN DIALOG)                */
/* -------------------------------------------------------------------------- */

function CitizenHistoryDialog({
  open,
  onOpenChange,
  citizen,
  profileMap,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  citizen: Citizen;
  profileMap: Record<string, any>;
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
      return (data || []) as any[];
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
      return (data || []) as any[];
    },
  });

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

    nightItems.forEach((item: any) => {
      const nid = item.night_id || "other";
      initNightGroup(nid, item.nights);
      nightsObj[nid].purchases.push(item);
    });

    conversions.forEach((conv: any) => {
      const nid = conv.night_id || "other";
      initNightGroup(nid, conv.nights);
      nightsObj[nid].conversions.push(conv);
    });

    return Object.values(nightsObj).sort((a, b) => {
      if (a.night_id === "other") return 1;
      if (b.night_id === "other") return -1;
      return b.date.localeCompare(a.date);
    });
  }, [nightItems, conversions]);

  const filteredGroupedNights = useMemo(() => {
    if (selectedNightId === "all") return groupedNights;
    return groupedNights.filter((g) => g.night_id === selectedNightId);
  }, [groupedNights, selectedNightId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#12141c] border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(citizen.nickname || citizen.full_name)}/40`}
              alt="Avatar"
              className="h-10 w-10 rounded-xl border border-amber-500/40 bg-[#0a0b10] object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/40.png";
              }}
            />
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-white">
                Storico Operazioni: {citizen.full_name}
              </DialogTitle>
              <div className="text-xs text-slate-400 font-mono">
                {citizen.nickname ? `@${citizen.nickname}` : "Nessun nickname"} • Membership{" "}
                <span className="text-amber-400 uppercase font-bold">
                  {MEMBERSHIP_LABEL[citizen.membership]}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* NIGHT FILTER SELECTOR */}
        {groupedNights.length > 1 && (
          <div className="flex items-center gap-3 bg-[#0a0b10] p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase">Filtra per Serata:</span>
            <Select value={selectedNightId} onValueChange={setSelectedNightId}>
              <SelectTrigger className="w-64 bg-[#12141c] border-slate-700 text-white text-xs h-8">
                <SelectValue placeholder="Tutte le serate" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                <SelectItem value="all">Tutte le Serate ({groupedNights.length})</SelectItem>
                {groupedNights.map((g) => (
                  <SelectItem key={g.night_id} value={g.night_id}>
                    {g.title} ({g.date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4 pt-2">
          {filteredGroupedNights.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nessuna operazione registrata per la serata selezionata.
            </div>
          ) : (
            filteredGroupedNights.map((g) => (
              <div
                key={g.night_id}
                className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0a0b10]/80"
              >
                <div className="bg-[#0f1118] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    {g.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-slate-400 border-slate-800"
                  >
                    {g.date}
                  </Badge>
                </div>

                <div className="p-4 space-y-4">
                  {g.purchases.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                        Acquisti / Servizi Usufruiti
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1 text-slate-400 text-[11px]">
                              Prodotto/Servizio
                            </TableHead>
                            <TableHead className="h-8 py-1 text-center text-slate-400 text-[11px]">
                              Quantità
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Prezzo Unitario
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Subtotale
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Operatore
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.purchases.map((p) => {
                            const op = p.created_by ? profileMap[p.created_by] : null;
                            const opName = op?.username || "-";
                            return (
                              <TableRow key={p.id} className="h-9 border-b border-slate-800/50">
                                <TableCell className="py-1.5 font-bold text-slate-200 text-xs">
                                  {p.service_name}
                                </TableCell>
                                <TableCell className="py-1.5 text-center font-mono text-xs">
                                  {p.qty}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs text-slate-400">
                                  {formatMoney(p.unit_price)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-sky-400 text-xs">
                                  {formatMoney(p.subtotal)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-slate-400">
                                  {opName}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {g.conversions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Conversioni Cassa
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent h-8">
                            <TableHead className="h-8 py-1 text-slate-400 text-[11px]">
                              Tipo Conversione
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Importo EUR
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Importo Dobloni
                            </TableHead>
                            <TableHead className="h-8 py-1 text-right text-slate-400 text-[11px]">
                              Operatore
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.conversions.map((c) => {
                            const op = c.created_by ? profileMap[c.created_by] : null;
                            const opName = op?.username || "-";
                            const isCashToDobloni = c.direction === "cash_to_dobloni";
                            return (
                              <TableRow key={c.id} className="h-9 border-b border-slate-800/50">
                                <TableCell className="py-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-bold ${
                                      isCashToDobloni
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    }`}
                                  >
                                    {isCashToDobloni ? "Soldi → Dobloni" : "Dobloni → Soldi"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-slate-200 text-xs">
                                  {formatMoney(c.eur_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono font-bold text-amber-400 text-xs">
                                  {formatDobloni(c.dobloni_amount)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-xs text-slate-400">
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-[#0a0b10] border-slate-800 text-slate-300 hover:text-white rounded-xl"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
