import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ text: z.string().min(2).max(500) });

const SYSTEM = `Você é um nutricionista. Estime as porções e os macros dos alimentos descritos (culinária brasileira, use a tabela TACO como referência).
Responda SOMENTE com JSON no formato: {"items":[{"name":string,"grams":number,"kcal":number,"p":number,"c":number,"f":number}]}
Valores totais por item (não por 100g), números arredondados a 1 casa. Se a quantidade não for dita, assuma uma porção típica.`;

export const Route = createFileRoute("/api/estimate-food")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Descrição inválida." }, { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "IA não configurada." }, { status: 500 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEM,
            input: parsed.data.text,
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
        });
        if (!res.ok || !res.body) {
          const msg =
            res.status === 429 ? "Muitas solicitações, tente em instantes."
            : res.status === 402 ? "Créditos de IA esgotados."
            : `Falha na IA (${res.status}).`;
          return Response.json({ error: msg }, { status: res.status || 500 });
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let text = "";
        let streamErr = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const d = line.slice(5).trim();
            if (!d || d === "[DONE]") continue;
            try {
              const ev = JSON.parse(d);
              if (ev.type === "response.output_text.delta") text += ev.delta;
              if (ev.type === "error" || ev.type === "response.failed") streamErr = ev.message ?? "Falha na IA.";
            } catch { /* ignore */ }
          }
        }
        if (streamErr) return Response.json({ error: streamErr }, { status: 502 });
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) return Response.json({ error: "A IA não retornou uma estimativa." }, { status: 502 });
        try {
          const json = JSON.parse(m[0]);
          return Response.json({ items: Array.isArray(json.items) ? json.items : [] });
        } catch {
          return Response.json({ error: "Resposta da IA inválida." }, { status: 502 });
        }
      },
    },
  },
});
