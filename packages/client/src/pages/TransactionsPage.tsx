import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { transactionsApi } from "../api/transactions.js";
import { accountsApi } from "../api/accounts.js";
import { categoriesApi } from "../api/categories.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { Select } from "../components/Select.js";
import { Input } from "../components/Input.js";
import { AmountDisplay } from "../components/AmountDisplay.js";
import { TransactionModal } from "../components/TransactionModal.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";
import type { Transaction } from "@money-man/shared";

export function TransactionsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | undefined>();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    account_id: "",
    category_id: "",
    type: "",
    from: "",
    to: "",
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const { data: txns, isLoading } = useQuery({
    queryKey: ["transactions", { ...filters, page }],
    queryFn: () =>
      transactionsApi.list({
        account_id: filters.account_id ? parseInt(filters.account_id) : undefined,
        category_id: filters.category_id ? parseInt(filters.category_id) : undefined,
        type: filters.type || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit: 50,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalPages = txns ? Math.ceil(txns.total / 50) : 1;

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-title-1 text-sys-label">Transactions</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={16} />
            Filters
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select
              label="Account"
              value={filters.account_id}
              onChange={(e) => updateFilter("account_id", e.target.value)}
            >
              <option value="">All accounts</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>

            <Select
              label="Category"
              value={filters.category_id}
              onChange={(e) => updateFilter("category_id", e.target.value)}
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Type"
              value={filters.type}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </Select>

            <Input
              label="From date"
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
            />

            <Input
              label="To date"
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : txns?.data.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No transactions"
            description={
              filters.account_id || filters.type || filters.from
                ? "No transactions match your filters."
                : "Add your first transaction to get started."
            }
            action={
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <Plus size={16} />
                Add Transaction
              </Button>
            }
          />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sys-separator">
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary">Date</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary">Payee</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary hidden sm:table-cell">Account</th>
                  <th className="pb-2 text-footnote font-medium text-sys-label-secondary hidden md:table-cell">Category</th>
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
                    <td className="py-2.5 text-subheadline text-sys-label-secondary pr-4 whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-2.5 text-subheadline text-sys-label pr-4">
                      {t.payee || "—"}
                    </td>
                    <td className="py-2.5 text-subheadline text-sys-label-secondary pr-4 hidden sm:table-cell">
                      {t.account_name}
                    </td>
                    <td className="py-2.5 pr-4 hidden md:table-cell">
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
                    <td className="py-2.5 text-right whitespace-nowrap">
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
            {txns && txns.total > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-sys-separator">
                <span className="text-footnote text-sys-label-secondary">
                  {txns.total} transaction{txns.total !== 1 ? "s" : ""}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-footnote text-sys-label-secondary">
                      {page} / {totalPages}
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
              </div>
            )}
          </>
        )}
      </Card>

      {showModal && (
        <TransactionModal
          transaction={editingTxn}
          onClose={() => {
            setShowModal(false);
            setEditingTxn(undefined);
          }}
        />
      )}
    </div>
  );
}
