import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing, CheckCheck } from "lucide-react";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/card";
import { NoticeList, useNoticeCount } from "@/components/NoticeCenter";
import { KEYS, useLocal, type Profile } from "@/lib/store";

export const Route = createFileRoute("/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos — forma" },
      { name: "description", content: "Conquistas, alertas de peso e alimentação, lembretes e notificações do aparelho." },
    ],
  }),
  component: NoticesPage,
});

/** The notices of the app in one place, opened from the bell in the tab bar. */
function NoticesPage() {
  const [profile, , ready] = useLocal<Profile | null>(KEYS.profile, null);
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const count = useNoticeCount(list);
  if (!ready) return <ScreenSkeleton cards={2} />;
  return (
    <div className="space-y-5">
      <header>
        <Eyebrow tone="muted">{count ? `${count} ${count === 1 ? "aviso" : "avisos"}` : "Central"}</Eyebrow>
        <h1 className="type-h1 mt-1 flex items-center gap-2"><BellRing className="h-7 w-7 text-accent" aria-hidden />Avisos</h1>
        <p className="mt-1 text-sm text-muted-foreground">O que os seus registros estão dizendo e pede uma decisão. Dispensar um aviso o esconde por um tempo.</p>
      </header>
      <div ref={setList} className="space-y-3" aria-live="polite">
        <NoticeList profile={profile} />
      </div>
      {count === 0 && (
        <EmptyState icon={CheckCheck} title="Tudo em dia por aqui">
          Nenhum aviso agora. Quando o peso, a alimentação ou o treino pedirem atenção, ou uma conquista nova chegar, aparece aqui.
        </EmptyState>
      )}
    </div>
  );
}
