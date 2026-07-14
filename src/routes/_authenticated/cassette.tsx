import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cassette")({
  component: SafesPage,
});

const NONE = "__none__";

type SafeBox = {
  id: string;
  box_number: number;
  citizen_id: string | null;
  activated_at: string | null;
  expires_at: string | null;
  active: boolean;
  notes: string | null;
  citizens: { full_name: string } | null;
};
type Citizen = { id: string; full_name: string };

type Status = "libera" | "attiva" | "in-scadenza" | "scaduta" | "disattivata";

function computeStatus(s: SafeBox): Status {
  if (!s.citizen_id) return "libera";
  if (!s.active) return "disattivata";
  if (s.expires_at) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(s.expires_at);
    const days = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return "scaduta";
    if (days <= 7) return "in-scadenza";
  }
  return "attiva";
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  libera: { label: "Libera", cls: "bg-muted text-muted-foreground" },
  attiva: { label: "Attiva", cls: "bg-primary/15 text-primary border border-primary/30" },
  "in-scadenza": {
    label: "In scadenza",
    cls: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
  },
  scaduta: {
    label: "Scaduta",
    cls: "bg-destructive/15 text-destructive border border-destructive/30",
  },
  disattivata: { label: "Disattivata", cls: "bg-muted text-muted-foreground" },
};

function SafesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SafeBox | null>(null);
  const [filter, setFilter] = useState<"tutte" | Status>("tutte");

  const { data: safes = [] } = useQuery({
    queryKey: ["safes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("safe_boxes")
        .select("*, citizens(full_name)")
        .order("box_number");
      return (data ?? []) as SafeBox[];
    },
  });
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("citizens").select("id, full_name").order("full_name");
      return (data ?? []) as Citizen[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("safe_boxes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safes"] });
      toast.success("Cassetta eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enriched = useMemo(() => safes.map((s) => ({ ...s, status: computeStatus(s) })), [safes]);
  const counts = useMemo(() => {
    const c = {
      tutte: enriched.length,
      libera: 0,
      attiva: 0,
      "in-scadenza": 0,
      scaduta: 0,
      disattivata: 0,
    } as Record<string, number>;
    enriched.forEach((s) => {
      c[s.status]++;
    });
    return c;
  }, [enriched]);
  const filtered = filter === "tutte" ? enriched : enriched.filter((s) => s.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cassette di Sicurezza</h1>
          <p className="text-muted-foreground">
            € 2.000 per attivazione — gestione assegnazioni e scadenze
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuova cassetta
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(["tutte", "attiva", "in-scadenza", "scaduta", "libera"] as const).map((k) => {
          const active = filter === k;
          const label = k === "tutte" ? "Tutte" : STATUS_META[k].label;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"}`}
            >
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-bold">{counts[k]}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Cittadino</TableHead>
                <TableHead>Attivata</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessuna cassetta
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => {
                const meta = STATUS_META[s.status];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-bold">#{s.box_number}</TableCell>
                    <TableCell>
                      {s.citizens?.full_name ?? (
                        <span className="text-muted-foreground italic">Libera</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(s.activated_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {s.status === "scaduta" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        {s.status === "in-scadenza" && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        {formatDate(s.expires_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={meta.cls}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(s);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            confirm(`Eliminare cassetta #${s.box_number}?`) && del.mutate(s.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {open && (
        <SafeDialog
          safe={editing}
          citizens={citizens}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["safes"] });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SafeDialog({
  safe,
  citizens,
  onClose,
  onSaved,
}: {
  safe: SafeBox | null;
  citizens: Citizen[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [boxNumber, setBoxNumber] = useState(safe?.box_number?.toString() ?? "");
  const [citizenId, setCitizenId] = useState<string>(safe?.citizen_id ?? NONE);
  const [activatedAt, setActivatedAt] = useState(safe?.activated_at ?? (safe ? "" : today));
  const [expiresAt, setExpiresAt] = useState(safe?.expires_at ?? (safe ? "" : in30));
  const [active, setActive] = useState(safe?.active ?? true);
  const [notes, setNotes] = useState(safe?.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const num = Number(boxNumber);
      if (!num || num < 1) throw new Error("Numero cassetta richiesto");
      const payload = {
        box_number: num,
        citizen_id: citizenId === NONE ? null : citizenId,
        activated_at: activatedAt || null,
        expires_at: expiresAt || null,
        active,
        notes: notes.trim() || null,
      };
      if (safe) {
        const { error } = await supabase.from("safe_boxes").update(payload).eq("id", safe.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("safe_boxes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvato");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewMonth = () => {
    const base = expiresAt ? new Date(expiresAt) : new Date();
    base.setMonth(base.getMonth() + 1);
    setExpiresAt(base.toISOString().slice(0, 10));
    setActive(true);
    toast.success("Scadenza rinnovata di 1 mese (ricorda di salvare)");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            {safe ? `Cassetta #${safe.box_number}` : "Nuova cassetta"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Numero *</Label>
              <Input
                type="number"
                min={1}
                value={boxNumber}
                onChange={(e) => setBoxNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Cittadino</Label>
              <Select value={citizenId} onValueChange={setCitizenId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Libera</SelectItem>
                  {citizens.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Attivata il</Label>
              <Input
                type="date"
                value={activatedAt ?? ""}
                onChange={(e) => setActivatedAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Scade il</Label>
              <Input
                type="date"
                value={expiresAt ?? ""}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={renewMonth}>
            <CheckCircle2 className="h-4 w-4" /> Rinnova +1 mese
          </Button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Cassetta attiva
          </label>
          <div>
            <Label>Note</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
