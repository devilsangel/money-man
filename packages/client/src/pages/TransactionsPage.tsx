import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Filter, Search, Download } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState("");

  const [filters, setFilters] = useState({
    account_id: "",
    category_id: "",
    type: "",
    from: "",
    to: "",
    q: "",
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
        q: filters.q || undefined,
        page,
        limit: 50,
      }),
  });

  const handleSearch = (value: string) => {
    setSearchInput(value);
    // Debounce: only update filter after user stops typing
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)["_searchTimer"]);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>)["_searchTimer"] = setTimeout(() => {
      setFilters((f) => ({ ...f, q: value }));
      setPage(1);
    }, 300);
  };

  const handleExport = (format: "csv" | "json") => {
    const url = transactionsApi.exportUrl(
      {
        account_id: filters.account_id ? parseInt(filters.account_id) : undefined,
        category_id: filters.category_id ? parseInt(filters.category_id) : undefined,
        type: filters.type || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        q: filters.q || undefined,
      },
      format
    );
    window.location.assign(url);
  };

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
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-title-1 text-sys-label flex-shrink-0">Transactions</h2>

        {/* Search bar */}
        <div className="flex-1 max-w-sm relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sys-label-tertiary pointer-events-none" />
          <input
            id="txn-search"
            type="search"
            placeholder="Search payee or notes…"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-callout bg-sys-bg-secondary border border-sys-separator rounded-input text-sys-label placeholder:text-sys-label-tertiary focus:outline-none focus:ring-2 focus:ring-system-blue/30 focus:border-system-blue transition-all"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={16} />
            Filters
          </Button>
          {/* Export dropdown */}
          <div className="relative group">
            <Button variant="secondary" size="sm">
              <Download size={16} />
              Export
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-sys-bg border border-sys-separator rounded-card shadow-card hidden group-hover:flex flex-col z-20 min-w-[120px] overflow-hidden">
              <button
                className="px-4 py-2 text-callout text-sys-label hover:bg-sys-fill text-left"
                onClick={() => handleExport("csv")}
              >
                Export CSV
              </button>
              <button
                className="px-4 py-2 text-callout text-sys-label hover:bg-sys-fill text-left"
                onClick={() => handleExport("json")}
              >
                Export JSON
              </button>
            </div>
          </div>
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
