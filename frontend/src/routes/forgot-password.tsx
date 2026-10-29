import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, Send } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Logo } from "@/components/Logo";
import { PageTransition, Spinner } from "@/components/ui-kit";
import { FloatingInput } from "@/components/ui/floating-input";
import { maskEmail } from "@/lib/utils";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { ConfigNotice } from "@/components/ConfigNotice";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? (search["email"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Forgot Password — GuardianAI" },
      {
        name: "description",
        content: "Reset your GuardianAI operator password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (!isFirebaseConfigured) {
      toast.error("Connect Firebase to continue.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setSent(true);
      toast.success("Password reset link sent to your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email.");
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
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan">Password Recovery</p>
        </div>

        <ConfigNotice />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass mt-6 rounded-3xl p-6"
        >
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
                <KeyRound className="size-7" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold">Check your inbox</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a password reset link to{" "}
                <span className="font-semibold text-cyan">{maskEmail(email)}</span>. Please check
                your inbox and follow the instructions.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/80">
                (If you don't see it in your inbox, please check your Spam or Junk folder.)
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
              >
                Back to Login
              </Link>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={busy}
                className="mt-3 text-xs font-semibold text-muted-foreground hover:text-cyan transition-colors disabled:opacity-50"
              >
                {busy ? "Sending link…" : "Didn't receive email? Resend link"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} noValidate className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your registered email address to receive a secure password reset link.
                </p>
              </div>

              <FloatingInput
                id="reset-email"
                type="email"
                autoComplete="email"
                label="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Spinner className="size-4" /> : <Send className="size-4" />}
                Send Reset Link
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan hover:underline"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
