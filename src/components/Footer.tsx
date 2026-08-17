import { Link } from "@tanstack/react-router";
import { Send, Tv, MessageCircle, Anchor } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-amber-500/20 py-10 px-4 bg-[#0a0b0f] text-slate-400 text-xs mt-16">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP NOTICE LINE */}
        <div className="text-center text-[10px] md:text-[11px] font-mono tracking-widest text-slate-400 uppercase">
          L'AGGIORNAMENTO DEI DATI AVVIENE AUTOMATICAMENTE OGNI 5 MINUTI
        </div>

        <div className="h-[1px] w-full bg-slate-800/80" />

        {/* NAVIGATION LINKS */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-extrabold text-[11px] tracking-wider uppercase text-slate-300">
          <Link to="/" className="hover:text-amber-400 transition-colors">
            HOME
          </Link>
          <Link
            to="/scheda-cittadino"
            className="hover:text-amber-400 transition-colors text-amber-300 font-black"
          >
            SCHEDA CITTADINO
          </Link>
          <a href="#guida" className="hover:text-amber-400 transition-colors">
            NOVITÀ
          </a>
          <a href="#valute" className="hover:text-amber-400 transition-colors">
            VALUTE
          </a>
          <a href="#giochi" className="hover:text-amber-400 transition-colors">
            I GIOCHI
          </a>
          <Link to="/dashboard" className="hover:text-amber-400 transition-colors text-amber-400">
            GESTIONALE
          </Link>
          <a href="#membership" className="hover:text-amber-400 transition-colors">
            MEMBERSHIP
          </a>
          <a href="#cavalli" className="hover:text-amber-400 transition-colors">
            CORSE CAVALLI
          </a>
          <Link to="/ciurma" className="hover:text-amber-400 transition-colors text-sky-400">
            STAFF & CIURMA
          </Link>
        </div>

        {/* BOTTOM ROW: LOGO, SOCIAL, COPYRIGHT */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-900">
          {/* LOGO BRAND */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20">
              ♠
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wider text-slate-100">
                Casinò Revenge
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Liberty Bay • Stabilimento Ufficiale
              </div>
            </div>
          </div>

          {/* SOCIAL ICONS */}
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="https://t.me/CasinoRevengeBot"
              target="_blank"
              rel="noreferrer"
              title="Telegram Bot"
              className="p-2 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              title="Canale Telegram"
              className="p-2 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              title="YouTube"
              className="p-2 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors"
            >
              <Tv className="h-4 w-4" />
            </a>
          </div>

          {/* LEGAL / COPYRIGHT */}
          <div className="text-center md:text-right text-[11px] text-slate-400 space-y-0.5">
            <div>© {new Date().getFullYear()} Casinò Revenge. Tutti i diritti riservati.</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Non affiliato con Mojang AB o Microsoft.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
