import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-footnote font-medium text-sys-label-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3 py-2
            text-body text-sys-label
            bg-sys-bg-secondary
            border border-sys-separator
            rounded-input
            focus:outline-none focus:ring-2 focus:ring-system-blue/30 focus:border-system-blue
            transition-all duration-150
            ${error ? "border-system-red" : ""}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-caption text-system-red">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
