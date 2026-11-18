/**
 * Progress photos. They live in the same Firestore documents as everything else (users/{uid}/data/{key}, readable
 * only by the person): the list in `forma.photos` and each picture in its own `forma.photo.{id}` as a JPEG data URL,
 * shrunk on the device to at most 900 px so a document stays far below Firestore's 1 MB. No Cloud Storage needed.
 */
export type Pose = "frente" | "lado" | "costas";
export type PhotoEntry = { id: string; date: string; pose: Pose; weightKg?: number | undefined };

export const PHOTOS_KEY = "forma.photos";
export const photoKey = (id: string) => `forma.photo.${id}`;
export const POSES: { v: Pose; label: string }[] = [
  { v: "frente", label: "Frente" },
  { v: "lado", label: "Lado" },
  { v: "costas", label: "Costas" },
];
/** A new photo is suggested every two weeks once the person has taken one. */
export const PHOTO_EVERY_DAYS = 14;

const MAX_SIDE = 900;
/** Largest data URL kept (characters); the quality steps down until the picture fits. */
const MAX_CHARS = 450_000;

/** Reads an image file and returns it as a shrunk JPEG data URL. */
export async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const source: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImage(file));
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não conseguiu ler a foto.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  bitmap?.close();
  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error("A foto ficou grande demais. Tente outra.");
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => reject(new Error("Não foi possível abrir essa imagem."));
    img.src = URL.createObjectURL(file);
  });
}
