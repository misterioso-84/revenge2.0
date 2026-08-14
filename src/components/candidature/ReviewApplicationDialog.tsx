import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationSubmission, ApplicationForm } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  Award,
  Sparkles,
  Lock,
  Globe,
  Tag,
  FileText,
} from "lucide-react";

interface ReviewApplicationDialogProps {
  application: ApplicationSubmission | null;
  form?: ApplicationForm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  reviewerName?: string;
}

export function ReviewApplicationDialog({
  application,
  form,
  open,
  onOpenChange,
  currentUserId,
  reviewerName,
}: ReviewApplicationDialogProps) {
  const qc = useQueryClient();

  const [status, setStatus] = useState<"pending" | "under_review" | "accepted" | "rejected">(
    "pending",
  );
  const [notes, setNotes] = useState("");
  const [copiedNick, setCopiedNick] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>("none");

  // Fetch all custom roles in case the reviewer wants to assign a role directly
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (application && open) {
      setStatus(application.status || "pending");
      setNotes(application.reviewer_notes || "");
      setSelectedRoleToAssign("none");
    }
  }, [application, open]);

  const copyNickname = (nick: string) => {
    navigator.clipboard.writeText(nick);
    setCopiedNick(true);
    toast.success("Nickname copiato negli appunti!");
    setTimeout(() => setCopiedNick(false), 2000);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!application) throw new Error("Candidatura non valida");

      const updateData = {
        status: status,
        reviewer_id: currentUserId || null,
        reviewer_notes: notes.trim() || null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", application.id);

      if (error) throw error;

      // If accepted and a custom role is selected, assign the role to user
      if (status === "accepted" && selectedRoleToAssign && selectedRoleToAssign !== "none") {
        await supabase.from("user_custom_roles").upsert({
          user_id: application.user_id,
          custom_role_id: selectedRoleToAssign,
        });
      }

      return data;
    },
    onSuccess: () => {
      toast.success(
        status === "accepted"
          ? "Candidatura approvata con successo!"
          : status === "rejected"
            ? "Candidatura contrassegnata come rifiutata"
            : "Stato candidatura aggiornato",
      );
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["users-roles"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante l'aggiornamento della candidatura");
    },
  });

  if (!application) return null;

  const nick = application.applicant_nickname || "Steve";
  const matchedForm = form || application.application_forms;
  const fields = matchedForm?.fields || [];
  const answers = application.answers || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0c12] border border-slate-800 text-white max-w-3xl max-h-[92vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with Candidate Profile Details */}
        <div className="p-6 border-b border-slate-800/90 bg-[#10121a]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 ${
                    application.status === "accepted"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : application.status === "rejected"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : application.status === "under_review"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-slate-500/10 text-slate-300 border-slate-700"
                  }`}
                >
                  {application.status === "accepted" && (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  {application.status === "rejected" && <XCircle className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "under_review" && <Clock className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "accepted"
                    ? "Accettata"
                    : application.status === "rejected"
                      ? "Rifiutata"
                      : application.status === "under_review"
                        ? "In Valutazione"
                        : "In Attesa"}
                </Badge>

                {matchedForm?.visibility === "internal_staff" ? (
                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px]">
                    <Lock className="h-3 w-3 mr-1" />
                    Bando Interno
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]">
                    <Globe className="h-3 w-3 mr-1" />
                    Bando Pubblico
                  </Badge>
                )}
              </div>

              <span className="text-xs font-mono text-slate-400">
                Inviata il {formatDateTime(application.created_at)}
              </span>
            </div>

            <DialogTitle className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              {matchedForm?.title || "Candidatura Staff"}
            </DialogTitle>

            <DialogDescription className="text-xs text-slate-400">
              Ruolo Target:{" "}
              <strong className="text-amber-400">{matchedForm?.role_target || "Staff"}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Candidate Card Identity */}
          <div className="mt-4 p-4 rounded-xl bg-[#0a0b10] border border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(nick)}/64`}
                  alt={nick}
                  className="h-12 w-12 rounded-xl border border-amber-500/40 bg-black/40 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">{application.applicant_name}</h4>
                  <button
                    type="button"
                    onClick={() => copyNickname(nick)}
                    className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
                    title="Clicca per copiare il nickname"
                  >
                    {copiedNick ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{nick}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                  {application.applicant_discord && (
                    <span className="text-indigo-400 font-medium">
                      Discord: {application.applicant_discord}
                    </span>
                  )}
                  {application.applicant_email && (
                    <span className="text-slate-500">{application.applicant_email}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Questions & Answers */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Risposte del Candidato
            </h3>

            {fields.length > 0 ? (
              fields.map((field, idx) => {
                const ans = answers[field.id];
                return (
                  <div
                    key={field.id || idx}
                    className="p-4 rounded-xl bg-[#0e1017]/80 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Label className="text-xs font-bold text-slate-200">
                        {idx + 1}. {field.label}
                      </Label>
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-mono px-1.5 py-0.5 border-slate-800 text-slate-500"
                      >
                        {field.type}
                      </Badge>
                    </div>

                    <div className="pt-1">
                      {ans === undefined || ans === null || ans === "" ? (
                        <span className="text-xs italic text-slate-600">
                          Nessuna risposta fornita
                        </span>
                      ) : Array.isArray(ans) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ans.map((item, i) => (
                            <Badge
                              key={i}
                              className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-medium"
                            >
                              ✓ {item}
                            </Badge>
                          ))}
                        </div>
                      ) : typeof ans === "boolean" ? (
                        <span className="text-xs font-bold text-amber-400">
                          {ans ? "Sì" : "No"}
                        </span>
                      ) : (
                        <p className="text-xs text-slate-200 bg-[#12141c] p-3 rounded-lg border border-slate-800/90 whitespace-pre-wrap leading-relaxed">
                          {String(ans)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback if fields definition is missing */
              <div className="space-y-3">
                {Object.entries(answers).map(([k, v], idx) => (
                  <div key={k} className="p-3 rounded-xl bg-[#0e1017] border border-slate-800">
                    <p className="text-xs font-bold text-slate-400 mb-1">
                      Campo #{idx + 1} ({k})
                    </p>
                    <p className="text-xs text-white whitespace-pre-wrap">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewer Action Area */}
          <div className="p-5 rounded-2xl bg-[#12141c] border border-amber-500/30 shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Pannello Valutazione & Esito Staff
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Decisione / Esito</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="bg-[#0a0b10] border-slate-700 text-white rounded-xl text-xs h-10 font-bold">
                    <SelectValue placeholder="Seleziona esito" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                    <SelectItem value="pending" className="text-slate-300">
                      🟡 In Attesa (Pending)
                    </SelectItem>
                    <SelectItem value="under_review" className="text-amber-400">
                      🟠 In Valutazione (Colloquio)
                    </SelectItem>
                    <SelectItem value="accepted" className="text-emerald-400 font-bold">
                      🟢 Accetta Candidatura (Approvata)
                    </SelectItem>
                    <SelectItem value="rejected" className="text-rose-400 font-bold">
                      🔴 Rifiuta Candidatura
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Assignment if Accepted */}
              {status === "accepted" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Assegna Ruolo Staff (Opzionale)
                  </Label>
                  <Select
                    value={selectedRoleToAssign}
                    onValueChange={(val) => setSelectedRoleToAssign(val)}
                  >
                    <SelectTrigger className="bg-[#0a0b10] border-emerald-500/40 text-emerald-300 rounded-xl text-xs h-10">
                      <SelectValue placeholder="Nessun ruolo assegnato automaticamente" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                      <SelectItem value="none">Nessun ruolo automatico</SelectItem>
                      {customRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                Note di Valutazione / Motivazione
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inserisci feedback, esito del colloquio o motivazione (visibile anche nella scheda del candidato)..."
                rows={3}
                className="bg-[#0a0b10] border-slate-700 text-white text-xs rounded-xl focus:ring-amber-500/40 resize-y"
              />
            </div>

            {application.reviewed_at && (
              <p className="text-[10px] text-slate-500 italic">
                Ultima revisione registrata il {formatDateTime(application.reviewed_at)}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-[#0e1017] flex items-center justify-between sm:justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-400 hover:text-white bg-transparent rounded-xl text-xs"
          >
            Chiudi
          </Button>

          <Button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 px-6 gap-2"
          >
            {updateMutation.isPending ? "Salvataggio..." : "Salva Valutazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
