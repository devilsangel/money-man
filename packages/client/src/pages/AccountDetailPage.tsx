import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { accountsApi } from "../api/accounts.js";
import { transactionsApi } from "../api/transactions.js";
import { reportsApi } from "../api/reports.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { AmountDisplay } from "../components/AmountDisplay.js";
import { TransactionModal } from "../components/TransactionModal.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";
import type { Transaction } from "@money-man/shared";

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accountId = parseInt(id!, 10);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>();
  const [page, setPage] = useState(1);

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ["accounts", accountId],
    queryFn: () => accountsApi.get(accountId),
  });

  // Balance history for the chart (last 90 days)
  const historyFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: balanceHistory } = useQuery({
    queryKey: ["balance-history", accountId, historyFrom],
    queryFn: () => reportsApi.accountBalanceHistory(accountId, historyFrom),
    enabled: !!account,
  });

  const chartData = balanceHistory?.map((d) => ({
    date: d.date,
    balance: d.running_balance_cents / 100,
  }));

  const { data: txns, isLoading: loadingTxns } = useQuery({
    queryKey: ["transactions", { account_id: accountId, page }],
    queryFn: () => transactionsApi.list({ account_id: accountId, page, limit: 25 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (txnId: number) => transactionsApi.delete(txnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loadingAccount) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-16">
        <p className="text-body text-sys-label-secondary">Account not found</p>
        <Button variant="ghost" onClick={() => navigate("/accounts")} className="mt-2">
          Back to accounts
        </Button>
      </div>
    );
  }

  const totalPages = txns ? Math.ceil(txns.total / 25) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/accounts")}
          className="p-1.5 rounded-full hover:bg-sys-fill transition-colors text-sys-label-secondary"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-title-1 text-sys-label">{account.name}</h2>
          <p className="text-footnote text-sys-label-secondary capitalize">
            {account.type.replace("_", " ")}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add Transaction
        </Button>
      </div>

      {/* Balance card + history chart */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-footnote text-sys-label-secondary mb-1">Current Balance</p>
            <AmountDisplay
              cents={account.balance ?? 0}
              showSign
              className="text-large-title font-bold text-sys-label"
            />
          </div>
          <span className="text-caption text-sys-label-tertiary">Last 90 days</span>
        </div>

        {chartData && chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-separator)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                formatter={(v: number) =>
                  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)
                }
                labelFormatter={(l) => l}
                contentStyle={{
                  backgroundColor: "var(--sys-bg)",
                  border: "1px solid var(--sys-separator)",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#007AFF"
                fill="url(#balGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-caption text-sys-label-tertiary mt-2">
            Add transactions to see balance history.
          </p>
        )}
      </Card>

      {/* Transactions */}
      <Card>
        <h3 className="text-headline text-sys-label mb-4">Transactions</h3>

        {loadingTxns ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : txns?.data.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No transactions"
            description="Add your first transaction for this account."
          />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sys-separator">
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary">Date</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary">Payee</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary">Category</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary text-right">Amount</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sys-separator">
                {txns?.data.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-sys-fill cursor-pointer"
                    onClick={() => {
                      setEditingTxn(t);
                      setShowModal(true);
                    }}
                  >
                    <td className="py-2.5 text-subheadline text-sys-label-secondary pr-4">
                      {t.date}
                    </td>
                    <td className="py-2.5 text-subheadline text-sys-label pr-4">
                      {t.payee || "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {t.category_name ? (
                        <span
                          className="text-caption px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (t.category_color ?? "#8E8E93") + "25",
                            color: t.category_color ?? "#8E8E93",
                          }}
                        >
                          {t.category_name}
                        </span>
                      ) : (
                        <span className="text-caption text-sys-label-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <AmountDisplay
                        cents={t.amount}
                        showSign
                        className="text-subheadline font-medium"
                      />
                    </td>
                    <td className="py-2.5 pl-2">
                      <button
                        className="text-sys-label-tertiary hover:text-system-red transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this transaction?")) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-sys-separator">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-footnote text-sys-label-secondary">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {showModal && (
        <TransactionModal
          transaction={editingTxn}
          defaultAccountId={accountId}
          onClose={() => {
            setShowModal(false);
            setEditingTxn(undefined);
          }}
        />
      )}
    </div>
  );
}
