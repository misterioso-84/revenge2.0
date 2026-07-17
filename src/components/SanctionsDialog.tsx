import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { applySanction, updateSanction, deleteSanctionCompletely } from "@/lib/admin.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  AlertTriangle,
  Plus,
  History,
  Clock,
  Calendar,
  Ban,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";

export function getSanctionStatusInfo(s: any) {
  const now = new Date();

  // 1. Has expiry date, and it's in the past
  if (s.expires_at && new Date(s.expires_at) <= now) {
    return {
      label: "Scaduta",
      colorClass: "bg-green-500/15 text-green-500 border border-green-500/30",
      status: "scaduta",
    };
  }

  // 2. Archived or deactivated
  if (!s.is_active) {
    return {
      label: "Rimossa",
      colorClass: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
      status: "rimossa",
    };
  }

  // 3. Otherwise, it is active (either no expiration, or expiration is in the future)
  return {
    label: "Attuale",
    colorClass:
      "bg-red-500/15 text-red-400 border border-red-500/30 font-bold uppercase animate-pulse",
    status: "attuale",
  };
}

export function SanctionsDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const applyFn = useServerFn(applySanction);
  const updateFn = useServerFn(updateSanction);
  const deleteFn = useServerFn(deleteSanctionCompletely);

  const [type, setType] = useState<"richiamo_verbale" | "warn" | "sospensione" | "espulsione">(
    "richiamo_verbale",
  );
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("3"); // 1, 3, 7 days, or "perm"
  const [busy, setBusy] = useState(false);

  // For inline editing of existing sanctions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editExpires, setEditExpires] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  const {
    data: sanctions = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["user-sanctions", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sanctions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Specifica un motivo per la sanzione.");
      return;
    }

    setBusy(true);
    try {
      let finalExpiresAt: string | null = null;
      if (type === "sospensione") {
        if (duration === "perm") {
          finalExpiresAt = null;
        } else {
          const days = parseInt(duration, 10);
          const d = new Date();
          d.setDate(d.getDate() + days);
          finalExpiresAt = d.toISOString();
        }
      } else if (type === "espulsione") {
        finalExpiresAt = null;
      }

      await applyFn({
        data: {
          userId: user.id,
          type,
          reason: reason.trim(),
          expiresAt: finalExpiresAt,
        },
      });

      toast.success("Sanzione applicata.");
      setReason("");
      refetch();
      qc.invalidateQueries({ queryKey: ["panel-users"] });
      qc.invalidateQueries({ queryKey: ["profiles-all"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (s: any) => {
    try {
      await updateFn({
        data: {
          sanctionId: s.id,
          isActive: !s.is_active,
        },
      });
      toast.success(s.is_active ? "Sanzione archiviata / rimossa" : "Sanzione riattivata");
      refetch();
      qc.invalidateQueries({ queryKey: ["panel-users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateFn({
        data: {
          sanctionId: id,
          reason: editReason.trim(),
          expiresAt: editExpires ? new Date(editExpires).toISOString() : null,
        },
      });
      toast.success("Sanzione aggiornata con successo.");
      setEditingId(null);
      refetch();
      qc.invalidateQueries({ queryKey: ["panel-users"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCompletely = (id: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Elimina sanzione definitivamente",
      description:
        "Sei sicuro di voler eliminare DEFINITIVAMENTE questa sanzione dal database? Non apparirà più nello storico.",
      onConfirm: async () => {
        try {
          await deleteFn({
            data: { sanctionId: id },
          });
          toast.success("Sanzione eliminata definitivamente.");
          refetch();
          qc.invalidateQueries({ queryKey: ["panel-users"] });
        } catch (err: any) {
          toast.error(err.message);
        }
      },
    });
  };

  const getBadgeStyle = (t: string) => {
    switch (t) {
      case "richiamo_verbale":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      case "warn":
        return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
      case "sospensione":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case "espulsione":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
    }
  };

  const getLabel = (t: string) => {
    switch (t) {
      case "richiamo_verbale":
        return "Grado 1 — Richiamo Verbale";
      case "warn":
        return "Grado 2 — Warn";
      case "sospensione":
        return "Grado 3 — Sospensione";
      case "espulsione":
        return "Grado 3 — Espulsione";
      default:
        return t;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Gestione Sanzioni —{" "}
            <span className="text-primary">{user.display_name || user.username}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          {/* Applicazione sanzione */}
          <div className="lg:col-span-5 space-y-4 border-r border-slate-800 pr-0 lg:pr-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Applica Sanzione
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Grado / Tipo di Sanzione</Label>
                <select
                  value={type}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setType(val);
                    if (val === "sospensione") setDuration("3");
                    else setDuration("");
                  }}
                  className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="richiamo_verbale">Grado 1 — Richiamo Verbale</option>
                  <option value="warn">Grado 2 — Warn</option>
                  <option value="sospensione">Grado 3 — Sospensione Temporanea</option>
                  <option value="espulsione">Grado 3 — Espulsione dalla Ciurma</option>
                </select>
              </div>

              {type === "sospensione" && (
                <div className="space-y-2 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                  <Label className="text-xs text-slate-300">
                    Durata Sospensione (senza dobloni)
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {["1", "3", "7"].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={duration === d ? "default" : "outline"}
                        className="text-xs"
                        onClick={() => setDuration(d)}
                      >
                        {d} {d === "1" ? "Giorno" : "Giorni"}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant={duration === "perm" ? "destructive" : "outline"}
                      className="text-xs"
                      onClick={() => setDuration("perm")}
                    >
                      Permanente
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-slate-300">Motivazione / Dettagli</Label>
                <textarea
                  required
                  placeholder="Specifica il motivo dell'infrazione..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-slate-700 bg-slate-800 text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {busy ? "Applicazione..." : "Esegui Sanzione"}
              </Button>
            </form>
          </div>

          {/* Storico sanzioni */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="h-4 w-4 text-primary" /> Storico & Stato Sanzioni
            </h3>

            {isLoading ? (
              <p className="text-sm text-slate-400 italic">Caricamento...</p>
            ) : sanctions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed border-slate-700 rounded-lg">
                Nessuna sanzione presente per questo utente.
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {sanctions.map((s: any) => {
                  const statusInfo = getSanctionStatusInfo(s);
                  const isEditing = editingId === s.id;

                  return (
                    <div
                      key={s.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        statusInfo.status === "attuale"
                          ? "bg-red-500/5 border-red-500/20"
                          : statusInfo.status === "scaduta"
                            ? "bg-green-500/5 border-green-500/20"
                            : "bg-slate-800/40 border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getBadgeStyle(s.type)}`}
                          >
                            {getLabel(s.type)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${statusInfo.colorClass}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => handleSaveEdit(s.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-400 hover:text-white"
                                title="Modifica sanzione"
                                onClick={() => {
                                  setEditingId(s.id);
                                  setEditReason(s.reason || "");
                                  setEditExpires(
                                    s.expires_at
                                      ? new Date(s.expires_at).toISOString().slice(0, 16)
                                      : "",
                                  );
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-7 w-7 ${s.is_active ? "text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" : "text-green-500 hover:text-green-600 hover:bg-green-500/10"}`}
                                title={s.is_active ? "Rimuovi sanzione" : "Riattiva sanzione"}
                                onClick={() => handleToggleActive(s)}
                              >
                                {s.is_active ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                title="Elimina definitivamente dal database"
                                onClick={() => handleDeleteCompletely(s.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="mt-3 space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-slate-300 font-semibold">
                                Motivazione
                              </Label>
                              <Input
                                size="sm"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                              />
                            </div>
                            {s.type === "sospensione" && (
                              <div>
                                <Label className="text-xs text-slate-300 font-semibold">
                                  Data Scadenza (lascia vuoto per permanente)
                                </Label>
                                <Input
                                  type="datetime-local"
                                  size="sm"
                                  value={editExpires}
                                  onChange={(e) => setEditExpires(e.target.value)}
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-200 font-medium italic">
                              "{s.reason}"
                            </p>
                            <div className="flex flex-col gap-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800">
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Assegnata il:{" "}
                                  {new Date(s.created_at).toLocaleDateString("it-IT")}
                                </span>
                                <span>
                                  Da:{" "}
                                  <strong className="text-slate-300">
                                    {s.created_by_name || "Amministratore"}
                                  </strong>
                                </span>
                                {s.type === "sospensione" && s.expires_at && (
                                  <span className="flex items-center gap-1 text-red-400 font-medium">
                                    <Calendar className="h-3 w-3" /> Scadenza:{" "}
                                    {new Date(s.expires_at).toLocaleString("it-IT", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                                {s.type === "sospensione" && !s.expires_at && (
                                  <span className="text-red-400 font-semibold flex items-center gap-1">
                                    <Ban className="h-3 w-3" /> Sospensione Permanente
                                  </span>
                                )}
                              </div>

                              {/* Display manual deactivation metadata if applicable */}
                              {statusInfo.status === "rimossa" && s.removed_by_name && (
                                <div className="text-xs text-green-400 font-semibold mt-1 bg-green-500/10 p-2 rounded border border-green-500/20">
                                  Rimossa manualmente da:{" "}
                                  <strong className="text-white">{s.removed_by_name}</strong>
                                  {s.removed_at &&
                                    ` il ${new Date(s.removed_at).toLocaleString("it-IT")}`}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-slate-800 pt-4">
          <Button
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={onClose}
          >
            Chiudi Gestione
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onConfirm={deleteConfirm.onConfirm}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </Dialog>
  );
}
