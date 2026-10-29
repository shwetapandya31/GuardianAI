import { Check, X } from "lucide-react";
import { validatePassword } from "@/lib/password";

interface Props {
  password?: string;
}

export function PasswordRequirementsList({ password = "" }: Props) {
  if (!password) return null;

  const reqs = validatePassword(password);

  const items = [
    { label: "At least 6 characters", met: reqs.minLength },
    { label: "Contains letter (a-z / A-Z)", met: reqs.hasLetter },
    { label: "Contains vowel (a, e, i, o, u)", met: reqs.hasVowel },
    { label: "Contains number (0-9)", met: reqs.hasNumber },
    { label: "Contains special character (!@#$…)", met: reqs.hasSpecialChar },
  ];

  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-secondary/20 p-3 text-xs space-y-1.5 transition-all">
      <p className="font-semibold text-muted-foreground mb-1">Password requirements:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {item.met ? (
              <Check className="size-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="size-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={item.met ? "text-emerald-400 font-medium" : "text-muted-foreground/70"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
