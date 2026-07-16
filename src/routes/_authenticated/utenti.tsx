import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  KeyRound,
  Trash2,
  Shield,
  ShieldOff,
  Pencil,
  AlertTriangle,
  Ban,
  Skull,
  Clock,
  History,
  Check,
  X,
  Calendar,
  Search,
  Database,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createPanelUser,
  updatePanelUser,
  resetPanelUserPassword,
  deletePanelUser,
  setUserAdmin,
  assignCustomRole,
  applySanction,
  updateSanction,
  deleteSanctionCompletely,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/utenti")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/cittadini" });
  },
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const createFn = useServerFn(createPanelUser);
  const updateFn = useServerFn(updatePanelUser);
  const resetFn = useServerFn(resetPanelUserPassword);
  const delFn = useServerFn(deletePanelUser);
  const adminFn = useServerFn(setUserAdmin);
  const assignFn = useServerFn(assignCustomRole);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [rolesTarget, setRolesTarget] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activityTarget, setActivityTarget] = useState<any>(null);

  // Query modificata per estrarre correttamente i dati uniti dal client
  const { data: users = [] } = useQuery({
    queryKey: ["panel-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(`
          *,
          user_roles (role),
          custom_roles (id, name)
        `);

      if (error) {
        console.error("Errore nel caricamento utenti:", error);
        throw error;
      }

      // Adattiamo i dati al formato richiesto dal frontend (.includes e .length)
      return (data ?? []).map((u: any) => ({
        ...u,
        roles: u.user_roles ? u.user_roles.map((r: any) => r.role) : [],
        custom_roles: u.custom_roles ?? [],
      }));
    },
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("custom_roles").select("*").order("name");
      return data ?? [];
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;

      const username = (u.username ?? "").toLowerCase();
      const displayName = (u.display_name ?? "").toLowerCase();
      const roleStr = u.roles?.includes("admin") ? "admin" : "operatore";
      const customRolesStr = (u.custom_roles ?? []).map((r: any) => r.name.toLowerCase()).join(" ");

      return (
        username.includes(q) ||
        displayName.includes(q) ||
        roleStr.includes(q) ||
        customRolesStr.includes(q)
      );
    });
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Utenti del Pannello</h1>
          <p className="text-muted-foreground">Gestione accessi (solo amministratore)</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nuovo utente
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm border border-border bg-card rounded-lg px-3 py-1.5 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Cerca per username, nome o ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2.5 px-3 h-auto">Username</TableHead>
                <TableHead className="py-2.5 px-3 h-auto">Nome</TableHead>
                <TableHead className="py-2.5 px-3 h-auto">Ruolo</TableHead>
                <TableHead className="py-2.5 px-3 h-auto">Ruoli personalizzati</TableHead>
                <TableHead className="py-2.5 px-3 h-auto w-56"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Nessun utente trovato
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono py-2 px-3">{u.username}</TableCell>
                    <TableCell className="py-2 px-3">{u.display_name ?? "-"}</TableCell>
                    <TableCell className="py-2 px-3">
                      {u.roles?.includes("admin") ? (
                        <Badge className="bg-primary">Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Operatore</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3">
                      {u.custom_roles?.length === 0
                        ? "—"
                        : u.custom_roles?.map((r: any) => r.name).join(", ")}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-indigo-400 border-indigo-900/40 hover:bg-indigo-950/20 hover:text-indigo-300 font-semibold"
                          onClick={() => setActivityTarget(u)}
                        >
                          <History className="h-3.5 w-3.5 mr-1" /> Attività
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => setEditTarget(u)}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => setRolesTarget(u)}
                        >
                          Ruoli
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => setResetTarget(u)}
                        >
                          <KeyRound className="h-3 w-3" /> Reset
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title={u.roles?.includes("admin") ? "Rimuovi admin" : "Promuovi ad admin"}
                          onClick={async () => {
                            await adminFn({
                              data: { userId: u.id, admin: !u.roles?.includes("admin") },
                            });
                            qc.invalidateQueries({ queryKey: ["panel-users"] });
                            toast.success("Aggiornato");
                          }}
                        >
                          {u.roles?.includes("admin") ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={async () => {
                            if (!confirm(`Eliminare ${u.username}?`)) return;
                            try {
                              await delFn({ data: { userId: u.id } });
                              qc.invalidateQueries({ queryKey: ["panel-users"] });
                              toast.success("Eliminato");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onSubmit={async (v: any) => {
            await createFn({ data: v });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
            toast.success("Utente creato");
          }}
        />
      )}
      {editTarget && (
        <EditUserDialog
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (v: any) => {
            await updateFn({ data: { userId: editTarget.id, ...v } });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
            toast.success("Utente modificato");
          }}
        />
      )}
      {resetTarget && (
        <ResetDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={async (pw: string) => {
            await resetFn({ data: { userId: resetTarget.id, newPassword: pw } });
            toast.success("Password reimpostata");
          }}
        />
      )}
      {rolesTarget && (
        <RolesDialog
          user={rolesTarget}
          customRoles={customRoles}
          onClose={() => setRolesTarget(null)}
          onToggle={async (roleId: string, assign: boolean) => {
            await assignFn({ data: { userId: rolesTarget.id, customRoleId: roleId, assign } });
            qc.invalidateQueries({ queryKey: ["panel-users"] });
          }}
        />
      )}
      {activityTarget && (
        <UserActivityDialog user={activityTarget} onClose={() => setActivityTarget(null)} />
      )}
    </div>
  );
}

function CreateUserDialog({ onClose, onSubmit }: any) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo utente</DialogTitle>
        </DialogHeader>
        <form
          id="new-user"
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const fd = new FormData(e.currentTarget);
            try {
              await onSubmit({
                username: String(fd.get("username")),
                password: String(fd.get("password")),
                displayName: String(fd.get("displayName") || ""),
                isAdmin: fd.get("isAdmin") === "on",
              });
              onClose();
            } catch (err: any) {
              toast.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label>Username *</Label>
            <Input name="username" required minLength={3} pattern="[a-zA-Z0-9_.\-]+" />
          </div>
          <div>
            <Label>Nome visualizzato</Label>
            <Input name="displayName" />
          </div>
          <div>
            <Label>Password iniziale *</Label>
            <Input name="password" type="password" required minLength={6} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isAdmin" name="isAdmin" />
            <Label htmlFor="isAdmin">Amministratore</Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="new-user" type="submit" disabled={busy}>
            Crea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({ user, onClose, onSubmit }: any) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Nuova password</Label>
          <Input type="text" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Comunica questa password all'utente. Verrà cifrata e non sarà più visibile.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            disabled={busy || pw.length < 6}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit(pw);
                onClose();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesDialog({ user, customRoles, onClose, onToggle }: any) {
  const assignedIds = new Set(user.custom_roles?.map((r: any) => r.id) ?? []);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ruoli di {user.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {customRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessun ruolo personalizzato. Creane uno in "Ruoli & Permessi".
            </p>
          )}
          {customRoles.map((r: any) => {
            const checked = assignedIds.has(r.id);
            return (
              <label
                key={r.id}
                className="flex items-start gap-3 p-3 rounded-md border border-border cursor-pointer hover:bg-card/60"
              >
                <input
                  type="checkbox"
                  defaultChecked={checked}
                  onChange={(e) => onToggle(r.id, e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.description ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(r.permissions ?? []).length} permessi
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onSubmit }: any) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica utente — {user.username}</DialogTitle>
        </DialogHeader>
        <form
          id="edit-user"
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onSubmit({
                username: username,
                displayName: displayName,
              });
              onClose();
            } catch (err: any) {
              toast.error(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label>Username *</Label>
            <Input
              name="username"
              required
              minLength={3}
              pattern="[a-zA-Z0-9_.\-]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <Label>Nome visualizzato</Label>
            <Input
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button form="edit-user" type="submit" disabled={busy}>
            Salva modifiche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserActivityDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch audit logs for this user specifically
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at" as any, { ascending: false });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Unique tables for filter
  const uniqueTables = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.table_name) set.add(l.table_name);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        search === "" ||
        l.details?.toLowerCase().includes(search.toLowerCase()) ||
        l.table_name?.toLowerCase().includes(search.toLowerCase());

      const matchesAction = selectedAction === "all" || l.action === selectedAction;
      const matchesTable = selectedTable === "all" || l.table_name === selectedTable;

      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, search, selectedAction, selectedTable]);

  // Stats calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter((l) => l.created_at?.startsWith(todayStr));

    return {
      total: logs.length,
      today: todayLogs.length,
      writes: logs.filter((l) => ["insert", "update", "delete", "upsert"].includes(l.action))
        .length,
    };
  }, [logs]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "insert":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Inserimento
          </Badge>
        );
      case "update":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Modifica
          </Badge>
        );
      case "delete":
        return (
          <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Eliminazione
          </Badge>
        );
      case "rpc":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            Funzione
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase font-bold text-[10px] tracking-wide px-2 py-0.5">
            {action}
          </Badge>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-slate-950 text-white border-slate-800">
        <DialogHeader className="pb-4 border-b border-slate-800 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-indigo-400 animate-pulse" /> Registro Attività —{" "}
            {user.display_name || user.username}
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-1">
            Storico completo e in tempo reale di tutte le operazioni eseguite dall'utente{" "}
            <strong>@{user.username}</strong>.
          </p>
        </DialogHeader>

        {/* Stats Row inside Dialog */}
        <div className="grid gap-3 md:grid-cols-3 my-4 shrink-0">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-indigo-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Operazioni Totali
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.total}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-emerald-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Operazioni Oggi
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.today}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-amber-500" />
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              Modifiche Dati
            </p>
            <p className="text-xl font-bold text-white mt-1">{isLoading ? "..." : stats.writes}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-2 md:grid-cols-12 mb-4 shrink-0">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Cerca per descrizione..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:ring-primary/50 text-xs h-9"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tutti i tipi</option>
              <option value="insert">Inserimento</option>
              <option value="update">Modifica</option>
              <option value="delete">Eliminazione</option>
              <option value="rpc">Funzione</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase text-[10px] font-bold"
            >
              <option value="all">Tutte le tabelle</option>
              {uniqueTables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800/60 rounded-lg bg-slate-900/20 divide-y divide-slate-900">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 italic space-y-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-[11px]">Caricamento attività...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-2">
              <Info className="h-10 w-10 text-slate-700 animate-pulse" />
              <p className="text-xs font-semibold">Nessuna attività trovata</p>
              <p className="text-[10px] text-slate-600 max-w-xs">
                Nessun record corrisponde ai criteri di ricerca impostati.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const date = new Date(log.created_at);
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className={`transition-colors hover:bg-slate-900/40 ${
                    isExpanded ? "bg-slate-900/60" : ""
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3 flex items-center justify-between gap-3 cursor-pointer text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="shrink-0 mt-0.5">{renderActionBadge(log.action)}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 leading-normal">{log.details}</p>
                        <span className="font-mono text-[9px] text-slate-500 uppercase flex items-center gap-1 mt-0.5">
                          <Database className="h-2.5 w-2.5" /> {log.table_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span className="text-[10px] font-mono text-slate-400">
                        {date.toLocaleDateString("it-IT")}{" "}
                        <span className="text-indigo-400 font-semibold">
                          {date.toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-slate-950/80 border-t border-slate-900"
                      >
                        <div className="p-3 text-[11px] text-slate-400 space-y-2">
                          <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            <span>Dettagli Operazione</span>
                            <span>ID: {log.id}</span>
                          </div>
                          <div className="grid gap-2 grid-cols-2 bg-slate-900/30 p-2.5 rounded border border-slate-800/40">
                            <div>
                              <p>
                                Azione:{" "}
                                <span className="font-mono text-slate-200 capitalize">
                                  {log.action}
                                </span>
                              </p>
                              <p>
                                Tabella:{" "}
                                <span className="font-mono text-slate-200 uppercase font-semibold">
                                  {log.table_name}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p>
                                Data ISO:{" "}
                                <span className="font-mono text-slate-200">{log.created_at}</span>
                              </p>
                              <p>
                                Dispositivo:{" "}
                                <span className="font-mono text-slate-200">Sessione attiva</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
