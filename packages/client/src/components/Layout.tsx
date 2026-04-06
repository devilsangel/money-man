import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Target,
  BarChart2,
  Upload,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/accounts", icon: CreditCard, label: "Accounts" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/budgets", icon: Target, label: "Budgets" },
  { to: "/reports", icon: BarChart2, label: "Reports" },
  { to: "/import", icon: Upload, label: "Import" },
];

export function Layout() {
  const location = useLocation();

  // Determine page title
  const currentNav = navItems.find((n) => location.pathname.startsWith(n.to));
  const pageTitle = currentNav?.label ?? (location.pathname.startsWith("/settings") ? "Settings" : "");

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sys-bg border-r border-sys-separator flex flex-col">
        {/* App name */}
        <div className="px-5 py-5 border-b border-sys-separator">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-title-3 text-sys-label">Money Man</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-btn text-callout font-medium transition-colors ${
                  isActive
                    ? "bg-system-blue text-white"
                    : "text-sys-label hover:bg-sys-fill"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Settings at bottom */}
        <div className="px-3 py-4 border-t border-sys-separator">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-btn text-callout font-medium transition-colors ${
                isActive
                  ? "bg-system-blue text-white"
                  : "text-sys-label hover:bg-sys-fill"
              }`
            }
          >
            <Settings size={18} />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        {pageTitle && (
          <header className="h-[52px] flex items-center px-6 border-b border-sys-separator bg-sys-bg flex-shrink-0">
            <h1 className="text-title-3 text-sys-label">{pageTitle}</h1>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
