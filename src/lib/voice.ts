/**
 * Spoken cues during a workout (Configurações → "Voz no treino"), through the browser's own speech synthesis.
 * They only play while the app is on screen: a locked iPhone suspends the page, and the rest push takes over.
 * Safari only speaks after a tap, so `unlockVoice` runs on "Concluir série" with an empty utterance.
 */
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

let unlocked = false;
let voice: SpeechSynthesisVoice | null | undefined;

/** A Brazilian Portuguese voice when the device has one (the iPhone does), else any Portuguese one. */
function pickVoice() {
  if (voice !== undefined && voice !== null) return voice;
  const all = window.speechSynthesis.getVoices();
  voice = all.find((v) => v.lang === "pt-BR" && v.localService) ?? all.find((v) => v.lang.replace("_", "-") === "pt-BR") ?? all.find((v) => v.lang.startsWith("pt")) ?? null;
  return voice;
}

export function unlockVoice() {
  if (!canSpeak() || unlocked) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    unlocked = false;
  }
}

/** Says `text` now, cutting off whatever was still being said; hidden pages stay quiet. */
export function speak(text: string) {
  if (!canSpeak() || document.visibilityState !== "visible") return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.05;
    synth.speak(u);
  } catch {
    // No speech on this device: the screen and the beep still say it.
  }
}

/** "3" → "terceira": the set number as it is said ("terceira série de quatro"). */
const ORDINAL = ["", "primeira", "segunda", "terceira", "quarta", "quinta", "sexta", "sétima", "oitava", "nona", "décima"];
export const ordinalSet = (n: number) => ORDINAL[n] ?? `${n}ª`;

/** 80 → "80 quilos", 62.5 → "62,5 quilos": the comma makes the voice say "vírgula". */
export const spokenKg = (kg: number) => `${String(Math.round(kg * 100) / 100).replace(".", ",")} quilos`;

/** What is said when a rest ends: exercise, which set of how many and the weight to use. */
export function nextSetSpeech(name: string, set: number, total: number, kg: number | null | undefined) {
  return `Descanso acabou. ${name}, ${ordinalSet(set)} série de ${total}${kg ? `, ${spokenKg(kg)}` : ""}.`;
}
