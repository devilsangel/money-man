import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AccountsPage } from "./pages/AccountsPage.js";
import { AccountDetailPage } from "./pages/AccountDetailPage.js";
import { TransactionsPage } from "./pages/TransactionsPage.js";
import { BudgetsPage } from "./pages/BudgetsPage.js";
import { ReportsPage } from "./pages/ReportsPage.js";
import { ImportPage } from "./pages/ImportPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
