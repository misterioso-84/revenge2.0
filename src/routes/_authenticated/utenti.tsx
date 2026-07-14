import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
} from "lucide-react";
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

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="py-4 text-sm flex items-start gap-3">
          <Shield className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <strong>Sicurezza password:</strong> le password sono <strong>cifrate</strong> e non
            visibili (neanche all'admin). Se un utente la dimentica, usa <em>Reset password</em> per
            assegnargliene una nuova.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Ruoli personalizzati</TableHead>
                <TableHead className="w-56"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.username}</TableCell>
                  <TableCell>{u.display_name ?? "-"}</TableCell>
                  <TableCell>
                    {u.roles?.includes("admin") ? (
                      <Badge className="bg-primary">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Operatore</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.custom_roles?.length === 0
                      ? "—"
                      : u.custom_roles?.map((r: any) => r.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setEditTarget(u)}>
                        <Pencil className="h-3 w-3 mr-1" /> Modifica
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRolesTarget(u)}>
                        Ruoli
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setResetTarget(u)}>
                        <KeyRound className="h-3 w-3" /> Reset
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
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
              ))}
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
