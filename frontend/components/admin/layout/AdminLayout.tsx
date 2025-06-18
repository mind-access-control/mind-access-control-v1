import { ReactNode } from 'react';
import AdminHeader from './AdminHeader';

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "User Management" },
  { id: "logs", label: "Access Logs" },
  { id: "settings", label: "Settings" },
];

interface AdminLayoutProps {
  children: ReactNode;
  onLogout?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminLayout({ children, onLogout, activeTab, setActiveTab }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      <AdminHeader onLogout={onLogout} />
      <nav className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-teal-600 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
