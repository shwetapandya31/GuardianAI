import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      className,
      containerClassName,
      label,
      id,
      type = "text",
      value,
      onChange,
      showPasswordToggle = false,
      required,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const inputType = type === "password" && showPassword ? "text" : type;

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <input
          id={id}
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder=" "
          required={required}
          className={cn(
            "peer block h-12 w-full rounded-xl border border-input/60 bg-secondary/20 px-4 text-sm font-medium text-foreground outline-none transition-all duration-200",
            "focus:border-cyan focus:ring-1 focus:ring-cyan/60 focus:bg-secondary/40",
            "disabled:cursor-not-allowed disabled:opacity-50 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
            type === "password" && showPasswordToggle ? "pr-11" : "",
            className
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "absolute left-3.5 transition-all duration-200 pointer-events-none origin-[0] select-none text-muted-foreground px-1.5 rounded-sm inline-flex items-center gap-0.5",
            // Position when focused or filled (sitting directly ON top border line)
            "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:font-medium peer-focus:text-cyan peer-focus:bg-card",
            "peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:bg-card",
            // Position when empty and not focused (inside input)
            "peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:bg-transparent",
            // Color override when focused
            "peer-focus:peer-[:not(:placeholder-shown)]:text-cyan"
          )}
        >
          <span>{label}</span>
          {(required || props["aria-required"]) && (
            <span className="text-destructive font-bold ml-0.5">*</span>
          )}
        </label>
        {type === "password" && showPasswordToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";
