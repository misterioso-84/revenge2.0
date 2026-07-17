import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Palmtree } from "lucide-react";

type ForceLeaveDialogProps = {
  user: {
    id: string;
    username: string;
    display_name: string | null;
  };
  onClose: () => void;
};

export function ForceLeaveDialog({ user, onClose }: ForceLeaveDialogProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Default start date: today (Rome time)
  const todayStr = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  // Default end date: today + 3 days
  const futureStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(futureStr);
  const [reason, setReason] = useState("Inserito d'ufficio dall'Amministratore");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Specificare le date di inizio e fine congedo.");
      return;
    }

    if (startDate > endDate) {
      toast.error("La data di inizio non può essere successiva alla data di fine.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: "approved", // Automatically approved by administrator
      });

      if (error) throw error;

      toast.success(
        `Congedo forzato inserito con successo per ${user.display_name || user.username}!`,
      );
      qc.invalidateQueries({ queryKey: ["all-leaves"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'inserimento del congedo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-400">
            <Palmtree className="h-5 w-5" /> Forza Congedo
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Inserisci un periodo di congedo forzato d'ufficio per l'utente{" "}
            <span className="text-slate-200 font-semibold">
              {user.display_name || user.username}
            </span>
            . Il congedo verrà approvato istantaneamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs text-slate-300 font-medium">
                Data Inizio
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs text-slate-300 font-medium">
                Data Fine
              </Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs text-slate-300 font-medium">
              Motivazione d'ufficio
            </Label>
            <Input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Esempio: Ferie approvate d'ufficio"
              required
              className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="border-slate-800 hover:bg-slate-800 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {busy ? "Inserimento..." : "Forza Congedo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
