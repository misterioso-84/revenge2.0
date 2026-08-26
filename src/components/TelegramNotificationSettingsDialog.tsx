import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Send,
  Sliders,
  Volume2,
  VolumeX,
  FileText,
  UserPlus,
  ArrowLeftRight,
  Calendar,
  UserCheck,
  CalendarDays,
  Banknote,
  ShieldAlert,
  Play,
  RotateCcw,
  PlusCircle,
  Crown,
  Clock,
  Ticket,
  Trophy,
  UserX,
  ShieldCheck,
  CheckSquare,
  UserMinus,
  Activity,
  Layers,
  Sparkles,
  Eye,
  Check,
  Pin,
  ClipboardList,
} from "lucide-react";
import {
  getTelegramNotificationRulesFn,
  saveAllTelegramNotificationRulesFn,
  testTelegramNotificationRuleFn,
  resetTelegramNotificationRulesFn,
} from "@/lib/telegram-groups.functions";

interface TelegramNotificationRule {
  id: string;
  section:
    | "candidature"
    | "cittadini"
    | "cassa"
    | "eventi"
    | "staff"
    | "congedi"
    | "stipendi"
    | "sicurezza"
    | "board";
  section_title: string;
  event_type: string;
  title: string;
  description: string;
  enabled: boolean;
  chat_id: string;
  custom_chat_id?: string;
  silent: boolean;
  min_amount_threshold?: number;
  template_override?: string;
  icon?: string;
}

interface TelegramGroup {
  id: string;
  chat_id: string | number;
  title: string;
  type?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: TelegramGroup[];
}

const SECTION_CONFIG = [
  { id: "all", label: "Tutte le Notifiche", icon: Layers, color: "text-amber-400" },
  { id: "candidature", label: "Candidature", icon: FileText, color: "text-blue-400" },
  { id: "cittadini", label: "Cittadini & VIP", icon: UserPlus, color: "text-emerald-400" },
  { id: "cassa", label: "Cassa & Economia", icon: ArrowLeftRight, color: "text-amber-400" },
  { id: "eventi", label: "Eventi & Tornei", icon: Calendar, color: "text-purple-400" },
  { id: "staff", label: "Staff & Ruoli", icon: UserCheck, color: "text-indigo-400" },
  { id: "congedi", label: "Ferie & Congedi", icon: CalendarDays, color: "text-orange-400" },
  { id: "stipendi", label: "Stipendi", icon: Banknote, color: "text-green-400" },
  { id: "sicurezza", label: "Sicurezza & Bot", icon: ShieldAlert, color: "text-rose-400" },
  { id: "board", label: "Board & Bacheca", icon: ClipboardList, color: "text-amber-400" },
];

export const TelegramNotificationSettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  groups,
}) => {
  const [rules, setRules] = useState<TelegramNotificationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "unassigned">(
    "all",
  );
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null);
  const [batchGroupId, setBatchGroupId] = useState<string>("");

  // Load rules when dialog opens
  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await getTelegramNotificationRulesFn();
      if (res && res.rules) {
        setRules(res.rules);
      }
    } catch (err: any) {
      toast.error("Errore caricamento regole notifiche: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
  };

  const handleGroupChange = (ruleId: string, chatId: string) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, chat_id: chatId } : r)));
  };

  const handleSilentToggle = (ruleId: string, silent: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, silent } : r)));
  };

  const handleThresholdChange = (ruleId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, min_amount_threshold: num } : r)),
    );
  };

  // Batch action: Apply group to all rules in current section
  const handleBatchAssignGroup = () => {
    if (!batchGroupId) {
      toast.warning("Seleziona prima un gruppo Telegram dal menu a tendina.");
      return;
    }

    setRules((prev) =>
      prev.map((r) => {
        if (activeSection === "all" || r.section === activeSection) {
          return { ...r, chat_id: batchGroupId };
        }
        return r;
      }),
    );

    const groupObj = groups.find((g) => String(g.chat_id) === batchGroupId);
    toast.success(
      `Gruppo "${groupObj?.title || batchGroupId}" assegnato a tutte le notifiche ${
        activeSection === "all" ? "dell'applicazione" : "della sezione"
      }. Ricordati di salvare!`,
    );
    setBatchGroupId("");
  };

  // Batch action: Enable all in section
  const handleBatchToggleAll = (enable: boolean) => {
    setRules((prev) =>
      prev.map((r) => {
        if (activeSection === "all" || r.section === activeSection) {
          return { ...r, enabled: enable };
        }
        return r;
      }),
    );
    toast.info(
      `${enable ? "Abilitate" : "Disabilitate"} tutte le notifiche ${
        activeSection === "all" ? "globali" : "della sezione"
      }.`,
    );
  };

  // Save all rules to database
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await saveAllTelegramNotificationRulesFn({ data: { rules } });
      toast.success("Impostazioni notifiche Telegram salvate con successo!");
    } catch (err: any) {
      toast.error("Errore salvataggio notifiche: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Reset to default settings
  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Sei sicuro di voler ripristinare tutte le notifiche ai valori predefiniti di fabbrica?",
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const res = await resetTelegramNotificationRulesFn();
      if (res && res.rules) {
        setRules(res.rules);
        toast.success("Regole notifiche ripristinate ai valori predefiniti.");
      }
    } catch (err: any) {
      toast.error("Errore reset notifiche: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Live test single notification
  const handleTestRule = async (rule: TelegramNotificationRule) => {
    const targetChat = rule.chat_id;
    if (!targetChat) {
      toast.warning("Seleziona prima un gruppo Telegram per questa notifica.");
      return;
    }

    try {
      setTestingRuleId(rule.id);
      const res = await testTelegramNotificationRuleFn({
        data: { ruleId: rule.id, targetChatId: targetChat },
      });

      if (res.success) {
        const grp = groups.find((g) => String(g.chat_id) === String(targetChat));
        toast.success(
          `Notifica di test inviata con successo al gruppo "${grp?.title || targetChat}"! Controlla Telegram.`,
        );
      } else {
        toast.error("Errore invio test: " + (res.error || "Impossibile inviare il messaggio."));
      }
    } catch (err: any) {
      toast.error("Errore test notifica: " + (err.message || String(err)));
    } finally {
      setTestingRuleId(null);
    }
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      // Section filter
      if (activeSection !== "all" && r.section !== activeSection) {
        return false;
      }
      // Status filter
      if (filterStatus === "active" && !r.enabled) return false;
      if (filterStatus === "inactive" && r.enabled) return false;
      if (filterStatus === "unassigned" && r.chat_id) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchSection = r.section_title.toLowerCase().includes(q);
        const matchEvent = r.event_type.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchSection || matchEvent;
      }
      return true;
    });
  }, [rules, activeSection, filterStatus, searchQuery]);

  // Summary counts
  const totalActive = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);
  const totalAssigned = useMemo(() => rules.filter((r) => !!r.chat_id).length, [rules]);

  // Render dynamic icon helper
  const renderRuleIcon = (eventType: string) => {
    switch (eventType) {
      case "candidature_new":
        return <FileText className="w-5 h-5 text-blue-400" />;
      case "candidature_evaluated":
        return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      case "candidature_second_chance":
        return <RotateCcw className="w-5 h-5 text-amber-400" />;
      case "candidature_form_published":
        return <PlusCircle className="w-5 h-5 text-cyan-400" />;
      case "citizen_created":
        return <UserPlus className="w-5 h-5 text-emerald-400" />;
      case "citizen_sanctioned":
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case "membership_activated":
        return <Crown className="w-5 h-5 text-amber-400" />;
      case "membership_expired_alert":
        return <Clock className="w-5 h-5 text-orange-400" />;
      case "conversion_completed":
        return <ArrowLeftRight className="w-5 h-5 text-amber-400" />;
      case "cassa_night_opened":
        return <Play className="w-5 h-5 text-emerald-400" />;
      case "cassa_night_closed":
        return <CheckCircle2 className="w-5 h-5 text-indigo-400" />;
      case "event_created":
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case "event_ticket_bought":
        return <Ticket className="w-5 h-5 text-pink-400" />;
      case "event_winner_announced":
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case "staff_hired":
        return <UserCheck className="w-5 h-5 text-green-400" />;
      case "staff_fired":
        return <UserX className="w-5 h-5 text-rose-400" />;
      case "staff_sanction":
        return <ShieldAlert className="w-5 h-5 text-orange-400" />;
      case "staff_role_promoted":
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
      case "leave_request_new":
        return <CalendarDays className="w-5 h-5 text-orange-400" />;
      case "leave_request_evaluated":
        return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      case "salary_paid":
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case "security_unauthorized_kick":
        return <UserMinus className="w-5 h-5 text-rose-500" />;
      case "system_daily_audit":
        return <Activity className="w-5 h-5 text-sky-400" />;
      case "board_task_assigned":
        return <CheckSquare className="w-5 h-5 text-amber-400" />;
      case "board_meeting_scheduled":
        return <CalendarDays className="w-5 h-5 text-indigo-400" />;
      case "board_announcement_pinned":
        return <Pin className="w-5 h-5 text-rose-400" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 bg-slate-950 border-slate-800 text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  Centro Notifiche Telegram per Sezione
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5"
                  >
                    Live Router
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-400 mt-1">
                  Seleziona quali eventi inviare su Telegram e assegna a ciascuna notifica il gruppo
                  dedicato.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-400">Attive:</span>
                <span className="font-bold text-emerald-400">
                  {totalActive} / {rules.length}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs flex items-center gap-2">
                <span className="text-slate-400">Gruppi Assegnati:</span>
                <span className="font-bold text-sky-400">{totalAssigned}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Section Navigation Tabs & Batch Controls */}
        <div className="border-b border-slate-800 bg-slate-900/30 px-6 py-3 space-y-3">
          {/* Section Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {SECTION_CONFIG.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeSection === sec.id;
              const count =
                sec.id === "all" ? rules.length : rules.filter((r) => r.section === sec.id).length;
              const activeCount =
                sec.id === "all"
                  ? rules.filter((r) => r.enabled).length
                  : rules.filter((r) => r.section === sec.id && r.enabled).length;

              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-700/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-slate-950" : sec.color}`} />
                  <span>{sec.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950 font-bold"
                        : "bg-slate-700/60 text-slate-400"
                    }`}
                  >
                    {activeCount}/{count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search, Filter & Quick Batch Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca evento, sezione o mansione..."
                className="pl-9 h-9 text-xs bg-slate-900 border-slate-700/80 text-slate-200 placeholder:text-slate-500 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Batch Assign Group Tool */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Assegna Gruppo a Sezione:
              </span>
              <Select value={batchGroupId} onValueChange={setBatchGroupId}>
                <SelectTrigger className="h-9 text-xs w-[190px] bg-slate-900 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Scegli gruppo..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.chat_id)} className="text-xs">
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchAssignGroup}
                disabled={!batchGroupId}
                className="h-9 text-xs bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              >
                Applica
              </Button>
            </div>

            {/* Batch Activate/Deactivate */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBatchToggleAll(true)}
                className="h-8 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Attiva Tutte
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBatchToggleAll(false)}
                className="h-8 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                ✕ Disattiva
              </Button>
            </div>
          </div>
        </div>

        {/* Rules List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 divide-y divide-slate-800/40">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm text-slate-400">Caricamento regole notifiche in corso...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
              <Bell className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Nessuna notifica trovata</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Nessuna regola corrisponde ai filtri impostati. Prova a reimpostare la ricerca.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSection("all");
                  setFilterStatus("all");
                }}
                className="mt-2 text-xs border-slate-700 bg-slate-800 text-slate-300"
              >
                Reimposta Filtri
              </Button>
            </div>
          ) : (
            filteredRules.map((rule) => {
              const isAssigned = !!rule.chat_id;
              const isTesting = testingRuleId === rule.id;
              const isPreviewing = previewRuleId === rule.id;
              const assignedGroup = groups.find((g) => String(g.chat_id) === String(rule.chat_id));

              return (
                <div
                  key={rule.id}
                  className={`pt-3.5 first:pt-0 p-4 rounded-xl border transition-all ${
                    rule.enabled
                      ? "bg-slate-900/50 border-slate-800 hover:border-slate-700/80 shadow-sm"
                      : "bg-slate-950/40 border-slate-900/80 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Event Meta & Description */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          rule.enabled
                            ? "bg-slate-800/80 border-slate-700 shadow-inner"
                            : "bg-slate-900 border-slate-800 text-slate-600"
                        }`}
                      >
                        {renderRuleIcon(rule.event_type)}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-100 tracking-tight">
                            {rule.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-slate-800/80 text-slate-400 border-slate-700/60 text-[10px] uppercase tracking-wider px-2 py-0.5"
                          >
                            {rule.section_title}
                          </Badge>
                          {rule.silent && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] flex items-center gap-1 px-1.5"
                            >
                              <VolumeX className="w-3 h-3" /> Silenziosa
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                          {rule.description}
                        </p>
                      </div>
                    </div>

                    {/* Routing Controls & Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {/* Target Group Selector */}
                      <div className="flex flex-col gap-1 min-w-[200px]">
                        <span className="text-[11px] text-slate-400 font-medium">
                          Gruppo Destinazione:
                        </span>
                        <Select
                          value={rule.chat_id || "unassigned"}
                          onValueChange={(val) =>
                            handleGroupChange(rule.id, val === "unassigned" ? "" : val)
                          }
                          disabled={!rule.enabled}
                        >
                          <SelectTrigger
                            className={`h-8 text-xs bg-slate-900 border transition-all ${
                              rule.chat_id
                                ? "border-emerald-500/40 text-emerald-300 font-medium"
                                : "border-amber-500/30 text-amber-400"
                            }`}
                          >
                            <SelectValue placeholder="Nessun gruppo assegnato" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <SelectItem
                              value="unassigned"
                              className="text-xs text-slate-400 italic"
                            >
                              -- Nessun Gruppo (Non Inviare) --
                            </SelectItem>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={String(g.chat_id)} className="text-xs">
                                👥 {g.title} ({g.chat_id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Threshold (if conversion) */}
                      {rule.event_type === "conversion_completed" && (
                        <div className="flex flex-col gap-1 w-24">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Soglia Min (€):
                          </span>
                          <Input
                            type="number"
                            min={0}
                            value={rule.min_amount_threshold || 0}
                            onChange={(e) => handleThresholdChange(rule.id, e.target.value)}
                            disabled={!rule.enabled}
                            className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-200"
                          />
                        </div>
                      )}

                      {/* Silent Mode Switch */}
                      <div className="flex items-center gap-1.5 pt-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={
                            rule.silent
                              ? "Modalità Silenziosa Attiva (Senza Notifica Sonora)"
                              : "Notifica Standard con Suono"
                          }
                          onClick={() => handleSilentToggle(rule.id, !rule.silent)}
                          className={`h-8 w-8 rounded-lg ${
                            rule.silent
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {rule.silent ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Preview Button */}
                      <div className="flex items-center pt-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Mostra Anteprima Layout Telegram"
                          onClick={() => setPreviewRuleId(isPreviewing ? null : rule.id)}
                          className={`h-8 w-8 rounded-lg ${
                            isPreviewing
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Live Test Button */}
                      <div className="flex items-center pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestRule(rule)}
                          disabled={!rule.chat_id || isTesting}
                          className="h-8 text-xs bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                        >
                          {isTesting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-amber-400" />
                          ) : (
                            <Send className="w-3.5 h-3.5 mr-1 text-sky-400" />
                          )}
                          Test Live
                        </Button>
                      </div>

                      {/* Enable/Disable Master Switch */}
                      <div className="flex flex-col items-center gap-1 pl-2 border-l border-slate-800 pt-1">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {rule.enabled ? "Attiva" : "Spenta"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telegram Message Live Preview Drawer */}
                  {isPreviewing && (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950 border border-sky-500/30 text-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between text-xs text-sky-400 border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Sparkles className="w-3.5 h-3.5" /> Anteprima Messaggio Telegram
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Destinatario: {assignedGroup?.title || "Nessun gruppo assegnato"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#17212b] rounded-lg border border-[#2b5278]/40 font-sans text-xs text-white leading-relaxed whitespace-pre-wrap shadow-inner">
                        {rule.event_type === "candidature_new" && (
                          <>
                            📋 <b>NUOVA CANDIDATURA STAFF RICEVUTA</b>
                            <br />
                            <br />
                            👤 <b>Candidato:</b> <code>Marco_Rossi</code>
                            <br />
                            📌 <b>Bando / Ruolo:</b> <b>Staff Dealer & Sicurezza</b>
                            <br />
                            💬 <b>Telegram:</b> @marcorossi_tg
                            <br />
                            🆔 <b>Codice Cittadino:</b> #REV-8924
                            <br />
                            📝 <b>Sintesi Risposte:</b>
                            <br />
                            <i>
                              Disponibilità serale 4 giorni a settimana, esperienza pregressa come
                              croupier.
                            </i>
                            <br />
                            <br />
                            ⏱️ <i>Inviata oggi alle 21:30 • Casinò Revenge System</i>
                          </>
                        )}
                        {rule.event_type === "candidature_evaluated" && (
                          <>
                            ⚖️ <b>ESITO CANDIDATURA STAFF REGISTRATO</b>
                            <br />
                            <br />
                            👤 <b>Candidato:</b> <code>Marco_Rossi</code>
                            <br />
                            📌 <b>Bando:</b> <b>Staff Dealer & Sicurezza</b>
                            <br />
                            🏷️ <b>Esito:</b> <b>✅ APPROVATA</b>
                            <br />
                            👨‍⚖️ <b>Valutato da:</b> Direzione
                            <br />
                            💬 <b>Motivazione:</b> <i>Ottimo profilo e disponibilità confermata.</i>
                            <br />
                            <br />
                            ⏱️ <i>Registrato il 23/08/2026 alle 21:35</i>
                          </>
                        )}
                        {rule.event_type === "conversion_completed" && (
                          <>
                            💱 <b>TRANSAZIONE DI CASSA REGISTRATA</b>
                            <br />
                            <br />
                            🔄 <b>Operazione:</b> <b>💶 Euro ➔ 🪙 Dobloni</b>
                            <br />
                            💵 <b>Controvalore Euro:</b> € 500
                            <br />
                            🪙 <b>Controvalore Dobloni:</b> 🪙 50
                            <br />
                            👤 <b>Cliente:</b> Francesco Totti
                            <br />
                            💼 <b>Operatore Cassa:</b> Cassiere Turno 1<br />
                            <br />
                            ⏱️ <i>Registrata il 23/08/2026 alle 21:40</i>
                          </>
                        )}
                        {rule.event_type === "citizen_sanctioned" && (
                          <>
                            ⚠️ <b>SANZIONE DISCIPLINARE EMESSA</b>
                            <br />
                            <br />
                            👤 <b>Destinatario:</b> <b>Giuseppe Verdi</b>
                            <br />
                            🛑 <b>Tipologia:</b> <code>Allontanamento 7 Giorni</code>
                            <br />
                            📜 <b>Motivazione:</b> <i>Comportamento scorretto al tavolo roulette</i>
                            <br />
                            👮‍♂️ <b>Emessa da:</b> Capo Sicurezza
                            <br />
                            <br />
                            ⏱️ <i>Provvedimento protocollato il 23/08/2026</i>
                          </>
                        )}
                        {![
                          "candidature_new",
                          "candidature_evaluated",
                          "conversion_completed",
                          "citizen_sanctioned",
                        ].includes(rule.event_type) && (
                          <>
                            🔔 <b>{rule.title.toUpperCase()}</b>
                            <br />
                            <br />
                            {rule.description}
                            <br />
                            <br />
                            ⏱️{" "}
                            <i>Notifica automatica in tempo reale dal portale del Casinò Revenge</i>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetDefaults}
              disabled={loading || saving}
              className="text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/40"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Ripristina Predefiniti
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadRules}
              disabled={loading || saving}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Ricarica
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Chiudi
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={loading || saving}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 shadow-md"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Salvataggio in corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Salva Modifiche Notifiche
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
