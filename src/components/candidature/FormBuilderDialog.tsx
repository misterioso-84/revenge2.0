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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ShieldAlert,
  ShieldCheck,
  User,
  Send,
  X,
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
  const [displayMode, setDisplayMode] = useState<"all" | "single_question">("all");
  const [fields, setFields] = useState<ApplicationFormField[]>([]);

  // Whitelist state
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [allowedNicks, setAllowedNicks] = useState<string[]>([]);
  const [allowedTelegrams, setAllowedTelegrams] = useState<string[]>([]);
  const [newNickInput, setNewNickInput] = useState("");
  const [newTgInput, setNewTgInput] = useState("");
  const [newRoleInput, setNewRoleInput] = useState("");

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("name");
      if (error) return [];
      return (data || []) as any[];
    },
  });

  const baseRoles = customRoles.filter((r: any) => !r.is_reparto);
  const extrapexRoles = customRoles.filter((r: any) => r.is_reparto === true);

  useEffect(() => {
    if (open) {
      if (form) {
        setTitle(form.title || "");
        setDescription(form.description || "");
        setRoleTarget(form.role_target || "");
        setVisibility(form.visibility || "public");
        setStatus(form.status || "open");
        setDisplayMode(form.display_mode === "single_question" ? "single_question" : "all");
        setAllowedRoles(form.allowed_roles || []);
        setAllowedNicks(form.allowed_minecraft_nicknames || []);
        setAllowedTelegrams(form.allowed_telegram_handles || []);
        setFields(
          form.fields && form.fields.length > 0 ? JSON.parse(JSON.stringify(form.fields)) : [],
        );
      } else {
        setTitle("");
        setDescription("");
        setRoleTarget("Croupier");
        setVisibility("public");
        setStatus("open");
        setAllowedRoles([]);
        setAllowedNicks([]);
        setAllowedTelegrams([]);
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

  const handleAddNick = () => {
    if (!newNickInput.trim()) return;
    const parts = newNickInput
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setAllowedNicks((prev) => Array.from(new Set([...prev, ...parts])));
    setNewNickInput("");
  };

  const handleAddTelegram = () => {
    if (!newTgInput.trim()) return;
    const parts = newTgInput
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => (p.startsWith("@") ? p : `@${p}`));
    setAllowedTelegrams((prev) => Array.from(new Set([...prev, ...parts])));
    setNewTgInput("");
  };

  const handleAddRole = () => {
    if (!newRoleInput.trim()) return;
    const r = newRoleInput.trim();
    if (!allowedRoles.some((role) => role.toLowerCase() === r.toLowerCase())) {
      setAllowedRoles((prev) => [...prev, r]);
    }
    setNewRoleInput("");
  };

  const toggleRole = (r: string) => {
    if (allowedRoles.some((role) => role.toLowerCase() === r.toLowerCase())) {
      setAllowedRoles((prev) => prev.filter((role) => role.toLowerCase() !== r.toLowerCase()));
    } else {
      setAllowedRoles((prev) => [...prev, r]);
    }
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
      if (!roleTarget.trim()) throw new Error("Inserisci il ruolo target");
      if (fields.length === 0) throw new Error("Aggiungi almeno una domanda al modulo");

      const payload = {
        id: form?.id || "form-" + Math.random().toString(36).substring(2, 12),
        title: title.trim(),
        description: description.trim(),
        role_target: roleTarget.trim(),
        visibility: visibility,
        status: status,
        display_mode: displayMode,
        fields: fields,
        allowed_roles: visibility === "private" ? allowedRoles : null,
        allowed_minecraft_nicknames: visibility === "private" ? allowedNicks : null,
        allowed_telegram_handles: visibility === "private" ? allowedTelegrams : null,
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
              Personalizza le domande, la visibilità (pubblica, staff o whitelist privata) e le
              regole di accesso.
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
                {/* Role Suggestion Chips */}
                {(baseRoles.length > 0 || extrapexRoles.length > 0) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {baseRoles.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoleTarget(r.name)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                          roleTarget.toLowerCase() === r.name.toLowerCase()
                            ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                            : "bg-[#0e1017] text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                    {extrapexRoles.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoleTarget(r.name)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 transition-all ${
                          roleTarget.toLowerCase() === r.name.toLowerCase()
                            ? "bg-purple-600 text-white font-bold border-purple-400"
                            : "bg-purple-950/20 text-purple-300 hover:text-purple-200 border-purple-800/30 hover:border-purple-700/50"
                        }`}
                      >
                        <Sparkles className="h-2 w-2 text-purple-400" />
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
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

              {/* Visibilità 3-way */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">Visibilità del Modulo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <label
                    onClick={() => setVisibility("public")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      visibility === "public"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Globe
                      className={`h-4 w-4 mt-0.5 shrink-0 ${visibility === "public" ? "text-amber-400" : "text-slate-500"}`}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Pubblica</p>
                      <p className="text-[10px] text-slate-400">Tutti i cittadini</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setVisibility("internal_staff")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      visibility === "internal_staff"
                        ? "bg-purple-500/10 border-purple-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Lock
                      className={`h-4 w-4 mt-0.5 shrink-0 ${visibility === "internal_staff" ? "text-purple-400" : "text-slate-500"}`}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Staff</p>
                      <p className="text-[10px] text-slate-400">Solo membri Staff</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setVisibility("private")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      visibility === "private"
                        ? "bg-rose-500/10 border-rose-500/50 text-white ring-1 ring-rose-500/30"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <ShieldAlert
                      className={`h-4 w-4 mt-0.5 shrink-0 ${visibility === "private" ? "text-rose-400" : "text-slate-500"}`}
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Privata / Whitelist</p>
                      <p className="text-[10px] text-slate-400">Ruoli, Nick o TG</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Display Mode Setting */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">
                  Modalità Visualizzazione Domande
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    onClick={() => setDisplayMode("all")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      displayMode === "all"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">📋 Tutte le Domande</p>
                      <p className="text-[10px] text-slate-400">
                        Tutti i campi su una singola pagina
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setDisplayMode("single_question")}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      displayMode === "single_question"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-[#12141c] border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">🎯 Una Domanda per Volta</p>
                      <p className="text-[10px] text-slate-400">
                        Navigazione step-by-step con avanzamento
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Whitelist box if private */}
              {visibility === "private" && (
                <div className="sm:col-span-2 p-4 rounded-xl border border-rose-500/30 bg-[#12141c] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Destinatari Whitelist
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {allowedRoles.length} Ruoli • {allowedNicks.length} Nick MC •{" "}
                      {allowedTelegrams.length} TG
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Roles (Base + Extrapex) */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-slate-300">Ruoli ammessi</Label>

                      {/* Base Roles */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block">
                          Ruoli Base:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {["admin", "staff"].map((r) => {
                            const isSel = allowedRoles.some((x) => x.toLowerCase() === r);
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => toggleRole(r)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                  isSel
                                    ? "bg-rose-500 text-white border-rose-400 font-bold"
                                    : "bg-[#0a0b10] text-slate-400 border-slate-800 hover:text-slate-200"
                                }`}
                              >
                                {isSel ? "✓ " : "+ "}
                                {r}
                              </button>
                            );
                          })}
                          {baseRoles.map((cr: any) => {
                            const isSel = allowedRoles.some(
                              (x) =>
                                x.toLowerCase() === cr.name.toLowerCase() ||
                                x.toLowerCase() === cr.id.toLowerCase(),
                            );
                            return (
                              <button
                                key={cr.id}
                                type="button"
                                onClick={() => toggleRole(cr.name)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                  isSel
                                    ? "bg-rose-500 text-white border-rose-400 font-bold"
                                    : "bg-[#0a0b10] text-amber-300/80 border-amber-500/20 hover:text-amber-200"
                                }`}
                              >
                                {isSel ? "✓ " : "+ "}
                                {cr.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reparti & Extrapex */}
                      {extrapexRoles.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            Reparti (Extrapex):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {extrapexRoles.map((er: any) => {
                              const isSel = allowedRoles.some(
                                (x) =>
                                  x.toLowerCase() === er.name.toLowerCase() ||
                                  x.toLowerCase() === er.id.toLowerCase(),
                              );
                              return (
                                <button
                                  key={er.id}
                                  type="button"
                                  onClick={() => toggleRole(er.name)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                    isSel
                                      ? "bg-purple-600 text-white border-purple-400 font-bold shadow-sm"
                                      : "bg-purple-950/20 text-purple-300 border-purple-800/30 hover:text-purple-100 hover:border-purple-700/50"
                                  }`}
                                >
                                  {isSel ? "✓ " : "+ "}
                                  {er.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add custom role input */}
                      <div className="flex gap-1 pt-1">
                        <Input
                          placeholder="Altro ruolo..."
                          value={newRoleInput}
                          onChange={(e) => setNewRoleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddRole();
                            }
                          }}
                          className="bg-[#0a0b10] border-slate-700 text-white text-xs h-7 rounded"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddRole}
                          className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold text-xs h-7 px-2"
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Nicknames */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-300">
                        Nickname Minecraft
                      </Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Nick..."
                          value={newNickInput}
                          onChange={(e) => setNewNickInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddNick();
                            }
                          }}
                          className="bg-[#0a0b10] border-slate-700 text-white text-xs h-7 rounded"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddNick}
                          className="bg-amber-500 text-slate-950 font-bold text-xs h-7 px-2"
                        >
                          +
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {allowedNicks.map((nick) => (
                          <Badge
                            key={nick}
                            className="bg-amber-500/15 text-amber-300 text-[10px] py-0 px-1.5 gap-1"
                          >
                            {nick}
                            <X
                              className="h-2.5 w-2.5 cursor-pointer"
                              onClick={() => setAllowedNicks((p) => p.filter((x) => x !== nick))}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Telegram */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-300">
                        Username @ Telegram
                      </Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="@handle..."
                          value={newTgInput}
                          onChange={(e) => setNewTgInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTelegram();
                            }
                          }}
                          className="bg-[#0a0b10] border-slate-700 text-white text-xs h-7 rounded"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddTelegram}
                          className="bg-sky-500 text-white font-bold text-xs h-7 px-2"
                        >
                          +
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {allowedTelegrams.map((tg) => (
                          <Badge
                            key={tg}
                            className="bg-sky-500/15 text-sky-300 text-[10px] py-0 px-1.5 gap-1"
                          >
                            {tg}
                            <X
                              className="h-2.5 w-2.5 cursor-pointer"
                              onClick={() => setAllowedTelegrams((p) => p.filter((x) => x !== tg))}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-200">
                  Descrizione & Requisiti del Bando
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Spiega i requisiti, orari minimi o cosa cerchi nel candidato..."
                  rows={3}
                  className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs resize-y"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="p-5 rounded-2xl bg-[#0e1017] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Domande del Modulo ({fields.length})
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={addField}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg h-7 gap-1"
              >
                <Plus className="h-3 w-3" /> Aggiungi Domanda
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <HelpCircle className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Nessuna domanda presente. Clicca su "Aggiungi Domanda".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="p-4 rounded-xl bg-[#12141c] border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <span className="text-xs font-bold text-amber-400">Domanda #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => moveField(idx, "up")}
                          className="h-6 w-6 text-slate-400 hover:text-white"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === fields.length - 1}
                          onClick={() => moveField(idx, "down")}
                          className="h-6 w-6 text-slate-400 hover:text-white"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(idx)}
                          className="h-6 w-6 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">Domanda *</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="Testo del quesito..."
                          className="bg-[#0a0b10] border-slate-800 text-white rounded-lg text-xs h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-300">Tipo</Label>
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
                          <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white rounded-lg text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                            <SelectItem value="text">✏️ Testo Breve</SelectItem>
                            <SelectItem value="textarea">📄 Testo Lungo</SelectItem>
                            <SelectItem value="radio">🔘 Radio Singola</SelectItem>
                            <SelectItem value="checkbox">☑️ Checkbox Multipla</SelectItem>
                            <SelectItem value="select">📑 Select Menu</SelectItem>
                            <SelectItem value="number">🔢 Numerico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-bold text-slate-400">
                          Suggerimento / Istruzioni
                        </Label>
                        <Input
                          value={field.description || ""}
                          onChange={(e) => updateField(idx, { description: e.target.value })}
                          placeholder="Opzionale..."
                          className="bg-[#0a0b10] border-slate-800 text-white rounded-lg text-xs h-7"
                        />
                      </div>

                      <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#0a0b10] border border-slate-800 self-end h-8">
                        <Label
                          htmlFor={`req-d-${idx}`}
                          className="text-[11px] font-bold text-slate-300 cursor-pointer"
                        >
                          Obbligatoria
                        </Label>
                        <Switch
                          id={`req-d-${idx}`}
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(idx, { required: checked })}
                          className="data-[state=checked]:bg-amber-500 scale-75"
                        />
                      </div>
                    </div>

                    {(field.type === "radio" ||
                      field.type === "checkbox" ||
                      field.type === "select") && (
                      <div className="p-3 rounded-lg bg-[#0a0b10] border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-amber-400">
                            Opzioni ({field.options?.length || 0})
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(idx)}
                            className="text-amber-400 hover:text-amber-300 text-[10px] h-6 px-1.5"
                          >
                            + Aggiungi
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {(field.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                className="bg-[#12141c] border-slate-800 text-white rounded text-xs h-7 flex-1"
                              />
                              {(field.options || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(idx, optIdx)}
                                  className="h-6 w-6 text-slate-500 hover:text-rose-400"
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
        <DialogFooter className="p-4 border-t border-slate-800 bg-[#10121a] flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs"
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 px-6 h-9"
          >
            {saveMutation.isPending ? "Salvataggio..." : form ? "Salva Modifiche" : "Crea Modulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
