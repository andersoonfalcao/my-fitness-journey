import barraFixa from "@/assets/motion/barra-fixa.mp4.asset.json";
import desenvolvimento from "@/assets/motion/desenvolvimento.mp4.asset.json";
import extensora from "@/assets/motion/extensora.mp4.asset.json";
import flexora from "@/assets/motion/flexora.mp4.asset.json";
import legPress from "@/assets/motion/leg-press.mp4.asset.json";
import peckDeck from "@/assets/motion/peck-deck.mp4.asset.json";
import remadaBaixa from "@/assets/motion/remada-baixa.mp4.asset.json";
import remadaCurvada from "@/assets/motion/remada-curvada.mp4.asset.json";
import supinoInclinado from "@/assets/motion/supino-inclinado.mp4.asset.json";
import supinoReto from "@/assets/motion/supino-reto.mp4.asset.json";

type MotionAsset = { url: string };

const motionAssets: Partial<Record<string, MotionAsset>> = {
  "barra-fixa": barraFixa,
  desenvolvimento,
  extensora,
  flexora,
  "leg-press": legPress,
  "peck-deck": peckDeck,
  "remada-baixa": remadaBaixa,
  "remada-curvada": remadaCurvada,
  "supino-inclinado": supinoInclinado,
  "supino-reto": supinoReto,
};

export const motionFor = (exerciseId: string) => motionAssets[exerciseId]?.url;