import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { toast } from "sonner";
import { ArrowLeft, Camera as CameraIcon, KeyRound, LogOut, MailCheck, Save } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageTransition, Spinner } from "@/components/ui-kit";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { COLLECTIONS, getDb, getFirebaseStorage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getPasswordError } from "@/lib/password";
import { PasswordRequirementsList } from "@/components/PasswordRequirementsList";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Operator Profile — GuardianAI" },
      {
        name: "description",
        content:
          "Manage your GuardianAI operator profile: photo, contact details, organization, email and password.",
      },
      { property: "og:title", content: "Operator Profile — GuardianAI" },
      { property: "og:description", content: "Manage your GuardianAI operator profile details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  department: "",
  city: "",
  emergencyContact: "",
  profileImage: "",
};

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: "", password: "" });
  const [emailBusy, setEmailBusy] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: profile?.name ?? user?.displayName ?? "",
      email: profile?.email ?? user?.email ?? "",
      phone: profile?.phone ?? "",
      organization: profile?.organization ?? "",
      department: profile?.department ?? "",
      city: profile?.city ?? "",
      emergencyContact: profile?.emergencyContact ?? "",
      profileImage: profile?.profileImage ?? user?.photoURL ?? "",
    });
  }, [profile, user]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const storageRef = ref(getFirebaseStorage(), `profileImages/${user.uid}-${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(getDb(), COLLECTIONS.users, user.uid), {
        profileImage: url,
        updatedAt: serverTimestamp(),
      });
      setForm((f) => ({ ...f, profileImage: url }));
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), COLLECTIONS.users, user.uid), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
        department: form.department.trim(),
        city: form.city.trim(),
        emergencyContact: form.emergencyContact.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Changes saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    const next = emailForm.newEmail.trim();
    if (!next) {
      toast.error("New email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(next)) {
      toast.error("Enter a valid new email address.");
      return;
    }
    if (!emailForm.password) {
      toast.error("Enter your current password to confirm.");
      return;
    }
    setEmailBusy(true);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, emailForm.password),
      );
      await verifyBeforeUpdateEmail(user, next);
      toast.success("Verification link sent to the new address. Confirm it to finish the change.");
      setEmailForm({ newEmail: "", password: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start email change.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (!pwForm.current) {
      toast.error("Current password is required.");
      return;
    }
    if (!pwForm.next) {
      toast.error("New password is required.");
      return;
    }
    const pwError = getPasswordError(pwForm.next);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    if (!pwForm.confirm) {
      toast.error("Confirm new password is required.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, pwForm.current),
      );
      await updatePassword(user, pwForm.next);
      toast.success("Password updated.");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setPwBusy(false);
    }
  }

  const initials = (form.name || "G")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <PageTransition className="relative mx-auto max-w-2xl px-4 pb-16 pt-6">
      <AmbientBackground variant="profile" />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Console
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await logout();
              toast.success("Signed out.");
              navigate({ to: "/login", replace: true });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Logout
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mt-5 rounded-3xl p-6"
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="size-24 border border-border/70 ring-4 ring-primary/25">
              <AvatarImage src={form.profileImage || undefined} alt={form.name || "Operator"} />
              <AvatarFallback className="bg-secondary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow disabled:opacity-70"
            >
              {uploading ? <Spinner className="size-4" /> : <CameraIcon className="size-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          {!profile ? (
            <Skeleton className="mt-4 h-5 w-32" />
          ) : (
            <>
              <p className="mt-4 font-display text-lg font-bold">{form.name || "Operator"}</p>
              <p className="text-xs uppercase tracking-wide text-cyan">{profile.role ?? "user"}</p>
            </>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="p-name" label="Full Name" value={form.name} onChange={update("name")} />
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={form.email} readOnly disabled />
            </div>
            <Field
              id="p-phone"
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={update("phone")}
            />
            <Field
              id="p-org"
              label="Organization"
              placeholder="City Police / Campus Security"
              value={form.organization}
              onChange={update("organization")}
            />
            <Field
              id="p-dept"
              label="Department / Role"
              placeholder="Control Room Operator"
              value={form.department}
              onChange={update("department")}
            />
            <Field id="p-city" label="City" placeholder="Pune" value={form.city} onChange={update("city")} />
            <div className="sm:col-span-2">
              <Field
                id="p-emergency"
                label="Emergency Contact"
                placeholder="+91 100 — Control Room"
                value={form.emergencyContact}
                onChange={update("emergencyContact")}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
            Save Changes
          </button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass mt-5 rounded-3xl p-6"
      >
        <h2 className="font-display text-base font-bold">Change Email</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          We send a verification link to the new address. The email only changes after you confirm it.
        </p>
        <form onSubmit={handleChangeEmail} noValidate className="mt-4 space-y-4">
          <Field
            id="p-new-email"
            label="New Email"
            type="email"
            value={emailForm.newEmail}
            onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
          />
          <Field
            id="p-email-pw"
            label="Current Password"
            type="password"
            value={emailForm.password}
            onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
          />
          <button
            type="submit"
            disabled={emailBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-4 py-3 text-sm font-semibold text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {emailBusy ? <Spinner className="size-4" /> : <MailCheck className="size-4" />}
            Send verification email
          </button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="glass mt-5 rounded-3xl p-6"
      >
        <h2 className="font-display text-base font-bold">Change Password</h2>
        <form onSubmit={handleChangePassword} noValidate className="mt-4 space-y-4">
          <Field
            id="p-cur-pw"
            label="Current Password"
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="p-next-pw"
              label="New Password"
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            />
            <Field
              id="p-confirm-pw"
              label="Confirm New Password"
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>
          <PasswordRequirementsList password={pwForm.next} />
          <button
            type="submit"
            disabled={pwBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-4 py-3 text-sm font-semibold text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pwBusy ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
            Update password
          </button>
        </form>
      </motion.div>
    </PageTransition>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
