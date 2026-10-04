import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_CREDIT, photosFor } from "@/lib/exercise-photos";
import type { Exercise } from "@/lib/exercises";
import { cn } from "@/lib/utils";

type ExerciseMediaProps = {
  exercise: Exercise;
  compact?: boolean;
  className?: string;
  /** Makes the media open the exercise details (kept as a sibling of the play button, never wrapping it). */
  onOpen?: () => void;
};

export function ExerciseMedia({ exercise, compact = false, className, onOpen }: ExerciseMediaProps) {
  const photos = photosFor(exercise.id);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (photos && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  // Start and end photos alternate like a slow repetition.
  useEffect(() => {
    if (!photos || !playing) return;
    const id = setInterval(() => setFrame((f) => 1 - f), 1300);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, playing]);

  const openButton = onOpen && (
    <button type="button" onClick={onOpen} aria-label={`Ver detalhes de ${exercise.name}`} className="absolute inset-0 rounded-[inherit]" />
  );

  if (!photos) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <img src={exercise.img} alt={exercise.name} loading="lazy" width={816} height={816} className="h-full w-full object-cover" />
        {openButton}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? `Execução de ${exercise.name}` : ""}
          loading="lazy"
          width={850}
          height={567}
          // Photos are landscape: the small card crops to fill, the details view shows the whole frame.
          className={cn("absolute inset-0 h-full w-full transition-opacity duration-500", compact ? "object-cover" : "object-contain", frame === i ? "opacity-100" : "opacity-0")}
        />
      ))}
      {!compact && <span className="absolute bottom-2 left-2 rounded bg-white/80 px-1.5 text-[10px] text-muted-foreground">{PHOTO_CREDIT}</span>}
      {openButton}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={playing ? `Pausar demonstração de ${exercise.name}` : `Reproduzir demonstração de ${exercise.name}`}
        title={playing ? "Pausar demonstração" : "Reproduzir demonstração"}
        onClick={() => setPlaying((p) => !p)}
        className={cn("absolute bottom-2 right-2 rounded-full shadow-md", compact ? "h-8 w-8" : "h-9 w-9")}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
    </div>
  );
}
