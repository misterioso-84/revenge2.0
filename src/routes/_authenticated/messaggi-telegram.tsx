import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  listBotTelegramGroups,
  sendBroadcastTelegramMessage,
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
  Eye,
  EyeOff,
  Link as LinkIcon,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Bot,
  ExternalLink,
  Check,
  Info,
  Terminal,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/messaggi-telegram")({
  component: TelegramMessagesPage,
});

// Telegram HTML Parser for Live Preview
function TelegramHTMLRenderer({ html }: { html: string }) {
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<number, boolean>>({});

  if (!html || !html.trim()) {
    return <span className="text-slate-500 italic">Il messaggio apparirà qui...</span>;
  }

  // Pre-process HTML string to convert Telegram <tg-spoiler> tags to a inspectable token format
  const processStr = html
    .replace(/<tg-spoiler>/gi, "___SPOILER_START___")
    .replace(/<\/tg-spoiler>/gi, "___SPOILER_END___");

  // Basic HTML sanitation & element splitting
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

    // Ignore other HTML tags for preview safety
    if (part.startsWith("<") && part.endsWith(">")) {
      return;
    }

    // Render Text node with active styles
    let node: React.ReactNode = part;

    if (inBold) {
      node = <strong>{node}</strong>;
    }
    if (inItalic) {
      node = <em>{node}</em>;
    }
    if (inUnderline) {
      node = <u>{node}</u>;
    }
    if (inStrike) {
      node = <s>{node}</s>;
    }
    if (inCode) {
      node = (
        <code className="bg-[#101b26] text-[#e0a96d] px-1.5 py-0.5 rounded font-mono text-xs border border-amber-500/20">
          {node}
        </code>
      );
    }
    if (inPre) {
      node = (
        <pre className="bg-[#0f1721] text-[#91d7ff] p-2.5 my-1.5 rounded-lg font-mono text-xs overflow-x-auto border border-sky-500/20 whitespace-pre-wrap">
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
            <span className="text-[10px] text-amber-300 font-mono not-italic block mb-0.5">
              [Citazione Espandibile]
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
          onClick={() => setSpoilerRevealed((prev) => ({ ...prev, [sId]: !prev[sId] }))}
          className={`cursor-pointer transition-all duration-200 px-1 py-0.5 rounded select-none ${
            isRevealed
              ? "bg-[#283849] text-slate-100"
              : "bg-[#283b4e] text-transparent blur-sm hover:blur-[2px] border border-sky-400/30"
          }`}
          title="Clicca per rivelare lo spoiler"
        >
          {node}
        </span>
      );
    }

    elements.push(<span key={idx}>{node}</span>);
  });

  return <div className="whitespace-pre-wrap break-words leading-relaxed">{elements}</div>;
}

function TelegramMessagesPage() {
  const { isAdmin, permissions = [] } = useAuth();
  const qc = useQueryClient();

  const canSendMessages =
    isAdmin ||
    permissions.includes("telegram.send_message") ||
    permissions.includes("ruoli.gestisci") ||
    permissions.includes("utenti.gestisci");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [inlineButtons, setInlineButtons] = useState<{ id: string; text: string; url: string }[]>(
    [],
  );
  const [newBtnText, setNewBtnText] = useState("");
  const [newBtnUrl, setNewBtnUrl] = useState("");

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");

  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    total: number;
    successCount: number;
    failCount: number;
    results: any[];
  } | null>(null);

  // Load Telegram groups from server
  const {
    data: groups = [],
    isLoading: loadingGroups,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["bot-telegram-groups"],
    queryFn: async () => {
      const res = await listBotTelegramGroups();
      return res || [];
    },
    enabled: canSendMessages,
  });

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g: any) =>
        (g.title || "").toLowerCase().includes(q) ||
        String(g.chat_id || "").includes(q) ||
        (g.type || "").toLowerCase().includes(q),
    );
  }, [groups, searchQuery]);

  const toggleGroupSelect = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    );
  };

  const selectAllGroups = () => {
    setSelectedChatIds(filteredGroups.map((g: any) => String(g.chat_id)));
  };

  const deselectAllGroups = () => {
    setSelectedChatIds([]);
  };

  // Formatting tool helper
  const applyTag = (openTag: string, closeTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageText((prev) => `${prev}${openTag}testo${closeTag}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    if (start !== end) {
      const selected = currentText.substring(start, end);
      const replacement = `${openTag}${selected}${closeTag}`;
      const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, end + openTag.length);
      }, 50);
    } else {
      const placeholder = "testo";
      const replacement = `${openTag}${placeholder}${closeTag}`;
      const newText = currentText.substring(0, start) + replacement + currentText.substring(end);
      setMessageText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + openTag.length,
          start + openTag.length + placeholder.length,
        );
      }, 50);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageText((prev) => `${prev}${emoji}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newText = currentText.substring(0, start) + emoji + currentText.substring(end);
    setMessageText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || linkUrl === "https://") {
      toast.error("Inserisci un URL valido.");
      return;
    }
    const label = linkText.trim() || "Link";
    applyTag(`<a href="${linkUrl.trim()}">`, "</a>");
    setLinkModalOpen(false);
    setLinkText("");
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
    setNewBtnUrl("");
  };

  const removeInlineButton = (id: string) => {
    setInlineButtons((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSendBroadcast = async () => {
    if (selectedChatIds.length === 0) {
      toast.error("Seleziona almeno un gruppo Telegram destinatario.");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Inserisci il testo del messaggio da inviare.");
      return;
    }

    try {
      setIsSending(true);
      setSendResult(null);

      const res = await sendBroadcastTelegramMessage({
        data: {
          chatIds: selectedChatIds,
          text: messageText,
          buttons: inlineButtons.map((b) => ({ text: b.text, url: b.url })),
        },
      });

      setSendResult(res);
      if (res.successCount > 0) {
        toast.success(
          `Messaggio inviato con successo a ${res.successCount} di ${res.total} gruppi!`,
        );
      } else {
        toast.error("Impossibile inviare il messaggio ai gruppi selezionati.");
      }
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'invio del messaggio.");
    } finally {
      setIsSending(false);
    }
  };

  if (!canSendMessages) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Card className="bg-slate-900 border-red-500/30 text-white shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-400" />
              <div>
                <CardTitle className="text-xl text-red-300">Accesso Negato</CardTitle>
                <CardDescription className="text-slate-400">
                  Non disponi dei permessi necessari per inviare messaggi nei gruppi Telegram del
                  Bot.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300">
              Contatta un Amministratore o Capitano per richiedere il permesso{" "}
              <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">
                telegram.send_message
              </code>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
    2,
    "0",
  )}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 rounded-2xl shadow-lg">
              <Send className="h-7 w-7 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Invio Messaggi Gruppi Telegram
                </h1>
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 font-semibold text-xs">
                  Bot Offizioso
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Seleziona i gruppi target, inserisci la formattazione e verifica la preview Telegram
                prima di inviare.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => refetchGroups()}
          variant="outline"
          className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 gap-2 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aggiorna Gruppi
        </Button>
      </div>

      {/* Main Grid: Left = Group Selection & Formatting, Right = Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Groups + Formatter (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Group Selector */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-950/60 border-b border-slate-800/80 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-400" />
                  <div>
                    <CardTitle className="text-base text-white">
                      1. Seleziona Gruppi Destinatari
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {selectedChatIds.length} di {groups.length} gruppi selezionati
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllGroups}
                    className="h-8 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                  >
                    Seleziona Tutti
                  </Button>
                  <span className="text-slate-700">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllGroups}
                    className="h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Deseleziona
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Cerca gruppo per nome o Chat ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950/80 border-slate-800 text-slate-200 text-xs h-9"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {loadingGroups ? (
                  <div className="text-center py-8 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                    Caricamento gruppi Telegram...
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Nessun gruppo Telegram trovato.
                  </div>
                ) : (
                  filteredGroups.map((group: any) => {
                    const cIdStr = String(group.chat_id);
                    const isChecked = selectedChatIds.includes(cIdStr);

                    return (
                      <div
                        key={group.id || cIdStr}
                        onClick={() => toggleGroupSelect(cIdStr)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-sky-500/10 border-sky-500/40 text-sky-200 shadow-sm"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleGroupSelect(cIdStr)}
                            className="border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                          />
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              {group.title}
                              {group.type && (
                                <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] px-1.5 py-0 uppercase">
                                  {group.type}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono">ID: {cIdStr}</p>
                          </div>
                        </div>

                        {isChecked && <Check className="h-4 w-4 text-sky-400" />}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor & Formatting */}
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="bg-slate-950/60 border-b border-slate-800/80 py-4">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-sky-400" />
                2. Componi Messaggio Formattato
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Usa la barra degli strumenti per formattare il testo. Telegram supporta grassetto,
                corsivo, citazioni (cita), spoiler e blocchi codice.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Formatting Toolbar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<b>", "</b>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-bold gap-1"
                    title="Grassetto (<b>)"
                  >
                    <Bold className="h-3.5 w-3.5" />B
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<i>", "</i>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs italic gap-1"
                    title="Corsivo (<i>)"
                  >
                    <Italic className="h-3.5 w-3.5" />I
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<u>", "</u>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs underline gap-1"
                    title="Sottolineato (<u>)"
                  >
                    <Underline className="h-3.5 w-3.5" />U
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<s>", "</s>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs line-through gap-1"
                    title="Barrato (<s>)"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />S
                  </Button>

                  <span className="text-slate-700 mx-0.5">|</span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<tg-spoiler>", "</tg-spoiler>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs gap-1"
                    title="Spoiler / Testo Nascosto (<tg-spoiler>)"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Spoiler
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<blockquote>", "</blockquote>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-teal-300 hover:bg-teal-500/10 hover:text-teal-200 text-xs gap-1"
                    title="Cita / Citazione (<blockquote>)"
                  >
                    <Quote className="h-3.5 w-3.5" />
                    Cita
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<blockquote expandable>", "</blockquote>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 text-xs gap-1"
                    title="Citazione Espandibile (<blockquote expandable>)"
                  >
                    <Quote className="h-3.5 w-3.5 text-amber-400" />
                    Cita Espandibile
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<code>", "</code>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200 text-xs font-mono gap-1"
                    title="Codice Monospazio (<code>)"
                  >
                    <Code className="h-3.5 w-3.5" />
                    Codice
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTag("<pre>", "</pre>")}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 text-xs font-mono gap-1"
                    title="Blocco di Codice (<pre>)"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    Blocco
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkModalOpen(true)}
                    className="h-8 px-2.5 bg-slate-900 border-slate-800 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 text-xs gap-1"
                    title="Link Ipertestuale (<a href>)"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Link
                  </Button>
                </div>

                {/* Quick Emoji Bar */}
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
                    Quick Emojis:
                  </span>
                  {[
                    "📢",
                    "⚠️",
                    "⚓",
                    "🎲",
                    "💎",
                    "👑",
                    "🔥",
                    "✨",
                    "📜",
                    "📌",
                    "🏆",
                    "💰",
                    "⚡",
                    "💙",
                    "❌",
                    "✅",
                  ].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="h-7 w-7 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:scale-110 transition-transform text-xs flex items-center justify-center"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Text Area */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Testo del Messaggio (supporta HTML Telegram):
                </Label>
                <Textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Scrivi qui il tuo messaggio... Usa <b>grassetto</b>, <i>corsivo</i>, <tg-spoiler>spoiler</tg-spoiler> o <code>codice</code>"
                  className="min-h-[160px] bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 font-sans text-xs leading-relaxed focus:border-sky-500 resize-y"
                />
              </div>

              {/* Optional Inline Keyboard Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                    Pulsanti Inline Telegram (Opzionale)
                  </Label>
                  <span className="text-[10px] text-slate-500">
                    Aggiunge bottoni con link sotto il messaggio
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Testo Pulsante (es. 🌐 Apri Portale)"
                    value={newBtnText}
                    onChange={(e) => setNewBtnText(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8 sm:w-1/2"
                  />
                  <Input
                    placeholder="URL Link (es. https://...)"
                    value={newBtnUrl}
                    onChange={(e) => setNewBtnUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8 sm:w-1/2"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addInlineButton}
                    className="h-8 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shrink-0 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aggiungi
                  </Button>
                </div>

                {inlineButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inlineButtons.map((btn) => (
                      <div
                        key={btn.id}
                        className="flex items-center gap-2 bg-slate-950 border border-sky-500/30 px-2.5 py-1 rounded-lg text-xs text-sky-300"
                      >
                        <span className="font-semibold">{btn.text}</span>
                        <span className="text-[10px] text-slate-500 max-w-[120px] truncate">
                          {btn.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeInlineButton(btn.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Target:{" "}
                  <span className="font-bold text-sky-400">
                    {selectedChatIds.length} gruppi Telegram
                  </span>
                </div>

                <Button
                  onClick={handleSendBroadcast}
                  disabled={isSending || selectedChatIds.length === 0 || !messageText.trim()}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-sky-500/20 gap-2"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Invia Messaggio ora ({selectedChatIds.length})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Telegram Real Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl sticky top-6 overflow-hidden">
            <CardHeader className="bg-slate-950/80 border-b border-slate-800 py-3.5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm text-white">Preview Reale Telegram</CardTitle>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                Live Rendering
              </Badge>
            </CardHeader>

            <CardContent className="p-4 bg-[#0e1621] min-h-[420px] flex flex-col justify-between font-sans">
              {/* Telegram App Interface Mockup */}
              <div className="space-y-4">
                {/* Telegram Group Header */}
                <div className="flex items-center justify-between bg-[#17212b] p-3 rounded-xl border border-slate-800/60 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#17212b]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Casinò Revenge Bot</span>
                        <Badge className="bg-sky-500/20 text-sky-300 border-none text-[9px] px-1 py-0">
                          bot
                        </Badge>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-medium">online</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">Chat ID: -100...</span>
                </div>

                {/* Telegram Date Divider */}
                <div className="flex justify-center">
                  <span className="bg-[#17212b]/80 border border-slate-800/60 text-slate-400 text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    Oggi
                  </span>
                </div>

                {/* Telegram Message Bubble */}
                <div className="flex flex-col items-start max-w-[92%] space-y-1">
                  <div className="bg-[#182533] border border-[#2b5278]/40 rounded-2xl rounded-tl-sm p-3.5 text-slate-100 text-xs shadow-lg relative min-w-[200px] space-y-2">
                    {/* Bot Sender Name */}
                    <p className="text-[#64b5ef] font-bold text-[11px]">Casinò Revenge Bot</p>

                    {/* Main Rendered HTML Message */}
                    <div className="text-slate-100 text-xs leading-relaxed">
                      <TelegramHTMLRenderer html={messageText} />
                    </div>

                    {/* Time & Sent Status */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-[#6e859b] pt-1">
                      <span>{timeStr}</span>
                      <span className="text-[#64b5ef] font-bold">✓✓</span>
                    </div>
                  </div>

                  {/* Inline Buttons Preview */}
                  {inlineButtons.length > 0 && (
                    <div className="w-full space-y-1 pt-1">
                      {inlineButtons.map((btn) => (
                        <a
                          key={btn.id}
                          href={btn.url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full bg-[#1e2c3a] hover:bg-[#2b3e52] border border-[#2b5278]/60 text-[#64b5ef] font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <span>{btn.text}</span>
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Tip */}
              <div className="pt-6 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Info className="h-3.5 w-3.5 text-sky-400" />
                  Suggerimento Telegram:
                </p>
                <p>
                  Gli spoiler si possono rivelare direttamente nella preview cliccandoci sopra. I
                  link con tag HTML apriranno la pagina di destinazione.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Broadcast Results Notification Card */}
          {sendResult && (
            <Card
              className={`border text-white shadow-xl ${
                sendResult.failCount === 0
                  ? "bg-emerald-950/40 border-emerald-500/40"
                  : "bg-amber-950/40 border-amber-500/40"
              }`}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  {sendResult.failCount === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  Esito Invio: {sendResult.successCount} / {sendResult.total} inviati con successo
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 text-xs space-y-1.5">
                {sendResult.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800"
                  >
                    <span className="font-semibold text-slate-200">{r.title}</span>
                    {r.success ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        Inviato ✓
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
                        {r.error || "Fallito"}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Link Insertion Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-slate-900 border-slate-800 text-white w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-sky-400" />
                Inserisci Link Ipertestuale
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Aggiunge un link cliccabile all'interno del testo del messaggio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Testo del Link:</Label>
                <Input
                  placeholder="Es. Visita il nostro sito"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">URL Destinazione:</Label>
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLinkModalOpen(false)}
                  className="bg-slate-800 border-slate-700 text-xs"
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLink}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                >
                  Inserisci Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
