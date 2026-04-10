/**
 * components/ui/FormField.jsx
 * Reusable form field wrapper:
 * - Label + required indicator
 * - Input / Select / Textarea / Custom children
 * - Error message
 * - Helper text
 */
import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

// ─── FormField wrapper ────────────────────────────────────────────────────────
export function FormField({
  label,
  required,
  error,
  helper,
  children,
  className,
}) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      {label && (
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
          {label}
          {required && <span className="text-danger-500 text-xs">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-danger-500">
          <AlertCircle size={11} className="flex-shrink-0" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-[--text-tertiary]">{helper}</p>
      )}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = forwardRef(({ error, className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx("input", error && "input-error", className)}
    {...props}
  />
));
Input.displayName = "Input";

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = forwardRef(
  ({ error, rows = 4, className, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx("input resize-none", error && "input-error", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef(
  ({ error, children, className, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx(
        "input appearance-none cursor-pointer",
        error && "input-error",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export function Checkbox({ label, checked, onChange, disabled }) {
  return (
    <label
      className={clsx(
        "flex items-center gap-2.5 cursor-pointer group",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={clsx(
            "w-4.5 w-[18px] h-[18px] rounded-md border transition-all duration-150",
            checked
              ? "bg-primary-500 border-primary-500"
              : "border-[--border-hover] group-hover:border-primary-500/60",
          )}
        >
          {checked && (
            <svg
              viewBox="0 0 12 10"
              fill="none"
              className="absolute inset-0 m-auto w-3"
            >
              <path
                d="M1 5l3.5 3.5L11 1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="text-sm text-[--text-primary]">{label}</span>}
    </label>
  );
}

// ─── Form Row (2 columns) ─────────────────────────────────────────────────────
export function FormRow({ children, className }) {
  return (
    <div className={clsx("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      {children}
    </div>
  );
}
