import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogIn, MailWarning } from "lucide-react";
import { sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { Logo } from "@/components/Logo";
import { PageTransition, Spinner } from "@/components/ui-kit";
import { FloatingInput } from "@/components/ui/floating-input";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ConfigNotice } from "@/components/ConfigNotice";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — GuardianAI Safety Console" },
      {
        name: "description",
        content: "Secure email sign-in to the GuardianAI fall detection and CCTV monitoring console.",
      },
      { property: "og:title", content: "Login — GuardianAI Safety Console" },
      {
        property: "og:description",
        content: "Secure email sign-in to the GuardianAI monitoring console.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    if (user && !user.emailVerified) {
      setUnverified(true);
    }

    if (!unverified) return;

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
  }, [user, unverified, navigate]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isFirebaseConfigured) {
      toast.error("Connect Firebase to continue.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (!form.password) {
      toast.error("Password is required.");
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        form.email.trim(),
        form.password,
      );
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        setUnverified(true);
        toast.error("Please verify your email before continuing.");
        return;
      }
      toast.success("Authenticated. Opening console…");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    const current = getFirebaseAuth().currentUser;
    if (!current) {
      toast.error("Sign in first so we can resend the link.");
      return;
    }
    setBusy(true);
    try {
      const actionCodeSettings = {
        url: typeof window !== "undefined" ? window.location.origin + "/dashboard" : "http://localhost:8080/dashboard",
        handleCodeInApp: true,
      };
      await sendEmailVerification(current, actionCodeSettings);
      toast.success("Verification email sent. Please check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AmbientBackground variant="login" />
      <ThemeToggle className="fixed right-4 top-4 z-20" />
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={64} />
          <h1 className="mt-4 font-display text-3xl font-bold text-gradient">GuardianAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered public safety and incident response platform
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan">Secure operator sign-in</p>
        </div>

        <ConfigNotice />


        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass mt-6 rounded-3xl p-6"
        >
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <FloatingInput
              id="login-email"
              type="email"
              autoComplete="email"
              label="Email"
              required
              value={form.email}
              onChange={update("email")}
            />
            <div>
              <FloatingInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                label="Password"
                required
                showPasswordToggle
                value={form.password}
                onChange={update("password")}
              />
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="/forgot-password"
                  search={{ email: form.email }}
                  className="text-xs font-semibold text-cyan hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Spinner className="size-4" /> : <LogIn className="size-4" />}
              Login
            </button>
          </form>

          {unverified ? (
            <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
                Your email is not verified yet. Check your inbox for the GuardianAI verification link.
              </p>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={busy}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-4 py-2.5 text-sm font-semibold text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner className="size-4" /> : null}
                Resend verification email
              </button>
            </div>
          ) : null}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New operator?{" "}
            <Link to="/register" className="font-semibold text-cyan hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
