import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_EMAIL, auth, db } from "./firebase";
import { migrateLocalData, resetCloudCache } from "./cloud-store";

export type AuthStatus = "loading" | "signed-out" | "unverified" | "not-invited" | "ready";

type AuthState = { status: AuthStatus; user: User | null; isAdmin: boolean; recheck: () => Promise<void> };

const AuthContext = createContext<AuthState>({ status: "loading", user: null, isAdmin: false, recheck: async () => {} });

export const normEmail = (email: string) => email.trim().toLowerCase();

async function statusFor(user: User | null): Promise<AuthStatus> {
  if (!user) return "signed-out";
  const email = normEmail(user.email ?? "");
  // Invited people go straight in. Only the administrator must own the address (Google sign-in already
  // proves it), otherwise anyone could create a password account with that e-mail and manage invites.
  if (email === ADMIN_EMAIL) return user.emailVerified ? "ready" : "unverified";
  try {
    const invite = await getDoc(doc(db(), "invites", email));
    return invite.exists() ? "ready" : "not-invited";
  } catch {
    return "not-invited";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const resolve = useCallback(async (u: User | null) => {
    if (!u) resetCloudCache();
    const next = await statusFor(u);
    if (next === "ready" && u) await migrateLocalData(u.uid);
    setUser(u);
    setStatus(next);
  }, []);

  useEffect(() => onAuthStateChanged(auth(), (u) => void resolve(u)), [resolve]);

  const recheck = useCallback(async () => {
    const u = auth().currentUser;
    if (u) await u.reload();
    await resolve(auth().currentUser);
  }, [resolve]);

  const isAdmin = normEmail(user?.email ?? "") === ADMIN_EMAIL && !!user?.emailVerified;
  return <AuthContext.Provider value={{ status, user, isAdmin, recheck }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth(), normEmail(email), password);

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth(), normEmail(email), password);
  if (normEmail(email) === ADMIN_EMAIL) await sendEmailVerification(cred.user, { url: window.location.origin });
}

export const signInWithGoogle = () => signInWithPopup(auth(), new GoogleAuthProvider());

export const resetPassword = (email: string) => sendPasswordResetEmail(auth(), normEmail(email), { url: window.location.origin });

export const resendVerification = () => {
  const u = auth().currentUser;
  return u ? sendEmailVerification(u, { url: window.location.origin }) : Promise.resolve();
};

export const logout = () => signOut(auth());

/** Portuguese messages for the Firebase Auth errors a user can actually hit. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Digite a senha.",
    "auth/email-already-in-use": "Este e-mail já tem conta. Use \"Entrar\" ou \"Esqueci a senha\".",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/network-request-failed": "Sem conexão com a internet.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/cancelled-popup-request": "Login com Google cancelado.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.",
    "auth/operation-not-allowed": "Esse tipo de login ainda não foi ativado no Firebase.",
  };
  return messages[code] ?? "Não foi possível concluir. Tente de novo.";
}
