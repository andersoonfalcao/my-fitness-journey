import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motionFor } from "@/lib/exercise-motion";
import type { Exercise } from "@/lib/exercises";
import { cn } from "@/lib/utils";

type ExerciseMediaProps = {
  exercise: Exercise;
  compact?: boolean;
  className?: string;
};

export function ExerciseMedia({ exercise, compact = false, className }: ExerciseMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const motion = motionFor(exercise.id);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [motion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().then(() => setPlaying(true));
    else {
      video.pause();
      setPlaying(false);
    }
  };

  if (!motion || failed) {
    return <img src={exercise.img} alt={exercise.name} loading="lazy" width={816} height={816} className={cn("object-cover", className)} />;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={motion}
        poster={exercise.img}
        aria-label={`Demonstração de ${exercise.name}`}
        muted
        loop
        playsInline
        preload={compact ? "metadata" : "auto"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={playing ? `Pausar demonstração de ${exercise.name}` : `Reproduzir demonstração de ${exercise.name}`}
        title={playing ? "Pausar demonstração" : "Reproduzir demonstração"}
        onClick={(event) => {
          event.stopPropagation();
          togglePlayback();
        }}
        className={cn("absolute bottom-2 right-2 rounded-full shadow-md", compact ? "h-8 w-8" : "h-9 w-9")}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
    </div>
  );
}