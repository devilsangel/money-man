import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { accountsApi } from "../api/accounts.js";
import { transactionsApi } from "../api/transactions.js";
import { budgetsApi } from "../api/budgets.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { AmountDisplay } from "../components/AmountDisplay.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { Skeleton } from "../components/Skeleton.js";
import { TransactionModal } from "../components/TransactionModal.js";

function StatCard({
  label,
  cents,
  icon: Icon,
  color,
}: {
  label: string;
  cents: number;
  icon: typeof DollarSign;
  color: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-footnote text-sys-label-secondary mb-1">{label}</p>
          <AmountDisplay cents={cents} className="text-title-2 font-bold text-sys-label" />
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  const { data: recent, isLoading: loadingTxns } = useQuery({
    queryKey: ["transactions", { page: 1, limit: 5 }],
    queryFn: () => transactionsApi.list({ limit: 5 }),
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets", currentMonth],
    queryFn: () => budgetsApi.list(currentMonth),
  });

  const assets = accounts
    ?.filter((a) => a.type !== "credit_card")
    .reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0;

  const liabilities = accounts
    ?.filter((a) => a.type === "credit_card")
    .reduce((s, a) => s + (a.balance ?? 0), 0) ?? 0;

  const netWorth = assets + liabilities;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-title-1 text-sys-label">Overview</h2>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add Transaction
        </Button>
      </div>

      {/* Summary cards */}
      {loadingAccounts ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Assets"
            cents={assets}
            icon={TrendingUp}
            color="bg-system-green"
          />
          <StatCard
            label="Liabilities"
            cents={Math.abs(liabilities)}
            icon={TrendingDown}
            color="bg-system-red"
          />
          <StatCard
            label="Net Worth"
            cents={netWorth}
            icon={DollarSign}
            color="bg-system-blue"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline text-sys-label">Recent Transactions</h3>
            <button
              className="text-footnote text-system-blue"
              onClick={() => navigate("/transactions")}
            >
              See all
            </button>
          </div>

          {loadingTxns ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : recent?.data.length === 0 ? (
            <p className="text-body text-sys-label-secondary text-center py-8">
              No transactions yet
            </p>
          ) : (
            <ul className="divide-y divide-sys-separator">
              {recent?.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: t.category_color ?? "#8E8E93" + "30" }}
                    >
                      {t.type === "income" ? "↑" : t.type === "transfer" ? "↔" : "↓"}
                    </span>
                    <div>
                      <p className="text-callout text-sys-label">
                        {t.payee || t.category_name || "Transaction"}
                      </p>
                      <p className="text-caption text-sys-label-secondary">
                        {t.date} · {t.account_name}
                      </p>
                    </div>
                  </div>
                  <AmountDisplay
                    cents={t.amount}
                    showSign
                    className="text-callout font-medium"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Budget Snapshot */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline text-sys-label">Budget This Month</h3>
            <button
              className="text-footnote text-system-blue"
              onClick={() => navigate("/budgets")}
            >
              Manage
            </button>
          </div>

          {loadingBudgets ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : budgets?.length === 0 ? (
            <p className="text-body text-sys-label-secondary text-center py-8">
              No budgets set
            </p>
          ) : (
            <ul className="space-y-4">
              {budgets?.slice(0, 5).map((b) => {
                const pct = b.amount > 0 ? Math.round(((b.spent ?? 0) / b.amount) * 100) : 0;
                return (
                  <li key={b.id}>
                    <div className="flex justify-between text-subheadline mb-1">
                      <span className="text-sys-label">
                        {b.category_icon} {b.category_name}
                      </span>
                      <span className="text-sys-label-secondary">
                        <AmountDisplay cents={b.spent ?? 0} /> /{" "}
                        <AmountDisplay cents={b.amount} />
                      </span>
                    </div>
                    <ProgressBar value={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
