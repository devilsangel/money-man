import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { reportsApi } from "../api/reports.js";
import { Card } from "../components/Card.js";
import { Input } from "../components/Input.js";
import { Skeleton } from "../components/Skeleton.js";
import { EmptyState } from "../components/EmptyState.js";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── Spending View ────────────────────────────────────────────────────────────

function SpendingView() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ["reports/spending-by-category", from, to],
    queryFn: () => reportsApi.spendingByCategory(from, to),
  });

  return (
    <div className="space-y-4">
      {/* Date range */}
      <Card>
        <div className="flex gap-4 items-end">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="max-w-[180px]"
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="max-w-[180px]"
          />
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No spending data"
          description="Add some expense transactions to see your spending breakdown."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie chart */}
          <Card>
            <h3 className="text-headline text-sys-label mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total_cents"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category_name, percent }) =>
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCents(v)}
                  contentStyle={{
                    backgroundColor: "var(--sys-bg)",
                    border: "1px solid var(--sys-separator)",
                    borderRadius: "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Bar chart */}
          <Card>
            <h3 className="text-headline text-sys-label mb-4">Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 80, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-separator)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCents(v)}
                  tick={{ fill: "var(--sys-label-secondary)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="category_name"
                  tick={{ fill: "var(--sys-label)", fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => formatCents(v)}
                  contentStyle={{
                    backgroundColor: "var(--sys-bg)",
                    border: "1px solid var(--sys-separator)",
                    borderRadius: "10px",
                  }}
                />
                <Bar dataKey="total_cents" radius={[0, 4, 4, 0]}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Legend table */}
          <Card className="lg:col-span-2">
            <h3 className="text-headline text-sys-label mb-3">Details</h3>
            <table className="w-full">
              <tbody className="divide-y divide-sys-separator">
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="text-subheadline text-sys-label">
                          {row.category_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-subheadline font-medium text-sys-label">
                      {formatCents(row.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Trends View ─────────────────────────────────────────────────────────────

function TrendsView() {
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data, isLoading } = useQuery({
    queryKey: ["reports/spending-by-month", year],
    queryFn: () => reportsApi.spendingByMonth(year),
  });

  const chartData = data?.map((d) => ({
    month: new Date(d.month + "-01").toLocaleString("en-US", { month: "short" }),
    Income: d.income_cents / 100,
    Expenses: d.expense_cents / 100,
    Net: d.net_cents / 100,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <Input
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="max-w-[120px]"
          />
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : !chartData || chartData.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No data for this year"
          description="Add transactions in this year to see monthly trends."
        />
      ) : (
        <Card>
          <h3 className="text-headline text-sys-label mb-4">
            Income vs Expenses — {year}
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34C759" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-separator)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--sys-label-secondary)", fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v) => `$${v.toLocaleString()}`}
                tick={{ fill: "var(--sys-label-secondary)", fontSize: 11 }}
              />
              <Tooltip
                formatter={(v: number) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(v)
                }
                contentStyle={{
                  backgroundColor: "var(--sys-bg)",
                  border: "1px solid var(--sys-separator)",
                  borderRadius: "10px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="Income"
                stroke="#34C759"
                fill="url(#colorIncome)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Expenses"
                stroke="#FF3B30"
                fill="url(#colorExpenses)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Net"
                stroke="#007AFF"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

const TAB_BASE =
  "px-4 py-2 text-callout font-medium rounded-btn transition-colors";
const TAB_ACTIVE = "bg-system-blue text-white";
const TAB_INACTIVE = "text-sys-label hover:bg-sys-fill";

export function ReportsPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-title-1 text-sys-label">Reports</h2>

      {/* Tab bar */}
      <div className="flex gap-2">
        <NavLink
          to="spending"
          className={({ isActive }) =>
            `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`
          }
        >
          Spending
        </NavLink>
        <NavLink
          to="trends"
          className={({ isActive }) =>
            `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`
          }
        >
          Trends
        </NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="spending" replace />} />
        <Route path="spending" element={<SpendingView />} />
        <Route path="trends" element={<TrendsView />} />
      </Routes>
    </div>
  );
}
