import Model, { type IExerciseData, type Muscle } from "react-body-highlighter";
import { byId, type Exercise, type Group } from "@/lib/exercises";

/** Muscles of the body model (react-body-highlighter, MIT) for each exercise group. */
const GROUP_MUSCLES: Record<Group, Muscle[]> = {
  peito: ["chest"],
  costas: ["upper-back", "lower-back"],
  quadriceps: ["quadriceps"],
  posterior: ["hamstring", "gluteal"],
  ombros: ["front-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  core: ["abs", "obliques"],
  panturrilha: ["calves", "left-soleus", "right-soleus"],
  trapezio: ["trapezius"],
  antebraco: ["forearm"],
  cardio: [],
};

function musclesOfExercise(id: string): Muscle[] {
  // Records may keep exercises that have since left the library.
  const ex = byId(id) as Exercise | undefined;
  if (!ex) return [];
  // Rear-delt work (reverse fly, face pull) lights the back of the shoulder instead of the front.
  if (ex.group === "ombros" && ex.pattern === "abrir-ombro-posterior") return ["back-deltoids"];
  return GROUP_MUSCLES[ex.group];
}

// Index = how many entries hit the muscle: the class's muscles in light orange, the open exercise in full orange.
const COLORS = ["color-mix(in oklch, var(--accent) 40%, var(--card))", "var(--accent)"];

/**
 * Front and back of a body with the class's muscles highlighted; `focus` (the exercise being done) stands out.
 * `exIds` alone with no focus paints those muscles in full orange.
 */
export function BodyMap({ exIds, focus, size = "md", className = "" }: { exIds: string[]; focus?: string | null | undefined; size?: "sm" | "md"; className?: string }) {
  const day = [...new Set(exIds.flatMap(musclesOfExercise))];
  const data: IExerciseData[] = focus
    ? [{ name: "aula", muscles: day }, { name: "agora", muscles: musclesOfExercise(focus) }]
    : [{ name: "aula", muscles: day, frequency: 2 }];
  const width = size === "sm" ? "w-12" : "w-14 sm:w-24";
  const view = (type: "anterior" | "posterior", label: string) => (
    <figure className="flex flex-col items-center gap-1">
      <div className={width}>
        <Model type={type} data={data} bodyColor="var(--body-map)" highlightedColors={COLORS}
          svgStyle={{ width: "100%", height: "auto", cursor: "default" }} />
      </div>
      {size === "md" && <figcaption className="text-[11px] font-semibold text-muted-foreground">{label}</figcaption>}
    </figure>
  );
  return (
    <div className={`flex items-start justify-center gap-2 ${className}`} role="img"
      aria-label={`Músculos trabalhados destacados no corpo, de frente e de costas`}>
      {view("anterior", "Frente")}
      {view("posterior", "Costas")}
    </div>
  );
}
