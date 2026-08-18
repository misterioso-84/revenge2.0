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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
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
  FileEdit,
  CalendarDays,
  ShieldAlert,
  Send,
  User,
  ShieldCheck,
  X,
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
  const [cooldownDays, setCooldownDays] = useState<number | "">("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">("");
  const [resetTimestamp, setResetTimestamp] = useState<string>("");
  const [fields, setFields] = useState<ApplicationFormField[]>([]);
  const [, setHasDraftRestored] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Whitelist / Access control state for private forms
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [allowedNicks, setAllowedNicks] = useState<string[]>([]);
  const [allowedTelegrams, setAllowedTelegrams] = useState<string[]>([]);
  const [newNickInput, setNewNickInput] = useState("");
  const [newTgInput, setNewTgInput] = useState("");
  const [newCustomRoleInput, setNewCustomRoleInput] = useState("");

  // Query custom roles to show quick toggles
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

  // Initialize or restore
  useEffect(() => {
    if (form) {
      setTitle(form.title || "");
      setDescription(form.description || "");
      setRoleTarget(form.role_target || "");
      setVisibility(form.visibility || "public");
      setStatus(form.status || "open");
      setCooldownDays(form.cooldown_days || "");
      setTimeLimitMinutes(form.time_limit_minutes || "");
      setResetTimestamp(form.reset_timestamp || "");
      setAllowedRoles(form.allowed_roles || []);
      setAllowedNicks(form.allowed_minecraft_nicknames || []);
      setAllowedTelegrams(form.allowed_telegram_handles || []);
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
            setAllowedRoles(parsed.allowedRoles || []);
            setAllowedNicks(parsed.allowedNicks || []);
            setAllowedTelegrams(parsed.allowedTelegrams || []);
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
        allowedRoles,
        allowedNicks,
        allowedTelegrams,
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
  }, [
    title,
    description,
    roleTarget,
    visibility,
    status,
    allowedRoles,
    allowedNicks,
    allowedTelegrams,
    fields,
    form,
  ]);

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
    setAllowedRoles([]);
    setAllowedNicks([]);
    setAllowedTelegrams([]);
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

  // Nickname whitelist handlers
  const handleAddNick = () => {
    if (!newNickInput.trim()) return;
    const parts = newNickInput
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const unique = Array.from(new Set([...allowedNicks, ...parts]));
    setAllowedNicks(unique);
    setNewNickInput("");
  };

  const handleRemoveNick = (nick: string) => {
    setAllowedNicks((prev) => prev.filter((n) => n.toLowerCase() !== nick.toLowerCase()));
  };

  // Telegram whitelist handlers
  const handleAddTelegram = () => {
    if (!newTgInput.trim()) return;
    const parts = newTgInput
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => (p.startsWith("@") ? p : `@${p}`));
    const unique = Array.from(new Set([...allowedTelegrams, ...parts]));
    setAllowedTelegrams(unique);
    setNewTgInput("");
  };

  const handleRemoveTelegram = (tg: string) => {
    setAllowedTelegrams((prev) => prev.filter((t) => t.toLowerCase() !== tg.toLowerCase()));
  };

  // Role whitelist handlers
  const toggleRole = (role: string) => {
    const formatted = role.trim();
    if (allowedRoles.some((r) => r.toLowerCase() === formatted.toLowerCase())) {
      setAllowedRoles((prev) => prev.filter((r) => r.toLowerCase() !== formatted.toLowerCase()));
    } else {
      setAllowedRoles((prev) => [...prev, formatted]);
    }
  };

  const handleAddCustomRole = () => {
    if (!newCustomRoleInput.trim()) return;
    toggleRole(newCustomRoleInput.trim());
    setNewCustomRoleInput("");
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
        cooldown_days: cooldownDays === "" ? null : Number(cooldownDays),
        time_limit_minutes: timeLimitMinutes === "" ? null : Number(timeLimitMinutes),
        reset_timestamp: resetTimestamp ? new Date(resetTimestamp).toISOString() : null,
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
      toast.success(
        form ? "Modulo aggiornato con successo!" : "Nuovo modulo pubblicato con successo!",
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
                : "Configura le domande, ruoli, permessi di accesso e visibilità"}
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
            {/* Quick role suggestion pills */}
            {(baseRoles.length > 0 || extrapexRoles.length > 0) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {baseRoles.map((r: any) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleTarget(r.name)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-all ${
                      roleTarget.toLowerCase() === r.name.toLowerCase()
                        ? "bg-amber-500 text-slate-950 font-black border-amber-400"
                        : "bg-[#141724] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
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
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                      roleTarget.toLowerCase() === r.name.toLowerCase()
                        ? "bg-purple-600 text-white font-bold border-purple-400"
                        : "bg-purple-950/20 text-purple-300 hover:text-purple-100 border-purple-800/30 hover:border-purple-700/50"
                    }`}
                  >
                    <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                    {r.name}
                  </button>
                ))}
              </div>
            )}
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

          {/* ========================================================================= */}
          {/* VISIBILITY SELECTOR (PUBLIC / INTERNAL STAFF / PRIVATE WHITELIST) */}
          {/* ========================================================================= */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-200">
              Visibilità & Permessi di Accesso
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Option 1: Public */}
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
                    Pubblico
                    {visibility === "public" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Aperto a tutti i cittadini registrati sul portale del Casinò.
                  </p>
                </div>
              </div>

              {/* Option 2: Internal Staff */}
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
                    Interno Staff
                    {visibility === "internal_staff" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Riservato esclusivamente a membri dello Staff & Amministratori.
                  </p>
                </div>
              </div>

              {/* Option 3: Private / Whitelist */}
              <div
                onClick={() => setVisibility("private")}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  visibility === "private"
                    ? "bg-rose-500/10 border-rose-500/50 text-white shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/30"
                    : "bg-[#0e1017] border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <ShieldAlert
                  className={`h-5 w-5 mt-0.5 shrink-0 ${visibility === "private" ? "text-rose-400" : "text-slate-500"}`}
                />
                <div className="space-y-1">
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    Privato / Whitelist
                    {visibility === "private" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Accesso ristretto per Ruoli, Nickname Minecraft o @ Telegram specifici.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRIVATE WHITELIST CONFIGURATION PANEL */}
          {/* ========================================================================= */}
          {visibility === "private" && (
            <div className="sm:col-span-2 p-5 rounded-2xl border border-rose-500/30 bg-[#0e1017] shadow-xl space-y-5">
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Configurazione Whitelist & Destinatari Autorizzati
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Solo gli utenti che soddisfano <strong>almeno uno</strong> dei seguenti criteri
                    (Ruolo, Nickname o Telegram) potranno visualizzare e compilare il modulo.
                  </p>
                </div>

                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] font-bold">
                  {allowedRoles.length} Ruoli • {allowedNicks.length} Nick MC •{" "}
                  {allowedTelegrams.length} Telegram
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. ALLOWED ROLES */}
                <div className="space-y-3 p-3.5 rounded-xl bg-[#12141c] border border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
                      1. Ruoli & Extrapex Autorizzati
                    </Label>
                    <Badge className="bg-rose-500/15 text-rose-300 text-[10px] py-0 px-1.5 border-rose-500/30">
                      {allowedRoles.length} selezionati
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Seleziona ruoli base o reparti extrapex autorizzati ad accedere al bando:
                  </p>

                  {/* Section A: Ruoli Base */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Ruoli Base del Gestionale:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["admin", "staff"].map((r) => {
                        const isSelected = allowedRoles.some((role) => role.toLowerCase() === r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRole(r)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-rose-500 text-white border-rose-400 shadow-sm"
                                : "bg-[#0a0b10] text-slate-400 border-slate-850 hover:text-slate-200"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {r}
                          </button>
                        );
                      })}

                      {baseRoles.map((cr: any) => {
                        const isSelected = allowedRoles.some(
                          (role) =>
                            role.toLowerCase() === cr.name.toLowerCase() ||
                            role.toLowerCase() === cr.id.toLowerCase(),
                        );
                        return (
                          <button
                            key={cr.id}
                            type="button"
                            onClick={() => toggleRole(cr.name)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-rose-500 text-white border-rose-400 shadow-sm"
                                : "bg-[#0a0b10] text-amber-300/90 border-amber-500/20 hover:text-amber-200 hover:border-amber-500/40"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {cr.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Reparti & Extrapex */}
                  {extrapexRoles.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        Reparti & Extrapex:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {extrapexRoles.map((er: any) => {
                          const isSelected = allowedRoles.some(
                            (role) =>
                              role.toLowerCase() === er.name.toLowerCase() ||
                              role.toLowerCase() === er.id.toLowerCase(),
                          );
                          return (
                            <button
                              key={er.id}
                              type="button"
                              onClick={() => toggleRole(er.name)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/20"
                                  : "bg-purple-950/20 text-purple-300 border-purple-800/30 hover:text-purple-100 hover:border-purple-700/50"
                              }`}
                            >
                              {isSelected ? "✓ " : "+ "}
                              {er.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Roles Badges Summary */}
                  {allowedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5 max-h-24 overflow-y-auto">
                      {allowedRoles.map((r) => (
                        <Badge
                          key={r}
                          className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] py-0 px-2 gap-1 rounded-md"
                        >
                          {r}
                          <X
                            className="h-2.5 w-2.5 cursor-pointer hover:text-white"
                            onClick={() => toggleRole(r)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Manual role input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Input
                      placeholder="Altro ruolo..."
                      value={newCustomRoleInput}
                      onChange={(e) => setNewCustomRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomRole();
                        }
                      }}
                      className="bg-[#0a0b10] border-slate-700 text-white text-xs h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomRole}
                      className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs h-8 px-2.5 rounded-lg shrink-0"
                    >
                      Aggiungi
                    </Button>
                  </div>
                </div>

                {/* 2. ALLOWED MINECRAFT NICKNAMES */}
                <div className="space-y-2.5 p-3.5 rounded-xl bg-[#12141c] border border-slate-800">
                  <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-amber-400" />
                    2. Nickname Minecraft
                  </Label>
                  <p className="text-[10px] text-slate-400">
                    Aggiungi i nickname Minecraft autorizzati:
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Es: Steve, Notch (anche separati da virgole)"
                      value={newNickInput}
                      onChange={(e) => setNewNickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNick();
                        }
                      }}
                      className="bg-[#0a0b10] border-slate-700 text-white text-xs h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNick}
                      className="bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold text-xs h-8 px-2.5 rounded-lg shrink-0"
                    >
                      +
                    </Button>
                  </div>

                  {/* Nicknames chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {allowedNicks.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">
                        Nessun nickname specificato
                      </span>
                    ) : (
                      allowedNicks.map((nick) => (
                        <Badge
                          key={nick}
                          className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono py-0.5 px-2 gap-1.5"
                        >
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(nick)}/16`}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span>{nick}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNick(nick)}
                            className="text-slate-400 hover:text-rose-400 ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. ALLOWED TELEGRAM HANDLES */}
                <div className="space-y-2.5 p-3.5 rounded-xl bg-[#12141c] border border-slate-800">
                  <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-sky-400" />
                    3. Account @ Telegram
                  </Label>
                  <p className="text-[10px] text-slate-400">
                    Aggiungi gli username Telegram autorizzati:
                  </p>

                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Es: @mario, @beppemonti"
                      value={newTgInput}
                      onChange={(e) => setNewTgInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTelegram();
                        }
                      }}
                      className="bg-[#0a0b10] border-slate-700 text-white text-xs h-8 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddTelegram}
                      className="bg-sky-500 text-white hover:bg-sky-600 font-bold text-xs h-8 px-2.5 rounded-lg shrink-0"
                    >
                      +
                    </Button>
                  </div>

                  {/* Telegram chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {allowedTelegrams.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">
                        Nessun username Telegram specificato
                      </span>
                    ) : (
                      allowedTelegrams.map((tg) => (
                        <Badge
                          key={tg}
                          className="bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-mono py-0.5 px-2 gap-1.5"
                        >
                          <Send className="h-3 w-3 text-sky-400 shrink-0" />
                          <span>{tg}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTelegram(tg)}
                            className="text-slate-400 hover:text-rose-400 ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Limits & Rules Settings */}
          <div className="space-y-4 sm:col-span-2 pt-2 pb-2 border-t border-slate-800/50 mt-4">
            <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Impostazioni Limiti & Regole
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-800 bg-[#0e1017]">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200">
                  Cooldown dopo Rifiuto (Giorni)
                </Label>
                <Input
                  type="number"
                  placeholder="Es. 7 (oppure 0 / vuoto)"
                  value={cooldownDays}
                  onChange={(e) =>
                    setCooldownDays(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="bg-[#12141c] border-slate-800 text-white text-xs h-9"
                  min="0"
                />
                <p className="text-[10px] text-slate-500">
                  Giorni di attesa automatica dopo un rifiuto (se 0 o vuoto, serve l'autorizzazione
                  dello Staff o l'azzeramento globale).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200">
                  Limite Tempo per Rispondere (Minuti)
                </Label>
                <Input
                  type="number"
                  placeholder="Es. 30 (opzionale)"
                  value={timeLimitMinutes}
                  onChange={(e) =>
                    setTimeLimitMinutes(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="bg-[#12141c] border-slate-800 text-white text-xs h-9"
                  min="1"
                />
                <p className="text-[10px] text-slate-500">
                  Tempo massimo a cronometro per completare e inviare il modulo (richiede conferma
                  di avvio).
                </p>
              </div>

              <div className="sm:col-span-2 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <Label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Azzeramento Cooldown Globale (Nuova Sessione)
                    </Label>
                    <p className="text-[11px] text-slate-400">
                      Permette a tutti gli utenti che hanno già inviato una candidatura in passato
                      di poterne inviare subito una nuova.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {resetTimestamp ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetTimestamp(new Date().toISOString());
                            toast.success(
                              "Cooldown azzerato a questo momento! Nuova sessione attiva.",
                            );
                          }}
                          className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl text-xs h-8 gap-1.5"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Azzera di Nuovo Adesso
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetTimestamp("");
                            toast.info("Azzeramento globale rimosso");
                          }}
                          className="border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs h-8"
                        >
                          Rimuovi
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetTimestamp(new Date().toISOString());
                          toast.success(
                            "Cooldown azzerato! Tutti i candidati possono ora reinviare.",
                          );
                        }}
                        className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs h-8 gap-1.5 font-bold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Azzera Cooldown per Tutti
                      </Button>
                    )}
                  </div>
                </div>

                {resetTimestamp && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Azzeramento attivo registrato il:{" "}
                      <strong>{formatDateTime(resetTimestamp)}</strong>. Tutte le candidature
                      antecedenti non bloccheranno i nuovi invii.
                    </span>
                  </div>
                )}
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
                    <Label className="text-xs font-bold text-slate-300">
                      Istruzioni / Suggerimento per il candidato (Opzionale)
                    </Label>
                    <Input
                      value={field.description || ""}
                      onChange={(e) => updateField(idx, { description: e.target.value })}
                      placeholder="Es: Minimo 2 frasi, elenca eventuali server o ruoli ricoperti in passato..."
                      className="bg-[#12141c] border-slate-800 text-white rounded-xl text-xs h-9"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#12141c] border border-slate-800 self-end h-10">
                    <Label
                      htmlFor={`req-${idx}`}
                      className="text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      Obbligatoria *
                    </Label>
                    <Switch
                      id={`req-${idx}`}
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(idx, { required: checked })}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </div>

                {/* Options Editor for Choice Types */}
                {(field.type === "radio" ||
                  field.type === "checkbox" ||
                  field.type === "select") && (
                  <div className="p-4 rounded-xl bg-[#12141c] border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-amber-400">
                        Opzioni di Risposta ({field.options?.length || 0})
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(idx)}
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-7 gap-1"
                      >
                        <Plus className="h-3 w-3" /> Aggiungi Opzione
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 w-5">
                            {optIdx + 1}.
                          </span>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                            placeholder={`Opzione ${optIdx + 1}`}
                            className="bg-[#0a0b10] border-slate-800 text-white rounded-xl text-xs h-8 flex-1"
                          />
                          {(field.options || []).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(idx, optIdx)}
                              className="h-7 w-7 text-slate-500 hover:text-rose-400"
                              title="Rimuovi opzione"
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

      {/* Bottom Floating Save Trigger */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs"
        >
          Annulla Modifiche
        </Button>

        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/20 px-8 h-10 gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending
            ? "Salvataggio..."
            : form
              ? "Salva Modifiche al Modulo"
              : "Pubblica Modulo"}
        </Button>
      </div>
    </div>
  );
}
