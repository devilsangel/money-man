import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AccountsPage } from "./pages/AccountsPage.js";
import { AccountDetailPage } from "./pages/AccountDetailPage.js";
import { TransactionsPage } from "./pages/TransactionsPage.js";
import { BudgetsPage } from "./pages/BudgetsPage.js";
import { ReportsPage } from "./pages/ReportsPage.js";
import { ImportPage } from "./pages/ImportPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TransactionModal } from "./components/TransactionModal.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";

// Inner component so it can use useNavigate (must be inside BrowserRouter)
function AppRoutes() {
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: "n",
      handler: () => setShowAddModal(true),
    },
    {
      key: "/",
      handler: () => {
        // Focus the search input on the transactions page if present, otherwise navigate there
        const searchInput = document.getElementById("txn-search");
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate("/transactions");
        }
      },
    },
  ]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/:id" element={<AccountDetailPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="reports/*" element={<ReportsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>

      {showAddModal && (
        <TransactionModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
