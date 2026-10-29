import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PageTransition, Spinner } from "@/components/ui-kit";
import { FloatingInput } from "@/components/ui/floating-input";
import { maskEmail } from "@/lib/utils";
import { getPasswordError } from "@/lib/password";
import { PasswordRequirementsList } from "@/components/PasswordRequirementsList";
import { COLLECTIONS, getDb, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ConfigNotice } from "@/components/ConfigNotice";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your GuardianAI account" },
      {
        name: "description",
        content:
          "Register for GuardianAI — AI powered public safety and fall detection monitoring for CCTV networks.",
      },
      { property: "og:title", content: "Create your GuardianAI account" },
      {
        property: "og:description",
        content: "Register for GuardianAI — AI powered public safety and fall detection monitoring.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const [resending, setResending] = useState(false);
  const isPending = sent || (Boolean(user) && !user?.emailVerified);
  const displayEmail = user?.email || form.email;

  useEffect(() => {
    if (user?.emailVerified) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    if (!isPending) return;

    const interval = setInterval(async () => {
      try {
        const auth = getFirebaseAuth();
        const current = auth.currentUser;
        if (current) {
          await current.reload();
          if (current.emailVerified) {
            clearInterval(interval);
            toast.success("Email verified! Redirecting to dashboard…");
            navigate({ to: "/dashboard", replace: true });
          }
        }
      } catch {
        // ignore polling error
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, isPending, navigate]);

  async function handleResendVerification() {
    const auth = getFirebaseAuth();
    const current = auth.currentUser;
    if (!current) {
      toast.error("Account session missing. Please go to login.");
      return;
    }
    setResending(true);
    try {
      const actionCodeSettings = {
        url: typeof window !== "undefined" ? window.location.origin + "/dashboard" : "http://localhost:8080/dashboard",
        handleCodeInApp: true,
      };
      await sendEmailVerification(current, actionCodeSettings);
      toast.success("Verification email resent. Please check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend email.");
    } finally {
      setResending(false);
    }
  }

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;

    const error = !isFirebaseConfigured
      ? "Connect Firebase to continue."
      : !form.name.trim()
        ? "Full Name is required."
        : form.name.trim().length < 2
          ? "Please enter your full name."
          : !form.email.trim()
            ? "Email is required."
            : !/^\S+@\S+\.\S+$/.test(form.email.trim())
              ? "Please enter a valid email."
              : !form.password
                ? "Password is required."
                : getPasswordError(form.password)
                  ? getPasswordError(form.password)
                  : !form.confirm
                    ? "Confirm Password is required."
                    : form.password !== form.confirm
                      ? "Passwords do not match."
                      : null;
    if (error) {
      toast.error(error);
      return;
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await setDoc(
        doc(getDb(), COLLECTIONS.users, cred.user.uid),
        {
          name: form.name.trim(),
          email: form.email.trim(),
          profileImage: "",
          role: "user",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      const actionCodeSettings = {
        url: typeof window !== "undefined" ? window.location.origin + "/dashboard" : "http://localhost:8080/dashboard",
        handleCodeInApp: true,
      };
      await sendEmailVerification(cred.user, actionCodeSettings);
      setSent(true);
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AmbientBackground variant="register" />
      <ThemeToggle className="fixed right-4 top-4 z-20" />
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 font-display text-3xl font-bold text-gradient">GuardianAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered public safety and incident response platform
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan">Create operator account</p>
        </div>


        <ConfigNotice />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass mt-6 rounded-3xl p-6"
        >
          {isPending ? (
            <div className="flex flex-col items-center text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
                <MailCheck className="size-7" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold">
                Verification email sent. Please check your inbox.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a link to <span className="font-semibold text-cyan">{maskEmail(displayEmail)}</span>. Verify it, then sign in to open the console.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/80">
                (If you don't see it in your inbox, please check your Spam or Junk folder.)
              </p>

              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
              >
                Go to Login
              </Link>

              <button
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={resending}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
              >
                {resending ? <Spinner className="size-3.5" /> : null}
                {resending ? "Resending email…" : "Resend verification email"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <FloatingInput
                id="name"
                label="Full Name"
                required
                value={form.name}
                onChange={update("name")}
              />
              <FloatingInput
                id="email"
                type="email"
                autoComplete="email"
                label="Email"
                required
                value={form.email}
                onChange={update("email")}
              />
              <FloatingInput
                id="password"
                type="password"
                autoComplete="new-password"
                label="Password"
                required
                showPasswordToggle
                value={form.password}
                onChange={update("password")}
              />
              <PasswordRequirementsList password={form.password} />
              <FloatingInput
                id="confirm"
                type="password"
                autoComplete="new-password"
                label="Confirm Password"
                required
                showPasswordToggle
                value={form.confirm}
                onChange={update("confirm")}
              />
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={busy}
                aria-busy={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner className="size-4" /> : null}
                {busy ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-cyan hover:underline">
              Login
            </Link>
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
