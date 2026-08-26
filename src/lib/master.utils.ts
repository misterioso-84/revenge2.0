/**
 * Helper to compute how long ago a date occurred in human readable Italian
 */
export function calculateTimeElapsed(dateStr: string | null | undefined): {
  text: string;
  durationMs: number;
  days: number;
  hours: number;
  minutes: number;
  isUrgent: boolean;
} {
  if (!dateStr) {
    return {
      text: "Data non registrata",
      durationMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      isUrgent: false,
    };
  }

  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const days = totalDays;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let text = "";
  if (days === 0) {
    if (hours === 0) {
      text = minutes <= 1 ? "Meno di un minuto fa" : `${minutes} minuti fa`;
    } else {
      text = minutes > 0 ? `${hours}h e ${minutes}m fa` : `${hours} ore fa`;
    }
  } else if (days === 1) {
    text = hours > 0 ? `1 giorno e ${hours}h fa` : "1 giorno fa";
  } else {
    text = hours > 0 ? `${days} giorni e ${hours}h fa` : `${days} giorni fa`;
  }

  // Urgent if waiting more than 3 days
  const isUrgent = days >= 3;

  return {
    text,
    durationMs: diffMs,
    days,
    hours,
    minutes,
    isUrgent,
  };
}
