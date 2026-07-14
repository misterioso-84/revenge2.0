import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/servizi")({
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_categories(name, sort_order)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-full"] });
      toast.success("Eliminato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped: Record<string, any[]> = {};
  services.forEach((s: any) => {
    const k = s.service_categories?.name ?? "Altro";
    (grouped[k] ??= []).push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Catalogo Servizi</h1>
          <p className="text-muted-foreground">Listino prezzi e gestione</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setManageCategoriesOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Layers className="h-4 w-4" /> Gestisci Categorie
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Nuovo servizio
            </Button>
          </div>
        )}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border bg-card/50">
              <h2 className="font-semibold text-primary">{cat}</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servizio</TableHead>
                  <TableHead>Fatturazione</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                  {isAdmin && <TableHead className="w-32"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{s.name}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {s.include_in_nights !== false ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none font-medium"
                            >
                              Disponibile nelle Serate
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground font-medium"
                            >
                              Escluso dalle Serate
                            </Badge>
                          )}
                          {s.include_in_nights !== false &&
                            (s.is_qty_editable ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/15 border-none font-medium"
                              >
                                Quantità Libera
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 border-none font-medium"
                              >
                                Opzione Sì/No (Flag)
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.billing === "per_night"
                        ? "A serata"
                        : s.billing === "one_time"
                          ? "Una tantum"
                          : "Ricorrente"}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(s.price)}</TableCell>
                    {isAdmin && (
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
                            onClick={() => confirm(`Eliminare ${s.name}?`) && del.mutate(s.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {open && (
        <ServiceDialog
          open={open}
          onOpenChange={setOpen}
          service={editing}
          categories={categories}
        />
      )}

      {manageCategoriesOpen && (
        <ManageCategoriesDialog
          open={manageCategoriesOpen}
          onOpenChange={setManageCategoriesOpen}
          categories={categories}
        />
      )}
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, service, categories }: any) {
  const qc = useQueryClient();
  const isEdit = !!service;
  const save = useMutation({
    mutationFn: async (v: any) => {
      v.price = Number(v.price);
      if (isEdit) {
        const { error } = await supabase.from("services").update(v).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(v);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services-full"] });
      toast.success("Salvato");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica servizio" : "Nuovo servizio"}</DialogTitle>
        </DialogHeader>
        <form
          id="svc-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const vals = Object.fromEntries(fd) as any;
            vals.include_in_nights = fd.get("include_in_nights") === "on";
            vals.is_qty_editable = fd.get("is_qty_editable") === "on";
            save.mutate(vals);
          }}
        >
          <div>
            <Label>Nome *</Label>
            <Input name="name" required defaultValue={service?.name ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prezzo (€)</Label>
              <Input
                name="price"
                type="number"
                min={0}
                step="10"
                required
                defaultValue={service?.price ?? 0}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select name="category_id" defaultValue={service?.category_id ?? categories[0]?.id}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Fatturazione</Label>
            <Select name="billing" defaultValue={service?.billing ?? "per_night"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_night">A serata</SelectItem>
                <SelectItem value="one_time">Una tantum</SelectItem>
                <SelectItem value="recurring">Ricorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include_in_nights"
                name="include_in_nights"
                defaultChecked={service?.include_in_nights ?? true}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="include_in_nights" className="cursor-pointer font-medium text-sm">
                Includi come acquistabile nelle serate
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_qty_editable"
                name="is_qty_editable"
                defaultChecked={service?.is_qty_editable ?? false}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_qty_editable" className="cursor-pointer font-medium text-sm">
                Quantità modificabile nelle serate
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Se la quantità è modificabile, in serata comparirà un input numerico a partire da 0.
              Se non lo è, comparirà un semplice checkbox di selezione (pari a 1 quantità).
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button form="svc-form" type="submit" disabled={save.isPending}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageCategoriesDialog({ open, onOpenChange, categories }: any) {
  const qc = useQueryClient();
  const [newCatName, setNewCatName] = useState("");

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const { error } = await supabase.from("service_categories").insert({
        name,
        slug,
        sort_order: categories.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-categories"] });
      qc.invalidateQueries({ queryKey: ["services-full"] });
      setNewCatName("");
      toast.success("Categoria creata");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-categories"] });
      qc.invalidateQueries({ queryKey: ["services-full"] });
      toast.success("Categoria eliminata");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gestione Categorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-2">
          {/* List existing */}
          <div className="max-h-[250px] overflow-y-auto border rounded-md divide-y">
            {categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nessuna categoria presente.
              </div>
            ) : (
              categories.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-card">
                  <span className="text-sm font-medium">{c.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Sei sicuro di voler eliminare la categoria "${c.name}"?`)) {
                        delCategory.mutate(c.id);
                      }
                    }}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Create new */}
          <div className="space-y-2 border-t pt-4">
            <Label>Nuova Categoria</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome categoria..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <Button
                disabled={!newCatName.trim() || addCategory.isPending}
                onClick={() => addCategory.mutate(newCatName.trim())}
              >
                Aggiungi
              </Button>
            </div>
          </div>
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
