import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { budgetsApi } from "../api/budgets.js";
import { AmountDisplay } from "./AmountDisplay.js";

export function SpendingAlert() {
  const [dismissed, setDismissed] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: budgets } = useQuery({
    queryKey: ["budgets", currentMonth],
    queryFn: () => budgetsApi.list(currentMonth),
  });

  if (dismissed || !budgets) return null;

  const overBudget = budgets.filter(
    (b) => b.amount > 0 && (b.spent ?? 0) >= b.amount
  );
  const nearLimit = budgets.filter(
    (b) => b.amount > 0 && (b.spent ?? 0) / b.amount >= 0.9 && (b.spent ?? 0) < b.amount
  );

  if (overBudget.length === 0 && nearLimit.length === 0) return null;

  return (
    <div className="mb-6 rounded-card border border-system-orange/40 bg-system-orange/8 px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="text-system-orange flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {overBudget.length > 0 && (
          <p className="text-callout font-medium text-sys-label">
            Over budget in{" "}
            {overBudget.map((b, i) => (
              <span key={b.id}>
                {i > 0 ? ", " : ""}
                <strong>{b.category_name}</strong>{" "}
                <span className="text-system-red font-normal">
                  (<AmountDisplay cents={(b.spent ?? 0) - b.amount} /> over)
                </span>
              </span>
            ))}
          </p>
        )}
        {nearLimit.length > 0 && (
          <p className="text-subheadline text-sys-label-secondary mt-0.5">
            Approaching limit:{" "}
            {nearLimit.map((b, i) => (
              <span key={b.id}>
                {i > 0 ? ", " : ""}
                {b.category_name} (
                {Math.round(((b.spent ?? 0) / b.amount) * 100)}%)
              </span>
            ))}
          </p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-sys-label-tertiary hover:text-sys-label transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
