import { getAI, getGenerativeModel, GoogleAIBackend, type ObjectSchema } from "firebase/ai";
import { firebaseApp } from "./firebase";

export { Schema } from "firebase/ai";

// Free tier, best first. Each model has its own quota (e.g. gemini-3.8-flash: 5/min and 20/day for the
// whole project), so falling back multiplies the daily capacity.
const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
const models = new Map<string, ReturnType<typeof getGenerativeModel>>();
/** Model → time until which it is known to be out of quota (skipped meanwhile). */
const exhaustedUntil = new Map<string, number>();

function model(name: string, system: string, schema: ObjectSchema) {
  const key = `${name}\n${system}`;
  let m = models.get(key);
  if (!m) {
    const ai = getAI(firebaseApp(), { backend: new GoogleAIBackend() });
    m = getGenerativeModel(ai, {
      model: name,
      systemInstruction: system,
      generationConfig: { responseMimeType: "application/json", responseSchema: schema },
    });
    models.set(key, m);
  }
  return m;
}

/** Seconds to wait from a quota message ("retry in 21h31m46s" or "retry in 43.07s"). */
function retrySeconds(message: string) {
  const match = /retry in ([\dhms.]+)/i.exec(message)?.[1] ?? "";
  const part = (unit: string) => Number(new RegExp(`([\\d.]+)${unit}`).exec(match)?.[1] ?? 0);
  return part("h") * 3600 + part("m") * 60 + part("s");
}

/**
 * Asks Gemini (Firebase AI Logic, free tier) for JSON matching `schema`, with Portuguese errors.
 * A busy (500/503) or out-of-quota (429) model hands over to the next one; every attempt, failed or not,
 * counts against that model's free quota, so nothing is retried on the same model.
 */
export async function generateJson(system: string, schema: ObjectSchema, prompt: string): Promise<unknown> {
  let lastError = "";
  let shortestWait = Infinity;
  for (const name of MODELS) {
    if ((exhaustedUntil.get(name) ?? 0) > Date.now()) continue;
    try {
      return JSON.parse((await model(name, system, schema).generateContent(prompt)).response.text());
    } catch (error) {
      lastError = error instanceof Error ? error.message : "";
      if (error instanceof SyntaxError) continue;
      if (/429|quota|resource.?exhausted/i.test(lastError)) {
        const wait = retrySeconds(lastError) || 60;
        exhaustedUntil.set(name, Date.now() + wait * 1000);
        shortestWait = Math.min(shortestWait, wait);
        continue;
      }
      if (/\b(500|503|404)\b|high demand|overloaded|unavailable|not found/i.test(lastError)) continue;
      throw new Error("Não foi possível falar com a IA. Verifique a internet e tente de novo.");
    }
  }
  if (shortestWait < 120) throw new Error(`Limite gratuito por minuto atingido. Tente de novo em ${Math.ceil(shortestWait)} segundos.`);
  if (shortestWait < Infinity) throw new Error("A cota gratuita de IA de hoje acabou. Ela volta amanhã; enquanto isso, use a busca de alimentos.");
  if (/high demand|500|503/i.test(lastError)) throw new Error("A IA gratuita está ocupada agora. Tente de novo em alguns instantes.");
  throw new Error("A IA respondeu num formato inesperado. Tente de novo.");
}
