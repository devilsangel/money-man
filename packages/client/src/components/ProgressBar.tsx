interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const fillColor =
    clamped >= 100
      ? "bg-system-red"
      : clamped >= 80
        ? "bg-system-orange"
        : "bg-system-blue";

  return (
    <div
      className={`h-1.5 rounded-full bg-sys-fill overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${fillColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
