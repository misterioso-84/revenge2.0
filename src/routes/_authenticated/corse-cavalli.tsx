import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, Pencil, Home, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/corse-cavalli")({
  component: HorsePage,
});

const NONE = "__none__";

type Stable = {
  id: string;
  name: string;
  owner_citizen_id: string | null;
  citizens: { full_name: string } | null;
};
type Horse = { id: string; name: string; stable_id: string | null; sponsor: string | null };
type Citizen = { id: string; full_name: string };

function HorsePage() {
  const qc = useQueryClient();
  const [stableDlg, setStableDlg] = useState<Stable | null | undefined>(undefined); // undefined = closed
  const [horseDlg, setHorseDlg] = useState<{ horse?: Horse; stableId?: string | null } | null>(
    null,
  );

  const { data: stables = [] } = useQuery({
    queryKey: ["stables"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stables")
        .select("*, citizens(full_name)")
        .order("name");
      return (data ?? []) as Stable[];
    },
  });
  const { data: horses = [] } = useQuery({
    queryKey: ["horses"],
    queryFn: async () => {
      const { data } = await supabase.from("horses").select("*").order("name");
      return (data ?? []) as Horse[];
    },
  });
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("citizens").select("id, full_name").order("full_name");
      return (data ?? []) as Citizen[];
    },
  });

  const delStable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stables"] });
      toast.success("Scuderia eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delHorse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["horses"] });
      toast.success("Cavallo eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const horsesWithoutStable = horses.filter((h) => !h.stable_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Corse dei Cavalli</h1>
          <p className="text-muted-foreground">Scuderie, cavalli e sponsor</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStableDlg(null)}>
            <Home className="h-4 w-4" /> Nuova scuderia
          </Button>
          <Button onClick={() => setHorseDlg({})}>
            <Plus className="h-4 w-4" /> Nuovo cavallo
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {stables.length === 0 && horsesWithoutStable.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="text-muted-foreground text-center py-10">
              <Trophy className="h-10 w-10 mx-auto opacity-40 mb-2" />
              Nessuna scuderia né cavallo registrato. Crea la prima scuderia per iniziare.
            </CardContent>
          </Card>
        )}

        {stables.map((s) => {
          const sHorses = horses.filter((h) => h.stable_id === s.id);
          return (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    {s.name}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    Proprietario:{" "}
                    {s.citizens?.full_name ?? <span className="italic">non assegnato</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setStableDlg(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      confirm("Eliminare la scuderia? I cavalli resteranno senza scuderia.") &&
                      delStable.mutate(s.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {sHorses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nessun cavallo in questa scuderia
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {sHorses.map((h) => (
                      <HorseRow
                        key={h.id}
                        horse={h}
                        onEdit={() => setHorseDlg({ horse: h })}
                        onDelete={() => delHorse.mutate(h.id)}
                      />
                    ))}
                  </ul>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setHorseDlg({ stableId: s.id })}
                >
                  <Plus className="h-3 w-3" /> Aggiungi cavallo
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {horsesWithoutStable.length > 0 && (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-muted-foreground">
                Cavalli senza scuderia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {horsesWithoutStable.map((h) => (
                  <HorseRow
                    key={h.id}
                    horse={h}
                    onEdit={() => setHorseDlg({ horse: h })}
                    onDelete={() => delHorse.mutate(h.id)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {stableDlg !== undefined && (
        <StableDialog
          stable={stableDlg}
          citizens={citizens}
          onClose={() => setStableDlg(undefined)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["stables"] });
            setStableDlg(undefined);
          }}
        />
      )}
      {horseDlg && (
        <HorseDialog
          horse={horseDlg.horse}
          defaultStableId={horseDlg.stableId ?? horseDlg.horse?.stable_id ?? null}
          stables={stables}
          onClose={() => setHorseDlg(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["horses"] });
            setHorseDlg(null);
          }}
        />
      )}
    </div>
  );
}

function HorseRow({
  horse,
  onEdit,
  onDelete,
}: {
  horse: Horse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm border border-border/60 rounded-md px-3 py-2 bg-card/30">
      <div className="min-w-0">
        <div className="font-medium truncate">🐎 {horse.name}</div>
        {horse.sponsor && (
          <div className="text-xs text-muted-foreground truncate">
            Sponsor:{" "}
            <Badge variant="secondary" className="ml-1 font-normal">
              {horse.sponsor}
            </Badge>
          </div>
        )}
      </div>
      <div className="flex gap-0.5 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => confirm("Eliminare il cavallo?") && onDelete()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </li>
  );
}

function StableDialog({
  stable,
  citizens,
  onClose,
  onSaved,
}: {
  stable: Stable | null;
  citizens: Citizen[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(stable?.name ?? "");
  const [owner, setOwner] = useState<string>(stable?.owner_citizen_id ?? NONE);
  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), owner_citizen_id: owner === NONE ? null : owner };
      if (!payload.name) throw new Error("Nome richiesto");
      if (stable) {
        const { error } = await supabase.from("stables").update(payload).eq("id", stable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stables").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvato");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{stable ? "Modifica scuderia" : "Nuova scuderia"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome scuderia *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Scuderia Rossi"
            />
          </div>
          <div>
            <Label>Proprietario (cittadino)</Label>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nessuno</SelectItem>
                {citizens.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function HorseDialog({
  horse,
  defaultStableId,
  stables,
  onClose,
  onSaved,
}: {
  horse?: Horse;
  defaultStableId: string | null;
  stables: Stable[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(horse?.name ?? "");
  const [stableId, setStableId] = useState<string>(defaultStableId ?? NONE);
  const [sponsor, setSponsor] = useState(horse?.sponsor ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        stable_id: stableId === NONE ? null : stableId,
        sponsor: sponsor.trim() || null,
      };
      if (!payload.name) throw new Error("Nome richiesto");
      if (horse) {
        const { error } = await supabase.from("horses").update(payload).eq("id", horse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("horses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvato");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{horse ? "Modifica cavallo" : "Nuovo cavallo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome cavallo *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Fulmine"
            />
          </div>
          <div>
            <Label>Scuderia</Label>
            <Select value={stableId} onValueChange={setStableId}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Senza scuderia</SelectItem>
                {stables.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sponsor</Label>
            <Input
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="Nome dello sponsor (libero)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Può essere il nome di un cittadino, un'azienda o qualsiasi testo.
            </p>
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
