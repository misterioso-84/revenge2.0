import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Menu,
  X,
  User,
  Anchor,
  ClipboardList,
  Home,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SiteNavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export function SiteNavbar({ onOpenLogin, onOpenRegister }: SiteNavbarProps) {
  const { user, hasEmployeeAccess } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check immediate on mount
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on path change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  const navLinks = [
    {
      label: "Home & Guida",
      shortLabel: "Home",
      href: "/",
      icon: Home,
      isActive: currentPath === "/",
    },
    {
      label: "Scheda Cittadino",
      shortLabel: "Scheda",
      href: "/scheda-cittadino",
      icon: User,
      isActive: currentPath === "/scheda-cittadino",
    },
    {
      label: "La nostra Ciurma",
      shortLabel: "Ciurma",
      href: "/ciurma",
      icon: Anchor,
      isActive: currentPath === "/ciurma",
    },
    {
      label: "Candidature",
      shortLabel: "Candidature",
      href: "/candidature",
      icon: ClipboardList,
      isActive: currentPath === "/candidature",
    },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
          isScrolled
            ? "py-2 sm:py-2.5 px-3 sm:px-6 lg:px-10 bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/30 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.95),0_0_25px_rgba(245,158,11,0.12)]"
            : "py-3 sm:py-4 px-4 sm:px-8 lg:px-12 bg-slate-950/80 backdrop-blur-md border-b border-amber-500/15 shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
        )}
      >
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 min-w-0 transition-all duration-300 ease-out">
          {/* BRAND LOGO */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-base sm:text-lg shadow-lg shadow-amber-500/20 group-hover:scale-105 group-hover:shadow-amber-500/40 transition-all shrink-0">
              ♠
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs sm:text-sm md:text-base lg:text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase leading-tight whitespace-nowrap">
                Casinò Revenge
              </div>
              <div className="hidden sm:flex text-[9px] md:text-[10px] text-amber-500/80 font-mono tracking-widest uppercase items-center gap-1 whitespace-nowrap">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span>Liberty Bay</span>
              </div>
            </div>
          </Link>

          {/* DESKTOP & LAPTOP RESPONSIVE NAV LINKS */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 xl:gap-2.5 mx-auto min-w-0 justify-center">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 lg:px-3 xl:px-4 py-1.5 xl:py-2 rounded-full text-xs xl:text-[13px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                    item.isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0",
                      item.isActive ? "text-amber-400" : "text-slate-400",
                    )}
                  />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="xl:hidden inline">{item.shortLabel}</span>
                </Link>
              );
            })}

            {hasEmployeeAccess && (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-2.5 lg:px-3 xl:px-4 py-1.5 xl:py-2 rounded-full text-xs xl:text-[13px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-sm whitespace-nowrap shrink-0 ml-0.5"
              >
                <ShieldAlert className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-amber-400 shrink-0" />
                <span className="hidden xl:inline">Gestionale Dipendenti</span>
                <span className="xl:hidden inline">Gestionale</span>
              </Link>
            )}
          </nav>

          {/* RIGHT ACTIONS / USER PROFILE */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user ? (
              <UserProfileDropdown />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onOpenLogin ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-bold h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl"
                    onClick={onOpenLogin}
                  >
                    Accedi
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-bold h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl"
                    asChild
                  >
                    <Link to="/scheda-cittadino">Accedi</Link>
                  </Button>
                )}

                {onOpenRegister ? (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl shadow-lg shadow-amber-500/20 hidden sm:flex items-center gap-1"
                    onClick={onOpenRegister}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Registrati</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl shadow-lg shadow-amber-500/20 hidden sm:flex items-center gap-1"
                    asChild
                  >
                    <Link to="/scheda-cittadino">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Registrati</span>
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* MOBILE & COMPACT MENU TOGGLE BUTTON */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Apri menu di navigazione"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* MOBILE & COMPACT DROPDOWN OVERLAY */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2.5 mx-auto max-w-lg bg-slate-950/98 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-4 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      item.isActive
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold"
                        : "text-slate-300 hover:text-white hover:bg-slate-900/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          item.isActive ? "text-amber-400" : "text-slate-400",
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              {hasEmployeeAccess && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all mt-2"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <span>Gestionale Dipendenti</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded">
                    Staff
                  </span>
                </Link>
              )}
            </div>

            {!user && (
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex flex-col gap-2">
                {onOpenLogin ? (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs h-9 rounded-xl"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLogin();
                    }}
                  >
                    Accedi
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold text-xs h-9 rounded-xl"
                    asChild
                  >
                    <Link to="/scheda-cittadino" onClick={() => setMobileMenuOpen(false)}>
                      Accedi
                    </Link>
                  </Button>
                )}

                {onOpenRegister ? (
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs h-9 rounded-xl shadow-lg shadow-amber-500/20"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRegister();
                    }}
                  >
                    Registrati / Nuova Tessera
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs h-9 rounded-xl shadow-lg shadow-amber-500/20"
                    asChild
                  >
                    <Link to="/scheda-cittadino" onClick={() => setMobileMenuOpen(false)}>
                      Registrati / Nuova Tessera
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* TOP SPACER to compensate for fixed header so content starts below navbar */}
      <div className="h-16 sm:h-20 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
