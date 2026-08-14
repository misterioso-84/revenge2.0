import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApplicationForm,
  ApplicationFormField,
  FormVisibility,
  FormStatus,
  QuestionType,
} from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Lock,
  Globe,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Save,
  CheckCircle2,
  RotateCcw,
  Eye,
  FileEdit,
} from "lucide-react";

interface FormBuilderViewProps {
  form: ApplicationForm | null; // null for creating new form
  onClose: () => void;
  currentUserId?: string;
}

const DRAFT_KEY = "casino_form_builder_persistent_draft";

export function FormBuilderView({ form, onClose, currentUserId }: FormBuilderViewProps) {
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roleTarget, setRoleTarget] = useState("");
  const [visibility, setVisibility] = useState<FormVisibility>("public");
  const [status, setStatus] = useState<FormStatus>("open");
  const [fields, setFields] = useState<ApplicationFormField[]>([]);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Initialize or restore
  useEffect(() => {
    if (form) {
      setTitle(form.title || "");
      setDescription(form.description || "");
      setRoleTarget(form.role_target || "");
      setVisibility(form.visibility || "public");
      setStatus(form.status || "open");
      setFields(
        form.fields && form.fields.length > 0 ? JSON.parse(JSON.stringify(form.fields)) : [],
      );
    } else {
      // Check if there is an unsaved draft in localStorage
      let loadedFromDraft = false;
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.title || parsed.fields?.length)) {
            setTitle(parsed.title || "");
            setDescription(parsed.description || "");
            setRoleTarget(parsed.roleTarget || "Croupier");
            setVisibility(parsed.visibility || "public");
            setStatus(parsed.status || "open");
            setFields(parsed.fields || []);
            loadedFromDraft = true;
            setHasDraftRestored(true);
            toast.info("Bozza precedente ripristinata automaticamente!", { duration: 3000 });
          }
        }
      } catch (e) {
        // ignore
      }

      if (!loadedFromDraft) {
        setTitle("");
        setDescription("");
        setRoleTarget("Croupier");
        setVisibility("public");
        setStatus("open");
        setFields([
          {
            id: "f_" + Math.random().toString(36).substring(2, 9),
            label: "Nickname Minecraft",
            description: "Il tuo nickname in gioco",
            type: "text",
            required: true,
            placeholder: "Es: Notch",
          },
          {
            id: "f_" + Math.random().toString(36).substring(2, 9),
            label: "Età Anagrafica",
            type: "number",
            required: true,
            placeholder: "Es: 18",
          },
          {
            id: "f_" + Math.random().toString(36).substring(2, 9),
            label: "Disponibilità oraria settimanale",
            type: "select",
            options: ["Meno di 5 ore", "5 - 10 ore", "10 - 20 ore", "Oltre 20 ore"],
            required: true,
          },
          {
            id: "f_" + Math.random().toString(36).substring(2, 9),
            label: "Perché vorresti candidarti per questa posizione?",
            type: "textarea",
            required: true,
            placeholder: "Spiega le tue motivazioni ed eventuali esperienze passate...",
          },
        ]);
      }
    }
  }, [form]);

  // Auto-save draft to localStorage on every change (if creating new form)
  useEffect(() => {
    if (!form) {
      const draftObj = {
        title,
        description,
        roleTarget,
        visibility,
        status,
        fields,
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
        const now = new Date();
        setLastSavedTime(
          `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
        );
      } catch (e) {
        // ignore
      }
    }
  }, [title, description, roleTarget, visibility, status, fields, form]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setTitle("");
    setDescription("");
    setRoleTarget("Croupier");
    setVisibility("public");
    setStatus("open");
    setFields([
      {
        id: "f_" + Math.random().toString(36).substring(2, 9),
        label: "Nickname Minecraft",
        type: "text",
        required: true,
      },
    ]);
    setHasDraftRestored(false);
    toast.success("Bozza resettata.");
  };

  const addField = () => {
    const newField: ApplicationFormField = {
      id: "f_" + Math.random().toString(36).substring(2, 9),
      label: "Nuova Domanda",
      type: "text",
      required: true,
      placeholder: "",
      options: ["Opzione 1", "Opzione 2"],
    };
    setFields((prev) => [...prev, newField]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    setFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const updateField = (index: number, partial: Partial<ApplicationFormField>) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...partial };
      return copy;
    });
  };

  const addOption = (fieldIndex: number) => {
    setFields((prev) => {
      const copy = [...prev];
      const opts = copy[fieldIndex].options || [];
      copy[fieldIndex] = {
        ...copy[fieldIndex],
        options: [...opts, `Opzione ${opts.length + 1}`],
      };
      return copy;
    });
  };

  const updateOption = (fieldIndex: number, optIndex: number, val: string) => {
    setFields((prev) => {
      const copy = [...prev];
      const opts = [...(copy[fieldIndex].options || [])];
      opts[optIndex] = val;
      copy[fieldIndex] = {
        ...copy[fieldIndex],
        options: opts,
      };
      return copy;
    });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    setFields((prev) => {
      const copy = [...prev];
      const opts = (copy[fieldIndex].options || []).filter((_, i) => i !== optIndex);
      copy[fieldIndex] = {
        ...copy[fieldIndex],
        options: opts,
      };
      return copy;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Inserisci il titolo del modulo");
      if (!roleTarget.trim()) throw new Error("Inserisci il ruolo o la posizione target");
      if (fields.length === 0) throw new Error("Aggiungi almeno una domanda al modulo");

      const payload = {
        id: form?.id || "form-" + Math.random().toString(36).substring(2, 12),
        title: title.trim(),
        description: description.trim(),
        role_target: roleTarget.trim(),
        visibility: visibility,
        status: status,
        fields: fields,
        created_by: form?.created_by || currentUserId || "system",
        updated_at: new Date().toISOString(),
        ...(form?.id ? {} : { created_at: new Date().toISOString(), expires_at: null }),
      };

      if (form?.id) {
        const { data, error } = await supabase
          .from("application_forms")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("application_forms").insert(payload);
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(
        form
          ? "Modulo di candidatura aggiornato con successo!"
          : "Nuovo modulo di candidatura pubblicato con successo!",
      );
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      qc.invalidateQueries({ queryKey: ["application_forms"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante il salvataggio del modulo");
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation & Draft Status */}
      <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-800 text-slate-300 hover:text-white bg-slate-900/80 rounded-xl h-10 px-3 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Torna ai Moduli</span>
          </Button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black uppercase text-white tracking-wide flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-amber-400" />
                {form ? `Modifica: ${form.title}` : "Creazione Nuovo Modulo Candidatura"}
              </h2>
              {!form && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  💾 Salvataggio Automatico Bozza
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {lastSavedTime
                ? `Le modifiche restano memorizzate anche se esci da questa pagina (Ultimo salvataggio: ${lastSavedTime})`
                : "Configura le domande, ruoli e visibilità del questionario"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end flex-wrap">
          {!form && (
            <Button
              type="button"
              variant="outline"
              onClick={clearDraft}
              className="border-rose-900/30 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs h-10 gap-1.5 font-semibold"
              title="Azzera campi e ricomincia"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Svuota Bozza
            </Button>
          )}

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 px-6 h-10 gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending
              ? "Salvataggio..."
              : form
                ? "Salva Modifiche"
                : "Pubblica Modulo"}
          </Button>
        </div>
      </div>

      {/* Main Form Information */}
      <div className="p-6 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl space-y-5">
        <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-3">
          <Sparkles className="h-4 w-4" />
          1. Informazioni Generali del Bando
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-200">Titolo del Modulo / Bando *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Candidatura Staff Casinò (Croupier & Tavoli da Gioco)"
              className="bg-[#0e1017] border-slate-800 text-white rounded-xl text-sm h-11 font-bold focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-200">Ruolo / Mansione Obiettivo *</Label>
            <Input
              value={roleTarget}
              onChange={(e) => setRoleTarget(e.target.value)}
              placeholder="Es: Croupier, Addetto Sicurezza, Barman..."
              className="bg-[#0e1017] border-slate-800 text-white rounded-xl text-xs h-10 focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-200">Stato Iniziale</Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger className="bg-[#0e1017] border-slate-800 text-white rounded-xl text-xs h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                <SelectItem value="open">🟢 Aperto (Accetta Candidature subito)</SelectItem>
                <SelectItem value="closed">🔴 Chiuso (Disabilitato)</SelectItem>
                <SelectItem value="draft">🟡 Bozza (Solo Staff)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-200">Visibilità del Modulo</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                onClick={() => setVisibility("public")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  visibility === "public"
                    ? "bg-amber-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5"
                    : "bg-[#0e1017] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Globe
                  className={`h-5 w-5 mt-0.5 shrink-0 ${visibility === "public" ? "text-amber-400" : "text-slate-500"}`}
                />
                <div className="space-y-1">
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    Pubblico (Per Tutti i Cittadini)
                    {visibility === "public" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Visibile a tutti i giocatori registrati per candidarsi ad entrare nello Staff
                    del Casinò Revenge.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setVisibility("internal_staff")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  visibility === "internal_staff"
                    ? "bg-purple-500/10 border-purple-500/50 text-white shadow-lg shadow-purple-500/5"
                    : "bg-[#0e1017] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Lock
                  className={`h-5 w-5 mt-0.5 shrink-0 ${visibility === "internal_staff" ? "text-purple-400" : "text-slate-500"}`}
                />
                <div className="space-y-1">
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    Interno (Solo Membri dello Staff)
                    {visibility === "internal_staff" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Riservato esclusivamente ai dipendenti/staff per concorsi interni, promozioni di
                    grado o questionari di servizio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-200">
              Descrizione & Linee Guida per i Candidati
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Spiega i requisiti, gli orari delle serate di apertura o cosa ti aspetti dal candidato..."
              rows={3}
              className="bg-[#0e1017] border-slate-800 text-white rounded-xl text-xs resize-y"
            />
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="p-6 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              2. Domande del Questionario ({fields.length})
            </h3>
            <p className="text-xs text-slate-400">
              Componi le domande con risposte a scelta multipla, checkbox, numeriche o testi aperti.
            </p>
          </div>

          <Button
            type="button"
            onClick={addField}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi Domanda
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10] space-y-3">
            <HelpCircle className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Nessuna domanda nel modulo</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Clicca sul pulsante "Aggiungi Domanda" per creare i quesiti a cui i candidati dovranno
              rispondere.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div
                key={field.id || idx}
                className="p-5 rounded-2xl bg-[#0e1017] border border-slate-800/90 shadow-md space-y-4 relative group hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">Domanda #{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => moveField(idx, "up")}
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      title="Sposta in alto"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === fields.length - 1}
                      onClick={() => moveField(idx, "down")}
                      className="h-8 w-8 text-slate-400 hover:text-white"
                      title="Sposta in basso"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(idx)}
                      className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Elimina domanda"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">
                      Testo della Domanda *
                    </Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Es: Qual è il tuo livello di esperienza nel ruolo?"
                      className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10 font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">Tipo di Risposta</Label>
                    <Select
                      value={field.type}
                      onValueChange={(val: QuestionType) => {
                        const updates: Partial<ApplicationFormField> = { type: val };
                        if (
                          (val === "radio" || val === "checkbox" || val === "select") &&
                          (!field.options || field.options.length === 0)
                        ) {
                          updates.options = ["Opzione 1", "Opzione 2"];
                        }
                        updateField(idx, updates);
                      }}
                    >
                      <SelectTrigger className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                        <SelectItem value="text">✏️ Risposta Aperta (Breve)</SelectItem>
                        <SelectItem value="textarea">📄 Risposta Aperta (Lunga)</SelectItem>
                        <SelectItem value="radio">🔘 Scelta Singola (Radio)</SelectItem>
                        <SelectItem value="checkbox">☑️ Scelta Multipla (Checkbox)</SelectItem>
                        <SelectItem value="select">📑 Menu a Tendina (Select)</SelectItem>
                        <SelectItem value="number">🔢 Numerico (Età / Ore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-slate-400">
                      Descrizione / Suggerimento per il candidato (Opzionale)
                    </Label>
                    <Input
                      value={field.description || ""}
                      onChange={(e) => updateField(idx, { description: e.target.value })}
                      placeholder="Es: Specifica eventuali server RP precedenti o disponibilità nei weekend"
                      className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-3 pt-4 sm:pt-6">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(idx, { required: checked })}
                        id={`req-${idx}`}
                      />
                      <Label
                        htmlFor={`req-${idx}`}
                        className="text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        Campo Obbligatorio
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Options Manager */}
                {(field.type === "radio" ||
                  field.type === "checkbox" ||
                  field.type === "select") && (
                  <div className="p-4 rounded-xl bg-[#141722]/80 border border-slate-800/80 space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Opzioni di Risposta Selezionabili
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(idx)}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 h-7 px-2.5"
                      >
                        + Aggiungi Opzione
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono w-5">
                            {optIdx + 1}.
                          </span>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                            placeholder={`Opzione ${optIdx + 1}`}
                            className="bg-[#0e1017] border-slate-800 text-white text-xs h-9 rounded-xl flex-1"
                          />
                          {(field.options || []).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(idx, optIdx)}
                              className="h-8 w-8 text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating/Fixed Bar */}
      <div className="p-5 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-2xl flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs h-10 px-5"
        >
          Annulla & Torna alla Lista
        </Button>

        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 px-8 h-10 gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Salvataggio..." : form ? "Salva Modifiche" : "Pubblica Modulo"}
        </Button>
      </div>
    </div>
  );
}
