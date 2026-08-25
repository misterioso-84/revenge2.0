import { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutList,
  Check,
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
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const [currentIdx, setCurrentIdx] = useState(0);

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

  const renderSingleFieldAnswer = (field: any, idx: number) => {
    const ans = answers[field.id];
    return (
      <div
        key={field.id || idx}
        className="p-5 rounded-xl bg-[#0e1017] border border-slate-800 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white">
            <span className="text-amber-400 font-mono mr-2">#{idx + 1}</span>
            {field.label}
          </p>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono text-slate-400 border-slate-800"
          >
            {field.type}
          </Badge>
        </div>

        {field.description && <p className="text-xs text-slate-400 italic">{field.description}</p>}

        <div className="pt-2">
          {ans === undefined || ans === null || ans === "" ? (
            <span className="text-xs italic text-slate-600">Nessuna risposta fornita</span>
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
            <p className="text-xs text-slate-200 bg-[#141724] p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed">
              {String(ans)}
            </p>
          )}
        </div>
      </div>
    );
  };

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

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <DialogTitle className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                {matchedForm?.title || "La Tua Candidatura"}
              </DialogTitle>

              {/* View Mode Toggle */}
              {fields.length > 1 && (
                <div className="flex items-center bg-[#141724] p-1 rounded-xl border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("all")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "all"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    <span>Tutte</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("single")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "single"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Una per Volta</span>
                  </button>
                </div>
              )}
            </div>

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

        {/* Answers Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === "single" && fields.length > 0 ? (
            /* Single Question View */
            <div className="space-y-5">
              {/* Question Pills Selector */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400">
                  Domanda {currentIdx + 1} di {fields.length}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {fields.map((f, idx) => (
                    <button
                      key={f.id || idx}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-7 w-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all border ${
                        idx === currentIdx
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                          : "bg-[#141724] text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {renderSingleFieldAnswer(fields[currentIdx], currentIdx)}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                  disabled={currentIdx === 0}
                  className="border-slate-800 text-slate-300 hover:text-white bg-[#0e1017] rounded-xl text-xs gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentIdx((p) => Math.min(fields.length - 1, p + 1))}
                  disabled={currentIdx === fields.length - 1}
                  className="border-slate-800 text-slate-300 hover:text-white bg-[#0e1017] rounded-xl text-xs gap-1"
                >
                  Successiva
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* All Questions List View */
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Riepilogo delle Risposte Fornite ({fields.length} Domande)
              </h3>

              {fields.length > 0 ? (
                fields.map((field, idx) => renderSingleFieldAnswer(field, idx))
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
