/**
 * Time-based greeting helper for Casinò Revenge
 * Returns appropriate Italian greetings based on current time:
 * - 05:00 - 11:59: Buongiorno
 * - 12:00 - 17:59: Buon pomeriggio
 * - 18:00 - 04:59: Buonasera
 */

export interface TimeGreeting {
  greeting: "Buongiorno" | "Buon pomeriggio" | "Buonasera";
  period: "morning" | "afternoon" | "evening";
  phrase: string;
  badgeLabel: string;
  emoji: string;
  accentClass: string;
  bgGradient: string;
}

export function getTimeBasedGreeting(date: Date = new Date()): TimeGreeting {
  const hours = date.getHours();

  if (hours >= 5 && hours < 12) {
    return {
      greeting: "Buongiorno",
      period: "morning",
      phrase: "Ti auguriamo un'ottima mattinata operativa a Liberty Bay",
      badgeLabel: "Turno Mattutino",
      emoji: "🌅",
      accentClass: "text-amber-400",
      bgGradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    };
  }

  if (hours >= 12 && hours < 18) {
    return {
      greeting: "Buon pomeriggio",
      period: "afternoon",
      phrase: "Buon pomeriggio di lavoro e intrattenimento ai tavoli del Casinò",
      badgeLabel: "Turno Pomeridiano",
      emoji: "☀️",
      accentClass: "text-sky-400",
      bgGradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    };
  }

  return {
    greeting: "Buonasera",
    period: "evening",
    phrase: "Buonasera e benvenuto al turno serale del Casinò Revenge",
    badgeLabel: "Turno Serale / Notturno",
    emoji: "🌙",
    accentClass: "text-indigo-400",
    bgGradient: "from-indigo-500/20 via-purple-500/5 to-transparent",
  };
}
