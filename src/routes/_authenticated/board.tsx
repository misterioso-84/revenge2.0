import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pin,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  FileText,
  User,
  Trash2,
  CalendarDays,
  CheckSquare,
  Crown,
  Coins,
  Shield,
  Lightbulb,
  FolderOpen,
  ChevronRight,
  MapPin,
  Users,
  Square,
  CheckSquare2,
  RefreshCw,
  ArrowLeft,
  Briefcase,
  Pencil,
  Lock,
  Unlock,
  Key,
  Folder,
  FolderPlus,
  Check,
  X,
  UserCheck,
  SlidersHorizontal,
  Layers,
  Send,
  HelpCircle,
  Tag,
  AlertCircle,
  Calendar,
  Eye,
  Edit3,
  Sun,
  BellRing,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBoardDataFn,
  createBoardCategoryFn,
  updateBoardCategoryFn,
  updateBoardCategoryPermissionsFn,
  deleteBoardCategoryFn,
  createBoardSubcategoryFn,
  updateBoardSubcategoryFn,
  updateBoardSubcategoryPermissionsFn,
  deleteBoardSubcategoryFn,
  createBoardItemFn,
  updateBoardItemFn,
  togglePinBoardItemFn,
  updateTaskStatusFn,
  deleteBoardItemFn,
  triggerTaskDueRemindersFn,
  triggerDailyTaskMorningBriefingFn,
  BoardCategory,
  BoardSubcategory,
  BoardItem,
  BoardChecklistItem,
  BoardCustomRole,
  BoardEmployee,
} from "@/lib/board.functions";

export const Route = createFileRoute("/_authenticated/board")({
  component: BoardPage,
});

const FOLDER_COLORS = [
  { label: "Ambra / Oro", value: "#f59e0b" },
  { label: "Blu Royal", value: "#3b82f6" },
  { label: "Smeraldo", value: "#10b981" },
  { label: "Viola Scuro", value: "#8b5cf6" },
  { label: "Cremisi", value: "#ef4444" },
  { label: "Ciano / Acqua", value: "#06b6d4" },
  { label: "Rosa Magenta", value: "#ec4899" },
  { label: "Grigio Ardesia", value: "#64748b" },
];

const FOLDER_ICONS: { name: string; label: string; icon: any }[] = [
  { name: "Folder", label: "Cartella Standard", icon: Folder },
  { name: "Crown", label: "Direzione", icon: Crown },
  { name: "Briefcase", label: "Amministrazione", icon: Briefcase },
  { name: "Coins", label: "Cassa & Finanze", icon: Coins },
  { name: "Shield", label: "Sicurezza & Regolamenti", icon: Shield },
  { name: "Sparkles", label: "Eventi & Serate", icon: Sparkles },
  { name: "FileText", label: "Documenti & Verbali", icon: FileText },
  { name: "CalendarDays", label: "Pianificazione", icon: CalendarDays },
  { name: "CheckSquare", label: "Task & Operazioni", icon: CheckSquare },
  { name: "Lightbulb", label: "Idee & Progetti", icon: Lightbulb },
];

function getIconComponent(iconName: string) {
  const found = FOLDER_ICONS.find((i) => i.name === iconName);
  return found ? found.icon : Folder;
}

export function BoardPage() {
  const queryClient = useQueryClient();

  // Navigation state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "note" | "task" | "meeting">("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Category Dialogs
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BoardCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "Folder",
    color: "#f59e0b",
    permission_mode: "public" as "public" | "restricted",
    allowed_roles: [] as string[],
    allowed_user_ids: [] as string[],
    publish_mode: "all_viewers" as "all_viewers" | "restricted",
    publish_roles: [] as string[],
    publish_user_ids: [] as string[],
  });

  // Delete Category Dialog
  const [categoryToDelete, setCategoryToDelete] = useState<BoardCategory | null>(null);

  // Permissions Dialog
  const [openPermissionsDialog, setOpenPermissionsDialog] = useState(false);
  const [permCategory, setPermCategory] = useState<BoardCategory | null>(null);
  const [permActiveTab, setPermActiveTab] = useState<"view" | "publish">("view");
  const [permViewMode, setPermViewMode] = useState<"public" | "restricted">("public");
  const [permViewRoles, setPermViewRoles] = useState<string[]>([]);
  const [permViewUserIds, setPermViewUserIds] = useState<string[]>([]);
  const [permPublishMode, setPermPublishMode] = useState<"all_viewers" | "restricted">(
    "all_viewers",
  );
  const [permPublishRoles, setPermPublishRoles] = useState<string[]>([]);
  const [permPublishUserIds, setPermPublishUserIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Subcategory Dialogs & Form
  const [openSubcategoryDialog, setOpenSubcategoryDialog] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<BoardSubcategory | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<BoardSubcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: "",
    name: "",
    description: "",
    icon: "Folder",
    color: "#3b82f6",
    permission_mode: "inherit" as "inherit" | "public" | "restricted",
    allowed_roles: [] as string[],
    allowed_user_ids: [] as string[],
    publish_mode: "inherit" as "inherit" | "all_viewers" | "restricted",
    publish_roles: [] as string[],
    publish_user_ids: [] as string[],
  });

  // Subcategory Permissions Dialog
  const [openSubPermissionsDialog, setOpenSubPermissionsDialog] = useState(false);
  const [permSubcategory, setPermSubcategory] = useState<BoardSubcategory | null>(null);
  const [subPermActiveTab, setSubPermActiveTab] = useState<"view" | "publish">("view");
  const [subPermViewMode, setSubPermViewMode] = useState<"inherit" | "public" | "restricted">(
    "inherit",
  );
  const [subPermViewRoles, setSubPermViewRoles] = useState<string[]>([]);
  const [subPermViewUserIds, setSubPermViewUserIds] = useState<string[]>([]);
  const [subPermPublishMode, setSubPermPublishMode] = useState<
    "inherit" | "all_viewers" | "restricted"
  >("inherit");
  const [subPermPublishRoles, setSubPermPublishRoles] = useState<string[]>([]);
  const [subPermPublishUserIds, setSubPermPublishUserIds] = useState<string[]>([]);

  // Item Dialogs
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BoardItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BoardItem | null>(null);
  const [itemForm, setItemForm] = useState({
    category_id: "",
    subcategory_id: "",
    type: "note" as "note" | "task" | "meeting",
    title: "",
    content: "",
    is_pinned: false,
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    tagsInput: "",

    // Task
    task_status: "todo" as "todo" | "in_progress" | "review" | "done",
    deadline: "",
    assigned_to_ids: [] as string[],
    checklist: [] as BoardChecklistItem[],
    newChecklistText: "",

    // Meeting
    meeting_date: "",
    meeting_location: "Discord / Sala Riunioni Staff",
    attendees_ids: [] as string[],
  });

  // Query board data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["boardData"],
    queryFn: () => getBoardDataFn(),
    staleTime: 1000 * 30,
  });

  const categories = useMemo(() => data?.categories || [], [data?.categories]);
  const subcategories = useMemo(() => data?.subcategories || [], [data?.subcategories]);
  const items = useMemo(() => data?.items || [], [data?.items]);
  const customRoles = useMemo(
    () => (data?.customRoles || []) as BoardCustomRole[],
    [data?.customRoles],
  );
  const staffMembers = useMemo(
    () => (data?.staffMembers || []) as BoardEmployee[],
    [data?.staffMembers],
  );
  const userContext = data?.userContext;

  const permissions = useMemo(() => new Set(userContext?.permissions || []), [userContext]);
  const isBoardAdmin = !!userContext?.isBoardAdmin || !!userContext?.isAdmin;

  // Selected Category & Subcategory objects
  const currentCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  const currentSubcategory = useMemo(
    () => subcategories.find((s) => s.id === selectedSubcategoryId) || null,
    [subcategories, selectedSubcategoryId],
  );

  // Subcategories belonging to current category
  const activeSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter((s) => s.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  // Determine user rights for current category
  const canPublishInCurrentCategory = useMemo(() => {
    if (!currentCategory) return false;
    return !!currentCategory.can_publish;
  }, [currentCategory]);

  const canManageCurrentCategory = useMemo(() => {
    if (!currentCategory) return false;
    return !!currentCategory.can_manage;
  }, [currentCategory]);

  const canDeleteCurrentCategory = useMemo(() => {
    if (!currentCategory) return false;
    return !!currentCategory.can_delete;
  }, [currentCategory]);

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (values: typeof categoryForm) => createBoardCategoryFn({ data: values }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenCategoryDialog(false);
      setSelectedCategoryId(res.category.id);
      setSelectedSubcategoryId(null);
      toast.success("Cartella creata con successo!");
    },
    onError: (err: any) => toast.error(err.message || "Errore nella creazione della cartella"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (values: typeof categoryForm & { id: string }) =>
      updateBoardCategoryFn({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenCategoryDialog(false);
      toast.success("Cartella modificata con successo!");
    },
    onError: (err: any) =>
      toast.error(err.message || "Errore durante l'aggiornamento della cartella"),
  });

  const updateCategoryPermissionsMutation = useMutation({
    mutationFn: (values: {
      category_id: string;
      permission_mode: "public" | "restricted";
      allowed_roles: string[];
      allowed_user_ids: string[];
      publish_mode: "all_viewers" | "restricted";
      publish_roles: string[];
      publish_user_ids: string[];
    }) => updateBoardCategoryPermissionsFn({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenPermissionsDialog(false);
      toast.success("Permessi e regole di pubblicazione aggiornati con successo!");
    },
    onError: (err: any) =>
      toast.error(err.message || "Errore durante l'aggiornamento dei permessi della cartella"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteBoardCategoryFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      if (selectedCategoryId === categoryToDelete?.id) {
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
      }
      setCategoryToDelete(null);
      toast.success("Cartella eliminata definitivamente!");
    },
    onError: (err: any) =>
      toast.error(err.message || "Errore durante l'eliminazione della cartella"),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: (values: typeof subcategoryForm) =>
      createBoardSubcategoryFn({
        data: values,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenSubcategoryDialog(false);
      setSelectedSubcategoryId(res.subcategory.id);
      toast.success("Sottocategoria aggiunta alla cartella!");
    },
    onError: (err: any) => toast.error(err.message || "Errore nella creazione della sottocategoria"),
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: (values: {
      id: string;
      name: string;
      description: string;
      icon: string;
      color: string;
    }) =>
      updateBoardSubcategoryFn({
        data: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenSubcategoryDialog(false);
      toast.success("Sottocategoria modificata!");
    },
    onError: (err: any) => toast.error(err.message || "Errore aggiornamento sottocategoria"),
  });

  const updateSubcategoryPermissionsMutation = useMutation({
    mutationFn: (values: {
      id: string;
      permission_mode: "inherit" | "public" | "restricted";
      allowed_roles: string[];
      allowed_user_ids: string[];
      publish_mode: "inherit" | "all_viewers" | "restricted";
      publish_roles: string[];
      publish_user_ids: string[];
      can_manage_roles: string[];
      can_manage_user_ids: string[];
    }) => updateBoardSubcategoryPermissionsFn({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenSubPermissionsDialog(false);
      toast.success("Permessi della sottocategoria salvati con successo!");
    },
    onError: (err: any) =>
      toast.error(err.message || "Errore aggiornamento permessi sottocategoria"),
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id: string) => deleteBoardSubcategoryFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      if (selectedSubcategoryId === subcategoryToDelete?.id) {
        setSelectedSubcategoryId(null);
      }
      setSubcategoryToDelete(null);
      toast.success("Sottocategoria eliminata!");
    },
    onError: (err: any) => toast.error(err.message || "Errore eliminazione sottocategoria"),
  });

  const triggerTaskDueRemindersMutation = useMutation({
    mutationFn: () => triggerTaskDueRemindersFn(),
    onSuccess: (res: any) => {
      if (res.remindersSent > 0) {
        toast.success(
          `Inviati ${res.remindersSent} promemoria privati (DM) su Telegram per le task in scadenza!`,
        );
      } else {
        toast.info(
          `Nessun promemoria necessario: tutte le ${res.totalChecked} task attive sono in orario o già notificate.`,
        );
      }
    },
    onError: (err: any) => toast.error(err.message || "Errore invio promemoria scadenze"),
  });

  const triggerDailyBriefingMutation = useMutation({
    mutationFn: () => triggerDailyTaskMorningBriefingFn(),
    onSuccess: (res: any) => {
      toast.success(
        `Report mattutino inviato! ${res.dmSentCount} DM recapitati agli operatori (${res.totalTodayCount} task che scadono oggi, ${res.totalOverdueCount} scadute).`,
      );
    },
    onError: (err: any) => toast.error(err.message || "Errore invio briefing mattutino"),
  });

  const createItemMutation = useMutation({
    mutationFn: (payload: any) => createBoardItemFn({ data: payload }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenItemDialog(false);
      toast.success(
        res.item.type === "task"
          ? "Task creata con successo!"
          : res.item.type === "meeting"
            ? "Riunione programmata con successo!"
            : "Nota pubblicata nella cartella!",
      );
    },
    onError: (err: any) => toast.error(err.message || "Errore creazione elemento"),
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: any) => updateBoardItemFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setOpenItemDialog(false);
      toast.success("Elemento aggiornato con successo!");
    },
    onError: (err: any) => toast.error(err.message || "Errore aggiornamento elemento"),
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, is_pinned }: { id: string; is_pinned: boolean }) =>
      togglePinBoardItemFn({ data: { id, is_pinned } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      toast.success(res.is_pinned ? "Elemento fissato in evidenza!" : "Elemento sbloccato.");
    },
    onError: (err: any) => toast.error(err.message || "Errore modifica stato fissato"),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      task_status: "todo" | "in_progress" | "review" | "done";
      checklist?: BoardChecklistItem[];
    }) => updateTaskStatusFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
    },
    onError: (err: any) => toast.error(err.message || "Errore aggiornamento task"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => deleteBoardItemFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardData"] });
      setItemToDelete(null);
      toast.success("Elemento eliminato.");
    },
    onError: (err: any) => toast.error(err.message || "Errore eliminazione elemento"),
  });

  // Filter items based on hierarchy and filter controls
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoryId && item.category_id !== selectedCategoryId) return false;
      if (selectedSubcategoryId && item.subcategory_id !== selectedSubcategoryId) return false;

      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (taskStatusFilter !== "all" && item.task_status !== taskStatusFilter) return false;

      if (
        onlyMyTasks &&
        (!item.assigned_to_ids || !item.assigned_to_ids.includes(userContext?.userId || ""))
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchAuthor = item.author_name.toLowerCase().includes(q);
        const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        const matchAssignee = item.assigned_to_names?.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchAuthor && !matchTags && !matchAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    selectedCategoryId,
    selectedSubcategoryId,
    typeFilter,
    taskStatusFilter,
    onlyMyTasks,
    searchQuery,
    userContext?.userId,
  ]);

  // Dialog openers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      icon: "Folder",
      color: "#f59e0b",
      permission_mode: "public",
      allowed_roles: [],
      allowed_user_ids: [],
      publish_mode: "all_viewers",
      publish_roles: [],
      publish_user_ids: [],
    });
    setOpenCategoryDialog(true);
  };

  const handleOpenEditCategory = (cat: BoardCategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      permission_mode: cat.permission_mode || "public",
      allowed_roles: cat.allowed_roles || [],
      allowed_user_ids: cat.allowed_user_ids || [],
      publish_mode: cat.publish_mode || "all_viewers",
      publish_roles: cat.publish_roles || [],
      publish_user_ids: cat.publish_user_ids || [],
    });
    setOpenCategoryDialog(true);
  };

  const handleOpenPermissions = (cat: BoardCategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPermCategory(cat);
    setPermActiveTab("view");
    setPermViewMode(cat.permission_mode || "public");
    setPermViewRoles(cat.allowed_roles || []);
    setPermViewUserIds(cat.allowed_user_ids || []);
    setPermPublishMode(cat.publish_mode || "all_viewers");
    setPermPublishRoles(cat.publish_roles || []);
    setPermPublishUserIds(cat.publish_user_ids || []);
    setEmployeeSearch("");
    setOpenPermissionsDialog(true);
  };

  const handleOpenSubPermissions = (sub: BoardSubcategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPermSubcategory(sub);
    setSubPermActiveTab("view");
    setSubPermViewMode(sub.permission_mode || "inherit");
    setSubPermViewRoles(sub.allowed_roles || []);
    setSubPermViewUserIds(sub.allowed_user_ids || []);
    setSubPermPublishMode(sub.publish_mode || "inherit");
    setSubPermPublishRoles(sub.publish_roles || []);
    setSubPermPublishUserIds(sub.publish_user_ids || []);
    setEmployeeSearch("");
    setOpenSubPermissionsDialog(true);
  };

  const handleOpenCreateSubcategory = (catId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSubcategory(null);
    setSubcategoryForm({
      category_id: catId || selectedCategoryId || categories[0]?.id || "",
      name: "",
      description: "",
      icon: "Folder",
      color: "#3b82f6",
      permission_mode: "inherit",
      allowed_roles: [],
      allowed_user_ids: [],
      publish_mode: "inherit",
      publish_roles: [],
      publish_user_ids: [],
    });
    setOpenSubcategoryDialog(true);
  };

  const handleOpenEditSubcategory = (sub: BoardSubcategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubcategory(sub);
    setSubcategoryForm({
      category_id: sub.category_id,
      name: sub.name,
      description: sub.description,
      icon: sub.icon || "Folder",
      color: sub.color || "#3b82f6",
      permission_mode: sub.permission_mode || "inherit",
      allowed_roles: sub.allowed_roles || [],
      allowed_user_ids: sub.allowed_user_ids || [],
      publish_mode: sub.publish_mode || "inherit",
      publish_roles: sub.publish_roles || [],
      publish_user_ids: sub.publish_user_ids || [],
    });
    setOpenSubcategoryDialog(true);
  };

  const handleOpenCreateItem = (
    type: "note" | "task" | "meeting",
    catId?: string,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    setEditingItem(null);

    const targetCatId = catId || selectedCategoryId || categories[0]?.id || "";
    const validSubs = subcategories.filter((s) => s.category_id === targetCatId);
    const defaultSubId =
      (catId && selectedCategoryId === catId ? selectedSubcategoryId : null) ||
      validSubs[0]?.id ||
      "";

    setItemForm({
      category_id: targetCatId,
      subcategory_id: defaultSubId,
      type: type,
      title: "",
      content: "",
      is_pinned: false,
      priority: "medium",
      tagsInput: "",
      task_status: "todo",
      deadline: "",
      assigned_to_ids: [],
      checklist: [],
      newChecklistText: "",
      meeting_date: "",
      meeting_location: "Discord / Sala Riunioni Staff",
      attendees_ids: [],
    });
    setOpenItemDialog(true);
  };

  const handleOpenEditItem = (item: BoardItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);

    setItemForm({
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      type: item.type,
      title: item.title,
      content: item.content,
      is_pinned: item.is_pinned,
      priority: item.priority,
      tagsInput: item.tags?.join(", ") || "",
      task_status: item.task_status || "todo",
      deadline: item.deadline ? item.deadline.slice(0, 16) : "",
      assigned_to_ids: item.assigned_to_ids || [],
      checklist: item.checklist || [],
      newChecklistText: "",
      meeting_date: item.meeting_date ? item.meeting_date.slice(0, 16) : "",
      meeting_location: item.meeting_location || "Discord / Sala Riunioni Staff",
      attendees_ids: item.attendees_ids || [],
    });
    setOpenItemDialog(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.title.trim()) {
      toast.error("Inserisci un titolo per il documento.");
      return;
    }
    if (!itemForm.category_id) {
      toast.error("Seleziona una cartella di destinazione.");
      return;
    }
    if (!itemForm.subcategory_id) {
      // If no subcategory exists, we create a default one or block
      const validSubs = subcategories.filter((s) => s.category_id === itemForm.category_id);
      if (validSubs.length === 0) {
        toast.error(
          "Questa cartella non ha ancora nessuna sezione. Crea prima una sezione/canale.",
        );
        return;
      }
      toast.error("Seleziona una sezione all'interno della cartella.");
      return;
    }

    const tags = itemForm.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const assignedNames = itemForm.assigned_to_ids
      .map((id) => {
        const st = staffMembers.find((s) => s.id === id);
        return st?.display_name || st?.username || "Staff";
      })
      .filter(Boolean);

    const attendeeNames = itemForm.attendees_ids
      .map((id) => {
        const st = staffMembers.find((s) => s.id === id);
        return st?.display_name || st?.username || "Staff";
      })
      .filter(Boolean);

    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem.id,
        title: itemForm.title,
        content: itemForm.content,
        is_pinned: itemForm.is_pinned,
        priority: itemForm.priority,
        tags,
        task_status: itemForm.type === "task" ? itemForm.task_status : undefined,
        deadline: itemForm.deadline ? new Date(itemForm.deadline).toISOString() : null,
        assigned_to_ids: itemForm.assigned_to_ids,
        assigned_to_names: assignedNames,
        checklist: itemForm.checklist,
        meeting_date: itemForm.meeting_date ? new Date(itemForm.meeting_date).toISOString() : null,
        meeting_location: itemForm.meeting_location,
        attendees_ids: itemForm.attendees_ids,
        attendees_names: attendeeNames,
      });
    } else {
      createItemMutation.mutate({
        category_id: itemForm.category_id,
        subcategory_id: itemForm.subcategory_id,
        type: itemForm.type,
        title: itemForm.title,
        content: itemForm.content,
        is_pinned: itemForm.is_pinned,
        priority: itemForm.priority,
        tags,
        task_status: itemForm.type === "task" ? itemForm.task_status : undefined,
        deadline: itemForm.deadline ? new Date(itemForm.deadline).toISOString() : null,
        assigned_to_ids: itemForm.assigned_to_ids,
        assigned_to_names: assignedNames,
        checklist: itemForm.checklist,
        meeting_date: itemForm.meeting_date ? new Date(itemForm.meeting_date).toISOString() : null,
        meeting_location: itemForm.meeting_location,
        attendees_ids: itemForm.attendees_ids,
        attendees_names: attendeeNames,
      });
    }
  };

  const handleToggleChecklistItem = (item: BoardItem, checkId: string) => {
    const updatedChecklist = (item.checklist || []).map((c) =>
      c.id === checkId ? { ...c, done: !c.done } : c,
    );
    const allDone = updatedChecklist.length > 0 && updatedChecklist.every((c) => c.done);
    const newStatus = allDone
      ? "done"
      : item.task_status === "done"
        ? "in_progress"
        : item.task_status;

    updateTaskStatusMutation.mutate({
      id: item.id,
      task_status: (newStatus || "todo") as any,
      checklist: updatedChecklist,
    });
  };

  const handleAddChecklistEntryToForm = () => {
    if (!itemForm.newChecklistText.trim()) return;
    const newItem: BoardChecklistItem = {
      id: `chk-${Date.now()}`,
      text: itemForm.newChecklistText.trim(),
      done: false,
    };
    setItemForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
      newChecklistText: "",
    }));
  };

  const handleRemoveChecklistEntryFromForm = (id: string) => {
    setItemForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((c) => c.id !== id),
    }));
  };

  // Filtered employees for permissions dialog
  const filteredStaffMembers = useMemo(() => {
    if (!employeeSearch.trim()) return staffMembers;
    const q = employeeSearch.toLowerCase();
    return staffMembers.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.telegram_handle && s.telegram_handle.toLowerCase().includes(q)) ||
        s.custom_roles.some((r) => r.toLowerCase().includes(q)),
    );
  }, [staffMembers, employeeSearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-400 font-medium">
          Caricamento delle cartelle e dei documenti...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Accesso alla Bacheca non consentito</h2>
        <p className="text-slate-400 text-sm">
          Non hai i permessi per visualizzare questa sezione. Contatta la direzione se ritieni si
          tratti di un errore.
        </p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-slate-700 text-slate-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Folder className="w-4 h-4" /> Archivio Documenti & Bacheca
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            {selectedCategoryId && currentCategory ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setSelectedSubcategoryId(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-base font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Cartelle
                </button>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <span style={{ color: currentCategory.color }}>{currentCategory.name}</span>
              </span>
            ) : (
              "Cartelle & Sottocategorie Staff"
            )}
          </h1>
          <p className="text-xs text-slate-400">
            {selectedCategoryId && currentCategory
              ? currentCategory.description ||
                "Gestione documenti, note, task operative e riunioni interne."
              : "Organizza note, compiti e riunioni per reparto o progetto con permessi dedicati."}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Automation Actions (Admin / Manager) */}
          {(isBoardAdmin || permissions.has("board:manage_categories")) && (
            <div className="flex items-center gap-1.5 mr-1 border-r border-slate-800 pr-3">
              <Button
                onClick={() => triggerTaskDueRemindersMutation.mutate()}
                disabled={triggerTaskDueRemindersMutation.isPending}
                variant="outline"
                size="sm"
                className="bg-blue-950/30 hover:bg-blue-900/50 text-blue-300 border-blue-800/40 text-xs h-9 gap-1.5"
                title="Invia promemoria privato (DM Telegram) a chi ha task in scadenza (<24h)"
              >
                <BellRing
                  className={`w-3.5 h-3.5 ${triggerTaskDueRemindersMutation.isPending ? "animate-spin" : ""}`}
                />
                <span className="hidden md:inline">Promemoria Scadenze (DM)</span>
                <span className="md:hidden">Promemoria DM</span>
              </Button>

              <Button
                onClick={() => triggerDailyBriefingMutation.mutate()}
                disabled={triggerDailyBriefingMutation.isPending}
                variant="outline"
                size="sm"
                className="bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 border-amber-800/40 text-xs h-9 gap-1.5"
                title="Invia il report mattutino (07:00) con le task del giorno e priorità"
              >
                <Sun
                  className={`w-3.5 h-3.5 ${triggerDailyBriefingMutation.isPending ? "animate-spin" : ""}`}
                />
                <span className="hidden md:inline">Briefing 07:00</span>
                <span className="md:hidden">Briefing</span>
              </Button>
            </div>
          )}

          {/* If on home view, button to create folder */}
          {!selectedCategoryId && (
            <Button
              onClick={handleOpenCreateCategory}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-md gap-2 text-xs sm:text-sm h-10 px-4"
            >
              <FolderPlus className="w-4 h-4" /> Nuova Cartella
            </Button>
          )}

          {/* If inside folder, action buttons based on permissions */}
          {selectedCategoryId && currentCategory && (
            <div className="flex items-center gap-2 flex-wrap">
              {canPublishInCurrentCategory && (
                <>
                  <Button
                    onClick={(e) => handleOpenCreateItem("note", currentCategory.id, e)}
                    variant="outline"
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 text-xs h-9 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" /> Nota
                  </Button>
                  <Button
                    onClick={(e) => handleOpenCreateItem("task", currentCategory.id, e)}
                    variant="outline"
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 text-xs h-9 gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Task
                  </Button>
                  <Button
                    onClick={(e) => handleOpenCreateItem("meeting", currentCategory.id, e)}
                    variant="outline"
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 text-xs h-9 gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-400" /> Riunione
                  </Button>
                </>
              )}

              {canManageCurrentCategory && (
                <>
                  <Button
                    onClick={(e) => handleOpenPermissions(currentCategory, e)}
                    variant="outline"
                    className="bg-slate-800/80 hover:bg-slate-800 text-amber-300 border-amber-500/30 text-xs h-9 gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" /> Permessi
                  </Button>
                  <Button
                    onClick={(e) => handleOpenEditCategory(currentCategory, e)}
                    variant="outline"
                    className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs h-9 gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifica
                  </Button>
                </>
              )}

              {canDeleteCurrentCategory && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryToDelete(currentCategory);
                  }}
                  variant="outline"
                  className="bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border-rose-800/50 text-xs h-9 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Elimina Cartella
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: HOME GRID OF FOLDERS (CARTELLE) */}
      {!selectedCategoryId && (
        <div className="space-y-5">
          {/* Quick Search & Stats */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cerca cartella per nome o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900/90 border-slate-800 text-xs text-slate-200 h-9"
              />
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>{categories.length} cartelle disponibili</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Accesso verificato
              </span>
            </div>
          </div>

          {/* Folders Grid */}
          {categories.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 space-y-4">
              <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <Folder className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">Nessuna cartella presente</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Non ci sono ancora cartelle a cui hai accesso. Creane una nuova con il pulsante in
                alto per iniziare.
              </p>
              <Button
                onClick={handleOpenCreateCategory}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs gap-2"
              >
                <Plus className="w-4 h-4" /> Crea la prima Cartella
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories
                .filter((cat) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    cat.name.toLowerCase().includes(q) || cat.description?.toLowerCase().includes(q)
                  );
                })
                .map((cat) => {
                  const IconComp = getIconComponent(cat.icon);
                  const catItems = items.filter((i) => i.category_id === cat.id);
                  const catSubs = subcategories.filter((s) => s.category_id === cat.id);
                  const noteCount = catItems.filter((i) => i.type === "note").length;
                  const taskCount = catItems.filter((i) => i.type === "task").length;
                  const meetingCount = catItems.filter((i) => i.type === "meeting").length;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setSelectedSubcategoryId(null);
                      }}
                      className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Header with Folder Icon & Badge */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor: `${cat.color}20`,
                              borderColor: `${cat.color}40`,
                              color: cat.color,
                            }}
                          >
                            <IconComp className="w-6 h-6" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            {cat.permission_mode === "restricted" ? (
                              <Badge className="bg-purple-950/60 text-purple-300 border-purple-800/50 text-[10px] gap-1 py-0.5 px-2">
                                <Lock className="w-3 h-3" /> Riservata
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-800/50 text-[10px] gap-1 py-0.5 px-2">
                                <Unlock className="w-3 h-3" /> Libera
                              </Badge>
                            )}

                            {cat.publish_mode === "restricted" && (
                              <Badge
                                className="bg-amber-950/60 text-amber-300 border-amber-800/50 text-[10px] gap-1 py-0.5 px-1.5"
                                title="Pubblicazione limitata"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                            {cat.name}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                            {cat.description || "Nessuna descrizione inserita per questa cartella."}
                          </p>
                        </div>

                        {/* Contents Summary Pills */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-300 font-medium">
                          <span className="bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-slate-400" /> {catSubs.length} sottocategorie
                          </span>
                          <span className="bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-amber-400" /> {noteCount} note
                          </span>
                          <span className="bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-blue-400" /> {taskCount} task
                          </span>
                          {meetingCount > 0 && (
                            <span className="bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-emerald-400" /> {meetingCount}{" "}
                              riunioni
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-slate-500 truncate">
                          Creata da {cat.created_by_name || "Staff"}
                        </span>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cat.can_edit_permissions && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleOpenPermissions(cat, e)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                              title="Gestisci Permessi di visualizzazione e pubblicazione"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {cat.can_manage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleOpenEditCategory(cat, e)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Modifica nome e colore"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {cat.can_delete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryToDelete(cat);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                              title="Elimina cartella e contenuti"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setSelectedSubcategoryId(null);
                            }}
                            className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold h-7 px-2.5 ml-1 transition-colors"
                          >
                            Apri <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INSIDE A FOLDER (CARTELLE SELEZIONATA) */}
      {selectedCategoryId && currentCategory && (
        <div className="space-y-6">
          {/* Subcategories Navigation Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Sottocategorie & Sotto-cartelle
              </span>
              {canManageCurrentCategory && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleOpenCreateSubcategory(currentCategory.id, e)}
                  className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-400" /> Nuova Sottocategoria
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedSubcategoryId(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedSubcategoryId === null
                    ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60"
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Tutti i file (
                {items.filter((i) => i.category_id === currentCategory.id).length})
              </button>

              {activeSubcategories.map((sub) => {
                const subItemCount = items.filter(
                  (i) => i.category_id === currentCategory.id && i.subcategory_id === sub.id,
                ).length;
                const isSelected = selectedSubcategoryId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className={`group flex items-center rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      isSelected
                        ? "bg-slate-800 text-amber-400 border-amber-500/50 shadow-sm"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border-slate-700/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSubcategoryId(sub.id)}
                      className="px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {sub.permission_mode === "restricted" ? (
                        <Lock className="w-3 h-3 text-purple-400" title="Sottocategoria Riservata" />
                      ) : sub.permission_mode === "inherit" ? (
                        <GitBranch className="w-3 h-3 text-slate-400" title="Eredita permessi cartella" />
                      ) : (
                        <Unlock className="w-3 h-3 text-emerald-400" title="Sottocategoria Libera" />
                      )}
                      <span>{sub.name}</span>
                      <span className="bg-slate-900/80 px-1.5 py-0.2 rounded-full text-[10px] text-slate-400">
                        {subItemCount}
                      </span>
                    </button>

                    {(canManageCurrentCategory || sub.can_edit_permissions || isBoardAdmin) && (
                      <div className="pr-1.5 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenSubPermissions(sub, e)}
                          className="p-1 hover:text-amber-300 text-slate-400"
                          title="Permessi Sottocategoria"
                        >
                          <Key className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditSubcategory(sub, e)}
                          className="p-1 hover:text-amber-300 text-slate-400"
                          title="Modifica sottocategoria"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubcategoryToDelete(sub);
                          }}
                          className="p-1 hover:text-rose-400 text-slate-400"
                          title="Elimina sottocategoria"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {activeSubcategories.length === 0 && (
                <div className="text-xs text-slate-500 italic py-1">
                  Nessuna sottocategoria creata. Puoi crearne una per organizzare i file e impostare permessi dedicati.
                </div>
              )}
            </div>
          </div>

          {/* Filter Bar (Type & Search) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  typeFilter === "all"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tutti ({filteredItems.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("note")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  typeFilter === "note"
                    ? "bg-slate-800 text-amber-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Note
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("task")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  typeFilter === "task"
                    ? "bg-slate-800 text-blue-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Task
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("meeting")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  typeFilter === "meeting"
                    ? "bg-slate-800 text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Riunioni
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cerca in questa cartella..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900/90 border-slate-800 text-xs text-slate-200 h-9"
              />
            </div>
          </div>

          {/* Items Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 space-y-4">
              <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">Nessun documento trovato</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Non ci sono elementi che corrispondono ai filtri attuali in questa cartella.
              </p>
              {canPublishInCurrentCategory && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={(e) => handleOpenCreateItem("note", currentCategory.id, e)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuova Nota
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => handleOpenCreateItem("task", currentCategory.id, e)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Nuova Task
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isAuthor = item.author_id === userContext?.userId;
                const canEditItem = isAuthor || isBoardAdmin || canManageCurrentCategory;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                      item.is_pinned
                        ? "border-amber-500/50 bg-slate-900/95"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Type Badge, Priority, Pinned, Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.type === "note" && (
                            <Badge className="bg-amber-950/60 text-amber-400 border-amber-800/40 text-[10px] gap-1 py-0.5">
                              <FileText className="w-3 h-3" /> Nota
                            </Badge>
                          )}
                          {item.type === "task" && (
                            <Badge className="bg-blue-950/60 text-blue-400 border-blue-800/40 text-[10px] gap-1 py-0.5">
                              <CheckSquare className="w-3 h-3" /> Task
                            </Badge>
                          )}
                          {item.type === "meeting" && (
                            <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-800/40 text-[10px] gap-1 py-0.5">
                              <CalendarDays className="w-3 h-3" /> Riunione
                            </Badge>
                          )}

                          {item.priority === "urgent" && (
                            <Badge className="bg-rose-950 text-rose-400 border-rose-800 text-[10px] py-0.5">
                              Urgente
                            </Badge>
                          )}
                          {item.priority === "high" && (
                            <Badge className="bg-amber-950 text-amber-400 border-amber-800 text-[10px] py-0.5">
                              Alta
                            </Badge>
                          )}
                        </div>

                        {/* Top Right Pin & Modals */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              togglePinMutation.mutate({ id: item.id, is_pinned: !item.is_pinned })
                            }
                            className={`p-1 rounded-md transition-colors ${
                              item.is_pinned
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                            title={item.is_pinned ? "Rimuovi da evidenza" : "Fissa in evidenza"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          {canEditItem && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditItem(item, e)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-200"
                              title="Modifica"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEditItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-1 rounded-md text-slate-500 hover:text-rose-400"
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                          {item.title}
                        </h4>
                        {item.content && (
                          <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-line line-clamp-4 leading-relaxed">
                            {item.content}
                          </p>
                        )}
                      </div>

                      {/* TASK SPECIFIC: Checklist & Status */}
                      {item.type === "task" && (
                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                          {/* Task Status Dropdown */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Stato:</span>
                            <Select
                              value={item.task_status || "todo"}
                              onValueChange={(val: any) =>
                                updateTaskStatusMutation.mutate({
                                  id: item.id,
                                  task_status: val,
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-32 text-[11px] bg-slate-800 border-slate-700 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                                <SelectItem value="todo">🟡 Da Fare</SelectItem>
                                <SelectItem value="in_progress">🔵 In Corso</SelectItem>
                                <SelectItem value="review">🟣 Revisione</SelectItem>
                                <SelectItem value="done">🟢 Completata</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Deadline */}
                          {item.deadline && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium">
                              <Clock className="w-3 h-3" /> Scadenza:{" "}
                              {new Date(item.deadline).toLocaleDateString("it-IT", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}

                          {/* Assignees */}
                          {item.assigned_to_names && item.assigned_to_names.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-400">
                              <span>Assegnata a:</span>
                              {item.assigned_to_names.map((name, i) => (
                                <span
                                  key={i}
                                  className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium"
                                >
                                  @{name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Checklist items */}
                          {item.checklist && item.checklist.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {item.checklist.map((chk) => (
                                <button
                                  type="button"
                                  key={chk.id}
                                  onClick={() => handleToggleChecklistItem(item, chk.id)}
                                  className="flex items-center gap-2 text-left w-full text-xs text-slate-300 hover:text-white"
                                >
                                  {chk.done ? (
                                    <CheckSquare2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  )}
                                  <span className={chk.done ? "line-through text-slate-500" : ""}>
                                    {chk.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* MEETING SPECIFIC: Date, Location, Attendees */}
                      {item.type === "meeting" && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
                          {item.meeting_date && (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(item.meeting_date).toLocaleString("it-IT", {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                          {item.meeting_location && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-500" /> {item.meeting_location}
                            </div>
                          )}
                          {item.attendees_names && item.attendees_names.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-400 pt-0.5">
                              <span>Partecipanti:</span>
                              {item.attendees_names.map((name, i) => (
                                <span
                                  key={i}
                                  className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {item.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Author & Date Footer */}
                    <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3 h-3 text-slate-500" /> {item.author_name}
                      </span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: CREA / MODIFICA CARTELLA */}
      <Dialog open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              {editingCategory ? "Modifica Cartella" : "Crea Nuova Cartella"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Imposta il nome, l'icona identificativa e il colore tematico per questa cartella.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Nome Cartella *</label>
              <Input
                placeholder="Es. Direzione Generale, Contabilità, Eventi..."
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Descrizione (Opzionale)</label>
              <Textarea
                placeholder="Descrivi brevemente lo scopo di questa cartella..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs resize-none h-18"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Icona Cartella</label>
                <Select
                  value={categoryForm.icon}
                  onValueChange={(val) => setCategoryForm({ ...categoryForm, icon: val })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                    {FOLDER_ICONS.map((ico) => {
                      const IconC = ico.icon;
                      return (
                        <SelectItem key={ico.name} value={ico.name}>
                          <div className="flex items-center gap-2">
                            <IconC className="w-3.5 h-3.5 text-amber-400" />
                            <span>{ico.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Colore Tematico</label>
                <Select
                  value={categoryForm.color}
                  onValueChange={(val) => setCategoryForm({ ...categoryForm, color: val })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                    {FOLDER_COLORS.map((col) => (
                      <SelectItem key={col.value} value={col.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: col.value }}
                          />
                          <span>{col.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenCategoryDialog(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!categoryForm.name.trim()) {
                  toast.error("Inserisci un nome per la cartella.");
                  return;
                }
                if (editingCategory) {
                  updateCategoryMutation.mutate({ ...categoryForm, id: editingCategory.id });
                } else {
                  createCategoryMutation.mutate(categoryForm);
                }
              }}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending
                ? "Salvataggio..."
                : editingCategory
                  ? "Salva Modifiche"
                  : "Crea Cartella"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: GESTIONE PERMESSI CARTELLA (VISUALIZZAZIONE & PUBBLICAZIONE) */}
      <Dialog open={openPermissionsDialog} onOpenChange={setOpenPermissionsDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              Permessi Cartella: {permCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configura chi può visualizzare questa cartella e chi ha i permessi per pubblicare
              contenuti (note, task e riunioni).
            </DialogDescription>
          </DialogHeader>

          {/* Perm Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 pt-1">
            <button
              type="button"
              onClick={() => setPermActiveTab("view")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                permActiveTab === "view"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white bg-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> 1. Chi può Visualizzare
            </button>
            <button
              type="button"
              onClick={() => setPermActiveTab("publish")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                permActiveTab === "publish"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white bg-slate-800"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> 2. Chi può Pubblicare
            </button>
          </div>

          {/* TAB 1: CHI PUÒ VISUALIZZARE */}
          {permActiveTab === "view" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300">
                  Modalità di Accesso in Visualizzazione
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPermViewMode("public")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      permViewMode === "public"
                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-200"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Unlock className="w-4 h-4 text-emerald-400" /> Libera (Tutto lo Staff)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tutti i membri dello staff abilitati possono vedere la cartella.
                    </p>
                  </div>

                  <div
                    onClick={() => setPermViewMode("restricted")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      permViewMode === "restricted"
                        ? "bg-purple-950/40 border-purple-500 text-purple-200"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Lock className="w-4 h-4 text-purple-400" /> Riservata (Solo Autorizzati)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Visibile solo ai ruoli e dipendenti selezionati sotto.
                    </p>
                  </div>
                </div>
              </div>

              {permViewMode === "restricted" && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Ruoli autorizzati */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" /> Ruoli con Accesso in
                        Visualizzazione
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPermViewRoles(customRoles.map((r) => r.id))}
                          className="text-amber-400 hover:underline"
                        >
                          Tutti i ruoli
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setPermViewRoles([])}
                          className="text-slate-400 hover:underline"
                        >
                          Deseleziona
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {customRoles.map((r) => {
                        const isChecked =
                          permViewRoles.includes(r.id) || permViewRoles.includes(r.name);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setPermViewRoles((prev) =>
                                isChecked
                                  ? prev.filter((x) => x !== r.id && x !== r.name)
                                  : [...prev, r.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                              isChecked
                                ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                isChecked
                                  ? "bg-amber-500 border-amber-500 text-slate-950"
                                  : "border-slate-600"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-medium">{r.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dipendenti specifici */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" /> Singoli Dipendenti con
                        Accesso Diretto
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {permViewUserIds.length} selezionati
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <Input
                        placeholder="Cerca dipendente per nome..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="pl-8 bg-slate-800 border-slate-700 text-xs h-8"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {filteredStaffMembers.map((emp) => {
                        const isChecked = permViewUserIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setPermViewUserIds((prev) =>
                                isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? "bg-blue-500/10 border-blue-500/50 text-blue-200"
                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "border-slate-600"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium">{emp.display_name}</span>
                              <span className="text-[11px] text-slate-500">(@{emp.username})</span>
                            </div>
                            {emp.custom_roles.length > 0 && (
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                {emp.custom_roles.join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHI PUÒ PUBBLICARE */}
          {permActiveTab === "publish" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300">
                  Regola di Pubblicazione Contenuti
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPermPublishMode("all_viewers")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      permPublishMode === "all_viewers"
                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-200"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Edit3 className="w-4 h-4 text-emerald-400" /> Tutti i Visualizzatori
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Chiunque abbia accesso alla cartella può creare note, task e riunioni.
                    </p>
                  </div>

                  <div
                    onClick={() => setPermPublishMode("restricted")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      permPublishMode === "restricted"
                        ? "bg-amber-950/40 border-amber-500 text-amber-200"
                        : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white">
                      <Lock className="w-4 h-4 text-amber-400" /> Solo Ruoli o Dipendenti
                      Specificati
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      La pubblicazione è riservata solo a chi indichi qui sotto.
                    </p>
                  </div>
                </div>
              </div>

              {permPublishMode === "restricted" && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Ruoli autorizzati a pubblicare */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" /> Ruoli Autorizzati a
                        Pubblicare
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPermPublishRoles(customRoles.map((r) => r.id))}
                          className="text-amber-400 hover:underline"
                        >
                          Tutti i ruoli
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setPermPublishRoles([])}
                          className="text-slate-400 hover:underline"
                        >
                          Deseleziona
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {customRoles.map((r) => {
                        const isChecked =
                          permPublishRoles.includes(r.id) || permPublishRoles.includes(r.name);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setPermPublishRoles((prev) =>
                                isChecked
                                  ? prev.filter((x) => x !== r.id && x !== r.name)
                                  : [...prev, r.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                              isChecked
                                ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                isChecked
                                  ? "bg-amber-500 border-amber-500 text-slate-950"
                                  : "border-slate-600"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-medium">{r.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dipendenti autorizzati a pubblicare */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Dipendenti con Permesso
                        di Pubblicazione
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {permPublishUserIds.length} selezionati
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {filteredStaffMembers.map((emp) => {
                        const isChecked = permPublishUserIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setPermPublishUserIds((prev) =>
                                isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200"
                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                    : "border-slate-600"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium">{emp.display_name}</span>
                              <span className="text-[11px] text-slate-500">(@{emp.username})</span>
                            </div>
                            {emp.custom_roles.length > 0 && (
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                {emp.custom_roles.join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenPermissionsDialog(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!permCategory) return;
                updateCategoryPermissionsMutation.mutate({
                  category_id: permCategory.id,
                  permission_mode: permViewMode,
                  allowed_roles: permViewRoles,
                  allowed_user_ids: permViewUserIds,
                  publish_mode: permPublishMode,
                  publish_roles: permPublishRoles,
                  publish_user_ids: permPublishUserIds,
                });
              }}
              disabled={updateCategoryPermissionsMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              {updateCategoryPermissionsMutation.isPending
                ? "Salvataggio..."
                : "Salva Permessi Cartella"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: ELIMINA CARTELLA (CONFIRMATION DIALOG) */}
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Elimina Cartella
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-300 space-y-2">
            <p>
              Sei sicuro di voler eliminare la cartella{" "}
              <strong className="text-white">"{categoryToDelete?.name}"</strong>?
            </p>
            <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3 text-rose-300 text-[11px] space-y-1">
              <p className="font-semibold">⚠️ Verranno rimossi permanentemente:</p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-300/80">
                <li>Tutte le sezioni/canali contenuti all'interno</li>
                <li>Tutte le note, task, checklist e riunioni associate</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (categoryToDelete) deleteCategoryMutation.mutate(categoryToDelete.id);
              }}
              disabled={deleteCategoryMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {deleteCategoryMutation.isPending ? "Eliminazione..." : "Elimina Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: CREA / MODIFICA SOTTOCATEGORIA */}
      <Dialog open={openSubcategoryDialog} onOpenChange={setOpenSubcategoryDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              {editingSubcategory ? "Modifica Sottocategoria" : "Aggiungi Sottocategoria"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Crea una sottocategoria per organizzare file e task con permessi dedicati.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Nome Sottocategoria *</label>
              <Input
                placeholder="Es. Task Settimanali, Note Interne, Verbali..."
                value={subcategoryForm.name}
                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Descrizione (Opzionale)</label>
              <Input
                placeholder="Breve scopo di questa sottocategoria..."
                value={subcategoryForm.description}
                onChange={(e) =>
                  setSubcategoryForm({ ...subcategoryForm, description: e.target.value })
                }
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSubcategoryDialog(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!subcategoryForm.name.trim()) {
                  toast.error("Inserisci un nome per la sottocategoria.");
                  return;
                }
                if (editingSubcategory) {
                  updateSubcategoryMutation.mutate({
                    ...subcategoryForm,
                    id: editingSubcategory.id,
                  });
                } else {
                  createSubcategoryMutation.mutate(subcategoryForm);
                }
              }}
              disabled={createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {editingSubcategory ? "Salva Modifiche" : "Crea Sottocategoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4.5: GESTIONE PERMESSI SOTTOCATEGORIA */}
      <Dialog open={openSubPermissionsDialog} onOpenChange={setOpenSubPermissionsDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              Permessi Sottocategoria:{" "}
              <span className="text-amber-400">"{permSubcategory?.name}"</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Imposta regole di visibilità e permessi di pubblicazione specifici per questa sottocategoria.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Selector Tabs (Visualizzazione vs Pubblicazione) */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 pt-1">
            <button
              type="button"
              onClick={() => setSubPermActiveTab("view")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                subPermActiveTab === "view"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm"
                  : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Chi può Accedere / Vedere
            </button>

            <button
              type="button"
              onClick={() => setSubPermActiveTab("publish")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                subPermActiveTab === "publish"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                  : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Chi può Creare / Pubblicare
            </button>
          </div>

          {/* TAB 1: VISIBILITÀ SOTTOCATEGORIA */}
          {subPermActiveTab === "view" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300">Modalità di Accesso</label>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => setSubPermViewMode("inherit")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermViewMode === "inherit"
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <GitBranch className="w-4 h-4 text-blue-400" /> Eredita
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Stessi permessi della cartella genitore.
                    </p>
                  </div>

                  <div
                    onClick={() => setSubPermViewMode("public")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermViewMode === "public"
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Unlock className="w-4 h-4 text-emerald-400" /> Libera
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Tutto lo staff con accesso alla bacheca può vedere.
                    </p>
                  </div>

                  <div
                    onClick={() => setSubPermViewMode("restricted")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermViewMode === "restricted"
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Lock className="w-4 h-4 text-purple-400" /> Riservata
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Solo ruoli o dipendenti specificati.
                    </p>
                  </div>
                </div>
              </div>

              {subPermViewMode === "restricted" && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Ruoli con permesso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-400" /> Ruoli Autorizzati
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSubPermViewRoles(customRoles.map((r) => r.id))}
                          className="text-purple-400 hover:underline"
                        >
                          Tutti i ruoli
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSubPermViewRoles([])}
                          className="text-slate-400 hover:underline"
                        >
                          Deseleziona
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {customRoles.map((r) => {
                        const isChecked =
                          subPermViewRoles.includes(r.id) || subPermViewRoles.includes(r.name);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSubPermViewRoles((prev) =>
                                isChecked
                                  ? prev.filter((x) => x !== r.id && x !== r.name)
                                  : [...prev, r.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                              isChecked
                                ? "bg-purple-500/10 border-purple-500/50 text-purple-200"
                                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                isChecked
                                  ? "bg-purple-500 border-purple-500 text-slate-950"
                                  : "border-slate-600"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-medium">{r.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dipendenti specifici */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" /> Dipendenti Specifici
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {subPermViewUserIds.length} selezionati
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {filteredStaffMembers.map((emp) => {
                        const isChecked = subPermViewUserIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setSubPermViewUserIds((prev) =>
                                isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? "bg-purple-500/10 border-purple-500/50 text-purple-200"
                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-purple-500 border-purple-500 text-slate-950"
                                    : "border-slate-600"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium">{emp.display_name}</span>
                              <span className="text-[11px] text-slate-500">(@{emp.username})</span>
                            </div>
                            {emp.custom_roles.length > 0 && (
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                {emp.custom_roles.join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PUBBLICAZIONE SOTTOCATEGORIA */}
          {subPermActiveTab === "publish" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-300">Regola di Pubblicazione</label>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => setSubPermPublishMode("inherit")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermPublishMode === "inherit"
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <GitBranch className="w-4 h-4 text-blue-400" /> Eredita
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Stesse regole di scrittura della cartella genitore.
                    </p>
                  </div>

                  <div
                    onClick={() => setSubPermPublishMode("all_viewers")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermPublishMode === "all_viewers"
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Users className="w-4 h-4 text-emerald-400" /> Chiunque può vedere
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Tutti coloro che hanno accesso a questa sottocategoria possono aggiungere file.
                    </p>
                  </div>

                  <div
                    onClick={() => setSubPermPublishMode("restricted")}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      subPermPublishMode === "restricted"
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-200 shadow-sm"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Lock className="w-4 h-4 text-amber-400" /> Limitata
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Solo ruoli o dipendenti specificati possono pubblicare.
                    </p>
                  </div>
                </div>
              </div>

              {subPermPublishMode === "restricted" && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  {/* Ruoli autorizzati a pubblicare */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" /> Ruoli Autorizzati a Pubblicare
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSubPermPublishRoles(customRoles.map((r) => r.id))}
                          className="text-amber-400 hover:underline"
                        >
                          Tutti i ruoli
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSubPermPublishRoles([])}
                          className="text-slate-400 hover:underline"
                        >
                          Deseleziona
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {customRoles.map((r) => {
                        const isChecked =
                          subPermPublishRoles.includes(r.id) || subPermPublishRoles.includes(r.name);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSubPermPublishRoles((prev) =>
                                isChecked
                                  ? prev.filter((x) => x !== r.id && x !== r.name)
                                  : [...prev, r.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                              isChecked
                                ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                                : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                isChecked
                                  ? "bg-amber-500 border-amber-500 text-slate-950"
                                  : "border-slate-600"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-medium">{r.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dipendenti autorizzati a pubblicare */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Dipendenti con Permesso di Pubblicazione
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {subPermPublishUserIds.length} selezionati
                      </span>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {filteredStaffMembers.map((emp) => {
                        const isChecked = subPermPublishUserIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              setSubPermPublishUserIds((prev) =>
                                isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                              );
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200"
                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                    : "border-slate-600"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="font-medium">{emp.display_name}</span>
                              <span className="text-[11px] text-slate-500">(@{emp.username})</span>
                            </div>
                            {emp.custom_roles.length > 0 && (
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                {emp.custom_roles.join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSubPermissionsDialog(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!permSubcategory) return;
                updateSubcategoryPermissionsMutation.mutate({
                  id: permSubcategory.id,
                  permission_mode: subPermViewMode,
                  allowed_roles: subPermViewRoles,
                  allowed_user_ids: subPermViewUserIds,
                  publish_mode: subPermPublishMode,
                  publish_roles: subPermPublishRoles,
                  publish_user_ids: subPermPublishUserIds,
                  can_manage_roles: [],
                  can_manage_user_ids: [],
                });
              }}
              disabled={updateSubcategoryPermissionsMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              {updateSubcategoryPermissionsMutation.isPending
                ? "Salvataggio..."
                : "Salva Permessi Sottocategoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: ELIMINA SOTTOCATEGORIA */}
      <Dialog
        open={!!subcategoryToDelete}
        onOpenChange={(open) => !open && setSubcategoryToDelete(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Elimina Sottocategoria
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-300">
            Sei sicuro di voler eliminare la sottocategoria{" "}
            <strong className="text-white">"{subcategoryToDelete?.name}"</strong>? I documenti al
            suo interno verranno cancellati.
          </div>
          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubcategoryToDelete(null)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (subcategoryToDelete) deleteSubcategoryMutation.mutate(subcategoryToDelete.id);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Elimina Sottocategoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: CREA / MODIFICA ELEMENTO (NOTA, TASK, RIUNIONE) */}
      <Dialog open={openItemDialog} onOpenChange={setOpenItemDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              {itemForm.type === "note" && <FileText className="w-5 h-5 text-amber-400" />}
              {itemForm.type === "task" && <CheckSquare className="w-5 h-5 text-blue-400" />}
              {itemForm.type === "meeting" && <CalendarDays className="w-5 h-5 text-emerald-400" />}
              {editingItem ? "Modifica Documento" : "Nuovo Documento"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Compila le informazioni richieste per pubblicare nella cartella.
            </DialogDescription>
          </DialogHeader>

          {/* Type Selector (if creating) */}
          {!editingItem && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemForm({ ...itemForm, type: "note" })}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  itemForm.type === "note"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Nota / Appunto
              </button>
              <button
                type="button"
                onClick={() => setItemForm({ ...itemForm, type: "task" })}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  itemForm.type === "task"
                    ? "bg-blue-500/20 border-blue-500 text-blue-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Task Operativa
              </button>
              <button
                type="button"
                onClick={() => setItemForm({ ...itemForm, type: "meeting" })}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  itemForm.type === "meeting"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Riunione
              </button>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Category and Subcategory selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Cartella Destinazione *</label>
                <Select
                  value={itemForm.category_id}
                  onValueChange={(val) => {
                    const validSubs = subcategories.filter((s) => s.category_id === val);
                    setItemForm({
                      ...itemForm,
                      category_id: val,
                      subcategory_id: validSubs[0]?.id || "",
                    });
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-9">
                    <SelectValue placeholder="Seleziona Cartella" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Sottocategoria *</label>
                <Select
                  value={itemForm.subcategory_id}
                  onValueChange={(val) => setItemForm({ ...itemForm, subcategory_id: val })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-9">
                    <SelectValue placeholder="Seleziona Sottocategoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                    {subcategories
                      .filter((s) => s.category_id === itemForm.category_id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title & Content */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Titolo *</label>
              <Input
                placeholder="Titolo chiaro e descrittivo..."
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Descrizione o Testo Completo</label>
              <Textarea
                placeholder="Dettagli, istruzioni, verbali o testo completo..."
                value={itemForm.content}
                onChange={(e) => setItemForm({ ...itemForm, content: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs resize-none h-24"
              />
            </div>

            {/* Priority & Tags */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Priorità</label>
                <Select
                  value={itemForm.priority}
                  onValueChange={(val: any) => setItemForm({ ...itemForm, priority: val })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                    <SelectItem value="low">🟢 Bassa</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Tag (Separati da virgola)</label>
                <Input
                  placeholder="es. direzione, urgente, cassa"
                  value={itemForm.tagsInput}
                  onChange={(e) => setItemForm({ ...itemForm, tagsInput: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-xs h-9"
                />
              </div>
            </div>

            {/* TASK SPECIFIC FIELDS */}
            {itemForm.type === "task" && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Data Limite Scadenza</label>
                    <Input
                      type="datetime-local"
                      value={itemForm.deadline}
                      onChange={(e) => setItemForm({ ...itemForm, deadline: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-xs h-9 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Stato Iniziale</label>
                    <Select
                      value={itemForm.task_status}
                      onValueChange={(val: any) => setItemForm({ ...itemForm, task_status: val })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-xs">
                        <SelectItem value="todo">🟡 Da Fare</SelectItem>
                        <SelectItem value="in_progress">🔵 In Corso</SelectItem>
                        <SelectItem value="review">🟣 In Revisione</SelectItem>
                        <SelectItem value="done">🟢 Completata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignees */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Assegna a Dipendenti</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 border border-slate-800 rounded-lg p-2 bg-slate-800/40">
                    {staffMembers.map((st) => {
                      const isAssigned = itemForm.assigned_to_ids.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            setItemForm((prev) => ({
                              ...prev,
                              assigned_to_ids: isAssigned
                                ? prev.assigned_to_ids.filter((x) => x !== st.id)
                                : [...prev.assigned_to_ids, st.id],
                            }));
                          }}
                          className={`p-1.5 rounded flex items-center justify-between text-xs cursor-pointer ${
                            isAssigned
                              ? "bg-blue-500/20 text-blue-200"
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <span className="font-medium">{st.display_name}</span>
                          <span className="text-[10px] text-slate-500">@{st.username}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Checklist Form */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Checklist Sotto-compiti</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Aggiungi voce alla checklist..."
                      value={itemForm.newChecklistText}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, newChecklistText: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChecklistEntryToForm();
                        }
                      }}
                      className="bg-slate-800 border-slate-700 text-xs h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddChecklistEntryToForm}
                      className="bg-slate-700 hover:bg-slate-600 text-xs h-8"
                    >
                      Aggiungi
                    </Button>
                  </div>

                  {itemForm.checklist.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {itemForm.checklist.map((chk) => (
                        <div
                          key={chk.id}
                          className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1 rounded text-xs text-slate-200"
                        >
                          <span>{chk.text}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistEntryFromForm(chk.id)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MEETING SPECIFIC FIELDS */}
            {itemForm.type === "meeting" && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Data e Ora Riunione *</label>
                    <Input
                      type="datetime-local"
                      value={itemForm.meeting_date}
                      onChange={(e) => setItemForm({ ...itemForm, meeting_date: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-xs h-9 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Luogo / Canale Vocale</label>
                    <Input
                      placeholder="Es. Canale Discord #direzione..."
                      value={itemForm.meeting_location}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, meeting_location: e.target.value })
                      }
                      className="bg-slate-800 border-slate-700 text-xs h-9 text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Partecipanti Convocati</label>
                  <div className="max-h-28 overflow-y-auto space-y-1 border border-slate-800 rounded-lg p-2 bg-slate-800/40">
                    {staffMembers.map((st) => {
                      const isAttendee = itemForm.attendees_ids.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            setItemForm((prev) => ({
                              ...prev,
                              attendees_ids: isAttendee
                                ? prev.attendees_ids.filter((x) => x !== st.id)
                                : [...prev.attendees_ids, st.id],
                            }));
                          }}
                          className={`p-1.5 rounded flex items-center justify-between text-xs cursor-pointer ${
                            isAttendee
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <span className="font-medium">{st.display_name}</span>
                          <span className="text-[10px] text-slate-500">@{st.username}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenItemDialog(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSaveItem}
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              {createItemMutation.isPending || updateItemMutation.isPending
                ? "Salvataggio..."
                : editingItem
                  ? "Salva Modifiche"
                  : "Pubblica"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 7: ELIMINA ELEMENTO (ITEM) */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Elimina Documento
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-300">
            Sei sicuro di voler eliminare{" "}
            <strong className="text-white">"{itemToDelete?.title}"</strong>?
          </div>
          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToDelete(null)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (itemToDelete) deleteItemMutation.mutate(itemToDelete.id);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
