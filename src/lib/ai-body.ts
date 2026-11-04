import { BEST_MODELS, generateJson, Schema } from "./ai";
import { photoData } from "./products";
import { targets, type BodyAnalysis, type BodyEntry, type Profile } from "./store";

/** Measures the AI reads from a report, in the units of `BodyEntry`. */
const MEASURES = ["weightKg", "fatPct", "muscleKg", "leanKg", "waterPct", "visceral", "boneKg", "bmrKcal", "metabolicAge"] as const;
type Measure = (typeof MEASURES)[number];

const READ_SYSTEM = `Você lê laudos e telas de balanças de bioimpedância (InBody, Tanita, Omron, Xiaomi, Relaxmedic e outras),
em foto ou PDF, e devolve os números exatamente como aparecem, convertidos para estas unidades:
- weightKg: peso em kg
- fatPct: gordura corporal em % (se o laudo só der kg de gordura e o peso, calcule a %)
- muscleKg: massa muscular em kg (no InBody, "massa muscular esquelética")
- leanKg: massa magra / massa livre de gordura em kg
- waterPct: água corporal em % do peso (se vier em litros ou kg, divida pelo peso)
- visceral: nível de gordura visceral (número da escala da balança)
- boneKg: massa óssea em kg
- bmrKcal: taxa metabólica basal em kcal
- metabolicAge: idade metabólica em anos
Deixe em branco (null) o que não aparecer; nunca invente um número. date é a data da medição no formato AAAA-MM-DD, se aparecer.
extras lista, em texto curto, outros números úteis do laudo que não cabem nos campos (gordura subcutânea, proteína, massa por segmento, pontuação InBody...).
Se a imagem não for de bioimpedância, devolva ok = false.`;

const READ_SCHEMA = Schema.object({
  properties: {
    ok: Schema.boolean(),
    date: Schema.string({ nullable: true }),
    ...Object.fromEntries(MEASURES.map((k) => [k, Schema.number({ nullable: true })])),
    extras: Schema.array({ items: Schema.string() }),
  },
});

const ANALYSIS_SYSTEM = `Você é um profissional de educação física e nutrição esportiva brasileiro. Analise a bioimpedância da pessoa,
compare com as medições anteriores quando houver e diga, para cada número relevante, como ele está, qual meta realista buscar
e o que fazer, de forma concreta, para chegar lá. Use referências reconhecidas e cite-as de forma curta quando ajudar:
gordura corporal por sexo e idade (Gallagher et al., 2000; ACE), água corporal (homens ~50–65%, mulheres ~45–60%),
gordura visceral (escala de 1 a 59 da Tanita/Omron: até 9 saudável; InBody: nível até 9 ou área < 100 cm²),
ganho de massa muscular realista (~0,5–1 kg/mês para iniciantes, menos para avançados),
perda de gordura de 0,5–1% do peso por semana, proteína de 1,6–2,2 g/kg/dia (Morton et al., 2018).
Lembre que a bioimpedância varia com hidratação, refeição e horário: as dicas de medição devem pedir as mesmas condições.
As ações devem usar os números da pessoa (calorias, proteína em gramas, treinos por semana) e ser poucas e práticas.
Escreva em português do Brasil, em frases curtas, sem jargão.
status: "bom", "atencao" ou "melhorar". metric é o nome do número em português ("Gordura corporal", "Massa muscular"...).
current e target são textos curtos com unidade ("24,8%", "18–20%"). how explica em 1 ou 2 frases o que fazer.
summary resume em 2 ou 3 frases. actions são de 3 a 5 passos para as próximas semanas. timeline estima em quanto tempo
a meta principal é alcançável seguindo as ações. measuring é uma dica curta para a próxima medição ser comparável.`;

const ANALYSIS_SCHEMA = Schema.object({
  properties: {
    summary: Schema.string(),
    items: Schema.array({
      items: Schema.object({
        properties: {
          metric: Schema.string(),
          status: Schema.enumString({ enum: ["bom", "atencao", "melhorar"] }),
          current: Schema.string(),
          target: Schema.string(),
          how: Schema.string(),
        },
      }),
    }),
    actions: Schema.array({ items: Schema.string() }),
    timeline: Schema.string(),
    measuring: Schema.string(),
  },
});

export type ReadReport = { date?: string | undefined; values: Partial<Record<Measure, number>>; extras: string[] };

/** Base64 of a photo (resized JPEG) or a PDF, with its type, for Gemini. */
async function filePart(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (file.size > 15 * 1024 * 1024) throw new Error("O PDF é grande demais (mais de 15 MB). Envie só a página do laudo ou uma foto.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { inlineData: { mimeType: "application/pdf", data: btoa(binary) } };
  }
  if (!file.type.startsWith("image/")) throw new Error("Envie uma foto ou um PDF do laudo.");
  return { inlineData: { mimeType: "image/jpeg", data: await photoData(file) } };
}

/** Reads the numbers of a bioimpedance report (photo or PDF). Nothing is saved here. */
export async function readBioimpedance(file: File): Promise<ReadReport> {
  const r = (await generateJson(READ_SYSTEM, READ_SCHEMA, [await filePart(file), { text: "Leia os números desta bioimpedância." }], { models: BEST_MODELS, timeoutMs: 60_000 })) as Record<string, unknown>;
  const values: Partial<Record<Measure, number>> = {};
  for (const k of MEASURES) {
    const v = Number(r[k]);
    if (r[k] !== null && r[k] !== undefined && Number.isFinite(v) && v > 0) values[k] = Math.round(v * 100) / 100;
  }
  if (r["ok"] === false || !Object.keys(values).length) throw new Error("Não encontrei números de bioimpedância. Envie a foto do laudo inteiro, de frente e com boa luz.");
  const date = typeof r["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r["date"]) ? r["date"] : undefined;
  const extras = Array.isArray(r["extras"]) ? r["extras"].map(String).filter(Boolean).slice(0, 8) : [];
  return { date, values, extras };
}

const SEX = { m: "homem", f: "mulher" } as const;
const GOAL: Record<Profile["focus"], string> = { perder: "perder gordura", massa: "ganhar massa muscular", forca: "ficar mais forte", condicionamento: "condicionamento" };

const describe = (e: BodyEntry) =>
  MEASURES.flatMap((k) => (e[k] !== undefined ? [`${k}=${e[k]}`] : [])).join(", ");

/** Reads the reading against the profile and the previous ones: status, targets and what to do for each number. */
export async function analyzeBioimpedance(entry: BodyEntry, previous: BodyEntry[], p: Profile, extras: string[] = []): Promise<BodyAnalysis> {
  const t = targets(p);
  const before = [...previous].filter((b) => b.date < entry.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const prompt = [
    `Pessoa: ${SEX[p.sex]}, ${p.age} anos, ${p.height} cm, objetivo ${GOAL[p.focus]}, meta de peso ${p.goalWeight} kg, nível ${p.level}, ${p.days} treinos de musculação por semana de ${p.minutes} min.`,
    `Metas diárias atuais do app: ${t.kcal} kcal, ${t.protein} g de proteína, ${t.carbs} g de carboidratos, ${t.fat} g de gordura.`,
    `Medição de ${entry.date}: ${describe(entry)}.`,
    extras.length ? `Outros números do laudo: ${extras.join("; ")}.` : "",
    before.length ? `Medições anteriores: ${before.map((b) => `${b.date}: ${describe(b)}`).join(" | ")}.` : "É a primeira medição registrada.",
  ].filter(Boolean).join("\n");
  const r = (await generateJson(ANALYSIS_SYSTEM, ANALYSIS_SCHEMA, prompt, { models: BEST_MODELS, timeoutMs: 60_000 })) as Record<string, unknown>;
  const text = (v: unknown) => String(v ?? "").trim();
  const items = (Array.isArray(r["items"]) ? r["items"] : []).flatMap((i: Record<string, unknown>) => {
    const metric = text(i["metric"]);
    if (!metric) return [];
    const status = (["bom", "atencao", "melhorar"] as const).find((s) => s === i["status"]) ?? "atencao";
    return [{ metric, status, current: text(i["current"]), target: text(i["target"]), how: text(i["how"]) }];
  });
  const summary = text(r["summary"]);
  if (!summary && !items.length) throw new Error("A IA não conseguiu analisar esta medição. Tente de novo.");
  return {
    createdAt: new Date().toISOString(),
    summary,
    items,
    actions: (Array.isArray(r["actions"]) ? r["actions"] : []).map(text).filter(Boolean).slice(0, 6),
    timeline: text(r["timeline"]),
    measuring: text(r["measuring"]),
    ...(extras.length ? { extras } : {}),
  };
}
