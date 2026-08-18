import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationSubmission, ApplicationForm, ApplicationStatus } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  Award,
  Sparkles,
  Lock,
  Globe,
  FileText,
  Timer,
  Send,
  PlusCircle,
  ExternalLink,
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

  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const [notes, setNotes] = useState("");
  const [timeExtension, setTimeExtension] = useState<number | "">("");
  const [allowRetry, setAllowRetry] = useState(false);
  const [copiedNick, setCopiedNick] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>("none");

  // Fetch applicant profile to ensure we have the verified Telegram handle
  const { data: applicantProfile } = useQuery({
    queryKey: ["applicant-profile-for-review", application?.user_id],
    queryFn: async () => {
      if (!application?.user_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, telegram_handle, telegram_connected")
        .eq("id", application.user_id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!application?.user_id && open,
  });

  // Fetch all custom roles in case the reviewer wants to assign a role directly
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const baseRoles = customRoles.filter((r: any) => !r.is_reparto);
  const extrapexRoles = customRoles.filter((r: any) => r.is_reparto === true);

  const telegramHandle = useMemo(() => {
    const raw = application?.applicant_telegram || applicantProfile?.telegram_handle;
    if (!raw) return null;
    const clean = raw.trim();
    return clean.startsWith("@") ? clean : `@${clean}`;
  }, [application?.applicant_telegram, applicantProfile?.telegram_handle]);

  useEffect(() => {
    if (application && open) {
      setStatus(application.status || "pending");
      setNotes(application.reviewer_notes || "");
      setTimeExtension(application.time_extension_minutes || "");
      setAllowRetry(!!application.allow_retry);
      setSelectedRoleToAssign("none");
    }
  }, [application, open]);

  const copyNickname = (nick: string) => {
    navigator.clipboard.writeText(nick);
    setCopiedNick(true);
    toast.success("Nickname copiato negli appunti!");
    setTimeout(() => setCopiedNick(false), 2000);
  };

  const copyTelegram = (handle: string) => {
    navigator.clipboard.writeText(handle);
    setCopiedTg(true);
    toast.success("Username Telegram copiato!");
    setTimeout(() => setCopiedTg(false), 2000);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!application) throw new Error("Candidatura non valida");

      const hasExtraTime = timeExtension !== "" && Number(timeExtension) > 0;
      const willAllowRetry = allowRetry || hasExtraTime;

      const updateData: any = {
        status: status,
        reviewer_id: currentUserId || null,
        reviewer_notes: notes.trim() || null,
        allow_retry: willAllowRetry,
        retry_granted_at: willAllowRetry
          ? application.retry_granted_at || new Date().toISOString()
          : null,
        retry_granted_by: willAllowRetry
          ? application.retry_granted_by || reviewerName || currentUserId
          : null,
        time_extension_minutes: hasExtraTime ? Number(timeExtension) : null,
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
            : allowRetry || (timeExtension !== "" && Number(timeExtension) > 0)
              ? `Tempo extra (${timeExtension}m) e seconda possibilità concessi al candidato!`
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 ${
                    application.status === "accepted"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : application.status === "rejected"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : application.status === "expired"
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          : application.status === "under_review"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-slate-500/10 text-slate-300 border-slate-700"
                  }`}
                >
                  {application.status === "accepted" && (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  {application.status === "rejected" && <XCircle className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "expired" && <Timer className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "under_review" && <Clock className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
                  {application.status === "accepted"
                    ? "Accettata"
                    : application.status === "rejected"
                      ? "Rifiutata"
                      : application.status === "expired"
                        ? "Fallito per Tempo Scaduto"
                        : application.status === "under_review"
                          ? "In Valutazione"
                          : "In Attesa"}
                </Badge>

                {application.allow_retry && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Seconda Possibilità Concessa
                  </Badge>
                )}

                {application.time_extension_minutes && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold flex items-center gap-1 font-mono">
                    <Timer className="h-3 w-3" />+{application.time_extension_minutes}m Extra
                    Concessi
                  </Badge>
                )}

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

                {application.started_at && application.created_at && (
                  <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    <Timer className="h-3 w-3 mr-1" />
                    Completata in:{" "}
                    {Math.floor(
                      Math.max(
                        0,
                        (new Date(application.created_at).getTime() -
                          new Date(application.started_at).getTime()) /
                          1000,
                      ) / 60,
                    )}
                    m{" "}
                    {Math.floor(
                      Math.max(
                        0,
                        (new Date(application.created_at).getTime() -
                          new Date(application.started_at).getTime()) /
                          1000,
                      ) % 60,
                    )}
                    s
                    {matchedForm?.time_limit_minutes
                      ? ` (Limite: ${matchedForm.time_limit_minutes}m)`
                      : ""}
                  </Badge>
                )}
              </div>

              <span className="text-xs font-mono text-slate-400">
                Inviata il {formatDateTime(application.created_at)}
              </span>
            </div>

            <DialogTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              {matchedForm?.title || "Candidatura"}
            </DialogTitle>

            <DialogDescription className="text-xs text-slate-400">
              Ruolo Target:{" "}
              <strong className="text-amber-400">{matchedForm?.role_target || "Staff"}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Candidate Card Identity with Verified Telegram */}
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

                {/* Verified Telegram Contact & Email */}
                <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-2 flex-wrap">
                  {telegramHandle ? (
                    <div className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-lg">
                      <Send className="h-3 w-3 text-sky-400" />
                      <a
                        href={`https://t.me/${telegramHandle.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 font-mono font-bold hover:underline inline-flex items-center gap-1"
                        title="Apri chat Telegram in nuova scheda"
                      >
                        <span>{telegramHandle}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyTelegram(telegramHandle)}
                        className="text-slate-400 hover:text-white ml-1"
                        title="Copia Telegram"
                      >
                        {copiedTg ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[9px] py-0 px-1.5 font-bold">
                        ✓ Telegram Verificato
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[10px]">
                      Nessun account Telegram associato
                    </span>
                  )}

                  {application.applicant_email && (
                    <span className="text-slate-500 text-[10px]">
                      • {application.applicant_email}
                    </span>
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
              Risposte Fornite dal Candidato
            </h3>

            {fields.length > 0 ? (
              fields.map((field, idx) => {
                const ans = answers[field.id];
                return (
                  <div
                    key={field.id || idx}
                    className="p-4 rounded-xl bg-[#0e1017] border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-300 leading-snug">
                        {idx + 1}. {field.label}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-slate-800 text-slate-500 shrink-0"
                      >
                        {field.type}
                      </Badge>
                    </div>

                    <div className="pt-1">
                      {ans === undefined || ans === null || ans === "" ? (
                        <span className="text-xs italic text-slate-600">Nessuna risposta</span>
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
          <div className="p-5 rounded-2xl bg-[#12141c] border border-amber-500/30 shadow-xl space-y-5">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Pannello Valutazione & Gestione Tempo Staff
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
                    <SelectItem value="expired" className="text-rose-400 font-bold">
                      ❌ Fallito per Tempo Scaduto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Assignment if Accepted */}
              {status === "accepted" ? (
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
                      <SelectValue placeholder="Nessun ruolo automatico" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs max-h-60">
                      <SelectItem value="none">Nessun ruolo automatico</SelectItem>
                      {baseRoles.length > 0 && (
                        <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 rounded my-1">
                          Ruoli Base
                        </div>
                      )}
                      {baseRoles.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                      {extrapexRoles.length > 0 && (
                        <div className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-500/10 rounded my-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Reparti & Extrapex
                        </div>
                      )}
                      {extrapexRoles.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          ✨ {r.name} (Extrapex)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-400">Tipo di Procedura</Label>
                  <div className="p-2.5 rounded-xl bg-[#0a0b10] border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>{matchedForm?.title || "Bando Staff"}</span>
                    {matchedForm?.time_limit_minutes ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                        Test {matchedForm.time_limit_minutes}m
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400 text-[10px]">Standard</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* GRANT MORE TIME & RETRY UNLOCK (STAFF PRIVILEGE) */}
            {/* ========================================================================= */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-[#0e1017] space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-amber-400" />
                    <Label className="text-xs font-bold text-white">
                      Concedi Più Tempo al Candidato
                    </Label>
                    {(timeExtension !== "" && Number(timeExtension) > 0) || allowRetry ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        ✓ Tempo Extra Attivo
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Come Staff puoi decidere di concedere minuti extra al candidato (specialmente se
                    il tempo è scaduto o necessita di completare il test). Questo sblocca
                    automaticamente una nuova possibilità di compilazione.
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons for Extra Minutes */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Preimpostati:</span>
                  {[5, 10, 15, 20, 30].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTimeExtension(mins);
                        setAllowRetry(true);
                      }}
                      className={`text-xs h-7 px-2.5 rounded-lg border ${
                        timeExtension === mins
                          ? "bg-amber-500 text-slate-950 font-black border-amber-400"
                          : "border-slate-800 bg-[#141724] text-slate-300 hover:text-white hover:border-amber-500/40"
                      }`}
                    >
                      +{mins} min
                    </Button>
                  ))}
                  {timeExtension !== "" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTimeExtension("");
                      }}
                      className="text-xs h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      Rimuovi Extra
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-40">
                    <Input
                      type="number"
                      placeholder="Minuti personalizzati"
                      value={timeExtension}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setTimeExtension(v);
                        if (v !== "" && Number(v) > 0) {
                          setAllowRetry(true);
                        }
                      }}
                      className="bg-[#0a0b10] border-slate-700 text-white text-xs h-9 rounded-lg"
                      min="1"
                    />
                  </div>
                  {timeExtension !== "" && Number(timeExtension) > 0 && (
                    <p className="text-[11px] text-amber-300 font-medium">
                      ⏱️ Tempo totale che avrà il candidato:{" "}
                      <strong>
                        {(matchedForm?.time_limit_minutes || 0) + Number(timeExtension)} minuti
                      </strong>{" "}
                      ({matchedForm?.time_limit_minutes || 0}m base + {timeExtension}m extra)
                    </p>
                  )}
                </div>
              </div>

              {/* SECOND CHANCE / RETRY SWITCH */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="allow-retry-switch"
                    className="text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Abilita Secondo Tentativo (Seconda Possibilità)
                  </Label>
                  <p className="text-[10px] text-slate-400">
                    Consente all'utente di ripetere e inviare nuovamente il modulo ignorando
                    qualsiasi blocco.
                  </p>
                </div>
                <Switch
                  id="allow-retry-switch"
                  checked={allowRetry || (timeExtension !== "" && Number(timeExtension) > 0)}
                  onCheckedChange={(checked) => {
                    setAllowRetry(checked);
                    if (!checked) {
                      setTimeExtension("");
                    }
                  }}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {application.retry_granted_at && (
                <p className="text-[10px] text-amber-400/90 italic pt-1">
                  Ultima concessione registrata il {formatDateTime(application.retry_granted_at)}
                  {application.retry_granted_by && ` da ${application.retry_granted_by}`}
                </p>
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
                placeholder="Inserisci feedback, esito del colloquio o motivazione per il candidato..."
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
            {updateMutation.isPending ? "Salvataggio..." : "Salva Valutazione & Impostazioni"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
