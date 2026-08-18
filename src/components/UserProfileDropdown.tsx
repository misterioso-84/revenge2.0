import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User as UserIcon,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  ShieldCheck,
  ClipboardList,
  Anchor,
  Sparkles,
  ExternalLink,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function UserProfileDropdown({ className = "" }: { className?: string }) {
  const { user, profile, isAdmin, hasEmployeeAccess, customRoleNames = [] } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const username = profile?.username || user?.user_metadata?.username || "Utente";
  const displayName = profile?.display_name || username;
  const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`;
  const roleLabel = isAdmin
    ? "Amministratore"
    : customRoleNames[0] || (hasEmployeeAccess ? "Dipendente" : "Cliente");

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      toast.success("Disconnessione effettuata con successo");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message || "Errore durante la disconnessione");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-850 border border-amber-500/35 hover:border-amber-400/60 rounded-full sm:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-1.5 shadow-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group cursor-pointer ${className}`}
        >
          <div className="relative shrink-0">
            <img
              src={avatarUrl}
              alt={username}
              className="h-8 w-8 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl border border-amber-500/60 group-hover:border-amber-400 object-cover shadow-sm transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/64.png";
              }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>

          <div className="hidden md:flex flex-col text-left max-w-[110px] lg:max-w-[140px] xl:max-w-[180px]">
            <span className="text-xs font-black text-white truncate group-hover:text-amber-300 transition-colors">
              {displayName}
            </span>
            <span className="text-[10px] text-amber-400 font-semibold truncate leading-tight">
              {roleLabel}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-400 transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-72 bg-[#0d0f17] border border-amber-500/30 rounded-2xl shadow-2xl p-2 text-slate-100 z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* User Profile Header Card */}
        <div className="p-3 bg-gradient-to-b from-amber-500/15 to-transparent rounded-xl border border-amber-500/20 mb-2">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt={username}
              className="h-11 w-11 rounded-xl border-2 border-amber-500/60 object-cover shadow-md shrink-0 bg-slate-950"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://minotar.net/helm/Steve/64.png";
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white truncate">{displayName}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">@{username}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isAdmin
                      ? "border-red-500/40 text-red-300 bg-red-500/10"
                      : hasEmployeeAccess
                        ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                        : "border-sky-500/40 text-sky-300 bg-sky-500/10"
                  }`}
                >
                  {roleLabel}
                </Badge>
                {profile?.telegram_connected && (
                  <Badge
                    variant="outline"
                    className="border-sky-500/30 text-sky-300 bg-sky-500/10 text-[9px] px-1.5 py-0.5"
                  >
                    TG ✓
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY LINK: IL MIO PROFILO (Scheda Cittadino) */}
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 hover:text-white hover:bg-amber-500/20 focus:bg-amber-500/20 focus:text-white transition-colors"
        >
          <Link to="/scheda-cittadino" className="flex items-center gap-2.5 w-full">
            <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left flex-1">
              <span className="font-extrabold text-white text-xs">Il mio profilo</span>
              <span className="text-[10px] text-amber-400/80 font-normal">
                Scheda Cittadino & Tessera
              </span>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          </Link>
        </DropdownMenuItem>

        {/* GESTIONALE DIPENDENTI LINK (Se dipendente/admin) */}
        {hasEmployeeAccess && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-300 hover:text-white hover:bg-emerald-500/20 focus:bg-emerald-500/20 focus:text-white transition-colors mt-1"
          >
            <Link to="/dashboard" className="flex items-center gap-2.5 w-full">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                {isAdmin ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <LayoutDashboard className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col text-left flex-1">
                <span className="font-extrabold text-white text-xs">Gestionale Dipendenti</span>
                <span className="text-[10px] text-emerald-400/80 font-normal">
                  Accesso riservato ai dipendenti
                </span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-slate-800 my-1.5" />

        {/* HOME & GUIDA */}
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 focus:bg-slate-800/80 transition-colors"
        >
          <Link to="/" className="flex items-center gap-2.5 w-full">
            <Globe className="h-4 w-4 text-slate-400" />
            <span>Home & Guida Casinò</span>
          </Link>
        </DropdownMenuItem>

        {/* CANDIDATURE & CIURMA LINKS */}
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 focus:bg-slate-800/80 transition-colors"
        >
          <Link to="/candidature" className="flex items-center gap-2.5 w-full">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>Invia Candidatura Staff</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 focus:bg-slate-800/80 transition-colors"
        >
          <Link to="/ciurma" className="flex items-center gap-2.5 w-full">
            <Anchor className="h-4 w-4 text-slate-400" />
            <span>Staff & Ciurma Casinò</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-800 my-1.5" />

        {/* LOGOUT */}
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loggingOut}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 focus:bg-red-500/15 focus:text-red-300 transition-colors flex items-center gap-2.5"
        >
          <div className="h-6 w-6 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <LogOut className="h-3.5 w-3.5" />
          </div>
          <span>{loggingOut ? "Disconnessione in corso..." : "Disconnettiti"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
