interface AmountDisplayProps {
  cents: number;
  showSign?: boolean;
  className?: string;
  currency?: string;
}

export function AmountDisplay({
  cents,
  showSign = false,
  className = "",
  currency = "USD",
}: AmountDisplayProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(cents) / 100);

  const isNegative = cents < 0;
  const isPositive = cents > 0;

  let colorClass = "";
  if (showSign) {
    colorClass = isNegative
      ? "text-system-red"
      : isPositive
        ? "text-system-green"
        : "";
  }

  return (
    <span className={`${colorClass} ${className}`.trim()}>
      {showSign && isNegative ? "-" : showSign && isPositive ? "+" : ""}
      {formatted}
    </span>
  );
}
