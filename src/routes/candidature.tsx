import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteFooter } from "@/components/Footer";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatDate, formatDateTime } from "@/lib/format";
import { ApplicationForm, ApplicationSubmission } from "@/components/candidature/types";
import { SubmitApplicationDialog } from "@/components/candidature/SubmitApplicationDialog";
import { ReviewApplicationDialog } from "@/components/candidature/ReviewApplicationDialog";
import { FormBuilderDialog } from "@/components/candidature/FormBuilderDialog";
import { FormBuilderView } from "@/components/candidature/FormBuilderView";
import { ViewAnswersDialog } from "@/components/candidature/ViewAnswersDialog";
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Lock,
  Globe,
  Sparkles,
  FileText,
  Layers,
  Award,
  Trash2,
  Pencil,
  Copy,
  Check,
  User,
  ShieldCheck,
  History,
  Eye,
  AlertCircle,
  HelpCircle,
  FileEdit,
} from "lucide-react";

export const Route = createFileRoute("/candidature")({
  component: CandidaturePage,
});

function CandidaturePage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    isAdmin,
    permissions = [],
    customRoleNames = [],
    hasEmployeeAccess,
  } = useAuth();
  const qc = useQueryClient();

  // Determine if user has staff permissions or review rights
  const isStaff =
    isAdmin ||
    permissions.length > 0 ||
    customRoleNames.length > 0 ||
    !!profile?.show_in_staff_list;

  const canManageForms = isAdmin || permissions.includes("candidature.gestisci");

  const canReview =
    isAdmin ||
    permissions.includes("candidature.gestisci") ||
    permissions.includes("candidature.visualizza");

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    "available" | "my-submissions" | "evaluations" | "manage-forms"
  >("available");

  // Page view mode for Form Builder (persistent, full page)
  const [isBuildingForm, setIsBuildingForm] = useState(false);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  // Dialog states
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedFormToSubmit, setSelectedFormToSubmit] = useState<ApplicationForm | null>(null);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAppToReview, setSelectedAppToReview] = useState<ApplicationSubmission | null>(
    null,
  );

  const [viewAnswersOpen, setViewAnswersOpen] = useState(false);
  const [selectedAppToView, setSelectedAppToView] = useState<ApplicationSubmission | null>(null);

  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<ApplicationForm | null>(null);

  const [deleteFormConfirm, setDeleteFormConfirm] = useState<{
    isOpen: boolean;
    formId: string | null;
    title: string;
  }>({ isOpen: false, formId: null, title: "" });

  const [copiedNick, setCopiedNick] = useState<string | null>(null);

  // Check if draft exists in localStorage on mount and when tab changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("casino_form_builder_persistent_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.title || (parsed.fields && parsed.fields.length > 0))) {
          setHasUnsavedDraft(true);
        } else {
          setHasUnsavedDraft(false);
        }
      } else {
        setHasUnsavedDraft(false);
      }
    } catch {
      setHasUnsavedDraft(false);
    }
  }, [isBuildingForm, activeTab]);

  // Filters for Evaluations tab
  const [evalSearch, setEvalSearch] = useState("");
  const [evalFormFilter, setEvalFormFilter] = useState("all");
  const [evalStatusFilter, setEvalStatusFilter] = useState("all");
  const [evalVisibilityFilter, setEvalVisibilityFilter] = useState("all");

  // Fetch all citizens for nickname and identity resolution
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("citizens").select("*");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch all application forms
  const { data: forms = [], isLoading: isLoadingForms } = useQuery({
    queryKey: ["application_forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ApplicationForm[];
    },
  });

  // Fetch user's own submissions
  const { data: mySubmissions = [], isLoading: isLoadingMySubs } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, application_forms(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ApplicationSubmission[];
    },
    enabled: !!user?.id,
  });

  // Fetch all submissions (for staff evaluation tab)
  const { data: allApplications = [], isLoading: isLoadingAllApps } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, application_forms(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ApplicationSubmission[];
    },
    enabled: canReview,
  });

  // Match current user's citizen record
  const myCitizen = useMemo(() => {
    const userNick = (profile?.username || user?.user_metadata?.username || "")
      .trim()
      .toLowerCase();
    const userDisplay = (profile?.display_name || user?.user_metadata?.display_name || "")
      .trim()
      .toLowerCase();

    if (!userNick && !userDisplay) return null;
    return citizens.find(
      (c) =>
        (c.nickname && c.nickname.trim().toLowerCase() === userNick) ||
        (c.full_name && c.full_name.trim().toLowerCase() === userDisplay),
    );
  }, [citizens, profile, user]);

  // Map of form ID -> my submission
  const mySubmissionsMap = useMemo(() => {
    const map = new Map<string, ApplicationSubmission>();
    mySubmissions.forEach((sub) => {
      map.set(sub.form_id, sub);
    });
    return map;
  }, [mySubmissions]);

  // Filter available forms based on user role (show internal only to staff)
  const availableForms = useMemo(() => {
    return forms.filter((f) => {
      if (f.visibility === "internal_staff" && !isStaff) return false;
      return true;
    });
  }, [forms, isStaff]);

  // Filter evaluations list
  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      // Visibility filter
      const matchedForm = forms.find((f) => f.id === app.form_id) || app.application_forms;
      if (evalVisibilityFilter !== "all") {
        if (matchedForm?.visibility !== evalVisibilityFilter) return false;
      }

      // Form filter
      if (evalFormFilter !== "all" && app.form_id !== evalFormFilter) {
        return false;
      }

      // Status filter
      if (evalStatusFilter !== "all" && app.status !== evalStatusFilter) {
        return false;
      }

      // Search filter
      if (evalSearch.trim()) {
        const s = evalSearch.trim().toLowerCase();
        const nick = (app.applicant_nickname || "").toLowerCase();
        const name = (app.applicant_name || "").toLowerCase();
        const discord = (app.applicant_discord || "").toLowerCase();
        const formTitle = (matchedForm?.title || "").toLowerCase();
        if (
          !nick.includes(s) &&
          !name.includes(s) &&
          !discord.includes(s) &&
          !formTitle.includes(s)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allApplications, forms, evalFormFilter, evalStatusFilter, evalVisibilityFilter, evalSearch]);

  // Statistics counters
  const pendingReviewsCount = useMemo(() => {
    return allApplications.filter((a) => a.status === "pending" || a.status === "under_review")
      .length;
  }, [allApplications]);

  const copyNickname = (nick: string) => {
    navigator.clipboard.writeText(nick);
    setCopiedNick(nick);
    toast.success("Nickname copiato!");
    setTimeout(() => setCopiedNick(null), 2000);
  };

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase.from("application_forms").delete().eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modulo eliminato con successo");
      qc.invalidateQueries({ queryKey: ["application_forms"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante l'eliminazione del modulo");
    },
  });

  // Toggle form open/closed mutation
  const toggleFormStatusMutation = useMutation({
    mutationFn: async ({ formId, newStatus }: { formId: string; newStatus: "open" | "closed" }) => {
      const { error } = await supabase
        .from("application_forms")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", formId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stato del modulo aggiornato");
      qc.invalidateQueries({ queryKey: ["application_forms"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Errore durante l'aggiornamento dello stato");
    },
  });

  if (isBuildingForm) {
    return (
      <div className="space-y-8 py-2">
        <FormBuilderView
          form={editingForm}
          onClose={() => {
            setIsBuildingForm(false);
            setEditingForm(null);
          }}
          currentUserId={user?.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      <div>
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/20 px-4 lg:px-8 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                ♠
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                  Casinò Revenge
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                  Liberty Bay • Lavora con noi
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Link to="/" className="hover:text-amber-400 transition-colors">
                Home & Guida
              </Link>
              <Link
                to="/scheda-cittadino"
                className="hover:text-amber-400 transition-colors text-amber-300 font-bold"
              >
                Scheda Cittadino
              </Link>
              <Link to="/ciurma" className="hover:text-amber-400 transition-colors">
                La Ciurma
              </Link>
              <Link
                to="/candidature"
                className="text-amber-400 font-bold border-b border-amber-500 pb-0.5"
              >
                Candidature
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <UserProfileDropdown />
              ) : (
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4"
                  onClick={() => navigate({ to: "/" })}
                >
                  Accedi / Registrati
                </Button>
              )}
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="space-y-8 py-2">
            {/* Title Section (Roleplay Theme) */}
            <div className="text-center space-y-2 pt-2">
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
                GESTIONALE ROLEPLAY
              </h1>

              {/* Diamond Divider Symbol */}
              <div className="flex items-center justify-center gap-2 my-2">
                <div className="h-[1px] w-12 bg-amber-500/40" />
                <span className="text-amber-400 text-xs font-bold">◆</span>
                <div className="h-[1px] w-12 bg-amber-500/40" />
              </div>

              <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-wider font-medium">
                CANDIDATURE STAFF, CONCORSI INTERNI E SELEZIONE PERSONALE CASINÒ
              </p>
            </div>

            {/* Unsaved Draft Banner */}
            {hasUnsavedDraft && (
              <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 text-xs shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <FileEdit className="h-4 w-4" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold text-sm">
                      Hai una bozza di modulo in lavorazione
                    </strong>
                    <span className="text-slate-400 text-xs">
                      I dati del questionario sono salvati in automatico. Puoi riprendere l'editing
                      in qualsiasi momento!
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingForm(null);
                      setIsBuildingForm(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-9 rounded-xl px-4 shadow-md shadow-amber-500/20"
                  >
                    Riprendi Bozza Modulo
                  </Button>
                </div>
              </div>
            )}

            {/* Main Mode Navigation Bar */}
            <div className="flex items-center justify-center">
              <div className="bg-[#0e1017] p-1.5 rounded-2xl border border-slate-800/90 shadow-xl flex items-center gap-1.5 flex-wrap justify-center">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("available")}
                  className={`rounded-xl text-xs font-bold transition-all px-4 py-2 flex items-center gap-2 ${
                    activeTab === "available"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Bandi & Moduli Aperti
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("my-submissions")}
                  className={`rounded-xl text-xs font-bold transition-all px-4 py-2 flex items-center gap-2 ${
                    activeTab === "my-submissions"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <History className="h-4 w-4" />
                  Le Mie Candidature
                  {mySubmissions.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 font-mono ml-0.5">
                      {mySubmissions.length}
                    </Badge>
                  )}
                </Button>

                {canReview && (
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("evaluations")}
                    className={`rounded-xl text-xs font-bold transition-all px-4 py-2 flex items-center gap-2 ${
                      activeTab === "evaluations"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Award className="h-4 w-4" />
                    Valutazione Candidature
                    {pendingReviewsCount > 0 && (
                      <Badge className="bg-rose-500 text-white font-black text-[10px] px-1.5 py-0 h-4 font-mono ml-0.5 animate-pulse">
                        {pendingReviewsCount}
                      </Badge>
                    )}
                  </Button>
                )}

                {canManageForms && (
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("manage-forms")}
                    className={`rounded-xl text-xs font-bold transition-all px-4 py-2 flex items-center gap-2 ${
                      activeTab === "manage-forms"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    Gestione Moduli
                  </Button>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: BANDI & MODULI APERTI */}
            {/* ========================================================================= */}
            {activeTab === "available" && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                        BANDI & SELEZIONI STAFF CASINÒ
                      </h2>
                      <p className="text-xs text-slate-400">
                        Seleziona il modulo per candidarti. Puoi inviare al massimo una candidatura
                        per ciascun bando.
                      </p>
                    </div>
                  </div>

                  {canManageForms && (
                    <Button
                      onClick={() => {
                        setEditingForm(null);
                        setFormBuilderOpen(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 gap-1.5 shrink-0 w-full sm:w-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crea Nuovo Modulo
                    </Button>
                  )}
                </div>

                {/* Forms Grid */}
                {isLoadingForms ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    Caricamento bandi e moduli in corso...
                  </div>
                ) : availableForms.length === 0 ? (
                  <div className="p-12 text-center bg-[#12141c] border border-slate-800 rounded-2xl space-y-3">
                    <HelpCircle className="h-10 w-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">
                      Nessun bando aperto al momento
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Attualmente non ci sono moduli attivi per nuove candidature. Controlla
                      regolarmente per nuove aperture.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {availableForms.map((formItem) => {
                      const existingSubmission = mySubmissionsMap.get(formItem.id);
                      const isOpen = formItem.status === "open";

                      return (
                        <Card
                          key={formItem.id}
                          className="bg-[#12141c] border-slate-800/90 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                        >
                          <div className="p-6 space-y-4">
                            {/* Top Badges */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {formItem.visibility === "internal_staff" ? (
                                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Bando Interno Staff
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Bando Pubblico
                                  </Badge>
                                )}

                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold uppercase ${
                                    isOpen
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  {isOpen ? "Aperto" : "Chiuso"}
                                </Badge>
                              </div>

                              <Badge
                                variant="outline"
                                className="border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase font-mono"
                              >
                                Ruolo: {formItem.role_target}
                              </Badge>
                            </div>

                            {/* Title & Description */}
                            <div className="space-y-1.5">
                              <h3 className="text-base md:text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                                {formItem.title}
                              </h3>
                              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                                {formItem.description}
                              </p>
                            </div>

                            {/* Questions count info */}
                            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80">
                              <span className="flex items-center gap-1 font-medium">
                                <FileText className="h-3.5 w-3.5 text-amber-500/70" />
                                {formItem.fields.length} domande previste
                              </span>
                              <span>Creato il {formatDate(formItem.created_at)}</span>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="p-4 bg-[#0a0b10] border-t border-slate-800 flex items-center justify-between gap-3">
                            {existingSubmission ? (
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`text-[11px] font-bold ${
                                      existingSubmission.status === "accepted"
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        : existingSubmission.status === "rejected"
                                          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    }`}
                                  >
                                    {existingSubmission.status === "accepted" &&
                                      "✓ Candidatura Accettata"}
                                    {existingSubmission.status === "rejected" &&
                                      "✕ Candidatura Rifiutata"}
                                    {existingSubmission.status === "under_review" &&
                                      "⏳ In Valutazione"}
                                    {existingSubmission.status === "pending" &&
                                      "⏳ Inviata (In Attesa)"}
                                  </Badge>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppToView(existingSubmission);
                                    setViewAnswersOpen(true);
                                  }}
                                  className="text-xs border-slate-800 text-slate-300 hover:text-white rounded-xl gap-1.5 h-8"
                                >
                                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                                  Vedi la tua Risposta
                                </Button>
                              </div>
                            ) : isOpen ? (
                              <div className="flex items-center justify-end w-full">
                                <Button
                                  onClick={() => {
                                    setSelectedFormToSubmit(formItem);
                                    setSubmitDialogOpen(true);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 gap-1.5 h-9 px-5 w-full sm:w-auto"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Compila Candidatura
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-slate-500 italic">
                                  Bando chiuso - candidature terminate
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: LE MIE CANDIDATURE (STORICO UTENTE) */}
            {/* ========================================================================= */}
            {activeTab === "my-submissions" && (
              <div className="space-y-6">
                <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                        LO STORICO DELLE TUE CANDIDATURE
                      </h2>
                      <p className="text-xs text-slate-400">
                        Riepilogo e stato in tempo reale di tutte le domande inviate per entrare
                        nello Staff del Casinò
                      </p>
                    </div>
                  </div>
                </div>

                {isLoadingMySubs ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    Caricamento candidature inviate...
                  </div>
                ) : mySubmissions.length === 0 ? (
                  <div className="p-12 text-center bg-[#12141c] border border-slate-800 rounded-2xl space-y-3">
                    <ClipboardList className="h-10 w-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">
                      Non hai ancora inviato nessuna candidatura
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Consulta i bandi aperti per inviare la tua domanda ed entrare a far parte
                      della squadra del Casinò Revenge.
                    </p>
                    <Button
                      onClick={() => setActiveTab("available")}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl mt-2"
                    >
                      Esplora i Bandi Aperti
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mySubmissions.map((sub) => {
                      const matchedForm =
                        forms.find((f) => f.id === sub.form_id) || sub.application_forms;

                      return (
                        <div
                          key={sub.id}
                          className="p-5 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl space-y-4 hover:border-slate-700 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-white">
                                  {matchedForm?.title || "Modulo Candidatura Staff"}
                                </h3>

                                {matchedForm?.visibility === "internal_staff" ? (
                                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px]">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Bando Interno
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Pubblico
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-slate-400">
                                Ruolo Target:{" "}
                                <strong className="text-amber-400">
                                  {matchedForm?.role_target || "Staff"}
                                </strong>{" "}
                                • Inviata il {formatDateTime(sub.created_at)}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <Badge
                                className={`text-xs font-bold px-3 py-1 uppercase tracking-wider ${
                                  sub.status === "accepted"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : sub.status === "rejected"
                                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                      : sub.status === "under_review"
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                        : "bg-slate-500/20 text-slate-300 border-slate-700"
                                }`}
                              >
                                {sub.status === "accepted" && (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                {sub.status === "rejected" && (
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                )}
                                {sub.status === "under_review" && (
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                )}
                                {sub.status === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
                                {sub.status === "accepted"
                                  ? "Accettata"
                                  : sub.status === "rejected"
                                    ? "Rifiutata"
                                    : sub.status === "under_review"
                                      ? "In Valutazione"
                                      : "In Attesa di Revisione"}
                              </Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppToView(sub);
                                  setViewAnswersOpen(true);
                                }}
                                className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs gap-1.5 h-9"
                              >
                                <Eye className="h-3.5 w-3.5 text-amber-400" />
                                Dettaglio Risposte
                              </Button>
                            </div>
                          </div>

                          {/* Feedback box if notes from reviewer exist */}
                          {sub.reviewer_notes && (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-200 space-y-1">
                              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                Note & Riscontro dello Staff:
                              </p>
                              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {sub.reviewer_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: VALUTAZIONE CANDIDATURE (STAFF & ADMIN) */}
            {/* ========================================================================= */}
            {canReview && activeTab === "evaluations" && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                        VALUTAZIONE & REVISIONE CANDIDATURE
                      </h2>
                      <p className="text-xs text-slate-400">
                        Esamina le risposte dei candidati, conduci i colloqui e accetta/rifiuta le
                        richieste
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold px-3 py-1">
                      {filteredApplications.length} candidature visualizzate
                    </Badge>
                  </div>
                </div>

                {/* Filters Bar */}
                <div className="p-4 rounded-2xl bg-[#12141c] border border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 shadow-lg">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="h-4 w-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={evalSearch}
                      onChange={(e) => setEvalSearch(e.target.value)}
                      placeholder="Cerca candidato, nick, discord..."
                      className="bg-[#0a0b10] border-slate-800 text-white pl-9 text-xs rounded-xl h-10"
                    />
                  </div>

                  {/* Form Filter */}
                  <div>
                    <Select value={evalFormFilter} onValueChange={(val) => setEvalFormFilter(val)}>
                      <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white text-xs rounded-xl h-10">
                        <SelectValue placeholder="Tutti i Moduli" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                        <SelectItem value="all">Tutti i Moduli / Bandi</SelectItem>
                        {forms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <Select
                      value={evalStatusFilter}
                      onValueChange={(val) => setEvalStatusFilter(val)}
                    >
                      <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white text-xs rounded-xl h-10">
                        <SelectValue placeholder="Tutti gli Stati" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                        <SelectItem value="all">Tutti gli Stati</SelectItem>
                        <SelectItem value="pending">🟡 In Attesa (Pending)</SelectItem>
                        <SelectItem value="under_review">🟠 In Valutazione</SelectItem>
                        <SelectItem value="accepted">🟢 Accettate (Approvate)</SelectItem>
                        <SelectItem value="rejected">🔴 Rifiutate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visibility Filter */}
                  <div>
                    <Select
                      value={evalVisibilityFilter}
                      onValueChange={(val) => setEvalVisibilityFilter(val)}
                    >
                      <SelectTrigger className="bg-[#0a0b10] border-slate-800 text-white text-xs rounded-xl h-10">
                        <SelectValue placeholder="Tutte le Visibilità" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12141c] border-slate-800 text-white text-xs">
                        <SelectItem value="all">Tutti i Bandi (Pubblici & Interni)</SelectItem>
                        <SelectItem value="public">🌐 Solo Bandi Pubblici</SelectItem>
                        <SelectItem value="internal_staff">🔒 Solo Bandi Interni Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submissions List */}
                {isLoadingAllApps ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    Caricamento candidature ricevute...
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="p-12 text-center bg-[#12141c] border border-slate-800 rounded-2xl space-y-2">
                    <ClipboardList className="h-10 w-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-300">
                      Nessuna candidatura trovata
                    </h3>
                    <p className="text-xs text-slate-500">
                      Non sono presenti candidature con i filtri di ricerca selezionati.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApplications.map((app) => {
                      const matchedForm =
                        forms.find((f) => f.id === app.form_id) || app.application_forms;
                      const nick = app.applicant_nickname || "Steve";

                      return (
                        <div
                          key={app.id}
                          className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                        >
                          {/* Candidate Identity */}
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                              <img
                                src={`https://mc-heads.net/avatar/${encodeURIComponent(nick)}/48`}
                                alt={nick}
                                className="h-11 w-11 rounded-xl border border-amber-500/40 bg-black/40 shadow"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-white">
                                  {app.applicant_name}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => copyNickname(nick)}
                                  className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors"
                                  title="Copia Nickname Minecraft"
                                >
                                  {copiedNick === nick ? (
                                    <>
                                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                                      <span className="text-emerald-400 text-[9px]">Copiato!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-2.5 w-2.5" />
                                      <span>{nick}</span>
                                    </>
                                  )}
                                </button>

                                {matchedForm?.visibility === "internal_staff" ? (
                                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px]">
                                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                                    Interno
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[9px]">
                                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                                    Pubblico
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                                <span>
                                  Bando:{" "}
                                  <strong className="text-slate-200">
                                    {matchedForm?.title || "Staff"}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Ruolo:{" "}
                                  <strong className="text-amber-400">
                                    {matchedForm?.role_target || "Staff"}
                                  </strong>
                                </span>
                              </p>

                              <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                                {app.applicant_discord && (
                                  <span className="text-indigo-400 font-medium">
                                    Discord: {app.applicant_discord}
                                  </span>
                                )}
                                <span>•</span>
                                <span>Inviata il {formatDateTime(app.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                            <Badge
                              className={`text-xs font-bold px-3 py-1 uppercase tracking-wider ${
                                app.status === "accepted"
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : app.status === "rejected"
                                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                    : app.status === "under_review"
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-slate-500/20 text-slate-300 border-slate-700"
                              }`}
                            >
                              {app.status === "accepted" && (
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              {app.status === "rejected" && (
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                              )}
                              {app.status === "under_review" && (
                                <Clock className="h-3.5 w-3.5 mr-1" />
                              )}
                              {app.status === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
                              {app.status === "accepted"
                                ? "Accettata"
                                : app.status === "rejected"
                                  ? "Rifiutata"
                                  : app.status === "under_review"
                                    ? "In Valutazione"
                                    : "In Attesa"}
                            </Badge>

                            <Button
                              onClick={() => {
                                setSelectedAppToReview(app);
                                setReviewDialogOpen(true);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 gap-1.5 h-9"
                            >
                              <Award className="h-3.5 w-3.5" />
                              Esamina & Valuta
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: GESTIONE MODULI (CREAZIONE E MODIFICA QUESTIONARI) */}
            {/* ========================================================================= */}
            {canManageForms && activeTab === "manage-forms" && (
              <div className="space-y-6">
                <div className="bg-[#12141c] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold uppercase text-white tracking-wider">
                        GESTIONE QUESTIONARI & MODULI CANDIDATURA
                      </h2>
                      <p className="text-xs text-slate-400">
                        Crea e configura i moduli di candidatura, personalizza le domande e gestisci
                        lo stato di apertura
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setEditingForm(null);
                      setIsBuildingForm(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 gap-1.5 shrink-0 w-full sm:w-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crea Nuovo Modulo
                  </Button>
                </div>

                {/* Forms Manager Table */}
                <div className="space-y-4">
                  {forms.map((f) => {
                    const subsForThisForm = allApplications.filter((a) => a.form_id === f.id);
                    const pendingCount = subsForThisForm.filter(
                      (a) => a.status === "pending" || a.status === "under_review",
                    ).length;
                    const acceptedCount = subsForThisForm.filter(
                      (a) => a.status === "accepted",
                    ).length;
                    const isOpen = f.status === "open";

                    return (
                      <div
                        key={f.id}
                        className="p-5 rounded-2xl bg-[#12141c] border border-slate-800/90 shadow-xl space-y-4 hover:border-slate-700 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-black text-white">{f.title}</h3>

                              {f.visibility === "internal_staff" ? (
                                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Interno Staff
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                                  <Globe className="h-3 w-3 mr-1" />
                                  Pubblico
                                </Badge>
                              )}

                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase ${
                                  isOpen
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                }`}
                              >
                                {isOpen ? "Aperto" : "Chiuso"}
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-400">{f.description}</p>

                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap font-medium">
                              <span>
                                Ruolo Target:{" "}
                                <strong className="text-amber-400">{f.role_target}</strong>
                              </span>
                              <span>•</span>
                              <span>{f.fields.length} domande</span>
                              <span>•</span>
                              <span className="text-emerald-400">{acceptedCount} approvate</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">
                                {pendingCount} in attesa
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleFormStatusMutation.mutate({
                                  formId: f.id,
                                  newStatus: isOpen ? "closed" : "open",
                                })
                              }
                              className={`text-xs rounded-xl h-9 font-bold ${
                                isOpen
                                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {isOpen ? "Chiudi Modulo" : "Riapri Modulo"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingForm(f);
                                setIsBuildingForm(true);
                              }}
                              className="border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs gap-1.5 h-9"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Modifica
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeleteFormConfirm({
                                  isOpen: true,
                                  formId: f.id,
                                  title: f.title,
                                });
                              }}
                              className="border-rose-900/30 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs h-9"
                              title="Elimina modulo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* DIALOGS */}
            {/* ========================================================================= */}

            {/* Submit Application Wizard Dialog */}
            <SubmitApplicationDialog
              form={selectedFormToSubmit}
              open={submitDialogOpen}
              onOpenChange={setSubmitDialogOpen}
              currentUser={user}
              currentProfile={profile}
              currentCitizen={myCitizen}
              onSubmitted={() => setActiveTab("my-submissions")}
            />

            {/* Review & Evaluate Application Dialog (Staff) */}
            <ReviewApplicationDialog
              application={selectedAppToReview}
              form={forms.find((f) => f.id === selectedAppToReview?.form_id)}
              open={reviewDialogOpen}
              onOpenChange={setReviewDialogOpen}
              currentUserId={user?.id}
              reviewerName={
                profile?.display_name || user?.user_metadata?.display_name || "Valutatore"
              }
            />

            {/* View Submitted Answers Dialog (Citizen) */}
            <ViewAnswersDialog
              application={selectedAppToView}
              form={forms.find((f) => f.id === selectedAppToView?.form_id)}
              open={viewAnswersOpen}
              onOpenChange={setViewAnswersOpen}
            />

            {/* Create / Edit Form Dialog (Admin & Managers) */}
            <FormBuilderDialog
              form={editingForm}
              open={formBuilderOpen}
              onOpenChange={setFormBuilderOpen}
              currentUserId={user?.id}
            />

            {/* Delete Form Confirmation */}
            <ConfirmDialog
              isOpen={deleteFormConfirm.isOpen}
              onClose={() => setDeleteFormConfirm({ isOpen: false, formId: null, title: "" })}
              onConfirm={() => {
                if (deleteFormConfirm.formId) {
                  deleteFormMutation.mutate(deleteFormConfirm.formId);
                }
              }}
              title="Elimina Modulo di Candidatura"
              description={`Sei sicuro di voler eliminare definitivamente il modulo "${deleteFormConfirm.title}"? Le relative candidature inviate rimarranno archiviate.`}
              confirmText="Elimina Definitivamente"
            />
          </div>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
