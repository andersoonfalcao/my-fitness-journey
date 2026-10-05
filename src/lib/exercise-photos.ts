// Execution photos from free-exercise-db (https://github.com/yuhonas/free-exercise-db, public domain):
// two photos per exercise, start and end position, shown alternately.

// Exercise id → free-exercise-db id. When the dataset has no photo of the exact variation, the closest one
// with the same movement is used (noted on the line). Exercises missing here keep their own illustration.
const PHOTO_IDS: Record<string, string> = {
  // Peito
  "supino-reto": "Barbell_Bench_Press_-_Medium_Grip",
  "supino-inclinado": "Incline_Dumbbell_Press",
  "peck-deck": "Butterfly",
  flexao: "Pushups",
  "supino-reto-halteres": "Dumbbell_Bench_Press",
  "supino-maquina": "Machine_Bench_Press",
  "supino-inclinado-barra": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "supino-smith": "Smith_Machine_Bench_Press",
  "flexao-inclinada": "Incline_Push-Up",
  "crucifixo-halteres": "Dumbbell_Flyes",
  "crucifixo-inclinado": "Incline_Dumbbell_Flyes",
  crossover: "Cable_Crossover",
  // Costas
  puxada: "Wide-Grip_Lat_Pulldown",
  "remada-curvada": "Bent_Over_Barbell_Row",
  "remada-baixa": "Seated_Cable_Rows",
  "barra-fixa": "Pullups",
  "puxada-supinada": "Underhand_Cable_Pulldowns",
  "puxada-triangulo": "V-Bar_Pulldown",
  "barra-fixa-assistida": "Band_Assisted_Pull-Up", // assisted with a band instead of the machine
  "pulldown-bracos-estendidos": "Straight-Arm_Pulldown",
  "remada-unilateral": "One-Arm_Dumbbell_Row",
  "remada-maquina": "Leverage_Iso_Row",
  "remada-cavalinho": "T-Bar_Row_with_Handle",
  "remada-invertida": "Inverted_Row",
  // Quadríceps
  agachamento: "Barbell_Squat",
  "leg-press": "Leg_Press",
  extensora: "Leg_Extensions",
  afundo: "Dumbbell_Lunges",
  "agachamento-goblet": "Goblet_Squat", // kettlebell instead of dumbbell
  hack: "Hack_Squat",
  "agachamento-smith": "Smith_Machine_Squat",
  "agachamento-corporal": "Bodyweight_Squat",
  "agachamento-bulgaro": "Split_Squat_with_Dumbbells",
  "subida-banco": "Dumbbell_Step_Ups",
  "afundo-reverso": "Dumbbell_Rear_Lunge",
  "extensora-unilateral": "Single-Leg_Leg_Extension",
  // Posterior e glúteos
  "terra-romeno": "Romanian_Deadlift",
  flexora: "Lying_Leg_Curls",
  "hip-thrust": "Barbell_Hip_Thrust",
  "stiff-halteres": "Stiff-Legged_Dumbbell_Deadlift",
  "terra-romeno-unilateral": "Kettlebell_One-Legged_Deadlift", // kettlebell instead of dumbbell
  "pull-through": "Pull_Through",
  hiperextensao: "Hyperextensions_Back_Extensions",
  "cadeira-flexora": "Seated_Leg_Curl",
  "flexora-em-pe": "Standing_Leg_Curl",
  "flexao-joelhos-bola": "Ball_Leg_Curl",
  "elevacao-pelvica-maquina": "Barbell_Hip_Thrust", // same movement with a barbell
  "hip-thrust-halter": "Barbell_Hip_Thrust", // same movement with a barbell
  "ponte-gluteo": "Butt_Lift_Bridge",
  "gluteo-cabo": "One-Legged_Cable_Kickback",
  // Ombros
  desenvolvimento: "Seated_Dumbbell_Press",
  "elevacao-lateral": "Side_Lateral_Raise",
  "face-pull": "Face_Pull",
  "desenvolvimento-maquina": "Machine_Shoulder_Military_Press",
  arnold: "Arnold_Dumbbell_Press",
  "desenvolvimento-barra": "Standing_Military_Press",
  "desenvolvimento-smith": "Smith_Machine_Overhead_Shoulder_Press",
  "elevacao-lateral-cabo": "Standing_Low-Pulley_Deltoid_Raise",
  "elevacao-lateral-maquina": "Cable_Seated_Lateral_Raise", // seated cable instead of the machine
  "elevacao-lateral-sentado": "Seated_Side_Lateral_Raise",
  "crucifixo-inverso": "Reverse_Flyes",
  "peck-deck-inverso": "Reverse_Machine_Flyes",
  "crucifixo-inverso-cabo": "Cable_Rear_Delt_Fly",
  "face-pull-elastico": "Face_Pull", // same movement on the cable
  "elevacao-y": "Straight_Raises_on_Incline_Bench",
  // Bíceps
  "rosca-direta": "Barbell_Curl",
  "rosca-martelo": "Hammer_Curls",
  "rosca-alternada": "Dumbbell_Alternate_Bicep_Curl",
  "rosca-scott": "Preacher_Curl",
  "rosca-polia": "Standing_Biceps_Cable_Curl",
  "rosca-concentrada": "Concentration_Curls",
  "rosca-inclinada": "Incline_Dumbbell_Curl",
  // Tríceps
  "triceps-corda": "Triceps_Pushdown_-_Rope_Attachment",
  "triceps-frances": "Seated_Triceps_Press",
  "triceps-barra-polia": "Triceps_Pushdown",
  "triceps-testa": "EZ-Bar_Skullcrusher",
  "triceps-frances-polia": "Triceps_Overhead_Extension_with_Rope",
  "triceps-coice": "Tricep_Dumbbell_Kickback",
  "flexao-fechada": "Push-Ups_-_Close_Triceps_Position",
  // Abdômen
  prancha: "Plank",
  "abdominal-polia": "Cable_Crunch",
  "prancha-lateral": "Side_Bridge",
  "dead-bug": "Dead_Bug",
  pallof: "Pallof_Press",
  "abdominal-crunch": "Crunches",
  "abdominal-maquina": "Ab_Crunch_Machine",
  "abdominal-reverso": "Reverse_Crunch",
  // Ampliação de 05/10/2026 (panturrilha, trapézio, antebraço, condicionamento e movimentos que faltavam)
  "panturrilha-em-pe": "Standing_Calf_Raises",
  "panturrilha-sentado": "Seated_Calf_Raise",
  "panturrilha-leg-press": "Calf_Press_On_The_Leg_Press_Machine",
  "panturrilha-halter": "Standing_Dumbbell_Calf_Raise",
  "panturrilha-smith": "Smith_Machine_Calf_Raise",
  "encolhimento-barra": "Barbell_Shrug",
  "encolhimento-halteres": "Dumbbell_Shrug",
  "encolhimento-maquina": "Leverage_Shrug",
  "remada-alta": "Upright_Barbell_Row",
  "remada-alta-polia": "Upright_Cable_Row",
  "rosca-punho": "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench",
  "rosca-punho-inversa": "Palms-Down_Wrist_Curl_Over_A_Bench",
  "rosca-inversa": "Reverse_Barbell_Curl",
  "caminhada-fazendeiro": "Farmers_Walk",
  "rolo-punho": "Wrist_Roller",
  "kettlebell-swing": "One-Arm_Kettlebell_Swings",
  "mountain-climber": "Mountain_Climbers",
  "salto-estrela": "Star_Jump",
  "salto-caixa": "Front_Box_Jump",
  "corda-naval": "Battling_Ropes",
  "pular-corda": "Rope_Jumping",
  "agachamento-salto": "Freehand_Jump_Squat",
  "thruster-kettlebell": "Kettlebell_Thruster",
  "remo-ergometro": "Rowing_Stationary",
  "empurrar-treno": "Sled_Push",
  "bicicleta-ergometrica": "Bicycling_Stationary",
  "esteira-corrida": "Jogging_Treadmill",
  eliptico: "Elliptical_Trainer",
  "terra-convencional": "Barbell_Deadlift",
  "terra-sumo": "Sumo_Deadlift",
  "terra-hexagonal": "Trap_Bar_Deadlift",
  "bom-dia": "Good_Morning",
  abdutora: "Thigh_Abductor",
  adutora: "Thigh_Adductor",
  "agachamento-frontal": "Front_Squat_Clean_Grip",
  "afundo-caminhando": "Bodyweight_Walking_Lunge",
  "mergulho-paralelas": "Dips_-_Chest_Version",
  "supino-declinado": "Decline_Barbell_Bench_Press",
  "pullover-halter": "Straight-Arm_Dumbbell_Pullover",
  "mergulho-triceps": "Dips_-_Triceps_Version",
  "mergulho-banco": "Bench_Dips",
  "supino-fechado": "Close-Grip_Barbell_Bench_Press",
  "barra-supinada": "Chin-Up",
  "remada-curvada-halteres": "Bent_Over_Two-Dumbbell_Row",
  "rosca-spider": "Spider_Curl",
  "rosca-zottman": "Zottman_Curl",
  "rosca-martelo-inclinada": "Incline_Hammer_Curls",
  "elevacao-frontal": "Front_Dumbbell_Raise",
  "elevacao-frontal-anilha": "Front_Plate_Raise",
  "abdominal-bicicleta": "Air_Bike",
  "rodinha-abdominal": "Ab_Roller",
  "elevacao-pernas-suspenso": "Hanging_Leg_Raise",
  "russian-twist": "Russian_Twist",
  "abdominal-obliquo": "Oblique_Crunches_-_On_The_Floor",
  "elevacao-pernas-banco": "Flat_Bench_Lying_Leg_Raise",
};

const files = import.meta.glob<string>("@/assets/fedb/*.webp", { eager: true, import: "default" });
const fileUrl = (name: string) => files[`/src/assets/fedb/${name}`];

export const PHOTO_CREDIT = "Fotos: free-exercise-db (domínio público)";

/** Start and end photos of the exercise, or undefined when the dataset has no equivalent. */
export function photosFor(exerciseId: string): [string, string] | undefined {
  const id = PHOTO_IDS[exerciseId];
  const start = id && fileUrl(`${id}-0.webp`);
  const end = id && fileUrl(`${id}-1.webp`);
  return start && end ? [start, end] : undefined;
}
