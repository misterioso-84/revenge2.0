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
import { ApplicationSubmission, ApplicationForm } from "./types";
import { formatDateTime } from "@/lib/format";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileText,
  Sparkles,
  Lock,
  Globe,
  Timer,
  Send,
} from "lucide-react";

interface ViewAnswersDialogProps {
  application: ApplicationSubmission | null;
  form?: ApplicationForm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAnswersDialog({
  application,
  form,
  open,
  onOpenChange,
}: ViewAnswersDialogProps) {
  if (!application) return null;

  const matchedForm = form || application.application_forms;
  const fields = matchedForm?.fields || [];
  const answers = application.answers || {};

  const durationSec =
    application.started_at && application.created_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(application.created_at).getTime() -
              new Date(application.started_at).getTime()) /
              1000,
          ),
        )
      : null;
  const durationMin = durationSec !== null ? Math.floor(durationSec / 60) : null;
  const durationRemSec = durationSec !== null ? durationSec % 60 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0c12] border border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
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
                    ? "Candidatura Accettata"
                    : application.status === "rejected"
                      ? "Candidatura Rifiutata"
                      : application.status === "expired"
                        ? "Fallito per Tempo Scaduto"
                        : application.status === "under_review"
                          ? "In Valutazione"
                          : "In Attesa di Revisione"}
                </Badge>

                {application.allow_retry && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Seconda Possibilità Concessa
                    {application.time_extension_minutes
                      ? ` (+${application.time_extension_minutes}m)`
                      : ""}
                  </Badge>
                )}

                {matchedForm?.visibility === "internal_staff" ? (
                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px]">
                    <Lock className="h-3 w-3 mr-1" />
                    Modulo Interno
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]">
                    <Globe className="h-3 w-3 mr-1" />
                    Bando Pubblico
                  </Badge>
                )}

                {durationSec !== null && (
                  <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    <Timer className="h-3 w-3 mr-1" />
                    Tempo impiegato: {durationMin}m {durationRemSec}s
                    {matchedForm?.time_limit_minutes
                      ? ` / max ${matchedForm.time_limit_minutes}m`
                      : ""}
                  </Badge>
                )}
              </div>

              <span className="text-xs font-mono text-slate-400">
                Inviata: {formatDateTime(application.created_at)}
              </span>
            </div>

            <DialogTitle className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              {matchedForm?.title || "La Tua Candidatura"}
            </DialogTitle>

            <DialogDescription className="text-xs text-slate-400">
              Ruolo Target:{" "}
              <strong className="text-amber-400">{matchedForm?.role_target || "Staff"}</strong>
              {application.applicant_telegram && (
                <span className="ml-3 inline-flex items-center gap-1 text-sky-400 font-mono">
                  <Send className="h-3 w-3" /> Telegram: {application.applicant_telegram}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Feedback Notes from Staff if available */}
          {application.reviewer_notes && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <MessageSquare className="h-4 w-4" />
                Note & Feedback dallo Staff
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {application.reviewer_notes}
              </p>
              {application.reviewed_at && (
                <p className="text-[10px] text-amber-400/70 font-mono">
                  Valutata il {formatDateTime(application.reviewed_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Answers List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Riepilogo delle Risposte Fornite
          </h3>

          {fields.length > 0 ? (
            fields.map((field, idx) => {
              const ans = answers[field.id];
              return (
                <div
                  key={field.id || idx}
                  className="p-4 rounded-xl bg-[#0e1017]/80 border border-slate-800/80 space-y-1.5"
                >
                  <p className="text-xs font-bold text-slate-300">
                    {idx + 1}. {field.label}
                  </p>

                  <div className="pt-1">
                    {ans === undefined || ans === null || ans === "" ? (
                      <span className="text-xs italic text-slate-600">Nessuna risposta</span>
                    ) : Array.isArray(ans) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ans.map((item, i) => (
                          <Badge
                            key={i}
                            className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs"
                          >
                            ✓ {item}
                          </Badge>
                        ))}
                      </div>
                    ) : typeof ans === "boolean" ? (
                      <span className="text-xs font-bold text-amber-400">{ans ? "Sì" : "No"}</span>
                    ) : (
                      <p className="text-xs text-slate-200 bg-[#12141c] p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed">
                        {String(ans)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
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

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-[#0e1017]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-400 hover:text-white bg-transparent rounded-xl text-xs w-full sm:w-auto"
          >
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
