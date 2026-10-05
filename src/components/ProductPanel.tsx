import { useRef, useState } from "react";
import { Camera, Loader2, ScanBarcode, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useLocal } from "@/lib/store";
import { lookupBarcode, PRODUCTS_KEY, readLabel, type Product } from "@/lib/products";

type Added = { name: string; grams: number; kcal: number; p: number; c: number; f: number };
const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number | undefined, unit: string) => (n === undefined ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`);

/** Alimentação → Produto: barcode (camera or typed) or a photo of the nutrition table, then the amount eaten. */
export function ProductPanel({ onAdd }: { onAdd: (food: Added) => void }) {
  const [saved, setSaved] = useLocal<Record<string, Product>>(PRODUCTS_KEY, {});
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [grams, setGrams] = useState(100);
  const [busy, setBusy] = useState<"" | "code" | "photo">("");
  const [scanning, setScanning] = useState(false);
  const photo = useRef<HTMLInputElement>(null);

  const keyOf = (p: Product) => p.barcode ?? `rotulo:${p.name.toLowerCase()}`;
  const save = (p: Product) => setSaved((all) => ({ ...all, [keyOf(p)]: { ...p, savedAt: Date.now() } }));
  const show = (p: Product) => {
    setProduct(p);
    setNotFound(null);
    setGrams(p.servingGrams ?? 100);
  };

  const find = async (raw: string) => {
    const barcode = raw.replace(/\D/g, "");
    if (barcode.length < 8) {
      toast.error("O código de barras tem de 8 a 14 números.");
      return;
    }
    setCode(barcode);
    setScanning(false);
    const mine = saved[barcode];
    if (mine) return show({ ...mine, source: "Meus produtos" });
    setBusy("code");
    try {
      const p = await lookupBarcode(barcode);
      if (p) {
        save(p);
        show(p);
      } else {
        setProduct(null);
        setNotFound(barcode);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar o código.");
    } finally {
      setBusy("");
    }
  };

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy("photo");
    try {
      const read = await readLabel(file, notFound ?? product?.barcode);
      // A re-read label keeps the name already known for the product.
      const p = product && product.barcode && product.barcode === read.barcode ? { ...read, name: product.name, brand: product.brand } : read;
      save(p);
      show(p);
      toast.success("Tabela lida. Confira os valores antes de adicionar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    } finally {
      setBusy("");
      if (photo.current) photo.current.value = "";
    }
  };

  const rename = (name: string) => {
    if (!product) return;
    const next = { ...product, name };
    setProduct(next);
    if (name.trim()) setSaved((all) => {
      const { [keyOf(product)]: _old, ...rest } = all;
      return { ...rest, [keyOf(next)]: { ...next, savedAt: Date.now() } };
    });
  };

  const add = () => {
    if (!product || !(grams > 0)) return;
    const k = grams / 100;
    onAdd({ name: product.brand ? `${product.name} (${product.brand})` : product.name, grams, kcal: Math.round(product.kcal * k), p: r1(product.p * k), c: r1(product.c * k), f: r1(product.f * k) });
    setProduct(null);
    setCode("");
  };

  const recent = Object.values(saved).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)).slice(0, 6);
  const serving = product?.servingGrams;

  return (
    <div className="mt-4 space-y-4">
      <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void fromPhoto(e.target.files?.[0])} />
      <BarcodeScanner open={scanning} onClose={() => setScanning(false)} onCode={(c) => void find(c)} />

      {!product && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={() => setScanning(true)} disabled={!!busy} className="h-12 rounded-full"><ScanBarcode />Ler código de barras</Button>
            <Button type="button" variant="secondary" onClick={() => photo.current?.click()} disabled={!!busy} className="h-12 rounded-full">
              {busy === "photo" ? <Loader2 className="animate-spin" /> : <Camera />}Foto da tabela nutricional
            </Button>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void find(code); }}>
            <Input inputMode="numeric" placeholder="Ou digite o código (ex.: 7891000100103)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código de barras" />
            <Button type="submit" variant="secondary" disabled={!!busy} className="shrink-0 rounded-full" aria-label="Buscar código">
              {busy === "code" ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </form>
          {notFound && (
            <div className="rounded-2xl bg-accent/10 p-4 text-sm">
              <p><b>Código {notFound} não encontrado</b> na base aberta de produtos.</p>
              <p className="mt-1 text-muted-foreground">Fotografe a tabela nutricional da embalagem: a IA lê os valores e o produto fica salvo para a próxima vez.</p>
              <Button type="button" size="sm" onClick={() => photo.current?.click()} disabled={!!busy} className="mt-3 rounded-full">
                {busy === "photo" ? <Loader2 className="animate-spin" /> : <Camera />}Fotografar tabela
              </Button>
            </div>
          )}
          {busy === "photo" && <p className="text-sm text-muted-foreground">Lendo a tabela… pode levar alguns segundos.</p>}
          {recent.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meus produtos</h4>
              <ul className="mt-1 divide-y divide-border">
                {recent.map((p) => (
                  <li key={keyOf(p)}>
                    <button type="button" onClick={() => show({ ...p, source: "Meus produtos" })} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-accent">
                      <span className="min-w-0 truncate font-semibold">{p.name}{p.brand && <span className="font-normal text-muted-foreground"> · {p.brand}</span>}</span>
                      <span className="shrink-0 text-muted-foreground">{p.kcal} kcal/100 g</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {product && (
        <div className="rounded-2xl bg-muted p-4">
          <Input value={product.name} onChange={(e) => rename(e.target.value)} aria-label="Nome do produto" className="bg-card font-display text-lg font-bold" />
          <p className="mt-1 text-xs text-muted-foreground">
            {product.brand && <>{product.brand} · </>}{product.barcode && <>código {product.barcode} · </>}fonte: {product.source}
          </p>

          <table className="mt-3 w-full overflow-hidden rounded-xl bg-card text-sm">
            <caption className="sr-only">Tabela nutricional</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Informação nutricional</th>
                <th className="px-3 py-2 text-right font-semibold">100 g</th>
                {serving && <th className="px-3 py-2 text-right font-semibold">Porção {serving} g</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {([
                ["Valor energético", product.kcal, "kcal"],
                ["Carboidratos", product.c, "g"],
                ["Açúcares totais", product.sugar, "g"],
                ["Proteínas", product.p, "g"],
                ["Gorduras totais", product.f, "g"],
                ["Fibras", product.fiber, "g"],
                ["Sódio", product.sodium, "mg"],
              ] as const).map(([label, value, unit]) => (
                <tr key={label}>
                  <td className="px-3 py-1.5">{label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">{fmt(value, unit)}</td>
                  {serving && <td className="whitespace-nowrap px-3 py-1.5 text-right">{fmt(value === undefined ? undefined : (value * serving) / 100, unit)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {product.servingLabel && <p className="mt-1 text-xs text-muted-foreground">Porção do rótulo: {product.servingLabel}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} aria-label="Quantidade em gramas" className="w-24 rounded-xl border border-input bg-card px-3 py-2" />
            <span className="text-sm">gramas</span>
            {serving && [1, 2, 3].map((n) => (
              <button key={n} type="button" onClick={() => setGrams(serving * n)} className="rounded-full border border-input bg-card px-3 py-1 text-xs font-semibold">{n} {n === 1 ? "porção" : "porções"}</button>
            ))}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {Math.round((product.kcal * grams) / 100)} kcal · P {r1((product.p * grams) / 100)}g · C {r1((product.c * grams) / 100)}g · G {r1((product.f * grams) / 100)}g
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={add} className="rounded-full bg-accent px-5 py-2 font-bold text-accent-foreground">Adicionar</button>
            <button type="button" onClick={() => photo.current?.click()} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold text-primary">
              {busy === "photo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Corrigir pela foto do rótulo
            </button>
            <button type="button" onClick={() => { setProduct(null); setCode(""); }} className="rounded-full px-4 py-2 font-semibold text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
