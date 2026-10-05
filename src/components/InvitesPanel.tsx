import { useEffect, useState, type FormEvent } from "react";
import { Copy, MessageCircle, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { normEmail } from "@/lib/auth";

type Invite = { email: string; name?: string };

const inviteLink = (email: string) => `${window.location.origin}/?convite=${encodeURIComponent(email)}`;
const whatsappText = (email: string) =>
  `Te convidei para o app de treino e alimentação forma. Entre por este link, crie sua senha (ou use "Entrar com Google" com este e-mail): ${inviteLink(email)}`;

/** Administrator only: who may use the app. Firestore rules enforce it server-side. */
export function InvitesPanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(
    () =>
      onSnapshot(collection(db(), "invites"), (snap) =>
        setInvites(snap.docs.map((d) => ({ email: d.id, ...(d.data() as { name?: string }) })).sort((a, b) => a.email.localeCompare(b.email))),
      ),
    [],
  );

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const clean = normEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      toast.error("Digite um e-mail válido");
      return;
    }
    await setDoc(doc(db(), "invites", clean), { name: name.trim(), createdAt: serverTimestamp() });
    toast.success(`Convite criado para ${clean}`);
    setEmail("");
    setName("");
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Convites</h2>
      <p className="mt-1 text-sm text-muted-foreground">Só os e-mails desta lista conseguem usar o app. Cada pessoa vê apenas os próprios dados.</p>
      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <Input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-40" />
        <Input type="email" placeholder="email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1" />
        <Button type="submit" className="rounded-full"><UserPlus />Convidar</Button>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {invites.length === 0 && <li className="py-2 text-sm text-muted-foreground">Nenhum convite ainda.</li>}
        {invites.map((i) => (
          <li key={i.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="min-w-0">
              {i.name && <span className="block font-semibold">{i.name}</span>}
              <span className="block truncate text-sm text-muted-foreground">{i.email}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <Button asChild variant="secondary" size="sm" className="rounded-full">
                <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText(i.email))}`} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp</a>
              </Button>
              <Button type="button" variant="secondary" size="icon" aria-label={`Copiar link de convite de ${i.email}`} title="Copiar link"
                onClick={() => navigator.clipboard.writeText(inviteLink(i.email)).then(() => toast.success("Link copiado"))} className="h-8 w-8 rounded-full">
                <Copy />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover convite de ${i.email}`} title="Remover convite"
                onClick={() => { if (confirm(`Remover o acesso de ${i.email}? Os dados da pessoa ficam guardados.`)) void deleteDoc(doc(db(), "invites", i.email)); }}
                className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
