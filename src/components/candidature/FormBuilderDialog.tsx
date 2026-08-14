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
  GripVertical,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface FormBuilderDialogProps {
  form: ApplicationForm | null; // null for creating new form
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

export function FormBuilderDialog({
  form,
  open,
  onOpenChange,
  currentUserId,
}: FormBuilderDialogProps) {
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roleTarget, setRoleTarget] = useState("");
  const [visibility, setVisibility] = useState<FormVisibility>("public");
  const [status, setStatus] = useState<FormStatus>("open");
  const [fields, setFields] = useState<ApplicationFormField[]>([]);

  useEffect(() => {
    if (open) {
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
            placeholder: "Spiega le tue motivazioni...",
          },
        ]);
      }
    }
  }, [form, open]);

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
      if (!roleTarget.trim()) throw new Error("Inserisci il ruolo target");
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
      toast.success(form ? "Modulo aggiornato con successo!" : "Nuovo modulo creato con successo!");
      qc.invalidateQueries({ queryKey: ["application_forms"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante il salvataggio del modulo");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0c12] border border-slate-800 text-white max-w-3xl max-h-[92vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/90 bg-[#10121a]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                <Layers className="h-3 w-3 mr-1" />
                Costruttore Moduli
              </Badge>
            </div>
            <DialogTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              {form ? "Modifica Modulo Candidatura" : "Crea Nuovo Modulo Candidatura"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Personalizza le domande (aperte, a scelta multipla, checkbox, numeriche) e la
              visibilità (pubblica o riservata allo staff).
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Info Section */}
          <div className="p-5 rounded-2xl bg-[#0e1017] border border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Informazioni di Base del Modulo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">Titolo del Modulo *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es: Candidatura Staff Casinò (Croupier & Tavoli)"
                  className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200">
                  Ruolo / Posizione Obiettivo *
                </Label>
                <Input
                  value={roleTarget}
                  onChange={(e) => setRoleTarget(e.target.value)}
                  placeholder="Es: Croupier, Addetto Sicurezza, Barman..."
                  className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200">Stato Modulo</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                    <SelectItem value="open">🟢 Aperto (Accetta Candidature)</SelectItem>
                    <SelectItem value="closed">🔴 Chiuso (Archiviato)</SelectItem>
                    <SelectItem value="draft">🟡 Bozza (In lavorazione)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">Visibilità del Modulo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    onClick={() => setVisibility("public")}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      visibility === "public"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Globe
                      className={`h-4 w-4 mt-0.5 shrink-0 ${visibility === "public" ? "text-amber-400" : "text-slate-500"}`}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Pubblica (Tutti i Cittadini)</p>
                      <p className="text-[10px] text-slate-400">
                        Visibile a tutti gli utenti registrati per candidarsi ad entrare nello
                        Staff.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setVisibility("internal_staff")}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      visibility === "internal_staff"
                        ? "bg-purple-500/10 border-purple-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Lock
                      className={`h-4 w-4 mt-0.5 shrink-0 ${visibility === "internal_staff" ? "text-purple-400" : "text-slate-500"}`}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Interna (Solo Membri Staff)</p>
                      <p className="text-[10px] text-slate-400">
                        Riservata solo agli utenti con permessi Staff (concorsi interni, promozioni,
                        feedback).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">
                  Descrizione & Istruzioni per i Candidati
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi i requisiti, orari previsti o informazioni utili..."
                  rows={2}
                  className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs resize-y"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Question List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-2">
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Domande & Campi del Modulo ({fields.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Aggiungi domande aperte, a scelta multipla o checkbox per selezionare i candidati.
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
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0a0b10] space-y-2">
                <HelpCircle className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Nessuna domanda presente</p>
                <p className="text-[11px] text-slate-500">
                  Clicca su "Aggiungi Domanda" per iniziare a comporre il questionario.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="p-4 rounded-2xl bg-[#0e1017] border border-slate-800/90 shadow-md space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">Domanda #{idx + 1}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => moveField(idx, "up")}
                          className="h-7 w-7 text-slate-400 hover:text-white"
                          title="Sposta in alto"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === fields.length - 1}
                          onClick={() => moveField(idx, "down")}
                          className="h-7 w-7 text-slate-400 hover:text-white"
                          title="Sposta in basso"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(idx)}
                          className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Elimina domanda"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">
                          Testo della Domanda *
                        </Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="Es: Qual è il tuo livello di esperienza?"
                          className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">
                          Tipo di Risposta
                        </Label>
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
                          <SelectTrigger className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-9">
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

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-medium text-slate-400">
                          Descrizione / Suggerimento (Opzionale)
                        </Label>
                        <Input
                          value={field.description || ""}
                          onChange={(e) => updateField(idx, { description: e.target.value })}
                          placeholder="Es: Specifica eventuali server RP precedenti"
                          className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-9"
                        />
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-3 pt-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(idx, { required: checked })}
                            id={`req-${idx}`}
                          />
                          <Label
                            htmlFor={`req-${idx}`}
                            className="text-xs font-bold text-slate-300 cursor-pointer"
                          >
                            Obbligatorio
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Options manager for radio, checkbox, select */}
                    {(field.type === "radio" ||
                      field.type === "checkbox" ||
                      field.type === "select") && (
                      <div className="p-3.5 rounded-xl bg-[#141722]/70 border border-slate-800/80 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                            Opzioni di Risposta
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(idx)}
                            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 h-6 px-2"
                          >
                            + Aggiungi Opzione
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          {(field.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-mono w-4">
                                {optIdx + 1}.
                              </span>
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                placeholder={`Opzione ${optIdx + 1}`}
                                className="bg-[#0e1017] border-slate-800 text-white text-xs h-8 rounded-lg"
                              />
                              {(field.options || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(idx, optIdx)}
                                  className="h-7 w-7 text-rose-400 hover:text-rose-300"
                                >
                                  <Trash2 className="h-3 w-3" />
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
        </div>

        {/* Footer */}
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
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 px-6"
          >
            {saveMutation.isPending ? "Salvataggio..." : form ? "Salva Modifiche" : "Crea Modulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
