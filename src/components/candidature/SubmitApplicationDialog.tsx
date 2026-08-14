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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationForm, ApplicationFormField } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Sparkles, Lock, Globe, AlertCircle, HelpCircle, CheckCircle2 } from "lucide-react";

interface SubmitApplicationDialogProps {
  form: ApplicationForm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
  currentProfile: any;
  currentCitizen?: any;
  onSubmitted?: () => void;
}

export function SubmitApplicationDialog({
  form,
  open,
  onOpenChange,
  currentUser,
  currentProfile,
  currentCitizen,
  onSubmitted,
}: SubmitApplicationDialogProps) {
  const qc = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [discordTag, setDiscordTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const userNick = (
    currentCitizen?.nickname ||
    currentProfile?.username ||
    currentUser?.user_metadata?.username ||
    ""
  ).trim();

  const userName = (
    currentCitizen?.full_name ||
    currentProfile?.display_name ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.email?.split("@")[0] ||
    "Cittadino"
  ).trim();

  // Initialize and pre-fill answers when form opens
  useEffect(() => {
    if (form && open) {
      const initial: Record<string, any> = {};
      form.fields.forEach((field) => {
        if (field.id === "f_mc_nick" || field.label.toLowerCase().includes("minecraft")) {
          initial[field.id] = userNick || "";
        } else if (field.type === "checkbox") {
          initial[field.id] = [];
        } else {
          initial[field.id] = "";
        }
      });

      setAnswers(initial);
      setDiscordTag("");
      setErrors({});
    }
  }, [form, open, userNick]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const currentList: string[] = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
      if (checked) {
        if (!currentList.includes(option)) currentList.push(option);
      } else {
        const index = currentList.indexOf(option);
        if (index > -1) currentList.splice(index, 1);
      }
      return { ...prev, [fieldId]: currentList };
    });
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form || !currentUser?.id) throw new Error("Utente o modulo non valido");

      // Verify no previous submission for this form
      const { data: existing } = await supabase
        .from("applications")
        .select("id")
        .eq("form_id", form.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existing) {
        throw new Error("Hai già inviato una candidatura per questo modulo!");
      }

      const submissionPayload = {
        id: "app-" + Math.random().toString(36).substring(2, 14),
        form_id: form.id,
        user_id: currentUser.id,
        citizen_id: currentCitizen?.id || null,
        applicant_name: userName,
        applicant_nickname: userNick || answers["f_mc_nick"] || userName,
        applicant_email: currentUser.email || null,
        applicant_discord: discordTag.trim() || answers["f_discord"] || null,
        status: "pending",
        answers: answers,
        reviewer_id: null,
        reviewer_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("applications").insert(submissionPayload);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidatura inviata con successo!", {
        description: "Il modulo è stato registrato ed è ora in valutazione da parte dello Staff.",
      });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      onOpenChange(false);
      onSubmitted?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossibile inviare la candidatura");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const newErrors: Record<string, string> = {};

    form.fields.forEach((field) => {
      if (field.required) {
        const val = answers[field.id];
        if (field.type === "checkbox") {
          if (!Array.isArray(val) || val.length === 0) {
            newErrors[field.id] = "Seleziona almeno un'opzione obbligatoria";
          }
        } else if (val === undefined || val === null || String(val).trim() === "") {
          newErrors[field.id] = "Questo campo è obbligatorio";
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Compila tutti i campi obbligatori contrassegnati da *");
      return;
    }

    submitMutation.mutate();
  };

  if (!form) return null;

  const renderField = (field: ApplicationFormField) => {
    const errorMsg = errors[field.id];
    const value = answers[field.id];

    return (
      <div
        key={field.id}
        className="space-y-2 p-4 rounded-xl bg-[#0e1017]/80 border border-slate-800/80 transition-all focus-within:border-amber-500/40"
      >
        <div className="flex items-start justify-between gap-2">
          <Label className="text-sm font-bold text-slate-200 leading-snug">
            {field.label}
            {field.required && <span className="text-amber-400 ml-1 font-black">*</span>}
          </Label>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-mono px-2 py-0.5 border-slate-800 text-slate-400 shrink-0"
          >
            {field.type === "text" && "Testo Breve"}
            {field.type === "textarea" && "Paragrafo"}
            {field.type === "radio" && "Scelta Singola"}
            {field.type === "checkbox" && "Selezione Multipla"}
            {field.type === "select" && "Menu a Tendina"}
            {field.type === "number" && "Numero"}
          </Badge>
        </div>

        {field.description && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5 leading-relaxed">
            <HelpCircle className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
            {field.description}
          </p>
        )}

        {/* FIELD TYPE: TEXT */}
        {field.type === "text" && (
          <Input
            value={value || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Inserisci la tua risposta..."}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs h-10 focus-visible:ring-amber-500/40"
          />
        )}

        {/* FIELD TYPE: NUMBER */}
        {field.type === "number" && (
          <Input
            type="number"
            value={value !== undefined ? value : ""}
            onChange={(e) =>
              handleFieldChange(field.id, e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={field.placeholder || "Es: 18"}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs h-10 focus-visible:ring-amber-500/40"
          />
        )}

        {/* FIELD TYPE: TEXTAREA */}
        {field.type === "textarea" && (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "Scrivi qui in modo chiaro e dettagliato..."}
            rows={4}
            className="bg-[#12141c] border-slate-800 text-white placeholder:text-slate-600 rounded-xl text-xs resize-y focus-visible:ring-amber-500/40 leading-relaxed"
          />
        )}

        {/* FIELD TYPE: RADIO */}
        {field.type === "radio" && (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            className="space-y-2 pt-1"
          >
            {(field.options || []).map((opt, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#141722]/60 hover:bg-[#181c2a] border border-slate-800/60 cursor-pointer transition-colors"
              >
                <RadioGroupItem
                  value={opt}
                  id={`${field.id}-${idx}`}
                  className="border-amber-500 text-amber-500"
                />
                <span className="text-xs text-slate-300 font-medium">{opt}</span>
              </label>
            ))}
          </RadioGroup>
        )}

        {/* FIELD TYPE: CHECKBOX */}
        {field.type === "checkbox" && (
          <div className="space-y-2 pt-1">
            {(field.options || []).map((opt, idx) => {
              const currentList = Array.isArray(value) ? value : [];
              const isChecked = currentList.includes(opt);
              return (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#141722]/60 hover:bg-[#181c2a] border border-slate-800/60 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxToggle(field.id, opt, !!checked)}
                    className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950"
                  />
                  <span className="text-xs text-slate-300 font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* FIELD TYPE: SELECT */}
        {field.type === "select" && (
          <Select value={value || ""} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10 focus:ring-amber-500/40">
              <SelectValue placeholder="Seleziona un'opzione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
              {(field.options || []).map((opt, idx) => (
                <SelectItem
                  key={idx}
                  value={opt}
                  className="focus:bg-amber-500/20 focus:text-amber-300"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {errorMsg && (
          <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0c12] border border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with Title & Badge */}
        <div className="p-6 border-b border-slate-800/90 bg-[#10121a]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {form.visibility === "internal_staff" ? (
                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <Lock className="h-3 w-3 mr-1" />
                    Modulo Interno Staff
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <Globe className="h-3 w-3 mr-1" />
                    Candidatura Aperta
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-400 font-semibold text-[10px]"
                >
                  Ruolo: {form.role_target}
                </Badge>
              </div>
            </div>

            <DialogTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              {form.title}
            </DialogTitle>

            <DialogDescription className="text-xs text-slate-400 leading-relaxed">
              {form.description}
            </DialogDescription>
          </DialogHeader>

          {/* Applicant Info Summary Box */}
          <div className="mt-4 p-3 rounded-xl bg-[#0a0b10] border border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {userNick ? (
                <img
                  src={`https://mc-heads.net/avatar/${encodeURIComponent(userNick)}/40`}
                  alt={userNick}
                  className="h-9 w-9 rounded-lg border border-amber-500/40 bg-black/40 shadow"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                  RP
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{userName}</span>
                  {userNick && (
                    <span className="text-[11px] font-mono text-amber-400">({userNick})</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400">
                  Candidato registrato • Invio singolo protetto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium">
                {form.fields.length} domande previste
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Domande del Questionario di Selezione
              </h3>
              <p className="text-[11px] text-slate-400">
                Rispondi con sincerità e completezza. I campi contrassegnati con (*) sono
                obbligatori.
              </p>
            </div>

            {form.fields.map((field) => renderField(field))}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 space-y-1">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Verifica prima dell'invio
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Puoi inviare solo una candidatura per ciascun bando. Una volta inviata, potrai
              consultare lo stato e le risposte nella sezione "Le Mie Candidature".
            </p>
          </div>
        </form>

        {/* Footer with Action Buttons */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-[#0e1017] flex items-center justify-between sm:justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-400 hover:text-white bg-transparent rounded-xl text-xs"
          >
            Annulla
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 px-6 gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {submitMutation.isPending ? "Invio in corso..." : "Invia Candidatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
