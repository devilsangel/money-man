import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary: "bg-system-blue text-white hover:opacity-90",
  secondary: "bg-sys-fill text-sys-label hover:opacity-80",
  destructive: "bg-system-red text-white hover:opacity-90",
  ghost: "text-system-blue hover:bg-sys-fill",
};

const sizes = {
  sm: "px-3 py-1.5 text-footnote",
  md: "px-4 py-2 text-callout",
  lg: "px-5 py-2.5 text-body",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-btn font-medium
        transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
