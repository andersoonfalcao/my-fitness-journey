import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MethodPicker } from "@/components/MethodPicker";
import { generatePlan, type Plan } from "@/lib/plan";
import { type MethodId } from "@/lib/methods";
import { KEYS, useLocal, type Profile, type WorkoutSession } from "@/lib/store";

/**
 * Regenerate the plan (Treinos and Perfil): keep or change the method, and optionally draw other exercises.
 * The sequence starts again from the first workout, since the workouts' names and order change; history stays.
 */
export function RegenerateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone?: () => void }) {
  const [profile, setProfile] = useLocal<Profile | null>(KEYS.profile, null);
  const [plan, setPlan] = useLocal<Plan | null>(KEYS.plan, null);
  const [doneLog] = useLocal<string[]>(KEYS.done, []);
  const [, setCycleStart] = useLocal<number>(KEYS.cycle, 0);
  const [session] = useLocal<WorkoutSession | null>(KEYS.session, null);
  const [method, setMethod] = useState<MethodId | undefined>(profile?.method);
  const [newExercises, setNewExercises] = useState(true);

  useEffect(() => {
    if (open) {
      setMethod(profile?.method);
      setNewExercises(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!profile) return null;

  const regenerate = () => {
    const nextProfile = { ...profile, method };
    const variation = (plan?.variation ?? 0) + (newExercises ? 1 : 0);
    setProfile(nextProfile);
    setPlan(generatePlan(nextProfile, { variation }));
    setCycleStart(doneLog.length);
    toast.success(newExercises ? "Treino regerado com novos exercícios" : "Treino regerado");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Regerar treino</DialogTitle>
          <DialogDescription>Escolha o método e se quer trocar os exercícios. As trocas feitas à mão se perdem; o histórico e as cargas continuam.</DialogDescription>
        </DialogHeader>
        <MethodPicker profile={profile} value={method} onChange={setMethod} />
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
          <span>
            <span className="block font-semibold">Trocar os exercícios</span>
            <span className="block text-xs text-muted-foreground">Sorteia outros exercícios da biblioteca para os mesmos músculos. Desligado, mantém os atuais sempre que o método permitir.</span>
          </span>
          <Switch checked={newExercises} onCheckedChange={setNewExercises} />
        </label>
        {session ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">Há um treino em andamento. Conclua ou cancele antes de regerar.</p>
        ) : (
          <p className="text-xs text-muted-foreground">A sequência recomeça do primeiro treino do novo plano.</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="rounded-full">Voltar</Button>
          <Button type="button" onClick={regenerate} disabled={!!session} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><RefreshCw />Regerar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
