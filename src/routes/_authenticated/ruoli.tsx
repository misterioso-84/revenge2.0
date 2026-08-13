import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PERMISSIONS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ruoli")({
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw redirect({ to: "/auth" });
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/cittadini" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: RolesPage,
});

function RolesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Ruolo eliminato");
    },
  });

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
          DEFINIZIONE RUOLI PERSONALIZZATI, PESO GERARCHICO E PERMESSI STAFF
        </p>
      </div>

      {/* Control Header Box */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
            RUOLI & PERMESSI
          </h2>
          <p className="text-xs text-slate-400">
            Crea e gestisci i ruoli personalizzati con permessi e colori identificativi
          </p>
        </div>

        <Button
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuovo ruolo
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {roles.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="text-center text-muted-foreground py-8">
              Nessun ruolo personalizzato
            </CardContent>
          </Card>
        )}
        {roles.map((r: any) => (
          <Card key={r.id} className="relative overflow-hidden border border-slate-800">
            <div className="h-1.5 w-full" style={{ backgroundColor: r.staff_color || "#3b82f6" }} />
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{r.name}</h3>
                    {r.show_in_staff_list ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        ⚓ In Ciurma (Peso: {r.staff_weight ?? 50})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 text-[10px]">
                        Nascosto in Ciurma
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description ?? "—"}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => confirm("Eliminare?") && del.mutate(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(r.permissions ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">Nessun permesso</span>
                )}
                {(r.permissions ?? []).map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && <RoleDialog role={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RoleDialog({ role, onClose }: any) {
  const qc = useQueryClient();
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? []);
  const [showInStaff, setShowInStaff] = useState<boolean>(role?.show_in_staff_list ?? true);
  const [staffWeight, setStaffWeight] = useState<number>(role?.staff_weight ?? 50);
  const [staffColor, setStaffColor] = useState<string>(role?.staff_color ?? "#3b82f6");

  const save = useMutation({
    mutationFn: async (v: any) => {
      const payload = {
        name: v.name,
        description: v.description || null,
        permissions: perms,
        show_in_staff_list: showInStaff,
        staff_weight: Number(staffWeight) || 50,
        staff_color: staffColor || "#3b82f6",
      };
      if (role) {
        const { error } = await supabase.from("custom_roles").update(payload).eq("id", role.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_roles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Salvato");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "Modifica ruolo" : "Nuovo ruolo"}</DialogTitle>
        </DialogHeader>
        <form
          id="role-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <div>
            <Label>Nome Ruolo *</Label>
            <Input name="name" required defaultValue={role?.name ?? ""} />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea name="description" rows={2} defaultValue={role?.description ?? ""} />
          </div>

          {/* Configurazione "La nostra Ciurma" (Staff List) */}
          <div className="p-3.5 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInStaff}
                  onChange={(e) => setShowInStaff(e.target.checked)}
                  className="rounded text-amber-500"
                />
                ⚓ Mostra membri di questo ruolo nella Ciurma (Lista Staff)
              </label>
            </div>

            {showInStaff && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Peso Gerarchico (Ordina lista)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={staffWeight}
                    onChange={(e) => setStaffWeight(Number(e.target.value))}
                    className="bg-background"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    100 = Capitano, 50 = Operatore
                  </span>
                </div>

                <div>
                  <Label className="text-xs">Colore distintivo Ruolo</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={staffColor}
                      onChange={(e) => setStaffColor(e.target.value)}
                      className="w-10 h-9 p-1 bg-background cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={staffColor}
                      onChange={(e) => setStaffColor(e.target.value)}
                      className="font-mono text-xs bg-background uppercase"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Permessi</Label>
            <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-56 overflow-y-auto border border-border rounded-md p-3">
              {PERMISSIONS.map((p) => {
                const checked = perms.includes(p.key);
                return (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPerms((cur) =>
                          e.target.checked ? [...cur, p.key] : cur.filter((x) => x !== p.key),
                        )
                      }
                    />
                    {p.label}
                    <span className="text-xs text-muted-foreground ml-auto font-mono">{p.key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="role-form" type="submit" disabled={save.isPending}>
            Salva Ruolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
