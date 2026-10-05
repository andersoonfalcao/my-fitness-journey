import { getApp, getApps, initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";

// Public web config of the Firebase project "apptreino" (safe to ship; access is limited by App Check).
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD944jrfTQDIGiAH6uskT3o8rJgpxYbGsA",
  authDomain: "apptreino-f3677.firebaseapp.com",
  projectId: "apptreino-f3677",
  storageBucket: "apptreino-f3677.firebasestorage.app",
  messagingSenderId: "825704581793",
  appId: "1:825704581793:web:0fc8921ff11aa3ce4b7ee0",
};

export type EstimatedFood = { name: string; grams: number; kcal: number; p: number; c: number; f: number };

const SYSTEM = `Você é um nutricionista brasileiro. Estime as porções e os macronutrientes dos alimentos descritos.
Use a tabela TACO (Unicamp) como referência e valores de alimentos já preparados (cozido, grelhado, assado) quando for o caso.
Medidas caseiras típicas: concha de feijão ≈ 80 g, colher de servir de arroz ≈ 45 g, filé de frango ≈ 120 g, pão francês = 50 g, ovo = 50 g.
Se a quantidade não for dita, assuma uma porção típica de um adulto.
Retorne um item por alimento, com o nome em português, gramas e os valores TOTAIS do item (não por 100 g), arredondados a 1 casa.`;

const SCHEMA = Schema.object({
  properties: {
    items: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(),
          grams: Schema.number(),
          kcal: Schema.number(),
          p: Schema.number(),
          c: Schema.number(),
          f: Schema.number(),
        },
      }),
    }),
  },
});

let model: ReturnType<typeof getGenerativeModel> | null = null;

function foodModel() {
  if (!model) {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: "gemini-3.8-flash",
      systemInstruction: SYSTEM,
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA },
    });
  }
  return model;
}

/** Estimates portions and macros of a free-text meal description with Gemini (Firebase AI Logic, free tier). */
export async function estimateFood(text: string): Promise<EstimatedFood[]> {
  let raw = "";
  // The free tier sometimes answers 500/503 "high demand" for a few seconds: retry before giving up.
  for (let attempt = 1; ; attempt++) {
    try {
      raw = (await foodModel().generateContent(text)).response.text();
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const busy = /\b(500|503)\b|high demand|overloaded|unavailable/i.test(message);
      if (busy && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }
      if (busy) throw new Error("A IA gratuita está ocupada agora. Tente de novo em alguns instantes.");
      if (/429|quota|resource.?exhausted/i.test(message)) throw new Error("Limite gratuito da IA atingido por agora. Tente mais tarde.");
      throw new Error("Não foi possível falar com a IA. Verifique a internet e tente de novo.");
    }
  }
  const items = (JSON.parse(raw) as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
  return items.map((i: Record<string, unknown>) => ({
    name: String(i["name"] ?? "Alimento"),
    grams: Math.round(num(i["grams"])),
    kcal: Math.round(num(i["kcal"])),
    p: Math.round(num(i["p"]) * 10) / 10,
    c: Math.round(num(i["c"]) * 10) / 10,
    f: Math.round(num(i["f"]) * 10) / 10,
  }));
}
