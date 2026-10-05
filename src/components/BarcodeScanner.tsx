import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/**
 * The browser's own BarcodeDetector where it exists (Chrome on Android); elsewhere (iPhone, desktop) the
 * ZXing WebAssembly ponyfill, with its .wasm served by the app itself so it also works without a CDN.
 */
async function createDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
  if (native && (await native.getSupportedFormats()).includes("ean_13")) return new native({ formats: FORMATS });
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import("barcode-detector/ponyfill"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) } });
  return new BarcodeDetector({ formats: FORMATS as never });
}

/** Camera dialog that reads a product barcode and hands back its digits. */
export function BarcodeScanner({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    setStatus("starting");
    (async () => {
      try {
        const detector = await createDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setStatus("scanning");
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = (await detector.detect(video.current)).find((b) => /^\d{8,14}$/.test(b.rawValue));
            if (found) {
              navigator.vibrate?.(80);
              onCode(found.rawValue);
              return;
            }
          } catch {
            // A frame that can't be read yet (camera still focusing): try the next one.
          }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch (e) {
        setStatus("error");
        setError(e instanceof DOMException && e.name === "NotAllowedError"
          ? "A câmera foi bloqueada. Libere o acesso à câmera para este site, ou digite o código."
          : "Não foi possível abrir a câmera. Digite o código que fica embaixo das barras.");
      }
    })();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Ler código de barras</DialogTitle>
          <DialogDescription>Aponte a câmera para o código, com as barras na horizontal e bem iluminadas.</DialogDescription>
        </DialogHeader>
        {status === "error" ? (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-accent/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            {status === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo a câmera…</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
