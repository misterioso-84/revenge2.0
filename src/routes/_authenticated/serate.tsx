import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Trash2,
  Search,
  UserPlus,
  Users,
  AlertCircle,
  CalendarDays,
  Lock,
  Unlock,
  Pencil,
} from "lucide-react";
import { formatDate, formatMoney, MEMBERSHIP_LABEL } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/serate")({
  component: NightsPage,
});

type Night = {
  id: string;
  night_date: string;
  title: string | null;
  total: number;
  notes: string | null;
  is_closed: boolean; // Aggiunto per gestire lo stato di chiusura
};

const EXCLUDED_CATEGORIES = ["Membership", "Ippodromo"];
const QTY_SERVICES = ["Guardia del corpo"];

function useCan() {
  const { isAdmin, permissions } = useAuth();
  return (perm: string) => isAdmin || permissions.includes(perm);
}

function NightsPage() {
  const qc = useQueryClient();
  const can = useCan();
  const canRead =
    can("serate.crea") || can("serate.gestisci") || can("serate.consulta") || can("serate.incassi");

  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [deleteNightId, setDeleteNightId] = useState<string | null>(null);

  const { data: nights = [] } = useQuery({
    queryKey: ["nights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nights")
        .select("id, night_date, title, total, notes, is_closed") // Selezioniamo anche is_closed
        .order("night_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Night[];
    },
    enabled: canRead,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nights"] });
      toast.success("Serata eliminata");
    },
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
                Non disponi dei permessi necessari per visualizzare questa sezione.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Serate</h1>
          <p className="text-muted-foreground">Apri una serata e registra i pass dei cittadini</p>
        </div>
        <div className="flex gap-2">
          {can("serate.consulta") && (
            <Button variant="outline" onClick={() => setLookupOpen(true)}>
              <Search className="h-4 w-4" /> Consulta cittadino
            </Button>
          )}
          {can("serate.crea") && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> Nuova serata
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Titolo</TableHead>
                {can("serate.incassi") && <TableHead className="text-right">Incasso</TableHead>}
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nights.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={can("serate.incassi") ? 5 : 4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nessuna serata
                  </TableCell>
                </TableRow>
              )}
              {nights.map((n) => (
                <TableRow key={n.id} className="cursor-pointer" onClick={() => setOpenId(n.id)}>
                  <TableCell>
                    {n.is_closed ? (
                      <Badge variant="destructive" className="gap-1">
                        <Lock className="h-3 w-3" /> Chiusa
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600/30 bg-green-500/10 gap-1"
                      >
                        <Unlock className="h-3 w-3" /> Aperta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(n.night_date)}</TableCell>
                  <TableCell className="font-medium">{n.title ?? "Serata"}</TableCell>
                  {can("serate.incassi") && (
                    <TableCell className="text-right font-mono">{formatMoney(n.total)}</TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {can("serate.crea") &&
                      !n.is_closed && ( // Non si può eliminare se è chiusa
                        <Button size="icon" variant="ghost" onClick={() => setDeleteNightId(n.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {newOpen && (
        <NewNightDialog
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            setOpenId(id);
          }}
        />
      )}
      {openId && <NightDetailDialog id={openId} onClose={() => setOpenId(null)} />}
      {lookupOpen && <CitizenLookupDialog nights={nights} onClose={() => setLookupOpen(false)} />}

      {deleteNightId && (
        <Dialog open onOpenChange={() => setDeleteNightId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Elimina Serata</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              Sei sicuro di voler eliminare definitivamente questa serata? Questa azione non può
              essere annullata.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteNightId(null)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  del.mutate(deleteNightId);
                  setDeleteNightId(null);
                }}
                disabled={del.isPending}
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* -------------------------- Citizen picker -------------------------- */

type Citizen = { id: string; full_name: string; membership: string };

function useCitizens() {
  return useQuery({
    queryKey: ["citizens-mini"],
    queryFn: async () => {
      const { data } = await supabase
        .from("citizens")
        .select("id, full_name, membership, created_at")
        .order("full_name");
      return (data ?? []) as Citizen[];
    },
  });
}

function CitizenPicker({
  value,
  onChange,
  allowCreate = true,
  excludeIds,
}: {
  value: Citizen | null;
  onChange: (c: Citizen | null) => void;
  allowCreate?: boolean;
  excludeIds?: Set<string>;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const { data: citizens = [] } = useCitizens();

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return citizens.slice(0, 8);
    return citizens.filter((c) => c.full_name.toLowerCase().includes(t)).slice(0, 8);
  }, [citizens, q]);

  const exactExists = useMemo(() => {
    const t = q.trim().toLowerCase();
    return !!citizens.find((c) => c.full_name.toLowerCase() === t);
  }, [citizens, q]);

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("citizens")
        .insert({ full_name: name.trim(), membership: "standard" })
        .select("id, full_name, membership, created_at")
        .single();
      if (error) throw error;
      return data as Citizen;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["citizens-mini"] });
      qc.invalidateQueries({ queryKey: ["citizens"] });
      onChange(data);
      setQ("");
      setFocused(false);
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

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 border border-border rounded-md px-3 py-2 bg-card/50">
        <div>
          <div className="font-medium">{value.full_name}</div>
          <div className="text-xs text-muted-foreground">
            Membership: {MEMBERSHIP_LABEL[value.membership]}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
          Cambia
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder="Cerca cittadino…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {matches.map((c) => {
            const isExcluded = excludeIds?.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center ${
                  isExcluded
                    ? "opacity-60 cursor-not-allowed bg-accent/5 text-muted-foreground"
                    : "hover:bg-accent/40"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (isExcluded) {
                    toast.error("Questo cittadino è già presente in questa serata!");
                    return;
                  }
                  onChange(c);
                  setQ("");
                  setFocused(false);
                }}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {c.full_name}
                  {isExcluded && (
                    <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20 font-normal">
                      Già in serata
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {MEMBERSHIP_LABEL[c.membership]}
                </span>
              </button>
            );
          })}
          {allowCreate && q.trim() && !exactExists && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm flex items-center gap-2 text-primary"
              onMouseDown={(e) => {
                e.preventDefault();
                create.mutate(q);
              }}
              disabled={create.isPending}
            >
              <UserPlus className="h-4 w-4" /> Crea cittadino: <strong>{q.trim()}</strong>
            </button>
          )}
          {!allowCreate && matches.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nessun risultato</div>
          )}
          {matches.length === 0 && !q.trim() && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Inizia a digitare per cercare
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------- New night dialog -------------------------- */

function NewNightDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("nights")
        .insert({ night_date: date, title: title.trim() || null, is_closed: false, total: 0 })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["nights"] });
      toast.success("Serata aperta");
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova serata</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Titolo (opzionale)</Label>
            <Input
              placeholder="es. Sabato sera"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            Apri serata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Night detail (citizens + services) -------------------------- */

type NightItem = {
  id: string;
  night_id: string;
  citizen_id: string;
  service_id: string | null;
  service_name: string;
  unit_price: number;
  qty: number;
  subtotal: number;
};

function NightDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useCan();
  const [addOpen, setAddOpen] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null);
  const [editingPicked, setEditingPicked] = useState<Record<string, number>>({});
  const [deleteCitizenId, setDeleteCitizenId] = useState<string | null>(null);
  const [showToggleCloseConfirm, setShowToggleCloseConfirm] = useState(false);

  const { data } = useQuery({
    queryKey: ["night", id],
    queryFn: async () => {
      const [n, items] = await Promise.all([
        supabase
          .from("nights")
          .select("id, night_date, title, total, notes, is_closed")
          .eq("id", id)
          .single(),
        supabase
          .from("night_items")
          .select("*, citizens(id, full_name, membership)")
          .eq("night_id", id),
      ]);
      if (n.error) throw n.error;
      return {
        night: n.data as Night,
        items: (items.data ?? []) as (NightItem & { citizens: Citizen | null })[],
      };
    },
  });

  const isClosed = data?.night?.is_closed ?? false;
  // Si può gestire la serata se si ha il permesso E la serata NON è chiusa
  const canManage = can("serate.gestisci") && !isClosed;
  const canIncassi = can("serate.incassi");
  const canToggleClose = can("serate.chiudi"); // Permesso specifico per chiudere/riaprire

  const toggleNightStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nights").update({ is_closed: !isClosed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["night", id] });
      qc.invalidateQueries({ queryKey: ["nights"] });
      toast.success(isClosed ? "Serata riaperta con successo" : "Serata chiusa definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCitizen = useMutation({
    mutationFn: async (citizenId: string) => {
      if (isClosed) throw new Error("La serata è chiusa. Impossibile modificare i servizi.");
      const { error } = await supabase
        .from("night_items")
        .delete()
        .eq("night_id", id)
        .eq("citizen_id", citizenId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["night", id] });
      qc.invalidateQueries({ queryKey: ["nights"] });
      toast.success("Cittadino rimosso dalla serata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m = new Map<string, { citizen: Citizen; items: NightItem[]; subtotal: number }>();
    (data?.items ?? []).forEach((it) => {
      if (!it.citizens) return;
      const k = it.citizen_id;
      if (!m.has(k)) m.set(k, { citizen: it.citizens, items: [], subtotal: 0 });
      const g = m.get(k)!;
      g.items.push(it);
      g.subtotal += Number(it.subtotal);
    });
    return Array.from(m.values()).sort((a, b) =>
      a.citizen.full_name.localeCompare(b.citizen.full_name),
    );
  }, [data]);

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {data?.night?.title ?? "Serata"}
              <span className="text-sm font-normal text-muted-foreground">
                · {data?.night ? formatDate(data.night.night_date) : ""}
              </span>
              {isClosed ? (
                <Badge variant="destructive" className="ml-2 gap-1">
                  <Lock className="h-3 w-3" /> Chiusa
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="ml-2 text-green-600 border-green-600/30 bg-green-500/10 gap-1"
                >
                  <Unlock className="h-3 w-3" /> Aperta
                </Badge>
              )}
            </DialogTitle>

            {/* Pulsante per chiudere/riaprire la serata disponibile solo a chi ha il permesso */}
            {canToggleClose && data?.night && (
              <Button
                size="sm"
                variant={isClosed ? "outline" : "destructive"}
                onClick={() => setShowToggleCloseConfirm(true)}
                disabled={toggleNightStatus.isPending}
              >
                {isClosed ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                {isClosed ? "Riapri Serata" : "Chiudi Serata"}
              </Button>
            )}
          </DialogHeader>

          {isClosed && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Serata Bloccata:</strong> I servizi di questa serata sono stati congelati.
                Nessuna modifica è ammessa.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> {grouped.length}{" "}
              {grouped.length === 1 ? "cittadino" : "cittadini"}
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Aggiungi cittadino
              </Button>
            )}
          </div>

          <div className="space-y-3 mt-2">
            {grouped.length === 0 && (
              <div className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-md">
                Nessun cittadino in questa serata
              </div>
            )}
            {grouped.map((g) => (
              <Card key={g.citizen.id} className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{g.citizen.full_name}</div>
                      <Badge variant="secondary" className="mt-1">
                        {MEMBERSHIP_LABEL[g.citizen.membership]}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Subtotale</div>
                      <div className="font-mono font-semibold">{formatMoney(g.subtotal)}</div>
                    </div>
                  </div>
                  <ul className="text-sm divide-y divide-border/40">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex justify-between py-1.5">
                        <span>
                          {i.service_name}
                          {i.qty > 1 ? ` ×${i.qty}` : ""}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatMoney(i.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {canManage && (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const pickedMap: Record<string, number> = {};
                          g.items.forEach((item) => {
                            if (item.service_id) pickedMap[item.service_id] = item.qty;
                          });
                          setEditingCitizen(g.citizen);
                          setEditingPicked(pickedMap);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Modifica Prodotti
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteCitizenId(g.citizen.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Rimuovi
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {canIncassi && (
            <div className="flex justify-between pt-4 border-t mt-4 font-bold text-lg">
              <span>Incasso serata</span>
              <span className="text-primary font-bold">{formatMoney(data?.night?.total ?? 0)}</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(addOpen || editingCitizen) && (
        <AddCitizenToNightDialog
          nightId={id}
          existingCitizenIds={new Set(grouped.map((g) => g.citizen.id))}
          initialCitizen={editingCitizen}
          initialPicked={editingPicked}
          onClose={() => {
            setAddOpen(false);
            setEditingCitizen(null);
            setEditingPicked({});
          }}
          onAdded={() => {
            setAddOpen(false);
            setEditingCitizen(null);
            setEditingPicked({});
            qc.invalidateQueries({ queryKey: ["night", id] });
            qc.invalidateQueries({ queryKey: ["nights"] });
          }}
        />
      )}

      {showToggleCloseConfirm && (
        <Dialog open onOpenChange={() => setShowToggleCloseConfirm(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isClosed ? "Riapri Serata" : "Chiudi Serata"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              {isClosed
                ? "Sei sicuro di voler riaprire questa serata? Sarà nuovamente possibile aggiungere o rimuovere servizi per i cittadini."
                : "Sei sicuro di voler chiudere questa serata? Non sarà più possibile aggiungere o rimuovere servizi per i cittadini."}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowToggleCloseConfirm(false)}>
                Annulla
              </Button>
              <Button
                variant={isClosed ? "default" : "destructive"}
                onClick={() => {
                  toggleNightStatus.mutate();
                  setShowToggleCloseConfirm(false);
                }}
                disabled={toggleNightStatus.isPending}
              >
                {isClosed ? "Riapri" : "Chiudi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteCitizenId && (
        <Dialog open onOpenChange={() => setDeleteCitizenId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rimuovi Cittadino</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              Sei sicuro di voler rimuovere questo cittadino dalla serata? Tutti i suoi servizi
              registrati per questa serata verranno eliminati.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteCitizenId(null)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removeCitizen.mutate(deleteCitizenId);
                  setDeleteCitizenId(null);
                }}
                disabled={removeCitizen.isPending}
              >
                Rimuovi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* -------------------------- Add citizen to night -------------------------- */

function AddCitizenToNightDialog({
  nightId,
  existingCitizenIds,
  initialCitizen = null,
  initialPicked = {},
  onClose,
  onAdded,
}: {
  nightId: string;
  existingCitizenIds: Set<string>;
  initialCitizen?: Citizen | null;
  initialPicked?: Record<string, number>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { profile } = useAuth();
  const [citizen, setCitizen] = useState<Citizen | null>(initialCitizen);
  const [picked, setPicked] = useState<Record<string, number>>(initialPicked);

  const { data: services = [] } = useQuery({
    queryKey: ["services-for-nights"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select(
          "id, name, price, billing, include_in_nights, is_qty_editable, service_categories(name, sort_order)",
        )
        .eq("active", true)
        .order("name");
      return (data ?? []).filter(
        (s) =>
          s.include_in_nights !== false &&
          !EXCLUDED_CATEGORIES.includes(s.service_categories?.name ?? ""),
      );
    },
  });

  const total = useMemo(
    () => services.reduce((s, sv) => s + Number(sv.price) * (picked[sv.id] ?? 0), 0),
    [services, picked],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, { list: typeof services; sort_order: number }>();
    services.forEach((s: any) => {
      const k = s.service_categories?.name ?? "Altro";
      const sortOrder = s.service_categories?.sort_order ?? 999;
      if (!m.has(k)) m.set(k, { list: [], sort_order: sortOrder });
      m.get(k)!.list.push(s);
    });
    return Array.from(m.entries())
      .sort((a, b) => a[1].sort_order - b[1].sort_order)
      .map(([name, val]) => [name, val.list] as [string, typeof services]);
  }, [services]);

  const save = useMutation({
    mutationFn: async () => {
      if (!citizen) throw new Error("Seleziona un cittadino");
      if (!initialCitizen && existingCitizenIds.has(citizen.id)) {
        throw new Error("Questo cittadino è già in serata");
      }
      const items = services.filter((s) => (picked[s.id] ?? 0) > 0);
      if (items.length === 0) throw new Error("Seleziona almeno un servizio");

      if (initialCitizen) {
        const { error: delError } = await supabase
          .from("night_items")
          .delete()
          .eq("night_id", nightId)
          .eq("citizen_id", citizen.id);
        if (delError) throw delError;
      }

      const payload = items.map((s) => ({
        night_id: nightId,
        citizen_id: citizen.id,
        service_id: s.id,
        service_name: s.name,
        unit_price: Number(s.price),
        qty: picked[s.id],
        subtotal: Number(s.price) * picked[s.id],
        created_by: profile?.id || null,
      }));
      const { error } = await supabase.from("night_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(initialCitizen ? "Prodotti modificati" : "Cittadino aggiunto");
      onAdded();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialCitizen
              ? `Modifica prodotti per ${citizen?.full_name}`
              : "Aggiungi cittadino alla serata"}
          </DialogTitle>
        </DialogHeader>

        {!initialCitizen && (
          <div>
            <Label>Cittadino *</Label>
            <CitizenPicker value={citizen} onChange={setCitizen} excludeIds={existingCitizenIds} />
          </div>
        )}

        {citizen && (
          <div className="text-xs text-muted-foreground">
            Membership: <strong>{MEMBERSHIP_LABEL[citizen.membership]}</strong>
          </div>
        )}

        <div className="space-y-4 mt-2">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <div className="text-sm font-semibold text-primary mb-2">{cat}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map((s) => {
                  const isQty = s.is_qty_editable ?? false;
                  const val = picked[s.id] ?? 0;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 bg-card/50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(s.price)}
                          {isQty ? " · a unità" : ""}
                        </div>
                      </div>
                      {isQty ? (
                        <Input
                          type="number"
                          min={0}
                          className="w-20"
                          value={val}
                          onChange={(e) =>
                            setPicked((p) => ({
                              ...p,
                              [s.id]: Math.max(0, Number(e.target.value)),
                            }))
                          }
                        />
                      ) : (
                        <Checkbox
                          checked={val > 0}
                          onCheckedChange={(c) => setPicked((p) => ({ ...p, [s.id]: c ? 1 : 0 }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 mt-4 pt-4 border-t">
          <span className="text-muted-foreground">Totale cittadino</span>
          <span className="text-2xl font-bold text-primary">{formatMoney(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {initialCitizen ? "Salva modifiche" : "Aggiungi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Citizen lookup (professional) -------------------------- */

function CitizenLookupDialog({ nights, onClose }: { nights: Night[]; onClose: () => void }) {
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [nightId, setNightId] = useState<string | null>(nights[0]?.id ?? null);

  useEffect(() => {
    if (!nightId && nights[0]) setNightId(nights[0].id);
  }, [nights, nightId]);

  const { data, isLoading } = useQuery({
    queryKey: ["lookup", citizen?.id, nightId],
    enabled: !!citizen && !!nightId,
    queryFn: async () => {
      const { data: items } = await supabase
        .from("night_items")
        .select("*")
        .eq("night_id", nightId!)
        .eq("citizen_id", citizen!.id);
      return (items ?? []) as NightItem[];
    },
  });

  const night = nights.find((n) => n.id === nightId);
  const subtotal = (data ?? []).reduce((s, i) => s + Number(i.subtotal), 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Consulta cittadino</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Cittadino</Label>
            <CitizenPicker value={citizen} onChange={setCitizen} allowCreate={false} />
          </div>
          <div>
            <Label>Serata</Label>
            <Select value={nightId ?? undefined} onValueChange={setNightId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona serata" />
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
          </div>

          {citizen && nightId && (
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Cittadino
                    </div>
                    <div className="text-xl font-bold">{citizen.full_name}</div>
                    <Badge variant="secondary" className="mt-1">
                      {MEMBERSHIP_LABEL[citizen.membership]}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Serata
                    </div>
                    <div className="font-medium">{night ? formatDate(night.night_date) : "-"}</div>
                    {night?.title && (
                      <div className="text-xs text-muted-foreground">{night.title}</div>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-6">Caricamento…</div>
                ) : (data ?? []).length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="text-sm">
                      <div className="font-semibold">Nessun servizio</div>
                      <div className="opacity-90">
                        Questo cittadino non ha servizi registrati in questa serata.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Servizio</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Subtot.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data!.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell>{i.service_name}</TableCell>
                              <TableCell className="text-right">{i.qty}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatMoney(i.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground">Totale cittadino</span>
                      <span className="text-xl font-bold text-primary">
                        {formatMoney(subtotal)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
