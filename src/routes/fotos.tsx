import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, ImageOff, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseCalendar } from "@/components/AppShell";
import { fmtKg, KEYS, roundKg, today, uid, useLocal, useWriteKey, type WeightEntry } from "@/lib/store";
import { photoKey, PHOTOS_KEY, POSES, shrinkPhoto, type PhotoEntry, type Pose } from "@/lib/photos";

export const Route = createFileRoute("/fotos")({
  head: () => ({
    meta: [
      { title: "Fotos de progresso — forma" },
      { name: "description", content: "Antes e depois lado a lado, por pose, com o peso de cada data." },
    ],
  }),
  component: PhotosPage,
});

const dateBR = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

/** Progress photos: before and after side by side for one pose, a slider through the dates, and new photos. */
function PhotosPage() {
  const close = useCloseCalendar();
  const [photos, setPhotos, ready] = useLocal<PhotoEntry[]>(PHOTOS_KEY, []);
  const [weights] = useLocal<WeightEntry[]>(KEYS.weights, []);
  const [pose, setPose] = useState<Pose>("frente");
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  // Each picture goes to its own document; the list above only holds date, pose and weight.
  const write = useWriteKey();

  if (!ready) return <ScreenSkeleton cards={2} />;
  const list = photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date));
  const after = list.at(-1);
  const before = list.length > 1 ? list[Math.min(beforeIdx, list.length - 2)] : undefined;

  const weightOn = (date: string) => {
    const w = [...weights].filter((x) => x.date <= date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return w?.kg;
  };

  const add = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    try {
      const url = await shrinkPhoto(picked);
      const id = uid();
      write(photoKey(id), url);
      const kg = weightOn(today());
      setPhotos((ps) => [...ps, { id, date: today(), pose, ...(kg !== undefined ? { weightKg: roundKg(kg) } : {}) }]);
      setBeforeIdx(0);
      toast.success("Foto guardada", { description: "Fica só na sua conta." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar a foto.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (entry: PhotoEntry) => {
    setPhotos((ps) => ps.filter((p) => p.id !== entry.id));
    write(photoKey(entry.id), null);
    setConfirm(null);
    toast.success("Foto apagada");
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow tone="muted">Evolução</Eyebrow>
          <h1 className="type-h1 mt-1">Fotos de progresso</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden />Só você vê, na sua conta.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={close}>Voltar</Button>
      </header>

      <div role="radiogroup" aria-label="Pose" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {POSES.map((p) => (
          <button key={p.v} type="button" role="radio" aria-checked={pose === p.v} onClick={() => { setPose(p.v); setBeforeIdx(0); }}
            className={`min-h-11 rounded-xl text-sm font-semibold ${pose === p.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {p.label}
            <span className="ml-1 text-xs font-medium text-muted-foreground">{photos.filter((x) => x.pose === p.v).length || ""}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Camera} title="A balança não mostra tudo. A foto mostra."
          action={<Button size="lg" loading={busy} onClick={() => file.current?.click()}><Camera />Tirar a primeira foto</Button>}>
          Mesma luz, mesmo lugar e mesma roupa, de manhã e em jejum. A cada duas semanas, a comparação mostra a troca de gordura por músculo que o peso esconde.
        </EmptyState>
      ) : (
        <Card padding="sm">
          <div className="grid grid-cols-2 gap-2">
            {[before, after].map((p, i) => (
              <figure key={i} className="min-w-0">
                <div className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted ${i === 1 ? "ring-2 ring-brand" : ""}`}>
                  {p ? <PhotoImage id={p.id} alt={`${POSES.find((x) => x.v === pose)!.label}, ${dateBR(p.date)}`} /> : (
                    <div className="grid h-full place-items-center p-3 text-center text-xs text-muted-foreground"><span><ImageOff className="mx-auto mb-1 h-5 w-5" aria-hidden />A comparação aparece com a segunda foto</span></div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-overlay px-2 py-0.5 text-xs font-semibold text-white">{i === 0 ? "Antes" : "Agora"}</span>
                </div>
                {p && (
                  <figcaption className="mt-1.5 text-center text-xs">
                    <span className="font-semibold">{dateBR(p.date)}</span>
                    {p.weightKg !== undefined && <span className="text-muted-foreground"> · {fmtKg(p.weightKg)} kg</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
          {before && after && before.weightKg !== undefined && after.weightKg !== undefined && (
            <p className="mt-3 text-center text-sm">
              <b className={after.weightKg <= before.weightKg ? "text-success-text" : "text-foreground"}>
                {after.weightKg - before.weightKg > 0 ? "+" : "−"}{fmtKg(Math.abs(after.weightKg - before.weightKg))} kg
              </b> entre as duas fotos
            </p>
          )}
          {list.length > 2 && (
            <label className="mt-3 block px-1">
              <span className="text-xs font-semibold text-muted-foreground">Comparar com</span>
              <input type="range" min={0} max={list.length - 2} step={1} value={Math.min(beforeIdx, list.length - 2)}
                onChange={(e) => setBeforeIdx(Number(e.target.value))} className="mt-1 h-11 w-full accent-[var(--accent-base)]"
                aria-valuetext={before ? dateBR(before.date) : undefined} />
              <span className="flex justify-between text-xs text-muted-foreground"><span>{dateBR(list[0]!.date)}</span><span>{dateBR(list[list.length - 2]!.date)}</span></span>
            </label>
          )}
        </Card>
      )}

      {list.length > 0 && (
        <Button size="lg" className="w-full" loading={busy} onClick={() => file.current?.click()}><Camera />Nova foto de {POSES.find((x) => x.v === pose)!.label.toLowerCase()}</Button>
      )}
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { void add(e.target.files?.[0]); e.target.value = ""; }} />

      {list.length > 0 && (
        <Card>
          <h2 className="type-h3">Todas de {POSES.find((x) => x.v === pose)!.label.toLowerCase()}</h2>
          <ul className="mt-2 divide-y divide-border">
            {[...list].reverse().map((p) => (
              <li key={p.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <span className="text-sm"><b>{dateBR(p.date)}</b>{p.weightKg !== undefined && <span className="text-muted-foreground"> · {fmtKg(p.weightKg)} kg</span>}</span>
                {confirm === p.id ? (
                  <span className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Manter</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(p)}>Apagar</Button>
                  </span>
                ) : (
                  <Button size="icon" variant="ghost" aria-label={`Apagar a foto de ${dateBR(p.date)}`} onClick={() => setConfirm(p.id)}><Trash2 className="text-muted-foreground" /></Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** One photo, read from its own document. */
function PhotoImage({ id, alt }: { id: string; alt: string }) {
  const [url, , ready] = useLocal<string | null>(photoKey(id), null);
  if (!ready) return <Skeleton className="h-full w-full rounded-none" />;
  if (!url) return <div className="grid h-full place-items-center text-xs text-muted-foreground">Foto indisponível</div>;
  return <img src={url} alt={alt} className="h-full w-full object-cover animate-fade-up" />;
}
