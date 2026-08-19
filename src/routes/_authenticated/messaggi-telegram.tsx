import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listAllTelegramChats,
  getTelegramChatMessages,
  sendTelegramChatMessage,
  togglePinTelegramMessage,
  toggleTelegramMessageReaction,
  togglePinChat,
  sendBroadcastTelegramMessage,
  deleteTelegramChatMessageFn,
  getTelegramGroupMembersListFn,
  kickTelegramMemberFromGroupFn,
  promoteTelegramMemberInGroupFn,
} from "@/lib/telegram-groups.functions";
import {
  Send,
  MessageSquare,
  Users,
  Search,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Bot,
  ExternalLink,
  Pin,
  PinOff,
  Reply,
  Copy,
  Volume2,
  VolumeX,
  User,
  CheckCheck,
  Radio,
  X,
  ArrowLeft,
  Maximize2,
  Minimize2,
  MoreVertical,
  Shield,
  ShieldAlert,
  Crown,
  UserMinus,
  UserCheck,
  UserX,
  Info,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/messaggi-telegram")({
  component: TelegramMessagesPage,
});

// Quick Emojis for Reactions & Composer
const QUICK_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "🔥",
  "👏",
  "🎉",
  "💎",
  "🎲",
  "👑",
  "⚡",
  "🚀",
  "💩",
  "💯",
  "😍",
  "😱",
  "🤩",
];

const COMPOSER_EMOJIS = [
  "😀",
  "🎲",
  "👑",
  "🔥",
  "💎",
  "⚔️",
  "🛡️",
  "💰",
  "🎰",
  "🐎",
  "🃏",
  "👍",
  "❤️",
  "🎉",
  "⚡",
  "🚀",
  "💯",
  "🏆",
  "✨",
  "⚠️",
  "📣",
];

// Telegram HTML Parser for Live Preview & Chat Bubbles
function TelegramHTMLRenderer({
  html,
  onSpoilerReveal,
}: {
  html: string;
  onSpoilerReveal?: () => void;
}) {
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<number, boolean>>({});

  if (!html || !html.trim()) {
    return <span className="text-slate-500 italic text-sm">Messaggio vuoto...</span>;
  }

  // Convert Telegram <tg-spoiler> tags
  const processStr = html
    .replace(/<tg-spoiler>/gi, "___SPOILER_START___")
    .replace(/<\/tg-spoiler>/gi, "___SPOILER_END___");

  const parts = processStr.split(/(<[^>]+>|___SPOILER_START___|___SPOILER_END___)/g);

  let inBold = false;
  let inItalic = false;
  let inUnderline = false;
  let inStrike = false;
  let inCode = false;
  let inPre = false;
  let inQuote = false;
  let isQuoteExpandable = false;
  let inSpoiler = false;
  let currentLinkUrl: string | null = null;
  let spoilerCounter = 0;

  const elements: React.ReactNode[] = [];

  parts.forEach((part, idx) => {
    if (!part) return;

    if (part === "___SPOILER_START___") {
      inSpoiler = true;
      return;
    }
    if (part === "___SPOILER_END___") {
      inSpoiler = false;
      return;
    }

    const lower = part.toLowerCase();

    if (lower === "<b>" || lower === "<strong>") {
      inBold = true;
      return;
    }
    if (lower === "</b>" || lower === "</strong>") {
      inBold = false;
      return;
    }
    if (lower === "<i>" || lower === "<em>") {
      inItalic = true;
      return;
    }
    if (lower === "</i>" || lower === "</em>") {
      inItalic = false;
      return;
    }
    if (lower === "<u>" || lower === "<ins>") {
      inUnderline = true;
      return;
    }
    if (lower === "</u>" || lower === "</ins>") {
      inUnderline = false;
      return;
    }
    if (lower === "<s>" || lower === "<del>") {
      inStrike = true;
      return;
    }
    if (lower === "</s>" || lower === "</del>") {
      inStrike = false;
      return;
    }
    if (lower === "<code>") {
      inCode = true;
      return;
    }
    if (lower === "</code>") {
      inCode = false;
      return;
    }
    if (lower === "<pre>") {
      inPre = true;
      return;
    }
    if (lower === "</pre>") {
      inPre = false;
      return;
    }
    if (lower.startsWith("<blockquote")) {
      inQuote = true;
      isQuoteExpandable = lower.includes("expandable");
      return;
    }
    if (lower === "</blockquote>") {
      inQuote = false;
      isQuoteExpandable = false;
      return;
    }
    if (lower.startsWith("<a ") && lower.includes("href=")) {
      const hrefMatch = part.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) currentLinkUrl = hrefMatch[1];
      return;
    }
    if (lower === "</a>") {
      currentLinkUrl = null;
      return;
    }

    if (part.startsWith("<") && part.endsWith(">")) {
      return;
    }

    let node: React.ReactNode = part;

    if (inBold) {
      node = <strong className="font-bold text-white">{node}</strong>;
    }
    if (inItalic) {
      node = <em className="italic">{node}</em>;
    }
    if (inUnderline) {
      node = <u className="underline underline-offset-2">{node}</u>;
    }
    if (inStrike) {
      node = <s className="line-through opacity-80">{node}</s>;
    }
    if (inCode) {
      node = (
        <code className="bg-[#0b131d] text-[#e0a96d] px-1.5 py-0.5 rounded font-mono text-xs border border-amber-500/20">
          {node}
        </code>
      );
    }
    if (inPre) {
      node = (
        <pre className="bg-[#0b131d] text-[#91d7ff] p-2.5 my-1.5 rounded-lg font-mono text-xs overflow-x-auto border border-sky-500/20 whitespace-pre-wrap">
          {node}
        </pre>
      );
    }
    if (inQuote) {
      node = (
        <blockquote
          className={`border-l-4 border-sky-400 pl-2.5 my-1 bg-[#101c28]/90 py-1 pr-2 rounded-r text-slate-200 italic font-sans text-xs ${
            isQuoteExpandable ? "border-amber-400 bg-amber-950/30" : ""
          }`}
        >
          {isQuoteExpandable && (
            <span className="text-[10px] text-amber-300 font-mono not-italic block mb-0.5 font-bold">
              [Citazione]
            </span>
          )}
          {node}
        </blockquote>
      );
    }
    if (currentLinkUrl) {
      node = (
        <a
          href={currentLinkUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[#64b5ef] underline hover:text-sky-300 transition-colors"
        >
          {node}
        </a>
      );
    }

    if (inSpoiler) {
      const sId = ++spoilerCounter;
      const isRevealed = !!spoilerRevealed[sId];

      node = (
        <span
          key={`spoiler-${idx}-${sId}`}
          onClick={() => {
            setSpoilerRevealed((prev) => ({ ...prev, [sId]: !prev[sId] }));
            if (onSpoilerReveal) onSpoilerReveal();
          }}
          className={`cursor-pointer transition-all duration-200 px-1 py-0.5 rounded select-none ${
            isRevealed
              ? "bg-[#283849] text-slate-100"
              : "bg-[#283b4e] text-transparent blur-[3px] hover:blur-[2px] border border-sky-400/30"
          }`}
          title="Clicca per rivelare lo spoiler"
        >
          {node}
        </span>
      );
    }

    elements.push(<span key={idx}>{node}</span>);
  });

  return <div className="whitespace-pre-wrap break-words leading-relaxed text-sm">{elements}</div>;
}

function TelegramMessagesPage() {
  const { isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();

  const canAccess =
    isAdmin ||
    permissions.includes("telegram.send_message") ||
    permissions.includes("ruoli.gestisci") ||
    permissions.includes("utenti.gestisci");

  const [activeTab, setActiveTab] = useState<"all" | "groups" | "private" | "pinned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<any | null>(null);

  // Responsive mobile view: 'list' shows chat list, 'chat' shows conversation
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Group Details & Members Sidebar/Modal
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Broadcast Multi-select mode
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [selectedBroadcastIds, setSelectedBroadcastIds] = useState<string[]>([]);

  // Composer states
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [pinOnSend, setPinOnSend] = useState(false);
  const [silentSend, setSilentSend] = useState(false);
  const [inlineButtons, setInlineButtons] = useState<{ id: string; text: string; url: string }[]>(
    [],
  );
  const [newBtnText, setNewBtnText] = useState("");
  const [newBtnUrl, setNewBtnUrl] = useState("https://");
  const [showButtonBuilder, setShowButtonBuilder] = useState(false);
  const [isExpandedComposer, setIsExpandedComposer] = useState(false);

  // Link dialog
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  // Long press / Action sheet state on message
  const [activeActionMessage, setActiveActionMessage] = useState<any | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  // Delete message confirmation
  const [messageToDelete, setMessageToDelete] = useState<any | null>(null);

  // Highlighted message ref
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch All Telegram Chats (Groups, Channels, DMs)
  const {
    data: chatsData,
    isLoading: loadingChats,
    refetch: refetchChats,
  } = useQuery({
    queryKey: ["telegram-all-chats"],
    queryFn: async () => {
      const res = await listAllTelegramChats();
      return res?.chats || [];
    },
    enabled: canAccess,
    refetchInterval: 6000,
  });

  const chats = useMemo(() => chatsData || [], [chatsData]);

  // Set default selected chat when list loads on desktop
  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    } else if (selectedChat) {
      const updated = chats.find((c: any) => String(c.chat_id) === String(selectedChat.chat_id));
      if (updated) setSelectedChat(updated);
    }
  }, [chats]);

  // 2. Fetch Message History for the Selected Chat
  const {
    data: messagesData,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["telegram-chat-messages", selectedChat?.chat_id],
    queryFn: async () => {
      if (!selectedChat?.chat_id) return [];
      const res = await getTelegramChatMessages({
        data: { chatId: selectedChat.chat_id },
      });
      return res?.messages || [];
    },
    enabled: !!selectedChat?.chat_id,
    refetchInterval: 3000,
  });

  const messages = useMemo(() => messagesData || [], [messagesData]);

  // 3. Fetch Group Members for Selected Group
  const {
    data: membersData,
    isLoading: loadingMembers,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ["telegram-group-members", selectedChat?.chat_id],
    queryFn: async () => {
      if (!selectedChat?.chat_id) return [];
      const res = await getTelegramGroupMembersListFn({
        data: { chatId: selectedChat.chat_id },
      });
      return res?.members || [];
    },
    enabled: !!selectedChat?.chat_id && (showMembersPanel || selectedChat?.category === "groups"),
    refetchInterval: 8000,
  });

  const groupMembers = useMemo(() => membersData || [], [membersData]);

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return groupMembers;
    const q = memberSearch.toLowerCase();
    return groupMembers.filter(
      (m: any) =>
        m.display_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.handle?.toLowerCase().includes(q) ||
        m.minecraft_username?.toLowerCase().includes(q) ||
        String(m.telegram_user_id).includes(q),
    );
  }, [groupMembers, memberSearch]);

  // Pinned messages in selected chat
  const pinnedMessages = useMemo(() => {
    return messages.filter((m: any) => m.is_pinned);
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedChat?.chat_id]);

  // Filter chats by tab and search
  const filteredChats = useMemo(() => {
    return chats.filter((chat: any) => {
      if (activeTab === "groups" && chat.category !== "groups") return false;
      if (activeTab === "private" && chat.category !== "private") return false;
      if (activeTab === "pinned" && !chat.is_pinned) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        chat.title?.toLowerCase().includes(q) ||
        chat.handle?.toLowerCase().includes(q) ||
        chat.username?.toLowerCase().includes(q) ||
        chat.last_message?.toLowerCase().includes(q) ||
        String(chat.chat_id).includes(q)
      );
    });
  }, [chats, activeTab, searchQuery]);

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (payload: {
      chatId: string | number;
      text: string;
      replyToMessageId?: number;
      isPinned?: boolean;
      silent?: boolean;
      buttons?: { text: string; url: string }[];
    }) => {
      return await sendTelegramChatMessage({ data: payload });
    },
    onSuccess: () => {
      setMessageText("");
      setReplyingTo(null);
      setPinOnSend(false);
      setInlineButtons([]);
      setShowButtonBuilder(false);
      setIsExpandedComposer(false);
      qc.invalidateQueries({ queryKey: ["telegram-chat-messages", selectedChat?.chat_id] });
      qc.invalidateQueries({ queryKey: ["telegram-all-chats"] });
      toast.success("Messaggio inviato con successo!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore durante l'invio del messaggio su Telegram.");
    },
  });

  // Delete Message Mutation
  const deleteMutation = useMutation({
    mutationFn: async (payload: { chatId: string | number; messageId: number }) => {
      return await deleteTelegramChatMessageFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-chat-messages", selectedChat?.chat_id] });
      qc.invalidateQueries({ queryKey: ["telegram-all-chats"] });
      toast.success("Messaggio eliminato con successo.");
      setActiveActionMessage(null);
      setMessageToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Impossibile eliminare il messaggio.");
    },
  });

  // Pin/Unpin Message Mutation
  const pinMessageMutation = useMutation({
    mutationFn: async (payload: {
      chatId: string | number;
      messageId: number;
      isPinned: boolean;
    }) => {
      return await togglePinTelegramMessage({ data: payload });
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["telegram-chat-messages", selectedChat?.chat_id] });
      qc.invalidateQueries({ queryKey: ["telegram-all-chats"] });
      toast.success(
        vars.isPinned ? "📌 Messaggio fissato in alto!" : "Messaggio rimosso dai fissati.",
      );
      setActiveActionMessage(null);
    },
  });

  // Reaction Mutation
  const reactionMutation = useMutation({
    mutationFn: async (payload: { chatId: string | number; messageId: number; emoji: string }) => {
      return await toggleTelegramMessageReaction({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-chat-messages", selectedChat?.chat_id] });
      setActiveActionMessage(null);
    },
  });

  // Pin Chat in Sidebar Mutation
  const pinChatMutation = useMutation({
    mutationFn: async (chatId: string | number) => {
      return await togglePinChat({ data: { chatId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-all-chats"] });
    },
  });

  // Kick Member Mutation
  const kickMemberMutation = useMutation({
    mutationFn: async (payload: { chatId: string | number; userId: string | number }) => {
      return await kickTelegramMemberFromGroupFn({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram-group-members", selectedChat?.chat_id] });
      toast.success("Utente espulso dal gruppo Telegram.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore durante l'espulsione dell'utente.");
    },
  });

  // Promote Member Mutation
  const promoteMemberMutation = useMutation({
    mutationFn: async (payload: {
      chatId: string | number;
      userId: string | number;
      isPromote: boolean;
    }) => {
      return await promoteTelegramMemberInGroupFn({ data: payload });
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["telegram-group-members", selectedChat?.chat_id] });
      toast.success(
        vars.isPromote
          ? "🛡️ Utente promosso ad Amministratore nel gruppo!"
          : "Permessi di amministratore revocati.",
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore nella modifica dei permessi dell'utente.");
    },
  });

  // Broadcast Multi-Message Mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload: {
      chatIds: (string | number)[];
      text: string;
      buttons?: { text: string; url: string }[];
    }) => {
      return await sendBroadcastTelegramMessage({ data: payload });
    },
    onSuccess: (res) => {
      toast.success(`Trasmissione inviata a ${res.successCount}/${res.total} gruppi!`);
      setMessageText("");
      setInlineButtons([]);
      setSelectedBroadcastIds([]);
      setBroadcastMode(false);
      setIsExpandedComposer(false);
      qc.invalidateQueries({ queryKey: ["telegram-all-chats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Errore durante la trasmissione.");
    },
  });

  // Formatting tool helper
  const applyTag = (openTag: string, closeTag: string) => {
    const targetTextarea = isExpandedComposer ? expandedTextareaRef.current : textareaRef.current;
    if (!targetTextarea) {
      setMessageText((prev) => `${prev}${openTag}testo${closeTag}`);
      return;
    }

    const start = targetTextarea.selectionStart;
    const end = targetTextarea.selectionEnd;
    const currentText = targetTextarea.value;

    if (start !== end) {
      const selected = currentText.substring(start, end);
      const replacement = `${openTag}${selected}${closeTag}`;
      const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        targetTextarea.focus();
        targetTextarea.setSelectionRange(start + openTag.length, end + openTag.length);
      }, 50);
    } else {
      const placeholder = "testo";
      const replacement = `${openTag}${placeholder}${closeTag}`;
      const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        targetTextarea.focus();
        targetTextarea.setSelectionRange(
          start + openTag.length,
          start + openTag.length + placeholder.length,
        );
      }, 50);
    }
  };

  const insertEmoji = (emoji: string) => {
    const targetTextarea = isExpandedComposer ? expandedTextareaRef.current : textareaRef.current;
    if (!targetTextarea) {
      setMessageText((prev) => `${prev}${emoji}`);
      return;
    }
    const start = targetTextarea.selectionStart;
    const end = targetTextarea.selectionEnd;
    const currentText = targetTextarea.value;
    const newText = currentText.substring(0, start) + emoji + currentText.substring(end);
    setMessageText(newText);
    setTimeout(() => {
      targetTextarea.focus();
      targetTextarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || linkUrl === "https://") {
      toast.error("Inserisci un URL valido.");
      return;
    }
    applyTag(`<a href="${linkUrl.trim()}">`, "</a>");
    setLinkModalOpen(false);
    setLinkUrl("https://");
  };

  const addInlineButton = () => {
    if (!newBtnText.trim() || !newBtnUrl.trim()) {
      toast.error("Compila sia il testo che l'URL del pulsante.");
      return;
    }
    setInlineButtons((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newBtnText.trim(), url: newBtnUrl.trim() },
    ]);
    setNewBtnText("");
    setNewBtnUrl("https://");
  };

  const jumpToMessage = (messageId: number) => {
    setHighlightedMessageId(messageId);
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2500);
  };

  // Touch and Long-Press Handlers for Messages
  const handleTouchStart = (msg: any) => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (e) {
          // ignore
        }
      }
      setActiveActionMessage(msg);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setActiveActionMessage(msg);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error("Il testo del messaggio non può essere vuoto.");
      return;
    }

    if (broadcastMode) {
      if (selectedBroadcastIds.length === 0) {
        toast.error("Seleziona almeno un gruppo o canale destinatario.");
        return;
      }
      broadcastMutation.mutate({
        chatIds: selectedBroadcastIds,
        text: messageText,
        buttons: inlineButtons.map((b) => ({ text: b.text, url: b.url })),
      });
      return;
    }

    if (!selectedChat) {
      toast.error("Seleziona una chat dalla barra laterale.");
      return;
    }

    sendMutation.mutate({
      chatId: selectedChat.chat_id,
      text: messageText,
      replyToMessageId: replyingTo?.message_id,
      isPinned: pinOnSend,
      silent: silentSend,
      buttons: inlineButtons.map((b) => ({ text: b.text, url: b.url })),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Accesso Riservato allo Staff</h2>
        <p className="text-slate-400 max-w-md text-sm">
          Questa sezione è accessibile solo agli Amministratori e ai membri dello Staff autorizzati
          per la gestione delle comunicazioni Telegram.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col bg-[#0e1621] text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* TOP STATUS / HEADER BAR */}
      <div className="bg-[#17212b] border-b border-slate-800/80 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button when viewing active chat */}
          {mobileView === "chat" && selectedChat && !broadcastMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMobileView("list");
                setShowMembersPanel(false);
              }}
              className="md:hidden h-8 w-8 p-0 text-sky-400 hover:text-white hover:bg-slate-800"
              title="Torna alle chat"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              Telegram Web Manager
              <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] py-0 px-1.5 font-mono hidden sm:inline-flex">
                Revenge Bot & Userbot
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              Gruppi Ufficiali Staff, Canali e Chat Private con i Cittadini di Liberty Bay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            size="sm"
            variant={broadcastMode ? "default" : "outline"}
            onClick={() => {
              setBroadcastMode(!broadcastMode);
              if (!broadcastMode) {
                setSelectedBroadcastIds(
                  chats
                    .filter((c: any) => c.category === "groups")
                    .map((c: any) => String(c.chat_id)),
                );
              }
            }}
            className={cn(
              "text-xs gap-1.5 h-8 font-semibold px-2.5 sm:px-3",
              broadcastMode
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                : "border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white",
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {broadcastMode ? "Singola Chat" : "Trasmetti a Più Gruppi"}
            </span>
            <span className="sm:hidden">{broadcastMode ? "Singola" : "Multi"}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              refetchChats();
              if (selectedChat) {
                refetchMessages();
                refetchMembers();
              }
              toast.success("Chat e membri aggiornati.");
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title="Aggiorna chat e messaggi"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* MAIN SPLIT CONTAINER: SIDEBAR + CHAT AREA + OPTIONAL MEMBERS PANEL */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR: CHATS LIST */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "bg-[#17212b] border-r border-slate-800/80 flex flex-col shrink-0 transition-all duration-200 z-10",
            "w-full md:w-80 lg:w-96",
            mobileView === "chat" && !broadcastMode ? "hidden md:flex" : "flex",
          )}
        >
          {/* SEARCH BOX */}
          <div className="p-2.5 sm:p-3 border-b border-slate-800/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca chat, player o messaggi..."
                className="pl-9 h-9 bg-[#242f3d] border-none text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* FILTER TABS */}
            <div className="flex items-center gap-1 bg-[#0e1621] p-1 rounded-lg border border-slate-800 text-[11px] font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-md transition-colors text-center whitespace-nowrap",
                  activeTab === "all"
                    ? "bg-[#2b5278] text-white"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                Tutte ({chats.length})
              </button>
              <button
                onClick={() => setActiveTab("groups")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-md transition-colors text-center whitespace-nowrap",
                  activeTab === "groups"
                    ? "bg-[#2b5278] text-white"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                Gruppi ({chats.filter((c: any) => c.category === "groups").length})
              </button>
              <button
                onClick={() => setActiveTab("private")}
                className={cn(
                  "flex-1 py-1 px-2 rounded-md transition-colors text-center whitespace-nowrap",
                  activeTab === "private"
                    ? "bg-[#2b5278] text-white"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                DM ({chats.filter((c: any) => c.category === "private").length})
              </button>
              <button
                onClick={() => setActiveTab("pinned")}
                className={cn(
                  "py-1 px-2 rounded-md transition-colors text-center whitespace-nowrap",
                  activeTab === "pinned"
                    ? "bg-[#2b5278] text-white"
                    : "text-slate-400 hover:text-slate-200",
                )}
                title="Chat Fissate"
              >
                📌 ({chats.filter((c: any) => c.is_pinned).length})
              </button>
            </div>
          </div>

          {/* CHAT LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
            {loadingChats ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-sky-400" />
                <p>Caricamento chat Telegram...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-600" />
                <p>Nessuna chat trovata</p>
                <p className="text-[11px] text-slate-600">
                  Registra un nuovo gruppo con <code>/registragruppo</code> o collega utenti con{" "}
                  <code>/associa</code>.
                </p>
              </div>
            ) : (
              filteredChats.map((chat: any) => {
                const isSelected = !broadcastMode && selectedChat?.id === chat.id;
                const isBroadcastChecked =
                  broadcastMode && selectedBroadcastIds.includes(String(chat.chat_id));

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      if (broadcastMode) {
                        const idStr = String(chat.chat_id);
                        setSelectedBroadcastIds((prev) =>
                          prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr],
                        );
                      } else {
                        setSelectedChat(chat);
                        setMobileView("chat");
                      }
                    }}
                    className={cn(
                      "p-3 flex items-start gap-3 cursor-pointer transition-colors relative group select-none",
                      isSelected ? "bg-[#2b5278] text-white" : "hover:bg-[#202b36] text-slate-300",
                    )}
                  >
                    {/* Broadcast Checkbox */}
                    {broadcastMode && (
                      <div className="self-center">
                        <input
                          type="checkbox"
                          checked={isBroadcastChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    {/* AVATAR */}
                    <div className="relative shrink-0">
                      {chat.avatar_url ? (
                        <img
                          src={chat.avatar_url}
                          alt={chat.title}
                          className="h-11 w-11 rounded-full object-cover bg-slate-900 border border-slate-700/80 shadow"
                        />
                      ) : chat.category === "groups" ? (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow">
                          <Users className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white font-bold text-sm shadow">
                          <User className="h-5 w-5" />
                        </div>
                      )}

                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
                    </div>

                    {/* DETAILS */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {chat.title}
                          {chat.category === "private" && (
                            <span className="text-[10px] text-sky-400 font-mono">DM</span>
                          )}
                        </h3>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(chat.last_message_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-[11px] truncate leading-tight",
                          isSelected ? "text-sky-100" : "text-slate-400",
                        )}
                      >
                        {chat.last_message}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500 font-mono truncate">
                          {chat.subtitle}
                        </span>

                        <div className="flex items-center gap-1">
                          {chat.is_pinned && (
                            <Pin className="h-3 w-3 text-amber-400 shrink-0 fill-amber-400" />
                          )}
                          {chat.pinned_message_count > 0 && (
                            <span className="text-[9px] bg-slate-800/80 text-amber-300 px-1 rounded font-mono">
                              {chat.pinned_message_count} 📌
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Pin Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        pinChatMutation.mutate(chat.chat_id);
                      }}
                      className={cn(
                        "absolute right-2 top-2 p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-amber-400 transition-opacity",
                        chat.is_pinned
                          ? "opacity-100 text-amber-400"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                      title={chat.is_pinned ? "Rimuovi dai fissati" : "Fissa in alto"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT CHAT AREA / CONVERSATION STREAM */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-[#0e1621] relative overflow-hidden",
            mobileView === "list" && !broadcastMode ? "hidden md:flex" : "flex",
          )}
        >
          {broadcastMode ? (
            /* BROADCAST MODE PANEL */
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4 max-w-2xl mx-auto w-full">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Radio className="h-4 w-4" />
                    Modalità Trasmissione Multi-Gruppo
                  </div>
                  <p className="text-xs text-slate-300">
                    Stai per inviare un annuncio contemporaneo a{" "}
                    <strong className="text-white">{selectedBroadcastIds.length}</strong> gruppi o
                    canali selezionati. Seleziona o deseleziona i destinatari dalla barra di
                    sinistra.
                  </p>
                </div>

                {/* Selected Groups Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Gruppi Destinatari ({selectedBroadcastIds.length}):</span>
                    <button
                      onClick={() =>
                        setSelectedBroadcastIds(
                          chats
                            .filter((c: any) => c.category === "groups")
                            .map((c: any) => String(c.chat_id)),
                        )
                      }
                      className="text-sky-400 hover:underline text-[11px]"
                    >
                      Seleziona tutti i gruppi
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                    {selectedBroadcastIds.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">
                        Nessun gruppo selezionato.
                      </span>
                    ) : (
                      selectedBroadcastIds.map((cid) => {
                        const found = chats.find((c: any) => String(c.chat_id) === String(cid));
                        return (
                          <span
                            key={cid}
                            className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-700"
                          >
                            <Users className="h-3 w-3 text-sky-400" />
                            {found?.title || `Chat ${cid}`}
                            <button
                              onClick={() =>
                                setSelectedBroadcastIds((prev) =>
                                  prev.filter((x) => x !== String(cid)),
                                )
                              }
                              className="text-slate-400 hover:text-rose-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : !selectedChat ? (
            /* EMPTY STATE */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-500">
              <div className="h-16 w-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-300">Seleziona una Chat</h2>
              <p className="text-xs max-w-sm">
                Scegli una conversazione dalla colonna di sinistra per leggere i messaggi,
                rispondere, gestire i membri, aggiungere reazioni o fissare comunicazioni
                importanti.
              </p>
            </div>
          ) : (
            /* ACTIVE CHAT VIEW */
            <>
              {/* CHAT HEADER (CLICKABLE FOR GROUP MEMBERS / DETAILS) */}
              <div className="bg-[#17212b] border-b border-slate-800/80 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shrink-0 shadow-md">
                <div
                  onClick={() => setShowMembersPanel(!showMembersPanel)}
                  className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer hover:opacity-90 transition-opacity flex-1"
                  title="Clicca per visualizzare e gestire i membri del gruppo"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileView("list");
                      setShowMembersPanel(false);
                    }}
                    className="md:hidden h-8 w-8 p-0 text-slate-400 hover:text-white mr-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  {selectedChat.avatar_url ? (
                    <img
                      src={selectedChat.avatar_url}
                      alt={selectedChat.title}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover bg-slate-900 border border-slate-700 shadow"
                    />
                  ) : selectedChat.category === "groups" ? (
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white font-bold text-sm shadow">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 sm:gap-2">
                      {selectedChat.title}
                      {selectedChat.category === "groups" ? (
                        <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] sm:text-[10px] py-0 px-1 font-mono">
                          {groupMembers.length > 0
                            ? `${groupMembers.length} Membri`
                            : "Gruppo Staff"}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] sm:text-[10px] py-0 px-1">
                          DM Cittadino
                        </Badge>
                      )}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                      {selectedChat.handle ? `${selectedChat.handle} • ` : ""}
                      <span>
                        ID: <code>{selectedChat.chat_id}</code>
                      </span>
                      <span className="text-sky-400 text-[10px] font-semibold hidden sm:inline">
                        (Clicca per Info & Membri)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Toggle Members Panel Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowMembersPanel(!showMembersPanel)}
                    className={cn(
                      "h-8 px-2 sm:px-2.5 text-xs gap-1 sm:gap-1.5 border border-slate-700/80",
                      showMembersPanel
                        ? "text-sky-400 bg-sky-500/10 border-sky-500/30"
                        : "text-slate-400 hover:text-white",
                    )}
                    title="Visualizza e gestisci i membri del gruppo"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Membri</span>
                    {groupMembers.length > 0 && (
                      <span className="text-[10px] font-mono bg-slate-800 px-1 rounded">
                        {groupMembers.length}
                      </span>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => pinChatMutation.mutate(selectedChat.chat_id)}
                    className={cn(
                      "h-8 px-2 sm:px-2.5 text-xs gap-1 sm:gap-1.5 border border-slate-700/80",
                      selectedChat.is_pinned
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-slate-400 hover:text-white",
                    )}
                    title={selectedChat.is_pinned ? "Rimuovi dai fissati" : "Fissa questa chat"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {selectedChat.is_pinned ? "Fissata" : "Fissa"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* PINNED MESSAGES BANNER (IF ANY) */}
              {pinnedMessages.length > 0 && (
                <div className="bg-[#1b2838] border-b border-amber-500/30 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-amber-300 shrink-0">
                  <div
                    onClick={() => jumpToMessage(pinnedMessages[0].message_id)}
                    className="flex items-center gap-2 cursor-pointer hover:underline truncate max-w-xl"
                  >
                    <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0 fill-amber-400" />
                    <span className="font-bold shrink-0">Fissato:</span>
                    <span className="text-slate-300 truncate">
                      {pinnedMessages[0].text.replace(/<[^>]*>?/gm, "")}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      pinMessageMutation.mutate({
                        chatId: selectedChat.chat_id,
                        messageId: pinnedMessages[0].message_id,
                        isPinned: false,
                      })
                    }
                    className="text-slate-400 hover:text-rose-400 p-1"
                    title="Rimuovi dai fissati"
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* MESSAGE STREAM */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 custom-scrollbar bg-[radial-gradient(#1c2a38_1px,transparent_1px)] [background-size:16px_16px]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2 text-sky-400" />
                    Caricamento messaggi...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 text-xs space-y-2">
                    <MessageSquare className="h-8 w-8 text-slate-600" />
                    <p>Nessun messaggio in questa conversazione</p>
                    <p className="text-[11px] text-slate-600">
                      Invia un messaggio o tieni premuto sui messaggi per le opzioni rapide ed
                      eliminazione.
                    </p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isStaff = msg.sender_type === "staff" || msg.sender_type === "bot";
                    const isHighlighted = highlightedMessageId === msg.message_id;

                    return (
                      <div
                        key={msg.id || msg.message_id}
                        id={`msg-${msg.message_id}`}
                        className={cn(
                          "flex flex-col group transition-all duration-300 relative",
                          isStaff ? "items-end" : "items-start",
                          isHighlighted
                            ? "bg-amber-500/15 p-2 rounded-2xl ring-2 ring-amber-400"
                            : "",
                        )}
                      >
                        {/* MESSAGE BUBBLE WITH LONG-PRESS & CONTEXT MENU */}
                        <div
                          onTouchStart={() => handleTouchStart(msg)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchEnd}
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          className={cn(
                            "relative max-w-[92%] sm:max-w-xl rounded-2xl p-3 sm:p-4 shadow-lg space-y-2 select-text group",
                            isStaff
                              ? "bg-[#2b5278] text-white rounded-br-none"
                              : "bg-[#182533] text-slate-200 rounded-bl-none border border-slate-700/60",
                          )}
                        >
                          {/* SENDER HEADER */}
                          <div className="flex items-center justify-between gap-3 text-xs border-b border-white/10 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sky-300">{msg.sender_name}</span>
                              {msg.sender_type === "bot" && (
                                <Badge className="bg-sky-500/20 text-sky-300 border-none text-[9px] py-0 px-1 font-mono">
                                  BOT
                                </Badge>
                              )}
                              {msg.sender_role && (
                                <span className="text-[10px] text-amber-300 font-mono">
                                  [{msg.sender_role}]
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              {msg.is_pinned && (
                                <Pin
                                  className="h-3 w-3 text-amber-400 fill-amber-400"
                                  title="Messaggio Fissato"
                                />
                              )}
                              <span>
                                {new Date(msg.created_at || msg.date * 1000).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                              {isStaff && <CheckCheck className="h-3.5 w-3.5 text-sky-300" />}

                              {/* Mobile 3-Dots Menu Trigger */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMessage(msg);
                                }}
                                className="sm:hidden p-0.5 text-slate-400 hover:text-white"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* QUOTED / REPLIED MESSAGE PREVIEW */}
                          {msg.reply_to_message && (
                            <div
                              onClick={() => jumpToMessage(msg.reply_to_message.message_id)}
                              className="border-l-4 border-amber-400 bg-slate-950/40 rounded-r-lg p-2 text-xs space-y-0.5 cursor-pointer hover:bg-slate-950/60 transition-colors"
                            >
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                <Reply className="h-3 w-3" />
                                <span>{msg.reply_to_message.sender_name || "Utente"}</span>
                              </div>
                              <p className="text-slate-300 text-[11px] line-clamp-1 italic">
                                {msg.reply_to_message.text?.replace(/<[^>]*>?/gm, "")}
                              </p>
                            </div>
                          )}

                          {/* MESSAGE BODY */}
                          <div className="text-sm">
                            <TelegramHTMLRenderer html={msg.text} />
                          </div>

                          {/* INLINE BUTTONS (IF ATTACHED) */}
                          {msg.inline_buttons && msg.inline_buttons.length > 0 && (
                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                              {msg.inline_buttons.map((btn: any, bIdx: number) => (
                                <a
                                  key={bIdx}
                                  href={btn.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-[#242f3d]/90 hover:bg-[#2f3f52] text-sky-300 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-sky-500/30 transition-colors shadow-sm"
                                >
                                  <span>{btn.text}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* REACTIONS PILLS */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-white/5">
                              {msg.reactions.map((r: any, rIdx: number) => (
                                <button
                                  key={rIdx}
                                  onClick={() =>
                                    reactionMutation.mutate({
                                      chatId: selectedChat.chat_id,
                                      messageId: msg.message_id,
                                      emoji: r.emoji,
                                    })
                                  }
                                  className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-transform hover:scale-105"
                                  title={`Reazioni: ${r.users?.map((u: any) => u.name).join(", ")}`}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="font-bold text-slate-300 text-[10px]">
                                    {r.count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* HOVER ACTIONS TOOLBAR (DESKTOP) */}
                          <div
                            className={cn(
                              "hidden sm:flex absolute top-[-14px] items-center gap-1 bg-[#17212b] border border-slate-700 rounded-full px-2 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10",
                              isStaff ? "right-2" : "left-2",
                            )}
                          >
                            {/* Quick Reactions */}
                            <div className="flex items-center gap-1 pr-1 border-r border-slate-700">
                              {["👍", "❤️", "🔥", "👑", "🎲"].map((emo) => (
                                <button
                                  key={emo}
                                  onClick={() =>
                                    reactionMutation.mutate({
                                      chatId: selectedChat.chat_id,
                                      messageId: msg.message_id,
                                      emoji: emo,
                                    })
                                  }
                                  className="hover:scale-125 transition-transform text-xs"
                                  title={`Reagisci con ${emo}`}
                                >
                                  {emo}
                                </button>
                              ))}
                            </div>

                            {/* Reply Action */}
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                textareaRef.current?.focus();
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded text-xs flex items-center gap-1"
                              title="Rispondi a questo messaggio"
                            >
                              <Reply className="h-3 w-3" />
                            </button>

                            {/* Pin / Unpin Action */}
                            <button
                              onClick={() =>
                                pinMessageMutation.mutate({
                                  chatId: selectedChat.chat_id,
                                  messageId: msg.message_id,
                                  isPinned: !msg.is_pinned,
                                })
                              }
                              className={cn(
                                "p-1 hover:bg-slate-800 rounded text-xs",
                                msg.is_pinned
                                  ? "text-amber-400"
                                  : "text-slate-400 hover:text-amber-400",
                              )}
                              title={msg.is_pinned ? "Rimuovi dai fissati" : "Fissa messaggio"}
                            >
                              <Pin className="h-3 w-3" />
                            </button>

                            {/* Delete Message Action */}
                            <button
                              onClick={() => setMessageToDelete(msg)}
                              className="p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded text-xs"
                              title="Elimina messaggio da Telegram"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>

                            {/* Copy text action */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                                toast.success("Testo copiato!");
                              }}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                              title="Copia testo"
                            >
                              <Copy className="h-3 w-3" />
                            </button>

                            {/* More Options */}
                            <button
                              onClick={() => setActiveActionMessage(msg)}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                              title="Tutte le opzioni"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM MESSAGE COMPOSER - HIGH-SPACIOUS & EXPANDABLE */}
          {/* ========================================================================= */}
          <div className="bg-[#17212b] border-t border-slate-800 p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 shrink-0">
            {/* REPLYING-TO PREVIEW BANNER */}
            {replyingTo && (
              <div className="bg-[#202b36] border-l-4 border-amber-400 rounded-r-lg p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Risposta a</span>
                  <strong className="text-white">{replyingTo.sender_name}:</strong>
                  <span className="text-slate-300 italic truncate max-w-md">
                    {replyingTo.text?.replace(/<[^>]*>?/gm, "")}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-400 hover:text-rose-400 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* FORMATTING TOOLBAR & OPTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-800/80 pb-2 text-xs">
              {/* Text formatting tags */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-[#0e1621] p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-full">
                <button
                  onClick={() => applyTag("<b>", "</b>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="Grassetto (<b>...</b>)"
                >
                  <Bold className="h-3.5 w-3.5 font-bold" />
                </button>
                <button
                  onClick={() => applyTag("<i>", "</i>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="Corsivo (<i>...</i>)"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyTag("<u>", "</u>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="Sottolineato (<u>...</u>)"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyTag("<s>", "</s>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="Barrato (<s>...</s>)"
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyTag("<code>", "</code>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-amber-400 font-mono"
                  title="Codice inline (<code>...</code>)"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => applyTag("<tg-spoiler>", "</tg-spoiler>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-sky-400"
                  title="Spoiler (<tg-spoiler>...</tg-spoiler>)"
                >
                  <span className="text-[10px] font-bold">👁️</span>
                </button>
                <button
                  onClick={() => applyTag("<blockquote>", "</blockquote>")}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                  title="Citazione (<blockquote>...</blockquote>)"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setLinkModalOpen(true)}
                  className="p-1 sm:p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-sky-400"
                  title="Inserisci Link (<a href='...'>...</a>)"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Composer Toggles */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowButtonBuilder(!showButtonBuilder)}
                  className={cn(
                    "h-7 text-[11px] sm:text-xs px-2 gap-1 border border-slate-700",
                    inlineButtons.length > 0
                      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                      : "text-slate-400",
                  )}
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">Pulsanti URL</span> ({inlineButtons.length})
                </Button>

                {!broadcastMode && (
                  <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pinOnSend}
                      onChange={(e) => setPinOnSend(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                    <Pin className="h-3 w-3 text-amber-400" />
                    <span className="hidden sm:inline">Fissa subito</span>
                  </label>
                )}

                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={silentSend}
                    onChange={(e) => setSilentSend(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  {silentSend ? (
                    <VolumeX className="h-3 w-3 text-rose-400" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-slate-400" />
                  )}
                  <span className="hidden sm:inline">Silenzioso</span>
                </label>

                {/* EXPAND COMPOSER / ZEN WRITING STUDIO BUTTON */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpandedComposer(true)}
                  className="h-7 text-xs px-2 text-sky-400 hover:text-white hover:bg-slate-800 border border-sky-500/30 gap-1"
                  title="Apri Editor Grande con Anteprima Live per scrivere comodamente"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Spazio Scrittura</span>
                </Button>
              </div>
            </div>

            {/* INLINE BUTTON BUILDER ACCORDION */}
            {showButtonBuilder && (
              <div className="bg-[#202b36] border border-slate-700/80 rounded-xl p-2.5 sm:p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Pulsanti Tastiera Inline Telegram:</span>
                  <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                    (Verranno allegati sotto al messaggio)
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newBtnText}
                    onChange={(e) => setNewBtnText(e.target.value)}
                    placeholder="Testo Pulsante (es. Apri Casinò)"
                    className="h-8 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                  <Input
                    value={newBtnUrl}
                    onChange={(e) => setNewBtnUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className="h-8 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                  <Button
                    size="sm"
                    onClick={addInlineButton}
                    className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0"
                  >
                    Aggiungi
                  </Button>
                </div>

                {inlineButtons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {inlineButtons.map((btn) => (
                      <span
                        key={btn.id}
                        className="bg-slate-900 text-sky-300 text-xs px-2.5 py-1 rounded-lg border border-sky-500/30 flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <strong>{btn.text}</strong> ({btn.url})
                        <button
                          onClick={() =>
                            setInlineButtons((prev) => prev.filter((b) => b.id !== btn.id))
                          }
                          className="text-slate-400 hover:text-rose-400 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUICK EMOJIS ROW */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-sm custom-scrollbar">
              <span className="text-[10px] text-slate-500 uppercase font-mono mr-1 shrink-0">
                Emoji:
              </span>
              {COMPOSER_EMOJIS.map((emo) => (
                <button
                  key={emo}
                  onClick={() => insertEmoji(emo)}
                  className="hover:scale-125 transition-transform p-1 shrink-0"
                >
                  {emo}
                </button>
              ))}
            </div>

            {/* TEXTAREA & SEND ACTION (COMFORTABLE HEIGHT) */}
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  broadcastMode
                    ? `Scrivi il messaggio da trasmettere a ${selectedBroadcastIds.length} gruppi... (HTML supportato, Ctrl+Invio per inviare)`
                    : `Scrivi a ${selectedChat?.title || "chat"}... (HTML supportato, Ctrl+Invio per inviare)`
                }
                rows={3}
                className="bg-[#242f3d] border-none text-sm text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-xl resize-y min-h-[64px] max-h-56 p-3 leading-relaxed"
              />

              <Button
                onClick={handleSendMessage}
                disabled={
                  sendMutation.isPending ||
                  broadcastMutation.isPending ||
                  !messageText.trim() ||
                  (broadcastMode && selectedBroadcastIds.length === 0)
                }
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-lg"
                title="Invia messaggio"
              >
                {sendMutation.isPending || broadcastMutation.isPending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: GROUP INFO & MEMBERS MANAGEMENT (PC & MOBILE) */}
        {/* ========================================================================= */}
        {showMembersPanel && selectedChat && (
          <div
            className={cn(
              "bg-[#17212b] border-l border-slate-800 flex flex-col z-20 transition-all shadow-2xl",
              "absolute inset-y-0 right-0 w-full sm:w-96 md:relative md:w-80 lg:w-96",
            )}
          >
            {/* PANEL HEADER */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-[#111923]">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 text-sky-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  Membri & Info Gruppo
                </h3>
                {groupMembers.length > 0 && (
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] py-0 px-1.5 font-mono">
                    {groupMembers.length}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    refetchMembers();
                    toast.success("Lista membri aggiornata!");
                  }}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-sky-400 hover:bg-slate-800"
                  title="Aggiorna lista membri"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loadingMembers && "animate-spin text-sky-400")}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMembersPanel(false)}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Chiudi pannello"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* GROUP STATS & QUICK INFO */}
            <div className="p-3 border-b border-slate-800 bg-[#141d27] space-y-2">
              <div className="flex items-center gap-3">
                {selectedChat.avatar_url ? (
                  <img
                    src={selectedChat.avatar_url}
                    alt={selectedChat.title}
                    className="h-12 w-12 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow">
                    <Users className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {selectedChat.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    Chat ID: {selectedChat.chat_id}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sincronizzazione Userbot & Bot Attiva
                  </p>
                </div>
              </div>

              {/* SEARCH MEMBERS */}
              <div className="relative pt-1">
                <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cerca membro o Minecraft nick..."
                  className="pl-8 h-8 bg-slate-900/80 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* MEMBERS LIST */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar p-1">
              {loadingMembers ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto text-sky-400" />
                  <p>Caricamento lista membri...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                  <Users className="h-6 w-6 mx-auto text-slate-600" />
                  <p>Nessun membro trovato con questa ricerca.</p>
                </div>
              ) : (
                filteredMembers.map((m: any) => {
                  const isCreator = m.status === "creator";
                  const isAdminMember = m.status === "administrator" || isCreator;
                  const isKicked = m.status === "kicked";

                  return (
                    <div
                      key={m.telegram_user_id}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2 transition-colors",
                        isKicked
                          ? "bg-rose-950/20 opacity-60"
                          : "hover:bg-slate-800/60 text-slate-200",
                      )}
                    >
                      {/* Avatar & Identifiers */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.display_name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400">
                              {m.display_name?.[0] || "U"}
                            </div>
                          )}
                          {isCreator && (
                            <Crown className="absolute -top-1.5 -right-1.5 h-4 w-4 text-amber-400 fill-amber-400 drop-shadow" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {m.display_name}
                            </span>
                            {m.is_bot && (
                              <Badge className="bg-sky-500/20 text-sky-300 text-[8px] py-0 px-1 font-mono">
                                BOT
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate">
                            {m.handle && <span className="text-sky-400 truncate">{m.handle}</span>}
                            {m.minecraft_username && (
                              <span className="text-amber-300 truncate">
                                [MC: {m.minecraft_username}]
                              </span>
                            )}
                          </div>

                          {/* Role / Custom Title Badge */}
                          <div className="pt-0.5">
                            <Badge
                              className={cn(
                                "text-[9px] py-0 px-1 font-mono",
                                isCreator
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : isAdminMember
                                    ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                    : isKicked
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                      : "bg-slate-800 text-slate-400 border-slate-700",
                              )}
                            >
                              {m.custom_title || (isAdminMember ? "Amministratore" : "Membro")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Moderation & Role Actions (Promote / Demote / Kick) */}
                      {!isCreator && !m.is_bot && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Promote / Demote Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              promoteMemberMutation.mutate({
                                chatId: selectedChat.chat_id,
                                userId: m.telegram_user_id,
                                isPromote: !isAdminMember,
                              })
                            }
                            disabled={promoteMemberMutation.isPending}
                            className={cn(
                              "h-7 w-7 p-0 rounded-lg",
                              isAdminMember
                                ? "text-amber-400 hover:bg-amber-950/40 hover:text-amber-300"
                                : "text-slate-400 hover:bg-slate-800 hover:text-sky-400",
                            )}
                            title={
                              isAdminMember
                                ? "Revoca privilegi di Amministratore"
                                : "Promuovi ad Amministratore"
                            }
                          >
                            {isAdminMember ? (
                              <ShieldAlert className="h-3.5 w-3.5" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Kick Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                confirm(
                                  `Vuoi davvero espellere ${m.display_name} dal gruppo Telegram?`,
                                )
                              ) {
                                kickMemberMutation.mutate({
                                  chatId: selectedChat.chat_id,
                                  userId: m.telegram_user_id,
                                });
                              }
                            }}
                            disabled={kickMemberMutation.isPending}
                            className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400"
                            title="Espelli dal gruppo Telegram"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXPANDED WRITING STUDIO / FULL-SCREEN COMPOSER MODAL */}
      {/* ========================================================================= */}
      {isExpandedComposer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col p-2 sm:p-6 animate-in fade-in">
          <div className="bg-[#17212b] border border-slate-700 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-5xl mx-auto w-full">
            {/* STUDIO HEADER */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-[#111923]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {broadcastMode
                      ? `Studio Trasmissione (${selectedBroadcastIds.length} gruppi)`
                      : `Studio Scrittura per ${selectedChat?.title || "Chat"}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Spazio di scrittura esteso con formattazione e anteprima istantanea Telegram
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpandedComposer(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <Minimize2 className="h-4 w-4 mr-1.5" />
                  Riduci
                </Button>
              </div>
            </div>

            {/* STUDIO BODY (SPLIT EDITOR + LIVE PREVIEW) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* LEFT: TEXTAREA & TOOLS */}
              <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 bg-[#17212b] overflow-y-auto">
                {/* Formatting bar */}
                <div className="flex flex-wrap items-center gap-1 bg-[#0e1621] p-1.5 rounded-xl border border-slate-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<b>", "</b>")}
                    className="h-7 px-2 text-xs font-bold text-white"
                  >
                    Grassetto
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<i>", "</i>")}
                    className="h-7 px-2 text-xs italic text-slate-300"
                  >
                    Corsivo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<u>", "</u>")}
                    className="h-7 px-2 text-xs underline text-slate-300"
                  >
                    Sottolineato
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<s>", "</s>")}
                    className="h-7 px-2 text-xs line-through text-slate-300"
                  >
                    Barrato
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<code>", "</code>")}
                    className="h-7 px-2 text-xs font-mono text-amber-400"
                  >
                    Codice
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<tg-spoiler>", "</tg-spoiler>")}
                    className="h-7 px-2 text-xs text-sky-400"
                  >
                    Spoiler 👁️
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTag("<blockquote>", "</blockquote>")}
                    className="h-7 px-2 text-xs text-indigo-300"
                  >
                    Citazione ❝
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLinkModalOpen(true)}
                    className="h-7 px-2 text-xs text-sky-300"
                  >
                    Link 🔗
                  </Button>
                </div>

                {/* Emojis row */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-sm bg-slate-900/40 p-2 rounded-xl border border-slate-800">
                  {COMPOSER_EMOJIS.map((emo) => (
                    <button
                      key={emo}
                      onClick={() => insertEmoji(emo)}
                      className="hover:scale-125 transition-transform p-1"
                    >
                      {emo}
                    </button>
                  ))}
                </div>

                {/* Large Textarea */}
                <Textarea
                  ref={expandedTextareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Scrivi qui il tuo lungo testo formattato... Supporta tutti i tag HTML di Telegram come <b>grassetto</b>, <i>corsivo</i>, <code>codice</code>, <tg-spoiler>spoiler</tg-spoiler>, <blockquote expandable>citazioni</blockquote> e <a href='...'>link</a>"
                  className="flex-1 bg-[#242f3d] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-xl p-4 resize-none leading-relaxed min-h-[220px]"
                />
              </div>

              {/* RIGHT: LIVE TELEGRAM PREVIEW */}
              <div className="flex-1 flex flex-col p-3 sm:p-4 bg-[#0e1621] space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
                  <span>Anteprima Live su Telegram:</span>
                  <span className="text-[11px] text-sky-400 font-normal">
                    (Come apparirà nel canale o chat)
                  </span>
                </div>

                <div className="flex-1 bg-[#182533] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-inner space-y-3 overflow-y-auto">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="font-bold text-sky-300">Staff Casinò Revenge</span>
                    <span className="text-[10px] text-slate-400 font-mono">Adesso</span>
                  </div>

                  <div className="text-sm">
                    <TelegramHTMLRenderer html={messageText} />
                  </div>

                  {inlineButtons.length > 0 && (
                    <div className="grid grid-cols-1 gap-1.5 pt-2">
                      {inlineButtons.map((btn, bIdx) => (
                        <div
                          key={bIdx}
                          className="bg-[#242f3d] text-sky-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-sky-500/30"
                        >
                          <span>{btn.text}</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STUDIO FOOTER */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#111923] flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>
                  Caratteri: <strong className="text-white">{messageText.length}</strong>
                </span>
                {!broadcastMode && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinOnSend}
                      onChange={(e) => setPinOnSend(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                    <Pin className="h-3.5 w-3.5 text-amber-400" />
                    <span>Fissa subito all'invio</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsExpandedComposer(false)}
                  className="text-xs text-slate-400"
                >
                  Annulla
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={
                    sendMutation.isPending ||
                    broadcastMutation.isPending ||
                    !messageText.trim() ||
                    (broadcastMode && selectedBroadcastIds.length === 0)
                  }
                  className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold gap-1.5 px-4"
                >
                  {sendMutation.isPending || broadcastMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Invia Messaggio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LONG-PRESS / RIGHT-CLICK MESSAGE ACTIONS BOTTOM SHEET & MODAL */}
      {/* ========================================================================= */}
      {activeActionMessage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setActiveActionMessage(null)}
        >
          <div
            className="bg-[#17212b] border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Snippet */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                  {activeActionMessage.sender_name?.[0] || "U"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {activeActionMessage.sender_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID Messaggio: {activeActionMessage.message_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveActionMessage(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Reactions Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-bold block">Reagisci:</span>
              <div className="flex flex-wrap gap-1.5 bg-slate-900/70 p-2 rounded-xl border border-slate-800">
                {QUICK_REACTION_EMOJIS.map((emo) => (
                  <button
                    key={emo}
                    onClick={() =>
                      reactionMutation.mutate({
                        chatId: selectedChat.chat_id,
                        messageId: activeActionMessage.message_id,
                        emoji: emo,
                      })
                    }
                    className="h-9 w-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                    title={`Reagisci con ${emo}`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons List */}
            <div className="space-y-1 pt-1">
              <button
                onClick={() => {
                  setReplyingTo(activeActionMessage);
                  setActiveActionMessage(null);
                  textareaRef.current?.focus();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 hover:text-white transition-colors"
              >
                <Reply className="h-4 w-4 text-sky-400" />
                <span>Rispondi a questo messaggio</span>
              </button>

              <button
                onClick={() =>
                  pinMessageMutation.mutate({
                    chatId: selectedChat.chat_id,
                    messageId: activeActionMessage.message_id,
                    isPinned: !activeActionMessage.is_pinned,
                  })
                }
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 hover:text-white transition-colors"
              >
                <Pin
                  className={cn(
                    "h-4 w-4",
                    activeActionMessage.is_pinned ? "text-amber-400" : "text-slate-400",
                  )}
                />
                <span>
                  {activeActionMessage.is_pinned
                    ? "Rimuovi dai messaggi fissati"
                    : "Fissa messaggio in alto"}
                </span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeActionMessage.text);
                  toast.success("Testo del messaggio copiato!");
                  setActiveActionMessage(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 hover:text-white transition-colors"
              >
                <Copy className="h-4 w-4 text-emerald-400" />
                <span>Copia testo del messaggio</span>
              </button>

              {/* DELETE MESSAGE OPTION */}
              <button
                onClick={() => {
                  setMessageToDelete(activeActionMessage);
                  setActiveActionMessage(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-950/40 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Elimina messaggio da Telegram</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(String(activeActionMessage.message_id));
                  toast.success("ID messaggio copiato!");
                  setActiveActionMessage(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors font-mono"
              >
                <Code className="h-4 w-4 text-slate-500" />
                <span>Copia ID: {activeActionMessage.message_id}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MESSAGE CONFIRMATION MODAL */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#17212b] border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Elimina Messaggio</h4>
                <p className="text-xs text-slate-400">Vuoi davvero eliminare questo messaggio?</p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 italic line-clamp-3">
              {messageToDelete.text?.replace(/<[^>]*>?/gm, "")}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMessageToDelete(null)}
                className="text-xs text-slate-400"
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  deleteMutation.mutate({
                    chatId: selectedChat.chat_id,
                    messageId: messageToDelete.message_id,
                  })
                }
                disabled={deleteMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INSERT LINK MODAL */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#17212b] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-sky-400" />
              Inserisci Link Telegram HTML
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">URL di Destinazione:</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://casino-revenge.com/..."
                  className="bg-[#242f3d] border-slate-700 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLinkModalOpen(false)}
                className="text-xs text-slate-400"
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleAddLink}
                className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold"
              >
                Inserisci Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
