import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-footnote font-medium text-sys-label-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2
            text-body text-sys-label
            bg-sys-bg-secondary
            border border-sys-separator
            rounded-input
            placeholder:text-sys-label-tertiary
            focus:outline-none focus:ring-2 focus:ring-system-blue/30 focus:border-system-blue
            transition-all duration-150
            ${error ? "border-system-red focus:ring-system-red/30" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-caption text-system-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
