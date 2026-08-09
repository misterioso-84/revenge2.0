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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ruoli & Permessi</h1>
          <p className="text-muted-foreground">Crea ruoli personalizzati con permessi granulari</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuovo ruolo
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
          <Card key={r.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{r.name}</h3>
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
  const save = useMutation({
    mutationFn: async (v: any) => {
      const payload = { name: v.name, description: v.description || null, permissions: perms };
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
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <div>
            <Label>Nome *</Label>
            <Input name="name" required defaultValue={role?.name ?? ""} />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea name="description" rows={2} defaultValue={role?.description ?? ""} />
          </div>
          <div>
            <Label>Permessi</Label>
            <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-72 overflow-y-auto border border-border rounded-md p-3">
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
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
