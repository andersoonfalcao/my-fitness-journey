import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BACKGROUNDS, shareImage, type Background } from "@/lib/share-card";

export type ShareRequest = { heading: string; title: string; fileName: string; make: (bg: Background) => Promise<Blob> };

const BG_KEY = "forma.share.bg";
const CHECKER = "repeating-conic-gradient(#d9d4c7 0% 25%, #f4efe4 0% 50%) 0 0 / 16px 16px";
const savedBg = () => {
  try {
    return BACKGROUNDS.find((b) => b.id === localStorage.getItem(BG_KEY)) ?? BACKGROUNDS[0]!;
  } catch {
    return BACKGROUNDS[0]!;
  }
};

/**
 * Preview of a share image with a background picker and a "Compartilhar" button. The image is drawn before the tap,
 * so the click goes straight to the share sheet (iOS only opens it inside the tap itself).
 */
export function ShareDialog({ request, onClose }: { request: ShareRequest | null; onClose: () => void }) {
  const [bg, setBg] = useState<Background>(savedBg);
  const [mine, setMine] = useState<Background | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const canShare = typeof navigator !== "undefined" && !!navigator.canShare;

  useEffect(() => {
    setBlob(null);
    setUrl("");
    if (!request) return;
    let alive = true;
    let objectUrl = "";
    request.make(bg).then(
      (b) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      },
      () => alive && toast.error("Não foi possível gerar a imagem."),
    );
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [request, bg]);

  const choose = (next: Background) => {
    setBg(next);
    if (next.id !== "mine") {
      try {
        localStorage.setItem(BG_KEY, next.id);
      } catch {
        // Remembering the choice is only a convenience.
      }
    }
  };

  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    if (mine?.src) URL.revokeObjectURL(mine.src);
    const own: Background = { id: "mine", label: "Sua foto", kind: "photo", src: URL.createObjectURL(f) };
    setMine(own);
    choose(own);
  };

  const share = async () => {
    if (!blob || !request) return;
    const result = await shareImage(blob, request.fileName, request.title);
    if (result === "downloaded") toast.success("Imagem salva. É só postar nas suas redes.");
  };

  const options = mine ? [mine, ...BACKGROUNDS] : BACKGROUNDS;

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-y-auto sm:max-w-md">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-2xl">{request?.heading}</DialogTitle>
          <DialogDescription>
            {bg.kind === "transparent" ? "Imagem sem fundo: cole por cima de uma foto nos stories." : "Escolha o fundo e compartilhe nas suas redes."}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl" style={{ background: bg.kind === "transparent" ? CHECKER : "var(--primary)" }}>
          {url ? (
            <img src={url} alt="Imagem para compartilhar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-primary-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
          )}
        </div>

        <div role="radiogroup" aria-label="Fundo da imagem" className="-mx-1 flex shrink-0 gap-2 overflow-x-auto px-1 pb-1">
          <button type="button" onClick={() => file.current?.click()} className="flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <span className="flex h-20 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border"><ImagePlus className="h-5 w-5" /></span>
            Sua foto
          </button>
          {options.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={bg.id === b.id} aria-label={b.label} onClick={() => choose(b)}
              className={`flex w-16 shrink-0 flex-col items-center gap-1 text-[11px] font-semibold ${bg.id === b.id ? "text-accent" : "text-muted-foreground"}`}>
              <span className={`h-20 w-16 overflow-hidden rounded-xl border-2 ${bg.id === b.id ? "border-accent" : "border-transparent"}`}
                style={{ background: b.kind === "transparent" ? CHECKER : b.kind === "brand" ? "#124830" : undefined }}>
                {b.src && <img src={b.src} alt="" className="h-full w-full object-cover" />}
                {b.kind === "brand" && <span className="flex h-full items-center justify-center font-display text-lg font-extrabold text-[#fbf6ec]">f<span className="text-accent">.</span></span>}
              </span>
              <span className="w-full truncate text-center">{b.label}</span>
            </button>
          ))}
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        <Button type="button" onClick={() => void share()} disabled={!blob} className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          {canShare ? <Share2 /> : <Download />}
          {canShare ? "Compartilhar" : "Baixar imagem"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
