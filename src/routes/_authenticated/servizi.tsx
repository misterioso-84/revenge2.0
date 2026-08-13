import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Layers, ArrowUp, ArrowDown } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/servizi")({
  component: ServicesPage,
});

function ServicesPage() {
  const qc = useQueryClient();
  const { isAdmin, permissions = [] } = useAuth();
  const canRead = isAdmin || permissions.includes("servizi.read");
  const canWrite = isAdmin || permissions.includes("servizi.write");

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
    enabled: canRead,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("*").order("sort_order");
      return data ?? [];
    },
    enabled: canRead,
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

  const grouped = useMemo(() => {
    const m = new Map<string, { items: any[]; sort_order: number }>();

    categories.forEach((cat: any) => {
      m.set(cat.name, { items: [], sort_order: cat.sort_order ?? 999 });
    });

    m.set("Altro", { items: [], sort_order: 99999 });

    services.forEach((s: any) => {
      const k = s.service_categories?.name ?? "Altro";
      if (!m.has(k)) {
        m.set(k, { items: [], sort_order: s.service_categories?.sort_order ?? 999 });
      }
      m.get(k)!.items.push(s);
    });

    return Array.from(m.entries())
      .filter(([_, value]) => value.items.length > 0)
      .sort((a, b) => a[1].sort_order - b[1].sort_order)
      .map(([name, value]) => ({ name, items: value.items }));
  }, [services, categories]);

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
                <strong>Vedere catalogo servizi</strong>).
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
          CATALOGO SERVIZI, LISTINO PREZZI E CATEGORIE
        </p>
      </div>

      {/* Control Header Box */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
            CATALOGO SERVIZI
          </h2>
          <p className="text-xs text-slate-400">
            Listino prezzi ufficiale, sconti soci e suddivisione per categoria
          </p>
        </div>

        {canWrite && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setManageCategoriesOpen(true)}
              className="border-slate-800 bg-[#0a0b10] hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Layers className="h-4 w-4 text-amber-400" /> Gestisci Categorie
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/10 flex items-center gap-1.5 flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" /> Nuovo Servizio
            </Button>
          </div>
        )}
      </div>

      {grouped.map(({ name, items }) => (
        <Card key={name}>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border bg-card/50">
              <h2 className="font-semibold text-primary">{name}</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servizio</TableHead>
                  <TableHead>Fatturazione</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                  {canWrite && <TableHead className="w-32"></TableHead>}
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
                    {canWrite && (
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

  const updateCategoryOrder = useMutation({
    mutationFn: async ({
      id1,
      order1,
      id2,
      order2,
    }: {
      id1: string;
      order1: number;
      id2: string;
      order2: number;
    }) => {
      const { error: err1 } = await supabase
        .from("service_categories")
        .update({ sort_order: order1 })
        .eq("id", id1);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("service_categories")
        .update({ sort_order: order2 })
        .eq("id", id2);
      if (err2) throw err2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-categories"] });
      qc.invalidateQueries({ queryKey: ["services-full"] });
      toast.success("Ordinamento aggiornato");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const current = categories[index];
    const prev = categories[index - 1];

    const currentOrder = current.sort_order ?? index;
    const prevOrder = prev.sort_order ?? index - 1;

    const newCurrentOrder = prevOrder === currentOrder ? currentOrder - 1 : prevOrder;
    const newPrevOrder = prevOrder === currentOrder ? currentOrder + 1 : currentOrder;

    updateCategoryOrder.mutate({
      id1: current.id,
      order1: newCurrentOrder,
      id2: prev.id,
      order2: newPrevOrder,
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const current = categories[index];
    const next = categories[index + 1];

    const currentOrder = current.sort_order ?? index;
    const nextOrder = next.sort_order ?? index + 1;

    const newCurrentOrder = nextOrder === currentOrder ? currentOrder + 1 : nextOrder;
    const newNextOrder = nextOrder === currentOrder ? currentOrder - 1 : nextOrder;

    updateCategoryOrder.mutate({
      id1: current.id,
      order1: newCurrentOrder,
      id2: next.id,
      order2: newNextOrder,
    });
  };

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
              categories.map((c: any, index: number) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-card">
                  <span className="text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || updateCategoryOrder.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === categories.length - 1 || updateCategoryOrder.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
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
